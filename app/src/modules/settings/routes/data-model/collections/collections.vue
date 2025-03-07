<template>
	<private-view :title="t('settings_data_model')">
		<template #headline><v-breadcrumb :items="[{ name: t('settings'), to: '/settings' }]" /></template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="list_alt" />
			</v-button>
		</template>

		<template #actions>
			<collection-dialog v-model="collectionDialogActive">
				<template #activator="{ on }">
					<v-button v-tooltip.bottom="t('create_folder')" rounded icon class="add-folder" @click="on">
						<v-icon name="create_new_folder" />
					</v-button>
				</template>
			</collection-dialog>

			<v-button v-tooltip.bottom="t('create_collection')" rounded icon to="/settings/data-model/+">
				<v-icon name="add" />
			</v-button>
		</template>

		<template #navigation>
			<settings-navigation />
		</template>

		<div class="padding-box">
			<v-info v-if="collections.length === 0" type="warning" icon="box" :title="t('no_collections')">
				{{ t('no_collections_copy_admin') }}

				<template #append>
					<v-button to="/settings/data-model/+">{{ t('create_collection') }}</v-button>
				</template>
			</v-info>

			<v-list v-else class="draggable-list">
				<draggable
					:force-fallback="true"
					:model-value="rootCollections"
					:group="{ name: 'collections' }"
					:swap-threshold="0.3"
					class="root-drag-container"
					item-key="collection"
					handle=".drag-handle"
					@update:model-value="onSort($event, true)"
				>
					<template #item="{ element }">
						<collection-item
							:collection="element"
							:collections="collections"
							@editCollection="editCollection = $event"
							@setNestedSort="onSort"
						/>
					</template>
				</draggable>
			</v-list>

			<v-list class="db-only">
				<v-list-item
					v-for="collection of tableCollections"
					:key="collection.collection"
					v-tooltip="t('db_only_click_to_configure')"
					class="collection-row hidden"
					block
					clickable
				>
					<v-list-item-icon>
						<v-icon name="add" />
					</v-list-item-icon>

					<div class="collection-name" @click="openCollection(collection)">
						<v-icon class="collection-icon" name="dns" />
						<span class="collection-name">{{ collection.name }}</span>
					</div>

					<collection-options :collection="collection" />
				</v-list-item>
			</v-list>

			<v-detail :label="t('system_collections')">
				<collection-item
					v-for="collection of systemCollections"
					:key="collection.collection"
					:collection="collection"
					:collections="systemCollections"
					disable-drag
				/>
			</v-detail>
		</div>

		<router-view name="add" />

		<template #sidebar>
			<sidebar-detail icon="info_outline" :title="t('information')" close>
				<div v-md="t('page_help_settings_datamodel_collections')" class="page-description" />
			</sidebar-detail>
		</template>

		<collection-dialog
			:model-value="!!editCollection"
			:collection="editCollection"
			@update:model-value="editCollection = null"
		/>
	</private-view>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, computed, ref } from 'vue';
import SettingsNavigation from '../../../components/navigation.vue';
import { useCollectionsStore } from '@/stores/';
import { Collection } from '@/types';
import CollectionOptions from './components/collection-options.vue';
import { sortBy, merge } from 'lodash';
import CollectionItem from './components/collection-item.vue';
import { translate } from '@/utils/translate-object-values';
import Draggable from 'vuedraggable';
import { unexpectedError } from '@/utils/unexpected-error';
import api from '@/api';
import CollectionDialog from './components/collection-dialog.vue';

export default defineComponent({
	components: { SettingsNavigation, CollectionItem, CollectionOptions, Draggable, CollectionDialog },
	setup() {
		const { t } = useI18n();

		const collectionDialogActive = ref(false);
		const editCollection = ref<Collection>();

		const collectionsStore = useCollectionsStore();

		const collections = computed(() => {
			return translate(
				sortBy(
					collectionsStore.collections.filter(
						(collection) => collection.collection.startsWith('directus_') === false && collection.meta
					),
					['meta.sort', 'collection']
				)
			);
		});

		const rootCollections = computed(() => {
			return collections.value.filter((collection) => !collection.meta?.group);
		});

		const tableCollections = computed(() => {
			return translate(
				sortBy(
					collectionsStore.collections.filter(
						(collection) =>
							collection.collection.startsWith('directus_') === false &&
							!!collection.meta === false &&
							collection.schema
					),
					['meta.sort', 'collection']
				)
			);
		});

		const systemCollections = computed(() => {
			return translate(
				sortBy(
					collectionsStore.collections
						.filter((collection) => collection.collection.startsWith('directus_') === true)
						.map((collection) => ({ ...collection, icon: 'settings' })),
					'collection'
				)
			);
		});

		return {
			collectionDialogActive,
			t,
			collections,
			tableCollections,
			systemCollections,
			onSort,
			rootCollections,
			editCollection,
		};

		async function onSort(updates: Collection[], removeGroup = false) {
			const updatesWithSortValue = updates.map((collection, index) =>
				merge(collection, { meta: { sort: index + 1, group: removeGroup ? null : collection.meta?.group } })
			);

			collectionsStore.collections = collectionsStore.collections.map((collection) => {
				const updatedValues = updatesWithSortValue.find(
					(updatedCollection) => updatedCollection.collection === collection.collection
				);

				return updatedValues ? merge({}, collection, updatedValues) : collection;
			});

			try {
				await Promise.all(
					updatesWithSortValue.map((collection) =>
						api.patch(`/collections/${collection.collection}`, {
							meta: { sort: collection.meta.sort, group: collection.meta.group },
						})
					)
				);
			} catch (err) {
				unexpectedError(err);
			}
		}
	},
});
</script>

<style scoped lang="scss">
.padding-box {
	padding: var(--content-padding);
	padding-top: 0;
}

.v-info {
	padding: var(--content-padding) 0;
}

.root-drag-container {
	padding: 8px 0;
	overflow: hidden;
}

.header-icon {
	--v-button-color-disabled: var(--warning);
	--v-button-background-color-disabled: var(--warning-10);
}

.collection-item.hidden {
	--v-list-item-color: var(--foreground-subdued);
}

.collection-name {
	flex-grow: 1;
	font-family: var(--family-monospace);
}

.collection-icon {
	margin-right: 8px;
}

.hidden .collection-name {
	color: var(--foreground-subdued);
}

.draggable-list :deep(.sortable-ghost) {
	.v-list-item {
		--v-list-item-background-color: var(--primary-alt);
		--v-list-item-border-color: var(--primary);
		--v-list-item-background-color-hover: var(--primary-alt);
		--v-list-item-border-color-hover: var(--primary);

		> * {
			opacity: 0;
		}
	}
}

.add-folder {
	--v-button-background-color: var(--primary-10);
	--v-button-color: var(--primary);
	--v-button-background-color-hover: var(--primary-25);
	--v-button-color-hover: var(--primary);
}

.db-only {
	margin-bottom: 16px;
}
</style>
