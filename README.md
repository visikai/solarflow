# solarflow

> A non-linear, adaptive clock based around sunrise and sunset — for any location, any day of the year.

**Live site**: [https://visikai.github.io/solarflow/](https://visikai.github.io/solarflow/)

## Motivation

We organize our lives around a fixed 24-hour clock. We start work at 8 or 9, finish at 4 or 5, and we do this all year round — regardless of how much daylight the day actually contains.

In the depths of winter at high latitudes, a "9-to-5" workday can consume **all** of the daylight available. The employee gives 100% of their daytime to the employer and walks home in the dark. Six months later the same nominal hours take a much smaller bite — maybe 60–70% — out of a generous summer day.

This seasonal disconnect is real, and it has measurable effects on mood, sleep, and well-being. Our usual fix — Daylight Saving Time — is a blunt one-hour, twice-a-year jolt that doesn't actually track the sun. It just shifts the misalignment around and disrupts circadian rhythms in the process.

What we actually need is a clock that **flows** with the sun: stretching and compressing through the seasons, so that the same scaled hour always represents the same fraction of available daylight, wherever and whenever you are.

That's solarflow.

## Concept

Solarflow defines two parallel time systems:

- **Clock time** — the familiar 24-hour clock. Identical regardless of season or latitude.
- **Solar time** — a non-linear clock anchored to the sun:
  - actual sunrise maps to **06:00**
  - actual sunset maps to **18:00**
  - daytime and nighttime are each independently stretched (or compressed) so that the mapping is continuous.

The same scaled hour always represents the same fraction of available daylight.

### Worked example

In Reykjavík on the winter solstice, the sun rises around 11:20 and sets around 15:30 — only about four hours of daylight. In solar time:

| Clock time | Solar time | Notes                              |
| ---------- | ---------- | ---------------------------------- |
| 11:20      | 06:00      | Sunrise                            |
| 13:25      | 12:00      | Solar noon                         |
| 15:30      | 18:00      | Sunset                             |
| 09:00      | ~03:25     | "Workday start" — still deep night |
| 17:00      | ~20:25     | "Workday end" — well after sunset  |

On the same day, the entire conventional workday (09:00–17:00) sits almost entirely _outside_ the daylight window. Solar time makes that visible at a glance.

## Status

Pure static SPA: all sun math runs in the browser. See the [live site](https://visikai.github.io/solarflow/) or run locally with the quickstart below.

## Tech stack

- [SvelteKit](https://kit.svelte.dev/) with `@sveltejs/adapter-static` (TypeScript, strict)
- [Vite](https://vitejs.dev/) for bundling
- [`suncalc`](https://github.com/mourner/suncalc) for sunrise/sunset/altitude/azimuth
- [`@photostructure/tz-lookup`](https://github.com/photostructure/tz-lookup) for IANA timezone from lat/lng (lazy-loaded)
- [`uplot`](https://github.com/leeoniya/uPlot) for time-series charts
- Hand-rolled SVG (via Svelte components) for the bespoke clocks/timeline/sun-arc
- [Nominatim](https://nominatim.org/) for free-form geocoding (browser → OSM directly)
- [Vitest](https://vitest.dev/) for unit tests
- [pnpm](https://pnpm.io/) + [mise](https://mise.jdx.dev/) for tooling

## Quickstart

```bash
mise install                  # node + pnpm + gh
mise run install              # pnpm install
mise run dev                  # SvelteKit dev server
```

Common tasks (see [`.mise.toml`](.mise.toml)):

| Task                 | What it does                             |
| -------------------- | ---------------------------------------- |
| `mise run install`   | `pnpm install --frozen-lockfile`         |
| `mise run dev`       | SvelteKit dev server with HMR            |
| `mise run build`     | Build the static bundle into `build/`    |
| `mise run preview`   | Serve the built bundle locally           |
| `mise run fmt`       | Format with Prettier + ESLint            |
| `mise run fmt:check` | Check formatting without modifying       |
| `mise run lint`      | `svelte-check` (TS + Svelte diagnostics) |
| `mise run tests`     | Run Vitest                               |
| `mise run all`       | fmt:check + lint + tests + build         |

## Project structure

```
solarflow/
├── src/
│   ├── app.html                # SvelteKit HTML shell
│   ├── routes/                 # File-based routing
│   │   └── +page.svelte        # Main page
│   ├── lib/
│   │   ├── scaling.ts          # clock↔solar mapping (pure functions)
│   │   ├── sun.ts              # suncalc wrapper, sun events
│   │   ├── presets.ts          # Curated city list
│   │   ├── geocode.ts          # Nominatim adapter + localStorage cache
│   │   ├── stores/             # Svelte reactive stores (location, theme)
│   │   └── components/         # Svelte components
│   │       ├── LocationPicker.svelte
│   │       └── viz/            # 5 visualizations
│   └── tests/                  # Co-located Vitest specs
├── static/                     # Files served as-is (favicon, og:image, ...)
├── .github/workflows/          # GitHub Actions (Pages deploy)
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .mise.toml
└── AGENTS.md
```

## Deployment

The site is a static SvelteKit build deployed to GitHub Pages at `/solarflow` on push to `main`. CI installs dependencies with pnpm, runs `BASE_PATH=/solarflow pnpm build`, and publishes the `build/` artifact via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Enable **Settings → Pages → Build and deployment → GitHub Actions** on the repo before the first deploy.

To preview the production base path locally:

```bash
BASE_PATH=/solarflow pnpm build && BASE_PATH=/solarflow pnpm preview
```

Then open `http://localhost:4173/solarflow/`.

## Glossary

- **Clock time** — the standard 24-hour clock; identical regardless of season or latitude.
- **Solar time** — a non-linear clock for a given location and date, where actual sunrise maps to `06:00` and actual sunset to `18:00`; daytime hours and nighttime hours are independently stretched or compressed so that the same scaled hour always represents the same fraction of available daylight.
- **Solar noon** — the moment the sun is highest in the sky; always maps to solar `12:00`.
- **Clock→solar / solar→clock** — the two directions of the mapping. The forward direction answers "what is the solar time right now?"; the inverse answers questions like "what clock time is solar 09:00?"

## License

MIT.
