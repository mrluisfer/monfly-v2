<script lang="ts">
	type Props = {
		/** Accessible name. Omit when the mark sits next to the "Monfly" wordmark. */
		label?: string;
		class?: string;
	};

	let { label, class: className }: Props = $props();

	// Unique per instance: with a shared id every copy paints from the first
	// copy's <defs>, and those stop rendering if that copy is ever hidden.
	const uid = $props.id();
	const id = (key: string) => `${uid}-${key}`;

	/** Lit faces of the rings — radial blue → lime (see --logo-lit-* below). */
	const lit = [
		{ key: 'a', transform: 'matrix(-93.94978 -1.31187 1.91351 -137.03592 119.07 85.05)' },
		{ key: 'b', transform: 'matrix(-50.24352 -14.35492 14.75776 -51.65347 180.635 22.73)' },
		{ key: 'c', transform: 'matrix(-50.24352 -14.35492 14.75776 -51.65347 180.635 159.67)' },
		{ key: 'd', transform: 'matrix(-45.96601 -20.03622 29.70752 -68.1534 226.095 157.52)' },
		{ key: 'e', transform: 'matrix(-45.96601 -20.03622 29.70752 -68.1534 226.095 31.103)' }
	];
</script>

<!--
	Every colour derives from the brand tokens, so the mark follows any palette
	change. Remapped from src/lib/assets/monfly-logo.svg, which stays untouched
	as the master: its mint became --lime, its violet-blue became --blue.

	The blue → lime midpoint is mixed in oklab on purpose. oklch keeps full
	chroma and clips to a neon cyan that bands hard between lime and violet;
	oklab passes through a soft pale tone instead — the same fade the Blob
	gradients use.
-->
<svg
	viewBox="0 0 256 170"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	style="
		aspect-ratio: 256 / 170;
		--logo-lit-a: var(--blue);
		--logo-lit-b: var(--lime);
		--logo-lit-mid: color-mix(in oklab, var(--logo-lit-a), var(--logo-lit-b));
		--logo-band: color-mix(in oklch, var(--blue), var(--violet));
		--logo-deep: color-mix(in oklab, var(--logo-band) 55%, var(--ink));
	"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : true}
