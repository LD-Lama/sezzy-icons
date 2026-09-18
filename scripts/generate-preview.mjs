// Builds preview/index.html — a static, self-contained catalog of every
// asset under assets/ (one tab per category), for browsing and copying
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

  const tabs = [];
  const panels = [];

  categories.forEach((category, index) => {
    const items = readSvgFiles(category.dir);
    totalCount += items.length;
    const isActive = index === 0;

    tabs.push(
      `<button class="tab${isActive ? " active" : ""}" data-tab="${category.folderName}" role="tab" aria-selected="${isActive}">${escapeHtml(category.componentName)} <span class="tab__count">${items.length}</span></button>`
    );

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

    panels.push(`<section class="panel" data-panel="${category.folderName}"${isActive ? "" : " hidden"}>
  <div class="grid">
${cards}
  </div>
  <p class="empty" hidden>No assets match your search.</p>
</section>`);
  });

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
  nav.tabs { position: sticky; top: 57px; background: #f6f6f7; display: flex; gap: 4px; padding: 12px 24px 0; border-bottom: 1px solid #e2e2e2; z-index: 1; }
  .tab { border: 1px solid transparent; border-bottom: none; background: transparent; padding: 8px 14px; border-radius: 8px 8px 0 0; cursor: pointer; font: inherit; font-size: 13px; color: #555; }
  .tab:hover { color: #1a1a1a; }
  .tab.active { background: #fff; border-color: #e2e2e2; color: #1a1a1a; font-weight: 600; position: relative; top: 1px; }
  .tab__count { color: #888; font-weight: normal; }
  .tab.active .tab__count { color: #999; }
  main { padding: 20px 24px 60px; }
  .panel[hidden] { display: none; }
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
<nav class="tabs" id="tabs" role="tablist">
${tabs.join("\n")}
</nav>
<main id="main">
${panels.join("\n")}
</main>
<script>
  const tabsNav = document.getElementById("tabs");
  const main = document.getElementById("main");
  const tabs = Array.from(tabsNav.querySelectorAll(".tab"));
  const panels = Array.from(main.querySelectorAll(".panel"));

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

  main.querySelectorAll(".icon-card").forEach((card) => {
    card.addEventListener("click", () => {
      copyText(card.dataset.copy).then(() => {
        card.classList.add("copied");
        setTimeout(() => card.classList.remove("copied"), 1200);
      });
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab.dataset.tab;
      });
    });
  });

  function applySearch(query) {
    panels.forEach((panel) => {
      let visible = 0;
      panel.querySelectorAll(".icon-card").forEach((card) => {
        const matches = card.dataset.search.includes(query);
        card.style.display = matches ? "" : "none";
        if (matches) visible++;
      });
      panel.querySelector(".empty").hidden = visible !== 0;
    });
  }

  document.getElementById("search").addEventListener("input", (e) => {
    applySearch(e.target.value.trim().toLowerCase());
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
