<script lang="ts">
	import { page } from '$app/state';

	/*
	 * What a search result and a shared link say about Monfly. Only the layouts a
	 * crawler can reach render this — (marketing) and (auth). (app) answers a
	 * crawler with a redirect to log in, and /offline is only ever served by the
	 * service worker, so neither needs it.
	 *
	 * The description is repeated in static/manifest.webmanifest, which can't
	 * import it: change both.
	 */
	const DESCRIPTION = 'Where your money went, and what is left.';

	/** 1200×630 in static/: the picture a shared link unfurls into. */
	const IMAGE = '/og-image.png';

	// Built on the origin that served the request, so no domain is written down
	// here: production and each preview describe themselves, and Vercel already
	// keeps previews out of search with `X-Robots-Tag: noindex`.
	const url = $derived(page.url.origin + page.url.pathname);
	const image = $derived(new URL(IMAGE, page.url.origin).href);
</script>

<svelte:head>
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href={url} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Monfly" />
	<meta property="og:title" content="Monfly" />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:url" content={url} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="The Monfly mark" />

	<!-- X reads the og: tags above; this only asks it for the large picture. -->
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
