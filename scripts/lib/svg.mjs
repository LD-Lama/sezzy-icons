// Shared naming/SVGO logic used by scripts/generate.mjs (React components)
// and scripts/generate-preview.mjs (the hosted catalog page).
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";

// Figma's background-blur export wraps a <div> in a <foreignObject> as a
// browser fallback for backdrop-filter. It carries no visible content of its
// own (the real shapes render from sibling elements) and React/TS reject the
// bare `xmlns` attribute on the div, so it's stripped rather than special-cased.
const removeForeignObject = {
  name: "removeForeignObject",
  fn: () => ({
    element: {
      enter: (node, parentNode) => {
        if (node.name === "foreignObject" && "children" in parentNode) {
          parentNode.children = parentNode.children.filter((child) => child !== node);
        }
      },
    },
  }),
};

export const svgoConfig = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // Several source SVGs rely on the viewBox for correct scaling; keep it.
          removeViewBox: false,
        },
      },
    },
    removeForeignObject,
  ],
};

export function toPascalCase(name) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** "icons" -> "Icon", "illustrations" -> "Illustration", "logo" -> "Logo". */
export function singularPascalCase(name) {
  const pascal = toPascalCase(name);
  return pascal.endsWith("s") ? pascal.slice(0, -1) : pascal;
}

function walkSvgFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...walkSvgFiles(fullPath));
    } else if (extname(entry) === ".svg") {
      results.push(fullPath);
    }
  }
  return results;
}

function componentNameFor(sourceDir, filePath) {
  const relPath = relative(sourceDir, filePath);
  const folder = dirname(relPath);
  const base = toPascalCase(basename(relPath, ".svg"));
  if (folder === ".") return base;
  const prefix = toPascalCase(folder);
  return `${prefix}${base}`;
}

/** Returns [{ filePath, componentName, svgCode }] for every SVG under sourceDir, sorted by name. */
export function readSvgFiles(sourceDir) {
  const files = walkSvgFiles(sourceDir);
  const seen = new Map();
  const items = [];

  for (const filePath of files) {
    const componentName = componentNameFor(sourceDir, filePath);
    if (seen.has(componentName)) {
      throw new Error(
        `Duplicate component name "${componentName}" from "${filePath}" and "${seen.get(componentName)}". Rename one of the source SVGs.`
      );
    }
    seen.set(componentName, filePath);
    items.push({ filePath, componentName, svgCode: readFileSync(filePath, "utf8") });
  }

  items.sort((a, b) => a.componentName.localeCompare(b.componentName));
  return items;
}

/** Every immediate subdirectory of assetsDir is an asset category (e.g. "icons", "illustrations"). */
export function discoverCategories(assetsDir) {
  return readdirSync(assetsDir)
    .filter((entry) => statSync(join(assetsDir, entry)).isDirectory())
    .sort()
    .map((folderName) => ({
      folderName,
      dir: join(assetsDir, folderName),
      componentName: `Sezzy${singularPascalCase(folderName)}`,
      typeName: `${singularPascalCase(folderName)}Name`,
    }));
}