>
	<defs>
		{#each lit as g (g.key)}
			<radialGradient
				id={id(g.key)}
				cx="0"
				cy="0"
				r="1"
				gradientUnits="userSpaceOnUse"
				gradientTransform={g.transform}
			>
				<stop stop-color="var(--logo-lit-a)" />
				<stop offset=".5" stop-color="var(--logo-lit-mid)" />
				<stop offset="1" stop-color="var(--logo-lit-b)" />
			</radialGradient>
		{/each}

		<!-- Rim light on the right-hand crescent -->
		<radialGradient
			id={id('f')}
			cx="0"
			cy="0"
			r="1"
			gradientUnits="userSpaceOnUse"
			gradientTransform="matrix(29.90682 0 0 147.52703 229.683 83.74)"
		>
			<stop stop-color="var(--logo-lit-b)" />
			<stop offset=".32" stop-color="var(--logo-lit-b)" stop-opacity="0" />
			<stop offset=".903" stop-color="var(--logo-lit-a)" />
		</radialGradient>
	</defs>

	<path
		d="M84.818 0c12.181 0 23.731 2.576 34.196 7.204-23.187 13.153-39.367 42.949-39.367 77.614 0 34.659 16.196 64.46 39.367 77.613a84.358 84.358 0 0 1-34.196 7.204C37.977 169.635 0 131.658 0 84.818 0 37.98 37.977 0 84.818 0Z"
		fill="url(#{id('a')})"
	/>
	<path
		d="M151.704 32.693c-8.577-10.977-19.777-19.794-32.698-25.489C127.151 2.576 136.145 0 145.607 0c8.926 0 17.46 2.304 25.216 6.435-7.582 5.646-14.161 14.77-19.132 26.258h.013Z"
		fill="url(#{id('b')})"
	/>
	<path
		d="M151.691 136.942c4.971 11.488 11.55 20.591 19.132 26.258-7.772 4.145-16.29 6.435-25.216 6.435-9.478 0-18.469-2.575-26.601-7.204 12.897-5.695 24.121-14.512 32.698-25.489h-.013Z"
		fill="url(#{id('c')})"
	/>
	<path
		d="M79.639 84.818c0-34.665 16.196-64.461 39.367-77.614 12.897 5.695 24.121 14.512 32.698 25.489-6.244 14.389-9.959 32.47-9.959 52.125 0 19.646 3.729 37.735 9.959 52.119a85.129 85.129 0 0 1-32.698 25.494c-23.185-13.153-39.367-42.954-39.367-77.613Z"
		fill="var(--logo-band)"
	/>
	<path
		d="M203.084 126.414c2.399 12.788 5.872 23.514 10.06 31.083-7.085 7.7-15.391 12.13-24.289 12.13-6.383 0-12.467-2.29-18.023-6.435 13.688-7.283 25.034-20.326 32.252-36.756v-.022Z"
		fill="url(#{id('d')})"
	/>
	<path
		d="M170.832 6.435C176.388 2.29 182.472 0 188.855 0c8.885 0 17.191 4.433 24.289 12.132-4.175 7.566-7.648 18.287-10.06 31.075-7.218-16.438-18.564-29.476-32.252-36.756v-.016Z"
		fill="url(#{id('e')})"
	/>
	<path
		d="M151.704 136.929c11.216-14.382 17.92-32.465 17.92-52.12 0-19.652-6.704-37.735-17.92-52.116 4.98-11.48 11.553-20.599 19.141-26.264 13.683 7.281 25.029 20.327 32.247 36.756-2.32 12.29-3.633 26.49-3.633 41.611 0 15.121 1.33 29.312 3.633 41.605-7.218 16.435-18.564 29.481-32.247 36.761-7.588-5.651-14.161-14.767-19.141-26.263v.03Z"
		fill="var(--logo-band)"
	/>
	<path
		d="M151.696 136.942c-6.236-14.389-9.951-32.47-9.951-52.124 0-19.647 3.729-37.73 9.951-52.12 11.224 14.39 17.928 32.473 17.928 52.12 0 19.654-6.704 37.735-17.928 52.124Z"
		fill="var(--logo-deep)"
	/>
	<path
		d="M213.144 12.132C217.4 4.433 222.38 0 227.724 0 243.343 0 256 37.98 256 84.818c0 46.84-12.657 84.817-28.276 84.817-5.331 0-10.324-4.438-14.58-12.132 13.682-14.85 22.837-41.828 22.837-72.685 0-30.855-9.155-57.85-22.837-72.686Z"
		fill="var(--logo-lit-b)"
	/>
	<path
		d="M213.144 12.132C217.4 4.433 222.38 0 227.724 0 243.343 0 256 37.98 256 84.818c0 46.84-12.657 84.817-28.276 84.817-5.331 0-10.324-4.438-14.58-12.132 13.682-14.85 22.837-41.828 22.837-72.685 0-30.855-9.155-57.85-22.837-72.686Z"
		fill="url(#{id('f')})"
	/>
	<path
		d="M211.58 84.826c0-15.13-3.087-29.321-8.496-41.611 2.399-12.79 5.872-23.508 10.068-31.077 13.68 14.835 22.834 41.847 22.834 72.688 0 30.832-9.154 57.849-22.834 72.685-4.183-7.574-7.648-18.295-10.068-31.083 5.396-12.29 8.496-26.481 8.496-41.602Z"
		fill="var(--logo-band)"
	/>
	<path
		d="M203.084 126.423c-2.317-12.293-3.634-26.484-3.634-41.605 0-15.127 1.33-29.321 3.634-41.611 5.396 12.29 8.496 26.484 8.496 41.611 0 15.121-3.087 29.312-8.496 41.605Z"
		fill="var(--logo-deep)"
	/>
</svg>
