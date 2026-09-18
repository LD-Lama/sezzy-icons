# Sezzy Icons → GitHub (Figma plugin)

A small internal Figma plugin: select one or more frames/components, pick (or
type) a target category under `assets/`, and push straight to a PR against
`LD-Lama/sezzy-icons` — no git required. Once CI passes, the PR merges itself.

It's purpose-built for this repo's conventions instead of being a generic
"push to GitHub" tool:

- File names are suggested from the Figma layer name using the same
  PascalCase rule `scripts/lib/svg.mjs` uses to derive component names (see
  `src/naming.ts` — keep the two in sync if that rule ever changes).
- Categories are read live from `assets/*` in the repo (via the GitHub
  contents API), with a free-text field to create a brand-new category —
  matching the "no developer needs to be involved" model described in the
  root `README.md`.
- Exports that look like single-color icons can have every fill/stroke color
  they used in Figma swapped for `currentColor` automatically (toggle per
  layer, on by default) — so a developer importing the package can override
  the color via CSS `color` regardless of what swatch was picked in Figma,
  matching how `assets/icons/*.svg` are typically authored. `none`,
  `transparent`, and gradient/pattern fills are left untouched since those
  are deliberate.
- Warns (but doesn't block) on a file name that already exists in the target
  category, since overwriting is sometimes intentional (updating an icon).

This plugin never pushes to `main` directly — it opens a PR and flags it for
GitHub's native auto-merge. `main` requires the repo's CI check
(`generate` + `typecheck` + `build`) to pass before anything can merge, so a
naming collision or invalid SVG blocks the merge automatically instead of
landing on `main`; a passing PR merges itself with no one needing to click
"merge" by hand.

## Setup (one-time, per designer)

1. Generate a GitHub **fine-grained personal access token**, scoped only to
   `LD-Lama/sezzy-icons`, with **Contents: read/write** and
   **Pull requests: read/write** permissions. Do not use a classic/org-wide
   token.
2. In Figma desktop: **Plugins → Development → Import plugin from manifest…**
   and select `figma-plugin/manifest.json` from a local clone of this repo.
3. Run the plugin — it opens straight to the connection screen the first
   time. Paste the token in (plus owner/repo if different from the
   defaults) and hit **Save & continue**. It's saved locally via Figma's
   `clientStorage` — never sent anywhere except `api.github.com`. Use the
   **Edit config** link (top of the main screen) to change it later.

### "403: Resource not accessible by personal access token"

1. Confirm the token's "Repository access" explicitly includes
   `sezzy-icons`.
2. Confirm it has **Contents: Read and write** and
   **Pull requests: Read and write** permissions (not just Metadata/read).
3. If this repo ever moves under an org again: fine-grained PATs against org
   repos often need an **org owner to approve them** first, even when
   permissions/repo access look correct — check
   `github.com/organizations/<org>/settings/personal-access-tokens` for a
   pending/denied request.

## Using it

1. Select the frame(s)/component(s) to export.
2. Pick the target category (or type a new one).
3. Adjust the suggested file name per layer if needed.
4. Click **Push to GitHub** — this opens a PR adding/updating those SVGs
   under `assets/<category>/`.

## Developing the plugin

```bash
cd figma-plugin
npm install
npm run build     # bundles src/ into dist/code.js + dist/ui.html
npm run watch      # rebuild on save, for local iteration
npm run typecheck
```

`manifest.json` points at `dist/`, so re-import the plugin (or just re-run
the build with the Figma dev console open) after changes.
