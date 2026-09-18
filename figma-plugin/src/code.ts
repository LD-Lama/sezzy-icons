import { suggestFileName } from "./naming";
import type { PluginToUiMessage, UiToPluginMessage, SelectionItem } from "./messages";

const STORAGE_KEYS = {
  owner: "sezzy-icons.owner",
  repo: "sezzy-icons.repo",
  token: "sezzy-icons.token",
} as const;

const DEFAULT_OWNER = "LD-Lama";
const DEFAULT_REPO = "sezzy-icons";

figma.showUI(__html__, { width: 420, height: 560 });

function post(message: PluginToUiMessage) {
  figma.ui.postMessage(message);
}

/** A node is exportable if it can render its own standalone SVG. */
function isExportable(node: SceneNode): boolean {
  return "exportAsync" in node;
}

function currentSelectionItems(): SelectionItem[] {
  return figma.currentPage.selection.filter(isExportable).map((node) => ({
    id: node.id,
    layerName: node.name,
    suggestedFileName: suggestFileName(node.name),
  }));
}

function postSelection() {
  post({ type: "selection", items: currentSelectionItems() });
}

async function postSettings() {
  const [owner, repo, token] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.owner),
    figma.clientStorage.getAsync(STORAGE_KEYS.repo),
    figma.clientStorage.getAsync(STORAGE_KEYS.token),
  ]);
  post({
    type: "settings",
    owner: owner ?? DEFAULT_OWNER,
    repo: repo ?? DEFAULT_REPO,
    token: token ?? null,
  });
}

figma.on("selectionchange", postSelection);

figma.ui.onmessage = async (msg: UiToPluginMessage) => {
  switch (msg.type) {
    case "ui-ready": {
      postSelection();
      await postSettings();
      break;
    }

    case "save-settings": {
      await Promise.all([
        figma.clientStorage.setAsync(STORAGE_KEYS.owner, msg.owner),
        figma.clientStorage.setAsync(STORAGE_KEYS.repo, msg.repo),
        figma.clientStorage.setAsync(STORAGE_KEYS.token, msg.token),
      ]);
      break;
    }

    case "request-export": {
      try {
        const items = [];
        for (const request of msg.items) {
          const node =
            figma.currentPage.selection.find((n) => n.id === request.id) ??
            ((await figma.getNodeByIdAsync(request.id)) as SceneNode | null);
          if (!node || !isExportable(node)) continue;

          const bytes = await (node as SceneNode & ExportMixin).exportAsync({
            format: "SVG",
            svgOutlineText: true,
            svgIdAttribute: false,
            svgSimplifyStroke: true,
          });
          let svg = utf8BytesToString(bytes);

          if (request.recolorToCurrentColor) {
            svg = recolorToCurrentColor(svg);
          }

          items.push({ id: request.id, fileName: request.fileName, svg });
        }
        post({ type: "export-result", items });
      } catch (err) {
        post({ type: "export-error", message: err instanceof Error ? err.message : String(err) });
      }
      break;
    }

    case "notify": {
      figma.notify(msg.message, { error: msg.error });
      break;
    }

    case "resize": {
      figma.ui.resize(msg.width, msg.height);
      break;
    }

    case "close": {
      figma.closePlugin();
      break;
    }
  }
};

/**
 * Most single-color icons in assets/icons use fill/stroke="currentColor" so
 * a developer importing the package can override the color at use-site (CSS
 * `color`, or a `color`/style prop) instead of it being baked in from
 * whatever swatch was picked in Figma. Figma always exports a literal color,
 * so for icon-style exports (the per-layer checkbox) every concrete
 * fill/stroke value is swapped for currentColor — regardless of which color
 * it was — rather than only matching black and leaving other colors baked in.
 * "none"/"transparent" and gradient/pattern refs (url(#...)) are left alone
 * since they're deliberate, not a color to override.
 */
function recolorToCurrentColor(svg: string): string {
  return svg.replace(/(fill|stroke)="([^"]+)"/gi, (match, attr: string, value: string) => {
    const v = value.trim().toLowerCase();
    if (v === "none" || v === "transparent" || v === "currentcolor" || v.startsWith("url(")) return match;
    return `${attr}="currentColor"`;
  });
}

/**
 * `exportAsync` returns UTF-8 bytes, but the plugin main thread (unlike the
 * UI iframe) has no `TextDecoder`/`TextEncoder` global — this sandbox only
 * exposes the Figma API plus a bare JS runtime. Decode manually instead.
 */
function utf8BytesToString(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc2 && byte1 < 0xe0) {
      const byte2 = bytes[i++] & 0x3f;
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
    } else if (byte1 >= 0xe0 && byte1 < 0xf0) {
      const byte2 = bytes[i++] & 0x3f;
      const byte3 = bytes[i++] & 0x3f;
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3);
    } else if (byte1 >= 0xf0 && byte1 < 0xf5) {
      const byte2 = bytes[i++] & 0x3f;
      const byte3 = bytes[i++] & 0x3f;
      const byte4 = bytes[i++] & 0x3f;
      const codepoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
      const surrogate = codepoint - 0x10000;
      result += String.fromCharCode(0xd800 + (surrogate >> 10), 0xdc00 + (surrogate & 0x3ff));
    } else {
      // Invalid leading byte — skip it rather than corrupting the rest of the decode.
    }
  }
  return result;
}
