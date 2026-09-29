# Microsoft Edge Add-ons listing draft

## Name

GroupRail - Side Tab Groups

## Short description

A privacy-first Edge tab manager and tab groups sidebar that keeps loose tabs on top and compacts crowded group labels.

## Detailed description

GroupRail is a privacy-first tab groups sidebar and tab manager for Microsoft Edge. It gives people with dozens—or hundreds—of open tabs more room without forcing every tab into a vertical-tabs layout.

Your ordinary, ungrouped tabs stay in Edge's familiar horizontal tab strip. Native Edge tab groups appear as expandable folders in GroupRail's side panel, with group colors, full titles, favicons, tab counts, one-click expand/collapse controls, and fast local search.

Organize tabs without giving up Edge's native groups:

- Create, rename, recolor, reorder, or safely ungroup tab groups.
- Drag groups into a new order.
- Drag tabs within a group, between groups, or into Loose Tabs.
- Use compact organizer menus when keyboard or menu controls are preferred.
- Move tabs earlier or later while preserving their exact browser order.
- In smallest-marker mode, right-click a browser tab and choose **GroupRail: Move this tab** to file it using full saved group names; this extra tab-strip menu hides itself when native names are visible.
- Right-click inside a webpage to use the same organizer in either display mode while the side rail is closed.
- Optionally assign a custom shortcut to toggle compact group names; GroupRail reserves no default key combination.
- Choose from Edge's nine native colors with a clear visual swatch picker.
- Removing a group never closes its tabs.

When you choose **Use smallest top-bar markers**, GroupRail stores each native group name only on your device, replaces the visible labels with an invisible placeholder, collapses inactive groups, and reduces them to Edge's smallest supported colored markers. Choose **Show names in Edge menus** at any time to reverse the change.

GroupRail is local-first by design:

- Free and open-source.
- No accounts or subscriptions.
- No ads or affiliate links.
- No analytics, telemetry, remote service, or application-controlled network requests.
- No direct remote favicon loading; site icons use Edge's browser-local extension favicon resource.
- No access to cookies, passwords, form data, or page contents.
- No scripts injected into websites.

Edge requires a small native marker for every open tab group and controls the size, side, and placement of its docked side panel. Edge also does not support nested groups or separate titles for the tab bar and built-in group menu. GroupRail works within those browser limitations; it cannot remove the last colored markers, add a second native tab row, nest groups, or make the panel float over webpages.

## Search terms

1. tab groups
2. sidebar
3. tab manager
4. vertical tabs
5. organize tabs
6. collapse groups
7. productivity

## Category

Productivity

## Pricing

Free

## Visual assets

- Store logo: `assets/grouprail-store-300.png` (300 × 300)
- Extension icons: `assets/icons/` (16, 32, 48, and 128 px)
- Small promotional tile: `assets/store/promo-small-440x280.png`
- Large promotional tile: `assets/store/promo-large-1400x560.png`
- Screenshots: three public-safe 1280 × 800 PNG files in `assets/store/`.

## Certification notes

1. Open several tabs and create two or more native Edge tab groups with names.
2. Select the GroupRail toolbar action to open the side panel.
3. Confirm folders and tabs appear with titles, favicons, group colors, and counts.
4. Use **Expand all**, **Collapse all**, and individual folder chevrons.
5. Use a group's `⋯` menu to rename, recolor, move, and safely ungroup it.
6. Drag a group by its grab handle and verify the same order changes in Edge's tab strip.
7. Expand two groups, then drag a tab within a group, between the groups, and into Loose Tabs.
8. Use a tab's `⋯` menu to verify the same organization actions are available without dragging.
9. Right-click inside a webpage and confirm **GroupRail: Move this tab** lists the full saved group names.
10. Select **Use smallest top-bar markers**, right-click a browser tab, and confirm **GroupRail: Move this tab** lists the full saved group names while Edge's native group names remain compact.
11. Select **Show names in Edge menus**, right-click a browser tab, and confirm the extra GroupRail tab-strip menu is hidden while Edge's native named menu remains available.
12. Assign a temporary shortcut to **Toggle compact group names**, verify both directions, then remove the shortcut.
13. Select an ungrouped tab and verify inactive native groups collapse.
14. Select the refresh button and verify the spinner, checkmark, and updated tab count appear.
15. Close the side panel and verify GroupRail does not block or overlay page content.

No test account is required. The extension has no application-controlled network requests, remote service, analytics, or telemetry. Its packaged content policy permits only local or embedded images, and direct remote favicon URLs are rejected.

## Permission disclosure

- `tabs`: read current-window tab titles, URLs, icons, order, active state, and group membership; activate the tab the user chooses.
- `tabGroups`: create, name, color, move, compact, restore, or safely ungroup native Edge groups.
- `contextMenus`: show the browser-controlled **GroupRail: Move this tab** menu.
- `sidePanel`: host the GroupRail interface.
- `storage`: save names, preferences, and privacy-minimized active-group match keys locally.
- `favicon`: use Edge's browser-local extension favicon resource instead of loading remote favicon URLs directly.

GroupRail requests no host permissions and injects no scripts into websites.
