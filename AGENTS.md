# solarflow

A non-linear, sun-anchored clock — deployed as a static SPA on GitHub Pages.

## Tech Stack

- **Framework**: SvelteKit with `@sveltejs/adapter-static` (fully prerendered / SPA)
- **Language**: TypeScript (strict)
- **Package manager**: pnpm
- **Bundler**: Vite (via SvelteKit)
- **Sun ephemerides**: [`suncalc`](https://github.com/mourner/suncalc)
- **Timezone resolution**: [`tz-lookup`](https://github.com/darkskyapp/tz-lookup) (lazy-loaded)
- **Charts**: [`uplot`](https://github.com/leeoniya/uPlot) for time-series visualizations
- **Bespoke viz**: hand-rolled SVG via Svelte components
- **Geocoding**: Nominatim (called directly from the browser; cached in localStorage)
- **Testing**: Vitest (+ Playwright for any future end-to-end)
- **Lint / format**: ESLint + Prettier
- **Tool version management**: mise
- **CI / Deploy**: GitHub Actions → GitHub Pages

## Layout

This is a pure static SPA. No server, no backend. All computation runs in the browser.

The original Python prototype (using `astral`) has been moved to a sibling repository at `../solarflow-py/` and is kept as a reference implementation for the linear↔solar scaling math.

## Hosting

Deployed to GitHub Pages via GitHub Actions on push to `main`. See task 012 in `.mdboard/tasks/` for deployment details.
