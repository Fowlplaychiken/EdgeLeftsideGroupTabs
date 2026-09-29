import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPACT_GROUP_TITLE,
  moveMenuContexts,
  chooseRecord,
  faviconPageUrl,
  filterSnapshot,
  groupDropPosition,
  normalizeUrl,
  overlapScore,
  safeFavicon,
  tabDropIndex,
  retainClaimedRecords,
  visibleGroupTitle,
} from "../model.js";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

test("tab-strip move menu appears only while compact mode hides native names", () => {
  assert.ok(moveMenuContexts(false).includes("page"));
  assert.ok(!moveMenuContexts(false).includes("tab"));
  assert.ok(moveMenuContexts(true).includes("page"));
  assert.ok(moveMenuContexts(true).includes("tab"));
});

test("group-name toggle command has no default shortcut", () => {
  const command = manifest.commands["toggle-group-names"];
  assert.equal(command.description, "Toggle compact group names");
  assert.equal(command.suggested_key, undefined);
});

test("normalizeUrl removes credentials, queries, and fragments", () => {
  assert.equal(
    normalizeUrl("https://user:secret@example.com/a?q=1#section"),
    "https://example.com/a",
  );
  assert.equal(normalizeUrl("file:///C:/Users/example/private.txt"), "file:");
  assert.equal(normalizeUrl("not a url"), "");
});

test("overlapScore uses URL-set Jaccard similarity", () => {
  assert.equal(overlapScore(["https://a.test", "https://b.test"], ["https://a.test"]), 0.5);
});

test("chooseRecord prefers the previous native group id", () => {
  const record = { id: "one", lastGroupId: 42, name: "Saved", color: "blue", urls: [] };
  assert.equal(chooseRecord({ id: 42, title: "", color: "red" }, [], [record]), record);
});

test("compact placeholder is never treated as a real group name", () => {
  assert.equal(visibleGroupTitle(COMPACT_GROUP_TITLE), "");
  assert.equal(visibleGroupTitle("Shopping"), "Shopping");

  const record = {
    id: "one",
    lastGroupId: 1,
    name: "Shopping",
    color: "blue",
    urls: ["https://saved.test/item"],
  };
  assert.equal(
    chooseRecord(
      { id: 99, title: COMPACT_GROUP_TITLE, color: "blue" },
      [{ url: "https://different.test/item" }],
      [record],
    ),
    undefined,
  );
});

test("chooseRecord recovers a record by URL overlap after group ids change", () => {
  const record = {
    id: "one",
    lastGroupId: 1,
    name: "Shopping",
    color: "blue",
    urls: ["https://shop.test/a", "https://shop.test/b"],
  };
  const tabs = [
    { url: "https://shop.test/a" },
    { url: "https://shop.test/b#reviews" },
  ];
  assert.equal(chooseRecord({ id: 99, title: "", color: "blue" }, tabs, [record]), record);
});

test("compact groups keep their saved names when Edge replaces every group id", () => {
  const records = [
    { id: "alpha", lastGroupId: 1, name: "Project Alpha", color: "green", urls: ["https://old.test/alpha"] },
    { id: "beta", lastGroupId: 2, name: "Project Beta", color: "blue", urls: ["https://old.test/beta"] },
    { id: "gamma", lastGroupId: 3, name: "Project Gamma", color: "red", urls: ["https://old.test/gamma"] },
  ];
  const restoredGroups = [
    { id: 101, title: COMPACT_GROUP_TITLE, color: "green" },
    { id: 102, title: COMPACT_GROUP_TITLE, color: "blue" },
    { id: 103, title: COMPACT_GROUP_TITLE, color: "red" },
  ];
  const claimed = new Set();

  const recovered = restoredGroups.map((group, index) => {
    const record = chooseRecord(
      group,
      [{ url: `https://restored.test/${index}` }],
      records,
      claimed,
      records[index],
    );
    if (record) claimed.add(record.id);
    return record?.name;
  });

  assert.deepEqual(recovered, [
    "Project Alpha",
    "Project Beta",
    "Project Gamma",
  ]);
});

test("filterSnapshot matches folder names and tab content", () => {
  const snapshot = {
    folders: [
      {
        name: "Shopping",
        tabs: [
          { title: "Welder", url: "https://tools.test/welder" },
          { title: "Tent", url: "https://outdoor.test/tent" },
        ],
      },
    ],
    looseTabs: [{ title: "Video", url: "https://video.test/watch" }],
  };

  assert.equal(filterSnapshot(snapshot, "shopping").folders[0].tabs.length, 2);
  assert.equal(filterSnapshot(snapshot, "welder").folders[0].tabs.length, 1);
  assert.equal(filterSnapshot(snapshot, "video").looseTabs.length, 1);
});

test("safeFavicon rejects privileged and local protocols", () => {
  assert.equal(safeFavicon({ favIconUrl: "https://example.com/favicon.ico" }), "");
  assert.equal(safeFavicon({ favIconUrl: "chrome://favicon/https://example.com" }), "");
  assert.equal(safeFavicon({ favIconUrl: "data:image/png;base64,AAAA" }), "data:image/png;base64,AAAA");
  assert.equal(safeFavicon({ favIconUrl: "file:///tmp/icon.png" }), "");
});

test("faviconPageUrl accepts browser pages without sensitive URL components", () => {
  assert.equal(
    faviconPageUrl("https://user:secret@example.com/path?q=private#section"),
    "https://example.com/path",
  );
  assert.equal(faviconPageUrl("file:///C:/private.txt"), "");
  assert.equal(faviconPageUrl("javascript:alert(1)"), "");
});

test("retainClaimedRecords survives a transient incomplete Edge snapshot", () => {
  const records = [{ id: "active" }, { id: "temporarily-missing" }];
  assert.deepEqual(retainClaimedRecords(records, new Set(["active"]), 1000, 5000), [
    { id: "active" },
    { id: "temporarily-missing", missingSince: 1000 },
  ]);
  assert.deepEqual(
    retainClaimedRecords(
      [{ id: "temporarily-missing", missingSince: 1000 }],
      new Set(),
      6000,
      5000,
    ),
    [],
  );
  assert.deepEqual(
    retainClaimedRecords(
      [{ id: "returned", missingSince: 1000 }],
      new Set(["returned"]),
      2000,
      5000,
    ),
    [{ id: "returned" }],
  );
});

test("groupDropPosition accounts for removing the dragged group", () => {
  assert.equal(groupDropPosition(0, 3, "before"), 2);
  assert.equal(groupDropPosition(0, 3, "after"), 3);
  assert.equal(groupDropPosition(3, 0, "before"), 0);
  assert.equal(groupDropPosition(3, 0, "after"), 1);
});

test("tabDropIndex preserves before and after intent in either direction", () => {
  assert.equal(tabDropIndex(2, 7, "before"), 6);
  assert.equal(tabDropIndex(2, 7, "after"), 7);
  assert.equal(tabDropIndex(7, 2, "before"), 2);
  assert.equal(tabDropIndex(7, 2, "after"), 3);
});
