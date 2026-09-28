import {
  COMPACT_GROUP_TITLE,
  NO_GROUP,
  chooseRecord,
  filterSnapshot,
  groupDropPosition,
  safeFavicon,
  tabDropIndex,
  uniqueUrls,
  visibleGroupTitle,
} from "./model.js";

const SETTINGS_KEY = "folderRailSettingsV1";
const COLOR_MAP = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  green: "#22c55e",
  grey: "#7b8495",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#a855f7",
  red: "#ef4444",
  yellow: "#eab308",
};

const elements = {
  collapseAll: document.querySelector("#collapse-all"),
  closeRail: document.querySelector("#close-rail"),
  compact: document.querySelector("#compact"),
  empty: document.querySelector("#empty"),
  expandAll: document.querySelector("#expand-all"),
  groupColor: document.querySelector("#group-color"),
  groupDialog: document.querySelector("#group-dialog"),
  groupDialogDescription: document.querySelector("#group-dialog-description"),
  groupDialogTitle: document.querySelector("#group-dialog-title"),
  groupForm: document.querySelector("#group-form"),
  groupName: document.querySelector("#group-name"),
  folderTemplate: document.querySelector("#folder-template"),
  folders: document.querySelector("#folders"),
  looseCount: document.querySelector("#loose-count"),
  looseSection: document.querySelector(".loose-section"),
  looseTabs: document.querySelector("#loose-tabs"),
  looseToggle: document.querySelector("#loose-toggle"),
  newGroup: document.querySelector("#new-group"),
  notice: document.querySelector("#notice"),
  refresh: document.querySelector("#refresh"),
  restore: document.querySelector("#restore"),
  search: document.querySelector("#search"),
  summary: document.querySelector("#summary"),
  tabTemplate: document.querySelector("#tab-template"),
};

let snapshot;
let settings;
let currentWindowId;
let expandedFolders = new Set();
let refreshTimer;
let pendingGroupEdit;
let dragState;
let dragOperationActive = false;

function defaultSettings() {
  return { compactWindows: {}, folderRecords: [], showLooseTabs: false };
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...defaultSettings(), ...(stored[SETTINGS_KEY] || {}) };
}

async function saveSettings(next) {
  settings = next;
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function hostFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

function clearDropIndicators() {
  document.querySelectorAll(".drop-before, .drop-after, .drop-inside")
    .forEach((element) => element.classList.remove("drop-before", "drop-after", "drop-inside"));
}

function verticalDropPlacement(element, event) {
  const bounds = element.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

function startDrag(event, state, sourceElement) {
  dragState = state;
  sourceElement.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(state));
}

function finishDrag(sourceElement) {
  sourceElement.classList.remove("dragging");
  clearDropIndicators();
  dragState = undefined;
}

function nextFolderName(index) {
  return `Folder ${index + 1}`;
}

function makeRecord(group, tabs, index) {
  return {
    id: crypto.randomUUID(),
    name: visibleGroupTitle(group.title) || nextFolderName(index),
    color: group.color,
    lastGroupId: group.id,
    urls: uniqueUrls(tabs),
    updatedAt: Date.now(),
  };
}

async function readSnapshot() {
  const currentWindow = await chrome.windows.getCurrent();
  currentWindowId = currentWindow.id;
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({ windowId: currentWindowId }),
    chrome.tabGroups.query({ windowId: currentWindowId }),
  ]);

  settings = await loadSettings();
  const compactStateChanged = groups.some((group) => group.title === COMPACT_GROUP_TITLE)
    && !settings.compactWindows[currentWindowId];
  if (compactStateChanged) {
    settings.compactWindows[currentWindowId] = true;
  }
  const records = [...settings.folderRecords];
  const claimed = new Set();
  const orderedGroups = groups
    .map((group) => ({
      group,
      tabs: tabs.filter((tab) => tab.groupId === group.id).sort((a, b) => a.index - b.index),
    }))
    .sort((left, right) => (left.tabs[0]?.index ?? Infinity) - (right.tabs[0]?.index ?? Infinity));

  let recordsChanged = false;
  const folders = orderedGroups.map(({ group, tabs: groupTabs }, index) => {
    let record = chooseRecord(group, groupTabs, records, claimed);
    if (!record) {
      record = makeRecord(group, groupTabs, index);
      records.push(record);
      recordsChanged = true;
    }

    claimed.add(record.id);
    const nextRecord = {
      ...record,
      name: visibleGroupTitle(group.title) || record.name || nextFolderName(index),
      color: group.color,
      lastGroupId: group.id,
      urls: uniqueUrls(groupTabs),
    };
    if (JSON.stringify(nextRecord) !== JSON.stringify(record)) {
      Object.assign(record, nextRecord, { updatedAt: Date.now() });
      recordsChanged = true;
    }

    return {
      color: group.color,
      collapsed: group.collapsed,
      groupId: group.id,
      name: record.name,
      recordId: record.id,
      tabs: groupTabs,
    };
  });

  if (recordsChanged || compactStateChanged) {
    settings.folderRecords = records;
    await saveSettings(settings);
  }

  return {
    folders,
    looseTabs: tabs.filter((tab) => tab.groupId === NO_GROUP).sort((a, b) => a.index - b.index),
    tabs,
  };
}

