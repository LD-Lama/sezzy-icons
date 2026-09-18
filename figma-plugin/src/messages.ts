// Message contract between the plugin's main thread (code.ts, has Figma API
// access) and the UI iframe (ui.ts, has DOM/fetch access). Figma's plugin
// sandbox has no shared memory, so everything crosses this postMessage bridge.

export interface SelectionItem {
  id: string;
  layerName: string;
  suggestedFileName: string;
}

export interface ExportedItem {
  id: string;
  fileName: string;
  svg: string;
}

export type PluginToUiMessage =
  | { type: "selection"; items: SelectionItem[] }
  | { type: "settings"; owner: string; repo: string; token: string | null }
  | { type: "export-result"; items: ExportedItem[] }
  | { type: "export-error"; message: string };

export type UiToPluginMessage =
  | { type: "ui-ready" }
  | { type: "save-settings"; owner: string; repo: string; token: string }
  | { type: "request-export"; items: { id: string; fileName: string; recolorToCurrentColor: boolean }[] }
  | { type: "notify"; message: string; error?: boolean }
  | { type: "resize"; width: number; height: number }
  | { type: "close" };
