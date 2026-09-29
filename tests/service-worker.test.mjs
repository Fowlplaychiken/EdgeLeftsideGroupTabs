import test from "node:test";
import assert from "node:assert/strict";
import { COMPACT_GROUP_TITLE } from "../model.js";

test("hotkey compacts and restores names while switching the tab-strip menu", async () => {
  const settingsKey = "folderRailSettingsV1";
  let settings = {
    compactWindows: {},
    folderRecords: [],
    showLooseTabs: false,
  };
  const groups = [
    { id: 10, title: "Project Alpha", color: "blue", windowId: 1, collapsed: false },
    { id: 20, title: "Project Beta", color: "green", windowId: 1, collapsed: false },
  ];
  const tabs = [
    { id: 1, groupId: 10, active: true, url: "https://alpha.test/item" },
    { id: 2, groupId: 20, active: false, url: "https://beta.test/item" },
  ];
  let commandListener;
  let menuItems = [];
  const event = () => ({ addListener() {} });

  globalThis.chrome = {
    action: {},
    commands: {
      onCommand: { addListener(listener) { commandListener = listener; } },
    },
    contextMenus: {
      create(properties, callback) {
        menuItems.push(structuredClone(properties));
        callback();
      },
      onClicked: event(),
      removeAll(callback) {
        menuItems = [];
        callback();
      },
    },
    runtime: {
      lastError: undefined,
      onInstalled: event(),
      onStartup: event(),
    },
    sidePanel: {
      async setPanelBehavior() {},
    },
    storage: {
      local: {
        async get() {
          return { [settingsKey]: structuredClone(settings) };
        },
        async set(value) {
          settings = structuredClone(value[settingsKey]);
        },
      },
      onChanged: event(),
    },
    tabGroups: {
      async query() {
        return groups.map((group) => ({ ...group }));
      },
      async update(groupId, changes) {
        Object.assign(groups.find((group) => group.id === groupId), changes);
      },
      onCreated: event(),
      onMoved: event(),
      onRemoved: event(),
      onUpdated: event(),
    },
    tabs: {
      async get(tabId) {
        return tabs.find((tab) => tab.id === tabId);
      },
      async group() {},
      async query() {
        return tabs.map((tab) => ({ ...tab }));
      },
      async ungroup() {},
      onActivated: event(),
    },
    windows: {
      async getLastFocused() {
        return { id: 1 };
      },
      onFocusChanged: event(),
      WINDOW_ID_NONE: -1,
    },
  };

  await import(`../service-worker.js?test=${Date.now()}`);
  assert.equal(typeof commandListener, "function");

  await commandListener("toggle-group-names");
  assert.equal(settings.compactWindows[1], true);
  assert.deepEqual(groups.map((group) => group.title), [COMPACT_GROUP_TITLE, COMPACT_GROUP_TITLE]);
  assert.ok(menuItems.some((item) => item.id === "grouprail-root" && item.contexts.includes("tab")));
  assert.deepEqual(settings.folderRecords.map((record) => record.name), ["Project Alpha", "Project Beta"]);

  await commandListener("toggle-group-names");
  assert.equal(settings.compactWindows[1], undefined);
  assert.deepEqual(groups.map((group) => group.title), ["Project Alpha", "Project Beta"]);
  assert.ok(menuItems.some((item) => item.id === "grouprail-root" && !item.contexts.includes("tab")));

  delete globalThis.chrome;
});