function addMoveOptions(select, tab) {
  const currentFolder = snapshot.folders.find((folder) => folder.groupId === tab.groupId);
  const peers = currentFolder?.tabs || snapshot.looseTabs;
  const position = peers.findIndex((peer) => peer.id === tab.id);
  select.querySelector('[value="earlier"]').disabled = position <= 0;
  select.querySelector('[value="later"]').disabled = position < 0 || position >= peers.length - 1;
  select.querySelector('[value="none"]').disabled = tab.groupId === NO_GROUP;

  const heading = document.createElement("option");
  heading.textContent = "Move to group:";
  heading.disabled = true;
  select.append(heading);
  for (const folder of snapshot.folders) {
    if (folder.groupId === tab.groupId) continue;
    const option = document.createElement("option");
    option.value = `group:${folder.groupId}`;
    option.textContent = folder.name;
    select.append(option);
  }
}

async function organizeTab(tab, action) {
  if (!action) return;
  try {
    if (action === "new") {
      openGroupDialog({ tab });
      return;
    }
    if (action === "none") {
      await chrome.tabs.ungroup(tab.id);
    } else if (action.startsWith("group:")) {
      const groupId = Number(action.slice("group:".length));
      await chrome.tabs.group({ groupId, tabIds: [tab.id] });
    } else {
      const currentFolder = snapshot.folders.find((folder) => folder.groupId === tab.groupId);
      const peers = currentFolder?.tabs || snapshot.looseTabs;
      const position = peers.findIndex((peer) => peer.id === tab.id);
      const neighbor = action === "earlier" ? peers[position - 1] : peers[position + 1];
      if (neighbor) await chrome.tabs.move(tab.id, { index: neighbor.index });
    }
    await refresh({ clearNotice: false });
    elements.notice.textContent = "Tab organization updated.";
  } catch (error) {
    elements.notice.textContent = `Could not move that tab: ${error.message}`;
  }
}

async function moveGroupToPosition(groupId, desiredPosition) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const current = await readSnapshot();
    const sourceIndex = current.folders.findIndex((folder) => folder.groupId === groupId);
    if (sourceIndex < 0 || sourceIndex === desiredPosition) return;

    const source = current.folders[sourceIndex];
    const direction = sourceIndex < desiredPosition ? 1 : -1;
    const neighbor = current.folders[sourceIndex + direction];
    if (!neighbor) return;
    const targetIndex = direction < 0
      ? neighbor.tabs[0]?.index
      : (source.tabs[0]?.index ?? 0) + neighbor.tabs.length;
    await chrome.tabGroups.move(groupId, { index: targetIndex });
  }
  throw new Error("Edge did not finish reordering that group.");
}

