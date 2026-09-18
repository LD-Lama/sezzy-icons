# sezzy-icons

Sezzy's icon set as tree-shakeable React components, published as [`@voartechs/sezzy-icons`](https://www.npmjs.com/package/@voartechs/sezzy-icons) on the public npm registry (no registry auth needed to install).

## Install

```bash
npm install @voartechs/sezzy-icons
```

## Usage

Import the icon you need directly — this tree-shakes cleanly:

```tsx
import { TickIcon, CrossIcon } from "@voartechs/sezzy-icons";

<TickIcon width={16} height={16} color="green" />
```

Or resolve an icon dynamically by name (e.g. when the icon comes from config/data):

```tsx
import { SezzyIcon, type IconName } from "@voartechs/sezzy-icons";

<SezzyIcon name={iconName as IconName} width={20} height={20} />
```

Every icon forwards standard SVG props (`width`, `height`, `className`, `style`, etc.) onto the root `<svg>` element. Most icons use `stroke="currentcolor"`/`fill="currentcolor"`, so `color` (via CSS `color` or an inline style) controls their color.

## Repo layout

- `icons/` — **source of truth.** Raw SVG files, one per icon (nested folders become a name prefix, e.g. `icons/mvt/Cross.svg` → `MvtCross`).
- `src/icons/` — generated React components + barrel (`npm run generate`). Do not hand-edit; regenerate instead.
- `src/SezzyIcon.tsx`, `src/index.ts` — hand-written, stable entry points.
- `scripts/generate-icons.mjs` — SVGO + SVGR pipeline that turns `icons/*.svg` into `src/icons/*.tsx`.

## Adding or updating icons

1. Drop the new/updated `.svg` file into `icons/` (or a subfolder).
2. Run `npm run generate` and `npm run typecheck` to confirm it compiles cleanly.
3. Commit both the source SVG and the regenerated `src/icons/` output.

A Figma-export pipeline (so a UI engineer can push icons from Figma straight into this repo) is planned as a follow-up — this manual flow is the interim path.

## Releasing

Bump `version` in `package.json`, cut a GitHub Release from `main`, and the `Publish` workflow builds and publishes to npm (needs an `NPM_TOKEN` repo secret with publish rights to the `@voartechs` org).
