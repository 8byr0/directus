import { test, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import VInfo from './v-info.vue';
import VIcon from './v-icon/v-icon.vue';

test('Mount component', () => {
	expect(VInfo).toBeTruthy();

	const wrapper = mount(VInfo, {
		props: {
			title: 'This is an info',
		},
		slots: {
			default: 'content',
		},
	});

	expect(wrapper.html()).toMatchSnapshot();
});

test('style props', async () => {
	const types = ['info', 'success', 'warning', 'danger', 'center'];

	for (const type of types) {
		const wrapper = mount(VInfo, {
			props: {
				title: 'This is an info',
				type,
			},
		});

		expect(wrapper.classes()).toContain(type);
	}
});

test('Renders an icon div with the passed icon when icon prop is set', () => {
	const wrapper = mount(VInfo, {
		props: {
			title: 'This is a test',
			icon: 'box',
		},
	});

	const iconDiv = wrapper.get('div.icon');

	expect(iconDiv.isVisible()).toBe(true);
	expect(iconDiv.getComponent(VIcon).props().name).toBe('box');
	expect(iconDiv.getComponent(VIcon).props().large).toBe(true);
});

test('Does not render icon when icon prop is set to false', () => {
	const wrapper = mount(VInfo, {
		props: {
			title: 'This is a test',
			icon: false,
		},
	});

	expect(wrapper.find('div.icon').exists()).toBe(false);
});
