import type { PluginToUiMessage, SelectionItem, UiToPluginMessage } from "./messages";
import { folderNameFromCategoryPath } from "./naming";
import { GitHubError, listCategories, listFolder, pushFilesAsPullRequest } from "./github";

function send(message: UiToPluginMessage) {
  parent.postMessage({ pluginMessage: message }, "*");
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const setupView = $<HTMLDivElement>("setupView");
const mainView = $<HTMLDivElement>("mainView");
const itemsEl = $<HTMLDivElement>("items");
const categorySelect = $<HTMLSelectElement>("category");
const newCategoryInput = $<HTMLInputElement>("newCategory");
const ownerInput = $<HTMLInputElement>("owner");
const repoInput = $<HTMLInputElement>("repo");
const tokenInput = $<HTMLInputElement>("token");
const saveSettingsBtn = $<HTMLButtonElement>("saveSettings");
const cancelSetupBtn = $<HTMLButtonElement>("cancelSetup");
const editConfigBtn = $<HTMLButtonElement>("editConfig");
const repoLabel = $<HTMLSpanElement>("repoLabel");
const prTitleInput = $<HTMLInputElement>("prTitle");
const pushBtn = $<HTMLButtonElement>("push");
const logEl = $<HTMLDivElement>("log");
const clearLogBtn = $<HTMLButtonElement>("clearLog");

let selection: SelectionItem[] = [];
let fileNameOverrides = new Map<string, string>();
let recolorFlags = new Map<string, boolean>();
let token = "";
let configured = false; // whether valid settings were saved before this session's edits
let lastSaved = { owner: "", repo: "", token: "" };

function showSetup() {
  setupView.hidden = false;
  mainView.hidden = true;
  cancelSetupBtn.hidden = !configured;
}

function showMain() {
  setupView.hidden = true;
  mainView.hidden = false;
  repoLabel.textContent = `${ownerInput.value.trim()}/${repoInput.value.trim()}`;
  repoLabel.title = repoLabel.textContent;
}

function log(message: string, isWarning = false) {
  const line = document.createElement("div");
  if (isWarning) line.className = "warning";
  line.textContent = message;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  clearLogBtn.hidden = false;
}

clearLogBtn.addEventListener("click", () => {
  logEl.innerHTML = "";
  clearLogBtn.hidden = true;
});

function renderSelection() {
  itemsEl.innerHTML = "";
  if (selection.length === 0) {
    itemsEl.innerHTML = `<div class="empty">Select one or more frames/components in Figma.</div>`;
    return;
  }
  for (const item of selection) {
    const row = document.createElement("div");
    row.className = "item";

    const layerLabel = document.createElement("span");
    layerLabel.className = "layer-name";
    layerLabel.title = item.layerName;
    layerLabel.textContent = item.layerName;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = fileNameOverrides.get(item.id) ?? item.suggestedFileName;
    nameInput.addEventListener("input", () => fileNameOverrides.set(item.id, nameInput.value));

    const recolorLabel = document.createElement("label");
    recolorLabel.style.display = "flex";
    recolorLabel.style.alignItems = "center";
    recolorLabel.style.gap = "4px";
    recolorLabel.style.fontWeight = "normal";
    recolorLabel.style.flex = "0 0 auto";
    recolorLabel.title = "Make this a recolorable icon: swap its exported color(s) for currentColor so importers can override via CSS color";
    const recolorCheckbox = document.createElement("input");
    recolorCheckbox.type = "checkbox";
    recolorCheckbox.checked = recolorFlags.get(item.id) ?? true;
    recolorCheckbox.addEventListener("change", () => recolorFlags.set(item.id, recolorCheckbox.checked));
    recolorLabel.append(recolorCheckbox, document.createTextNode("⚡"));

    row.append(layerLabel, nameInput, recolorLabel);
    itemsEl.appendChild(row);
  }
  updatePrTitleDefault();
}

function updatePrTitleDefault() {
  if (prTitleInput.dataset.userEdited === "true") return;
  const n = selection.length;
  prTitleInput.value = n === 0 ? "" : `Add ${n} asset${n === 1 ? "" : "s"} from Figma`;
}
prTitleInput.addEventListener("input", () => {
  prTitleInput.dataset.userEdited = "true";
});

async function refreshCategories() {
  if (!token || !ownerInput.value || !repoInput.value) return;
  try {
    const categories = await listCategories(token, ownerInput.value.trim(), repoInput.value.trim());
    const previous = categorySelect.value;
    categorySelect.innerHTML = "";
    for (const c of categories) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    }
    if (categories.includes(previous)) categorySelect.value = previous;
  } catch (err) {
    log(`Couldn't load categories: ${err instanceof Error ? err.message : err}`, true);
  }
}

