// Mirrors the naming rules in scripts/lib/svg.mjs (toPascalCase) so a name
// typed here matches the component name the repo's generator will produce.
// Keep these two in sync if the generator's rules ever change.

export function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Figma layer name -> suggested SVG file base name (no extension). */
export function suggestFileName(layerName: string): string {
  return toPascalCase(layerName) || "Untitled";
}

/** "assets/illustrations" -> "illustrations", also strips a trailing slash. */
export function folderNameFromCategoryPath(categoryPath: string): string {
  const trimmed = categoryPath.replace(/^\/+|\/+$/g, "");
  const segments = trimmed.split("/");
  return segments[segments.length - 1] ?? trimmed;
}