async function dropGroup(sourceGroupId, targetGroupId, placement) {
  const sourceIndex = snapshot.folders.findIndex((folder) => folder.groupId === sourceGroupId);
  const targetIndex = snapshot.folders.findIndex((folder) => folder.groupId === targetGroupId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
  const desiredPosition = groupDropPosition(sourceIndex, targetIndex, placement);
  await moveGroupToPosition(sourceGroupId, desiredPosition);
}

async function setTabGroup(tabId, groupId) {
  const tab = await chrome.tabs.get(tabId);
  if (groupId === NO_GROUP) {
    if (tab.groupId !== NO_GROUP) await chrome.tabs.ungroup(tabId);
  } else if (tab.groupId !== groupId) {
    await chrome.tabs.group({ groupId, tabIds: [tabId] });
  }
}

async function dropTabNear(sourceTabId, targetTabId, placement) {
  if (sourceTabId === targetTabId) return;
  const targetBeforeMove = await chrome.tabs.get(targetTabId);
  await setTabGroup(sourceTabId, targetBeforeMove.groupId);
  const [source, target] = await Promise.all([
    chrome.tabs.get(sourceTabId),
    chrome.tabs.get(targetTabId),
  ]);
  const index = tabDropIndex(source.index, target.index, placement);
  if (index !== source.index) await chrome.tabs.move(sourceTabId, { index });
}

async function dropTabAtEnd(tabId, groupId) {
  await setTabGroup(tabId, groupId);
  const tabs = (await chrome.tabs.query({ windowId: currentWindowId }))
    .filter((tab) => tab.id !== tabId && tab.groupId === groupId)
    .sort((left, right) => left.index - right.index);
  const last = tabs.at(-1);
  if (!last) return;
  const source = await chrome.tabs.get(tabId);
  const index = source.index < last.index ? last.index : last.index + 1;
  if (index !== source.index) await chrome.tabs.move(tabId, { index });
}

async function completeDrop(action, successMessage) {
  dragOperationActive = true;
  clearTimeout(refreshTimer);
  try {
    await action();
    await refresh({ clearNotice: false });
    elements.notice.textContent = successMessage;
  } catch (error) {
    elements.notice.textContent = `Could not complete that drag: ${error.message}`;
  } finally {
    dragOperationActive = false;
    clearDropIndicators();
    dragState = undefined;
  }
}

function createTabRow(tab, dragEnabled = true) {
  const row = elements.tabTemplate.content.firstElementChild.cloneNode(true);
  const dragHandle = row.querySelector(".tab-drag");
  const openButton = row.querySelector(".tab-open");
  const organize = row.querySelector(".tab-organize");
  const favicon = row.querySelector(".favicon");
  const faviconUrl = safeFavicon(tab);
  if (faviconUrl) favicon.src = faviconUrl;
  row.querySelector(".tab-title").textContent = tab.title || "Untitled tab";
  row.querySelector(".tab-host").textContent = hostFor(tab.url);
  row.classList.toggle("active", Boolean(tab.active));
  row.title = tab.title || tab.url || "Tab";
  row.dataset.tabId = String(tab.id);
  dragHandle.draggable = dragEnabled;
  if (!dragEnabled) dragHandle.title = "Clear search to drag tabs";
  addMoveOptions(organize, tab);
  dragHandle.addEventListener("click", (event) => event.stopPropagation());
  dragHandle.addEventListener("dragstart", (event) => {
    if (!dragEnabled) return event.preventDefault();
    event.stopPropagation();
    startDrag(event, { type: "tab", tabId: tab.id }, row);
  });
  dragHandle.addEventListener("dragend", () => finishDrag(row));
  row.addEventListener("dragover", (event) => {
    if (dragState?.type !== "tab" || dragState.tabId === tab.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    clearDropIndicators();
    row.classList.add(`drop-${verticalDropPlacement(row, event)}`);
  });
  row.addEventListener("drop", (event) => {
    if (dragState?.type !== "tab" || dragState.tabId === tab.id) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceTabId = dragState.tabId;
    const placement = verticalDropPlacement(row, event);
    completeDrop(
      () => dropTabNear(sourceTabId, tab.id, placement),
      "Tab moved. Edge’s top-bar order is updated.",
    );
  });
  openButton.addEventListener("click", async () => {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  });
  organize.addEventListener("change", async () => {
    const action = organize.value;
    organize.value = "";
    await organizeTab(tab, action);
  });
  return row;
}

async function moveFolder(folder, direction) {
  const index = snapshot.folders.findIndex((item) => item.groupId === folder.groupId);
  const neighbor = snapshot.folders[index + direction];
  if (!neighbor) return;
  const targetIndex = direction < 0
    ? neighbor.tabs[0]?.index
    : (folder.tabs[0]?.index ?? 0) + neighbor.tabs.length;
  try {
    await chrome.tabGroups.move(folder.groupId, { index: targetIndex });
    await refresh({ clearNotice: false });
    elements.notice.textContent = `Moved ${folder.name} ${direction < 0 ? "earlier" : "later"}.`;
  } catch (error) {
    elements.notice.textContent = `Could not move that group: ${error.message}`;
  }
}

async function ungroupFolder(folder) {
  const confirmed = confirm(`Ungroup “${folder.name}”?\n\nIts ${folder.tabs.length} tabs will stay open and move to Loose tabs.`);
  if (!confirmed) return;
  try {
    await chrome.tabs.ungroup(folder.tabs.map((tab) => tab.id));
    await refresh({ clearNotice: false });
    elements.notice.textContent = `${folder.name} was removed; all of its tabs remain open.`;
  } catch (error) {
    elements.notice.textContent = `Could not ungroup those tabs: ${error.message}`;
  }
}

function renderFolder(folder, forceExpanded, folderIndex, dragEnabled) {
  const card = elements.folderTemplate.content.firstElementChild.cloneNode(true);
  const dragHandle = card.querySelector(".group-drag");
  const toggle = card.querySelector(".folder-toggle");
  const menu = card.querySelector(".folder-menu");
  const actions = card.querySelector(".folder-actions");
  const list = card.querySelector(".tab-list");
  const expanded = forceExpanded || expandedFolders.has(folder.recordId);
  card.style.setProperty("--folder-color", COLOR_MAP[folder.color] || COLOR_MAP.grey);
  card.dataset.groupId = String(folder.groupId);
  card.querySelector(".folder-name").textContent = folder.name;
  card.querySelector(".count").textContent = folder.tabs.length;
  const up = card.querySelector(".move-folder-up");
  const down = card.querySelector(".move-folder-down");
  up.disabled = folderIndex === 0;
  down.disabled = folderIndex === snapshot.folders.length - 1;
  toggle.setAttribute("aria-expanded", String(expanded));
  list.hidden = !expanded;
  dragHandle.draggable = dragEnabled;
  if (!dragEnabled) dragHandle.title = "Clear search to drag groups";
  for (const tab of folder.tabs) list.append(createTabRow(tab, dragEnabled));

  dragHandle.addEventListener("click", (event) => event.stopPropagation());
  dragHandle.addEventListener("dragstart", (event) => {
    if (!dragEnabled) return event.preventDefault();
    event.stopPropagation();
    startDrag(event, { type: "group", groupId: folder.groupId }, card);
  });
  dragHandle.addEventListener("dragend", () => finishDrag(card));
  card.addEventListener("dragover", (event) => {
    if (!dragState) return;
    if (dragState.type === "group" && dragState.groupId === folder.groupId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDropIndicators();
    if (dragState.type === "group") {
      card.classList.add(`drop-${verticalDropPlacement(card, event)}`);
    } else {
      card.classList.add("drop-inside");
    }
  });
  card.addEventListener("drop", (event) => {
    if (!dragState) return;
    event.preventDefault();
    const state = dragState;
    if (state.type === "group" && state.groupId !== folder.groupId) {
      const placement = verticalDropPlacement(card, event);
      completeDrop(
        () => dropGroup(state.groupId, folder.groupId, placement),
        "Group moved. Edge’s top-bar order is updated.",
      );
    } else if (state.type === "tab") {
      completeDrop(
        () => dropTabAtEnd(state.tabId, folder.groupId),
        `Tab moved to ${folder.name}.`,
      );
    }
  });

  toggle.addEventListener("click", () => {
    const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    list.hidden = !nextExpanded;
    if (nextExpanded) expandedFolders.add(folder.recordId);
    else expandedFolders.delete(folder.recordId);
  });
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    actions.hidden = !open;
  });
  card.querySelector(".edit-folder").addEventListener("click", () => openGroupDialog({ folder }));
  up.addEventListener("click", () => moveFolder(folder, -1));
  down.addEventListener("click", () => moveFolder(folder, 1));
  card.querySelector(".ungroup-folder").addEventListener("click", () => ungroupFolder(folder));
  return card;
}

function render() {
  if (!snapshot) return;
  const query = elements.search.value;
  const filtered = filterSnapshot(snapshot, query);
  const searching = Boolean(query.trim());

  elements.folders.replaceChildren();
  for (const folder of filtered.folders) {
    const originalIndex = snapshot.folders.findIndex((item) => item.groupId === folder.groupId);
    elements.folders.append(renderFolder(folder, searching, originalIndex, !searching));
  }

  elements.looseTabs.replaceChildren();
  for (const tab of filtered.looseTabs) elements.looseTabs.append(createTabRow(tab, !searching));
  elements.looseCount.textContent = filtered.looseTabs.length;
  elements.looseSection.hidden = searching && filtered.looseTabs.length === 0;

  const showLoose = searching || settings.showLooseTabs;
  elements.looseToggle.setAttribute("aria-expanded", String(showLoose));
  elements.looseTabs.hidden = !showLoose;

  const groupedCount = snapshot.folders.reduce((total, folder) => total + folder.tabs.length, 0);
  elements.summary.textContent = `${snapshot.tabs.length} tabs · ${snapshot.folders.length} folders · ${groupedCount} filed`;
  const compact = Boolean(settings.compactWindows[currentWindowId]);
  elements.compact.hidden = compact;
  elements.restore.hidden = !compact;

  elements.empty.hidden = filtered.folders.length + filtered.looseTabs.length > 0;
}

function openGroupDialog({ folder, tab } = {}) {
  const sourceTab = tab || snapshot?.tabs.find((item) => item.active);
  if (!folder && !sourceTab) {
    elements.notice.textContent = "Open a tab first, then create its group.";
    return;
  }
  pendingGroupEdit = { folder, tab: sourceTab };
  elements.groupDialogTitle.textContent = folder ? "Edit group" : "New group";
  elements.groupDialogDescription.textContent = folder
    ? "Changes appear here and on Edge’s tab bar."
    : sourceTab.groupId === NO_GROUP
      ? "The active tab will move into this new group."
      : "The active tab will move out of its current group into this new one.";
  elements.groupName.value = folder?.name || "";
  const selectedColor = folder?.color || "blue";
  const colorInput = elements.groupColor.querySelector(`input[value="${selectedColor}"]`);
  if (colorInput) colorInput.checked = true;
  elements.groupDialog.showModal();
  elements.groupName.focus();
}

async function saveGroupEdit(event) {
  event.preventDefault();
  const name = elements.groupName.value.trim();
  const color = elements.groupColor.querySelector('input[name="color"]:checked')?.value || "blue";
  if (!name || !pendingGroupEdit) return;
  try {
    const compact = Boolean(settings.compactWindows[currentWindowId]);
    if (pendingGroupEdit.folder) {
      const folder = pendingGroupEdit.folder;
      const record = settings.folderRecords.find((item) => item.id === folder.recordId);
      if (record) Object.assign(record, { name, color, updatedAt: Date.now() });
      await saveSettings(settings);
      await chrome.tabGroups.update(folder.groupId, {
        title: compact ? COMPACT_GROUP_TITLE : name,
        color,
      });
    } else {
      const tab = pendingGroupEdit.tab;
      const groupId = await chrome.tabs.group({
        tabIds: [tab.id],
        createProperties: { windowId: currentWindowId },
      });
      settings.folderRecords.push({
        id: crypto.randomUUID(),
        name,
        color,
        lastGroupId: groupId,
        urls: uniqueUrls([tab]),
        updatedAt: Date.now(),
      });
      await saveSettings(settings);
      await chrome.tabGroups.update(groupId, {
        title: compact ? COMPACT_GROUP_TITLE : name,
        color,
        collapsed: false,
      });
    }
    elements.groupDialog.close();
    pendingGroupEdit = undefined;
    await refresh({ clearNotice: false });
    elements.notice.textContent = "Group saved.";
  } catch (error) {
    elements.notice.textContent = `Could not save that group: ${error.message}`;
  }
}

async function refresh({ clearNotice = true } = {}) {
  try {
    snapshot = await readSnapshot();
    if (clearNotice) elements.notice.textContent = "";
    render();
  } catch (error) {
    elements.notice.textContent = `Could not read tabs: ${error.message}`;
  }
}

function scheduleRefresh() {
  if (dragOperationActive) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 90);
}

