<!-- Trimmed mark: sun colours fixed; bg + text follow app theme via CSS variables. -->
<svg
	class="logo"
	viewBox="350 85 500 435"
	role="img"
	aria-label="solarflow"
	xmlns="http://www.w3.org/2000/svg"
>
	<title>solarflow</title>
	<rect class="logo__bg" x="350" y="85" width="500" height="435" />
	<circle class="logo__sun-disc" cx="600" cy="219" r="72" />
	<g class="logo__sun-rays" fill="none" stroke-linecap="round" stroke-width="10">
		<line x1="600" y1="99" x2="600" y2="135" />
		<line x1="600" y1="303" x2="600" y2="339" />
		<line x1="480" y1="219" x2="516" y2="219" />
		<line x1="684" y1="219" x2="720" y2="219" />
		<line x1="515" y1="134" x2="541" y2="160" />
		<line x1="659" y1="278" x2="685" y2="304" />
		<line x1="515" y1="304" x2="541" y2="278" />
		<line x1="659" y1="160" x2="685" y2="134" />
	</g>
	<text
		class="logo__title"
		x="600"
		y="436"
		text-anchor="middle"
		font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
		font-size="72"
		font-weight="600"
	>
		solarflow
	</text>
	<text
		class="logo__tagline"
		x="600"
		y="506"
		text-anchor="middle"
		font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
		font-size="28"
	>
		A clock that flows with the sun
	</text>
</svg>

<style>
	.logo {
		display: block;
		width: 100%;
		height: auto;
	}

	.logo__bg {
		fill: var(--color-bg);
	}

	.logo__sun-disc {
		fill: #f4d03f;
	}

	.logo__sun-rays {
		stroke: #c2410c;
	}

	.logo__title {
		fill: var(--color-fg);
	}

	.logo__tagline {
		fill: var(--color-muted);
	}
</style>
