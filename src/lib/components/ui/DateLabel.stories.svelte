<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DateLabel from './DateLabel.svelte';

	const { Story } = defineMeta({
		title: 'UI/DateLabel',
		component: DateLabel,
		tags: ['autodocs'],
		args: {
			date: '2026-09-02T22:45:00.000Z',
			timeZone: 'America/Mexico_City',
			unroll: true,
			class: 'text-sm text-fg-muted'
		}
	});
</script>

<!-- Point at it: the whole date unrolls out of the short one. -->
<Story name="This year" />

<Story name="Another year" args={{ date: '2025-12-24T03:10:00.000Z' }} />

<!-- For a column too narrow to keep room for the whole date. -->
<Story name="Short only" args={{ unroll: false }} />
