import {
  COMPACT_GROUP_TITLE,
  moveMenuContexts,
  uniqueUrls,
  visibleGroupTitle,
} from "./model.js";

const SETTINGS_KEY = "folderRailSettingsV1";

function removeAllMenus() {
  return new Promise((resolve) => chrome.contextMenus.removeAll(resolve));
}

function createMenu(properties) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(properties, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(error);
      else resolve();
    });
  });
}

let menuBuild = Promise.resolve();

function rebuildMenus(windowId) {
  menuBuild = menuBuild.then(async () => {
    try {
      const targetWindowId = windowId || (await chrome.windows.getLastFocused({ windowTypes: ["normal"] })).id;
      const [groups, stored] = await Promise.all([
        chrome.tabGroups.query({ windowId: targetWindowId }),
        chrome.storage.local.get(SETTINGS_KEY),
      ]);
      const settings = stored[SETTINGS_KEY];
      const records = settings?.folderRecords || [];
      const menuContexts = moveMenuContexts(Boolean(settings?.compactWindows?.[targetWindowId]));

      await removeAllMenus();
      await createMenu({
        id: "grouprail-root",
        title: "GroupRail: Move this tab",
        contexts: menuContexts,
      });
      for (const group of groups) {
        const savedName = records.find((record) => record.lastGroupId === group.id)?.name;
        const title = group.title && group.title !== COMPACT_GROUP_TITLE
          ? group.title
          : savedName || `${group.color} group`;
        await createMenu({
          id: `grouprail-group:${group.id}`,
          parentId: "grouprail-root",
          title,
          contexts: menuContexts,
        });
      }
      if (groups.length) {
        await createMenu({
          id: "grouprail-separator",
          parentId: "grouprail-root",
          type: "separator",
          contexts: menuContexts,
        });
      }
      await createMenu({
        id: "grouprail-loose",
        parentId: "grouprail-root",
        title: "Move to Loose tabs",
        contexts: menuContexts,
      });
    } catch {
      // The focused window or a group may have changed during the rebuild.
    }
  });
  return menuBuild;
}

async function toggleGroupNames() {
  const targetWindow = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
  const [groups, tabs, stored] = await Promise.all([
    chrome.tabGroups.query({ windowId: targetWindow.id }),
    chrome.tabs.query({ windowId: targetWindow.id }),
    chrome.storage.local.get(SETTINGS_KEY),
  ]);
  const settings = stored[SETTINGS_KEY] || {
    compactWindows: {},
    folderRecords: [],
    showLooseTabs: false,
  };
  settings.compactWindows ||= {};
  settings.folderRecords ||= [];

  if (settings.compactWindows[targetWindow.id]) {
    await Promise.all(groups.map((group, index) => {
      const record = settings.folderRecords.find((item) => item.lastGroupId === group.id);
      const name = record?.name || visibleGroupTitle(group.title) || `Folder ${index + 1}`;
      return chrome.tabGroups.update(group.id, { title: name });
    }));
    delete settings.compactWindows[targetWindow.id];
  } else {
    groups.forEach((group, index) => {
      const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
      let record = settings.folderRecords.find((item) => item.lastGroupId === group.id);
      if (!record) {
        record = { id: crypto.randomUUID() };
        settings.folderRecords.push(record);
      }
      record.name = visibleGroupTitle(group.title) || record.name || `Folder ${index + 1}`;
      record.color = group.color;
      record.lastGroupId = group.id;
      record.urls = uniqueUrls(groupTabs);
      record.updatedAt = Date.now();
      delete record.missingSince;
    });
    settings.compactWindows[targetWindow.id] = true;
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    const activeTab = tabs.find((tab) => tab.active);
    await Promise.all(groups.map((group) => chrome.tabGroups.update(group.id, {
      title: COMPACT_GROUP_TITLE,
      collapsed: group.id !== activeTab?.groupId,
    })));
  }

  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  await rebuildMenus(targetWindow.id);
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  if (!stored[SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        compactWindows: {},
        folderRecords: [],
        showLooseTabs: false,
      },
    });
  }
  await rebuildMenus();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  rebuildMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || typeof info.menuItemId !== "string") return;
  try {
    if (info.menuItemId === "grouprail-loose") {
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) await chrome.tabs.ungroup(tab.id);
      return;
    }
    if (info.menuItemId.startsWith("grouprail-group:")) {
      const groupId = Number(info.menuItemId.slice("grouprail-group:".length));
      if (Number.isInteger(groupId) && groupId !== tab.groupId) {
        await chrome.tabs.group({ groupId, tabIds: [tab.id] });
      }
    }
  } catch {
    // Pinned, closing, or cross-window tabs can become unavailable before the click is handled.
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-group-names") return;
  return toggleGroupNames().catch(() => {});
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) rebuildMenus(windowId);
});

for (const event of [
  chrome.tabGroups.onCreated,
  chrome.tabGroups.onMoved,
  chrome.tabGroups.onRemoved,
  chrome.tabGroups.onUpdated,
]) {
  event.addListener((group) => rebuildMenus(group.windowId));
}

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === "local") rebuildMenus();
});

let collapseTimer;

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(async () => {
    try {
      const stored = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = stored[SETTINGS_KEY];
      if (!settings?.compactWindows?.[windowId]) return;

      const activeTab = await chrome.tabs.get(tabId);
      const groups = await chrome.tabGroups.query({ windowId });
      await Promise.all(
        groups
          .filter((group) => group.id !== activeTab.groupId && !group.collapsed)
          .map((group) => chrome.tabGroups.update(group.id, { collapsed: true })),
      );
    } catch {
      // The tab or window may have closed while the event was being handled.
    }
  }, 120);
});
