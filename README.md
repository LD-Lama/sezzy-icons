# sezzy-icons

Sezzy's icon set, rendered via the `SezzyIcon` React component, published as [`@voartechs/sezzy-icons`](https://www.npmjs.com/package/@voartechs/sezzy-icons) on the public npm registry (no registry auth needed to install).

**[Browse all icons →](https://voartechs.github.io/sezzy-icons/)** — hosted catalog of every icon; click one to copy its name for `SezzyIcon`. Also linked as the package's `homepage` on npm.

## Install

```bash
npm install @voartechs/sezzy-icons
```

## Usage

Every icon renders through `SezzyIcon` by name — there's no per-icon import, so consumer code stays consistent:

```tsx
import { SezzyIcon } from "@voartechs/sezzy-icons";

<SezzyIcon name="TickIcon" width={20} height={20} />
```

`name` accepts any string (autocomplete still suggests known icon names via the exported `IconName` type) — an unknown name renders nothing rather than throwing. This also means the whole icon set ships in any bundle that imports `SezzyIcon` (no per-icon tree-shaking); with 152 small icons that's a deliberate, acceptable trade-off for a single consistent API.

`SezzyIcon` forwards standard SVG props (`width`, `height`, `className`, `style`, etc.) onto the root `<svg>` element. Most icons use `stroke="currentcolor"`/`fill="currentcolor"`, so `color` (via CSS `color` or an inline style) controls their color.

## Repo layout

- `icons/` — **source of truth.** Raw SVG files, one per icon (nested folders become a name prefix, e.g. `icons/mvt/Cross.svg` → `MvtCross`).
- `src/icons/` — generated React components + barrel (`npm run generate`). Do not hand-edit; regenerate instead.
- `src/SezzyIcon.tsx`, `src/index.ts` — hand-written, stable entry points.
- `scripts/lib/icons.mjs` — shared naming/SVGO logic used by both generators below.
- `scripts/generate-icons.mjs` — turns `icons/*.svg` into `src/icons/*.tsx` (SVGR).
- `scripts/generate-preview.mjs` — turns `icons/*.svg` into `preview/index.html`, the source for the [hosted catalog](https://voartechs.github.io/sezzy-icons/). `.github/workflows/pages.yml` runs it and deploys `preview/` to GitHub Pages on every push to `main`.

## Adding or updating icons

1. Drop the new/updated `.svg` file into `icons/` (or a subfolder).
2. Run `npm run generate` and `npm run typecheck` to confirm it compiles cleanly.
3. Commit both the source SVG and the regenerated `src/icons/` output.

A Figma-export pipeline (so a UI engineer can push icons from Figma straight into this repo) is planned as a follow-up — this manual flow is the interim path.

## Releasing

Bump `version` in `package.json`, cut a GitHub Release from `main`, and the `Publish` workflow builds and publishes to npm (needs an `NPM_TOKEN` repo secret with publish rights to the `@voartechs` org).
