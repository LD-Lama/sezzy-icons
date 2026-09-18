// Builds preview/index.html — a static, self-contained catalog of every
// asset under assets/ (one section per category), for browsing and copying
// ready-to-paste usage. Run via `npm run preview`.
import { optimize } from "svgo";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { svgoConfig, readSvgFiles, discoverCategories } from "./lib/svg.mjs";

const rootDir = dirname(fileURLToPath(import.meta.url)) + "/..";
const assetsDir = join(rootDir, "assets");
const outDir = join(rootDir, "preview");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function main() {
  const categories = discoverCategories(assetsDir);
  let totalCount = 0;

  const sections = categories
    .map((category) => {
      const items = readSvgFiles(category.dir);
      totalCount += items.length;

      const cards = items
        .map(({ componentName, svgCode }) => {
          const { data: optimized } = optimize(svgCode, { ...svgoConfig, path: componentName });
          const safeName = escapeHtml(componentName);
          const snippet = `<${category.componentName} name="${safeName}" />`;
          const safeSnippet = escapeHtml(snippet);
          return `<button class="icon-card" data-search="${safeName.toLowerCase()}" data-copy="${safeSnippet}" title="Click to copy ${safeSnippet}">
  <span class="icon-card__glyph">${optimized}</span>
  <span class="icon-card__name">${safeName}</span>
</button>`;
        })
        .join("\n");

      return `<section class="category" data-category>
  <h2>${escapeHtml(category.componentName)} <span class="category__count">${items.length}</span></h2>
  <div class="grid">
${cards}
  </div>
</section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>sezzy-icons preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #f6f6f7; color: #1a1a1a; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e2e2e2; padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; z-index: 1; }
  header h1 { font-size: 16px; margin: 0; white-space: nowrap; }
  header .count { color: #666; font-size: 13px; white-space: nowrap; }
  input#search { flex: 1; min-width: 200px; max-width: 360px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
  main { padding: 8px 24px 60px; }
  section.category { margin-top: 24px; }
  section.category h2 { font-size: 14px; color: #333; display: flex; align-items: baseline; gap: 8px; }
  .category__count { font-size: 12px; color: #888; font-weight: normal; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  .icon-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; cursor: pointer; font: inherit; color: inherit; }
  .icon-card:hover { border-color: #999; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .icon-card.copied { border-color: #2e7d32; background: #eefbef; }
  .icon-card__glyph { display: flex; align-items: center; justify-content: center; height: 40px; color: #333; }
  .icon-card__glyph svg { height: 100%; width: auto; max-width: 140px; }
  .icon-card__name { font-size: 11px; text-align: center; word-break: break-word; color: #444; }
  .icon-card.copied .icon-card__name::after { content: " ✓ copied"; color: #2e7d32; }
  .empty { color: #777; padding: 40px; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>sezzy-icons</h1>
  <span class="count">${totalCount} assets across ${categories.length} categories — click one to copy its usage snippet</span>
  <input id="search" type="search" placeholder="Search…" autofocus />
</header>
<main id="main">
${sections}
  <p class="empty" id="empty" hidden>No assets match your search.</p>
</main>
<script>
  const main = document.getElementById("main");
  const empty = document.getElementById("empty");
  const cards = Array.from(main.querySelectorAll(".icon-card"));
  const sections = Array.from(main.querySelectorAll("[data-category]"));

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      copyText(card.dataset.copy).then(() => {
        card.classList.add("copied");
        setTimeout(() => card.classList.remove("copied"), 1200);
      });
    });
  });

  document.getElementById("search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    let visibleCount = 0;
    sections.forEach((section) => {
      let sectionVisible = 0;
      section.querySelectorAll(".icon-card").forEach((card) => {
        const matches = card.dataset.search.includes(query);
        card.style.display = matches ? "" : "none";
        if (matches) sectionVisible++;
      });
      section.style.display = sectionVisible === 0 ? "none" : "";
      visibleCount += sectionVisible;
    });
    empty.hidden = visibleCount !== 0;
  });
</script>
</body>
</html>
`;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  console.log(`Generated preview for ${totalCount} assets across ${categories.length} categories at preview/index.html`);
}

main();