async function compactGroups() {
  elements.notice.textContent = "Saving folder names and compacting the top bar...";
  snapshot = await readSnapshot();

  const activeTab = snapshot.tabs.find((tab) => tab.active);
  for (const folder of snapshot.folders) {
    const record = settings.folderRecords.find((item) => item.id === folder.recordId);
    if (record) record.name = folder.name;
    await chrome.tabGroups.update(folder.groupId, {
      title: COMPACT_GROUP_TITLE,
      collapsed: folder.groupId !== activeTab?.groupId,
    });
  }

  settings.compactWindows[currentWindowId] = true;
  await saveSettings(settings);
  await refresh({ clearNotice: false });
  elements.notice.textContent = "Folder names are saved locally. Edge now shows only compact group markers.";
}

async function restoreGroups() {
  elements.notice.textContent = "Restoring folder names...";
  snapshot = await readSnapshot();
  for (const folder of snapshot.folders) {
    await chrome.tabGroups.update(folder.groupId, { title: folder.name });
  }
  delete settings.compactWindows[currentWindowId];
  await saveSettings(settings);
  await refresh({ clearNotice: false });
  elements.notice.textContent = "Full names are back in Edge’s tab menu and top bar.";
}

elements.compact.addEventListener("click", compactGroups);
elements.restore.addEventListener("click", restoreGroups);
elements.refresh.addEventListener("click", () => refresh());
elements.closeRail.addEventListener("click", async () => {
  if (chrome.sidePanel.close) {
    await chrome.sidePanel.close({ windowId: currentWindowId });
  }
});
elements.search.addEventListener("input", render);
elements.newGroup.addEventListener("click", () => openGroupDialog());
elements.groupForm.addEventListener("submit", saveGroupEdit);
document.querySelector("#cancel-group").addEventListener("click", () => {
  elements.groupDialog.close();
  pendingGroupEdit = undefined;
});
elements.expandAll.addEventListener("click", () => {
  for (const folder of snapshot?.folders || []) expandedFolders.add(folder.recordId);
  render();
});
elements.collapseAll.addEventListener("click", () => {
  expandedFolders.clear();
  render();
});
elements.looseToggle.addEventListener("click", async () => {
  settings.showLooseTabs = !settings.showLooseTabs;
  await saveSettings(settings);
  render();
});

elements.looseSection.addEventListener("dragover", (event) => {
  if (dragState?.type !== "tab") return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearDropIndicators();
  elements.looseSection.classList.add("drop-inside");
});
elements.looseSection.addEventListener("drop", (event) => {
  if (dragState?.type !== "tab") return;
  event.preventDefault();
  const tabId = dragState.tabId;
  completeDrop(
    () => dropTabAtEnd(tabId, NO_GROUP),
    "Tab moved to Loose Tabs.",
  );
});
document.addEventListener("dragend", () => {
  clearDropIndicators();
  dragState = undefined;
});

for (const event of [
  chrome.tabs.onActivated,
  chrome.tabs.onAttached,
  chrome.tabs.onCreated,
  chrome.tabs.onDetached,
  chrome.tabs.onMoved,
  chrome.tabs.onRemoved,
  chrome.tabs.onUpdated,
  chrome.tabGroups.onCreated,
  chrome.tabGroups.onMoved,
  chrome.tabGroups.onRemoved,
  chrome.tabGroups.onUpdated,
]) {
  event.addListener(scheduleRefresh);
}

refresh();
