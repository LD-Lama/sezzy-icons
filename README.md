# sezzy-icons

Sezzy's icon and illustration assets, rendered via `Sezzy<Category>` React components (e.g. `SezzyIcon`, `SezzyIllustration`), published as [`@voartechs/sezzy-icons`](https://www.npmjs.com/package/@voartechs/sezzy-icons) on the public npm registry (no registry auth needed to install).

**[Browse all assets →](https://voartechs.github.io/sezzy-icons/)** — hosted catalog of everything in `assets/`, grouped by category; click one to copy its ready-to-paste usage. Also linked as the package's `homepage` on npm.

## Install

```bash
npm install @voartechs/sezzy-icons
```

## Usage

Every asset renders through its category's component by name — there's no per-asset import, so consumer code stays consistent:

```tsx
import { SezzyIcon, SezzyIllustration } from "@voartechs/sezzy-icons";

<SezzyIcon name="TickIcon" width={20} height={20} />
<SezzyIllustration name="BogCycle" width={400} />
```

`name` accepts any string (autocomplete still suggests known names via the exported `IconName`/`IllustrationName` types) — an unknown name renders nothing rather than throwing. This also means a whole category ships in any bundle that imports its component (no per-asset tree-shaking); with this many small assets that's a deliberate, acceptable trade-off for a single consistent API.

Every component forwards standard SVG props (`width`, `height`, `className`, `style`, etc.) onto the root `<svg>` element. Most icons use `stroke="currentcolor"`/`fill="currentcolor"`, so `color` (via CSS `color` or an inline style) controls their color — illustrations are typically multi-color and don't respond to `color`.

## Categories

Every immediate subfolder of `assets/` is its own category, auto-discovered at generate time — **no code change needed to add a new one**:

- `assets/icons/` → `SezzyIcon` component, `IconName` type. Small, usually single-color, recolorable glyphs (nested folders become a name prefix, e.g. `icons/mvt/Cross.svg` → `MvtCross`).
- `assets/illustrations/` → `SezzyIllustration` component, `IllustrationName` type. Larger, usually multi-color graphics (e.g. process diagrams) that aren't meant to be recolored.

Adding `assets/<anything-new>/*.svg` automatically produces a `Sezzy<Anything>` component the next time `npm run generate` runs (folder name is singularized and PascalCased: `assets/badges/` → `SezzyBadge`).

## Repo layout

- `assets/` — **source of truth.** One folder per category (see above), raw SVGs inside. The only thing that needs to be committed to add/update an asset.
- `src/` — **entirely generated** (`npm run generate`), gitignored like `dist/` — CI and `npm run build` always regenerate it fresh from `assets/`, so it can never drift out of sync with a PR that only touches raw SVGs. Don't hand-edit anything under `src/`.
- `scripts/lib/svg.mjs` — shared naming/SVGO/category-discovery logic used by both generators below.
- `scripts/generate.mjs` — turns `assets/<category>/*.svg` into `src/<category>/*.tsx` + `src/Sezzy<Category>.tsx` + `src/index.ts` (SVGR).
- `scripts/generate-preview.mjs` — turns `assets/**/*.svg` into `preview/index.html`, the source for the [hosted catalog](https://voartechs.github.io/sezzy-icons/). `.github/workflows/pages.yml` runs it and deploys `preview/` to GitHub Pages on every push to `main`.

## Adding or updating assets

1. Drop the new/updated `.svg` file into the right category folder under `assets/` (or create a brand-new category folder — see above).
2. Run `npm run generate` and `npm run typecheck` locally to confirm it compiles cleanly (optional — CI does this on every PR anyway).
3. Commit and open a PR with just the source SVG(s). Nothing else needs regenerating/committing by hand.

## For designers: publishing from Figma

Use the [Push My Icons](https://www.figma.com/community/plugin/1500058387867124676/push-my-icons) Figma plugin ([source](https://github.com/aken-you/push-my-icons)) to open a PR straight from Figma — no git required:

1. Select the frames containing your SVG components.
2. In the plugin, connect it to `VoarTechs/sezzy-icons` with a GitHub personal access token you generate yourself — use a **fine-grained PAT scoped only to this repo** (permissions: Contents read/write, Metadata read, Pull requests read/write), not an org-wide classic token.
3. Set the target folder to the right category under `assets/` — e.g. `assets/icons` for small recolorable glyphs, `assets/illustrations` for larger multi-color graphics. **Need a new category** (something that's neither an icon nor an illustration)? Just type a new folder path, e.g. `assets/banners` — pushing to it creates the folder, and the next merge automatically gets you a `SezzyBanner` component. No developer needs to be involved.
4. Click **Push** — the plugin opens a PR with the added/changed/removed SVGs. CI (`generate` + `typecheck` + `build`) runs automatically; a naming collision or invalid SVG fails the PR before it can be merged.
5. Once merged, the [hosted preview](https://voartechs.github.io/sezzy-icons/) and the next npm publish both pick up the change automatically.

## Releasing

Bump `version` in `package.json`, cut a GitHub Release from `main`, and the `Publish` workflow builds and publishes to npm (needs an `NPM_TOKEN` repo secret with publish rights to the `@voartechs` org).
