// Figma loads `ui` as a single static HTML file with no relative resource
// loading, so the bundled UI script is inlined directly into dist/ui.html
// rather than referenced via <script src>.
import { build, context } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, "dist");
const watch = process.argv.includes("--watch");

mkdirSync(distDir, { recursive: true });

function inlineUi(uiJs) {
  const template = readFileSync(join(root, "src/ui.html"), "utf8");
  const html = template.replace("<script></script>", `<script>${uiJs}</script>`);
  writeFileSync(join(distDir, "ui.html"), html);
}

const codeOptions = {
  entryPoints: [join(root, "src/code.ts")],
  outfile: join(distDir, "code.js"),
  bundle: true,
  target: "es2017",
  format: "iife",
};

const uiOptions = {
  entryPoints: [join(root, "src/ui.ts")],
  bundle: true,
  target: "es2017",
  format: "iife",
  write: false,
};

async function buildOnce() {
  await build(codeOptions);
  const result = await build(uiOptions);
  inlineUi(result.outputFiles[0].text);
  console.log("Built figma-plugin/dist/{code.js,ui.html}");
}

if (watch) {
  const codeCtx = await context({ ...codeOptions, plugins: [{ name: "log", setup: (b) => b.onEnd(() => console.log("code.js rebuilt")) }] });
  const uiCtx = await context({
    ...uiOptions,
    plugins: [
      {
        name: "inline",
        setup: (b) =>
          b.onEnd((result) => {
            if (result.outputFiles?.[0]) inlineUi(result.outputFiles[0].text);
            console.log("ui.html rebuilt");
          }),
      },
    ],
  });
  await Promise.all([codeCtx.watch(), uiCtx.watch()]);
  console.log("Watching for changes…");
} else {
  await buildOnce();
}
