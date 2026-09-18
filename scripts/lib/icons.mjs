// Shared naming/SVGO logic used by both scripts/generate-icons.mjs
// (React components) and scripts/generate-preview.mjs (icon catalog page).
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

/** Returns [{ filePath, componentName, svgCode }] for every icon under sourceDir, sorted by name. */
export function readIcons(sourceDir) {
  const files = walkSvgFiles(sourceDir);
  const seen = new Map();
  const icons = [];

  for (const filePath of files) {
    const componentName = componentNameFor(sourceDir, filePath);
    if (seen.has(componentName)) {
      throw new Error(
        `Duplicate icon component name "${componentName}" from "${filePath}" and "${seen.get(componentName)}". Rename one of the source SVGs.`
      );
    }
    seen.set(componentName, filePath);
    icons.push({ filePath, componentName, svgCode: readFileSync(filePath, "utf8") });
  }

  icons.sort((a, b) => a.componentName.localeCompare(b.componentName));
  return icons;
}