saveSettingsBtn.addEventListener("click", () => {
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  token = tokenInput.value.trim();
  if (!owner || !repo || !token) {
    return log("Owner, repo, and token are all required.", true);
  }
  send({ type: "save-settings", owner, repo, token });
  lastSaved = { owner, repo, token };
  configured = true;
  showMain();
  refreshCategories();
});

cancelSetupBtn.addEventListener("click", () => {
  ownerInput.value = lastSaved.owner;
  repoInput.value = lastSaved.repo;
  tokenInput.value = lastSaved.token;
  token = lastSaved.token;
  showMain();
});

editConfigBtn.addEventListener("click", () => {
  showSetup();
});

pushBtn.addEventListener("click", async () => {
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  const category = folderNameFromCategoryPath(newCategoryInput.value.trim() || categorySelect.value);

  if (!token || !owner || !repo) return log("Use “Edit config” to connect to GitHub first.", true);
  if (!category) return log("Pick or type a target category.", true);
  if (selection.length === 0) return log("Select at least one layer in Figma first.", true);

  const exportItems = selection.map((item) => ({
    id: item.id,
    fileName: fileNameOverrides.get(item.id) ?? item.suggestedFileName,
    recolorToCurrentColor: recolorFlags.get(item.id) ?? true,
  }));

  const names = exportItems.map((i) => i.fileName);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    return log(`Duplicate file names in this push: ${[...new Set(duplicates)].join(", ")}`, true);
  }

  pushBtn.disabled = true;
  try {
    log(`Exporting ${exportItems.length} layer(s) as SVG…`);
    const existing = await listFolder(token, owner, repo, `assets/${category}`).catch((): string[] => []);
    const collisions = names.filter((n) => existing.includes(`${n}.svg`));
    if (collisions.length > 0) {
      log(`Note: this will update existing file(s): ${collisions.join(", ")}`, true);
    }

    send({ type: "request-export", items: exportItems });
  } catch (err) {
    log(`Export failed: ${err instanceof Error ? err.message : err}`, true);
    pushBtn.disabled = false;
  }
});

window.onmessage = async (event: MessageEvent) => {
  const msg = event.data.pluginMessage as PluginToUiMessage | undefined;
  if (!msg) return;

  switch (msg.type) {
    case "selection": {
      selection = msg.items;
      renderSelection();
      break;
    }

    case "settings": {
      ownerInput.value = msg.owner;
      repoInput.value = msg.repo;
      if (msg.token) {
        token = msg.token;
        tokenInput.value = msg.token;
        lastSaved = { owner: msg.owner, repo: msg.repo, token: msg.token };
        configured = true;
        showMain();
        refreshCategories();
      } else {
        showSetup();
      }
      break;
    }

    case "export-result": {
      const owner = ownerInput.value.trim();
      const repo = repoInput.value.trim();
      const category = folderNameFromCategoryPath(newCategoryInput.value.trim() || categorySelect.value);
      const files = msg.items.map((item) => ({ path: `assets/${category}/${item.fileName}.svg`, content: item.svg }));

      try {
        log(`Opening a PR against ${owner}/${repo}…`);
        const title = prTitleInput.value || `Add ${files.length} asset(s) from Figma`;
        const body = [
          "Pushed from the Sezzy Icons Figma plugin.",
          "",
          "Files:",
          ...files.map((f) => `- \`${f.path}\``),
        ].join("\n");
        const result = await pushFilesAsPullRequest(token, owner, repo, files, title, body);
        log(`Done — opened ${result.prUrl}`);
        if (result.autoMergeEnabled) {
          log("Auto-merge enabled — it'll merge itself once CI passes.");
        } else {
          log(`Auto-merge not enabled (${result.autoMergeError}). Merge it manually once CI passes.`, true);
        }
        send({ type: "notify", message: `PR opened: ${result.prUrl}` });
      } catch (err) {
        const message = err instanceof GitHubError ? err.message : err instanceof Error ? err.message : String(err);
        log(`GitHub push failed: ${message}`, true);
        send({ type: "notify", message: "Push failed — see plugin log.", error: true });
      } finally {
        pushBtn.disabled = false;
      }
      break;
    }

    case "export-error": {
      log(`Export failed: ${msg.message}`, true);
      pushBtn.disabled = false;
      break;
    }
  }
};

send({ type: "ui-ready" });
