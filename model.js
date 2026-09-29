export const NO_GROUP = -1;
export const COMPACT_GROUP_TITLE = "\u200B";
const PAGE_MOVE_MENU_CONTEXTS = Object.freeze([
  "page",
  "frame",
  "selection",
  "link",
  "editable",
  "image",
  "video",
  "audio",
]);

export function moveMenuContexts(compact) {
  return compact ? [...PAGE_MOVE_MENU_CONTEXTS, "tab"] : [...PAGE_MOVE_MENU_CONTEXTS];
}

export function visibleGroupTitle(value) {
  return value && value !== COMPACT_GROUP_TITLE ? value : "";
}

export function normalizeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    if (url.protocol === "file:") return "file:";
    if (!/^(https?|edge|chrome|about|chrome-extension):$/.test(url.protocol)) {
      return url.protocol;
    }
    return url.href;
  } catch {
    return "";
  }
}

export function uniqueUrls(tabs) {
  return [...new Set(tabs.map((tab) => normalizeUrl(tab.url)).filter(Boolean))];
}

export function overlapScore(left = [], right = []) {
  const a = new Set(left.map(normalizeUrl).filter(Boolean));
  const b = new Set(right.map(normalizeUrl).filter(Boolean));
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;

  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return intersection / new Set([...a, ...b]).size;
}

export function chooseRecord(
  group,
  tabs,
  records,
  claimedRecordIds = new Set(),
  preferredRecord,
) {
  const available = records.filter((record) => !claimedRecordIds.has(record.id));
  const exactId = available.find((record) => record.lastGroupId === group.id);
  if (exactId) return exactId;

  const groupTitle = visibleGroupTitle(group.title);
  if (groupTitle) {
    const exactTitle = available.find(
      (record) => record.name === groupTitle && record.color === group.color,
    );
    if (exactTitle) return exactTitle;
  }

  const urls = uniqueUrls(tabs);
  let best;
  let bestScore = 0;
  for (const record of available) {
    const score = overlapScore(urls, record.urls);
    const colorBonus = record.color === group.color ? 0.05 : 0;
    if (score + colorBonus > bestScore) {
      best = record;
      bestScore = score + colorBonus;
    }
  }
  if (bestScore >= 0.55) return best;

  // Edge may restore a session with entirely new native group ids before all
  // tabs have finished loading. Compact groups have no native title to match,
  // so use a unique color, then the saved positional hint, to keep their names.
  if (!groupTitle && preferredRecord) {
    const sameColor = available.filter((record) => record.color === group.color);
    if (sameColor.length === 1) return sameColor[0];
    if (available.includes(preferredRecord)) return preferredRecord;
  }

  return undefined;
}

export function searchableText(tab) {
  return `${tab.title || ""} ${tab.url || ""}`.toLocaleLowerCase();
}

export function filterSnapshot(snapshot, query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return snapshot;

  const folders = snapshot.folders
    .map((folder) => {
      const folderMatches = folder.name.toLocaleLowerCase().includes(needle);
      const tabs = folderMatches
        ? folder.tabs
        : folder.tabs.filter((tab) => searchableText(tab).includes(needle));
      return { ...folder, tabs };
    })
    .filter((folder) => folder.tabs.length > 0);

  return {
    ...snapshot,
    folders,
    looseTabs: snapshot.looseTabs.filter((tab) => searchableText(tab).includes(needle)),
  };
}

export function safeFavicon(tab) {
  const value = tab.favIconUrl || "";
  return /^data:image\//i.test(value) ? value : "";
}

export function faviconPageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!/^(https?|edge|chrome|about):$/.test(url.protocol)) return "";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

export function retainClaimedRecords(
  records,
  claimedRecordIds,
  now = Date.now(),
  graceMs = 24 * 60 * 60 * 1000,
) {
  return records.flatMap((record) => {
    if (claimedRecordIds.has(record.id)) {
      if (record.missingSince === undefined) return [record];
      const { missingSince: _missingSince, ...activeRecord } = record;
      return [activeRecord];
    }
    const missingSince = record.missingSince ?? now;
    return now - missingSince < graceMs ? [{ ...record, missingSince }] : [];
  });
}

export function groupDropPosition(sourceIndex, targetIndex, placement) {
  if (sourceIndex === targetIndex) return sourceIndex;
  if (placement === "before") return sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  return sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
}

export function tabDropIndex(sourceIndex, targetIndex, placement) {
  if (sourceIndex === targetIndex) return sourceIndex;
  if (placement === "before") return sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  return sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
}
