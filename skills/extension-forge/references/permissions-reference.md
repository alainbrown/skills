# MV3 Permissions Reference

**Authoritative source for CWS paperwork.** For every permission the extension declares, copy the
matching **Justification** into `cws-justifications.md` and the **Privacy line** into `PRIVACY.md`.
Do not declare a permission without a concrete feature behind it — over-broad requests are the #1
cause of Chrome Web Store rejection. Prefer `activeTab` over host permissions; prefer narrow host
patterns over `<all_urls>`.

The Justification text below is a template — replace `<feature>` with the actual user-facing
feature. Reviewers want the *why*, tied to a concrete behavior.

---

## Permission audit (manifest ↔ code reconciliation)

**Run this before writing CWS justifications, in `verify`, and whenever wrapping an existing
extension.** Declaration-time good intentions aren't enough — reconcile the declared manifest
against what the code actually calls, and prune the difference. An unused permission a reviewer
can't find in your code is the #1 rejection reason.

**Procedure:**
1. For each entry in `permissions` / `optional_permissions`, grep the codebase for its API surface
   (table below). **Zero hits → propose removing it.**
2. Grep for `chrome.<namespace>` calls that have **no** matching declared permission → propose
   **adding** it (or warn the call throws at runtime).
3. For each `host_permissions` pattern, find the actual `fetch(`/`XMLHttpRequest`/`connect-src`
   origins and `declarativeNetRequest` rule domains. **Narrow `<all_urls>` / broad patterns down to
   the origins the code truly contacts.** If injection only happens on user action, recommend
   dropping host permissions in favor of `activeTab`.
4. Emit a table and act on it:

   | Permission | Used? | Evidence (file:line) | Action |
   |---|---|---|---|
   | storage | yes | `src/lib/chromeStorage.ts:12` | keep |
   | scripting | **no** | — | **remove** |

**Grep map — permission → API to search for:**

| Permission | Search for | Notes |
|---|---|---|
| `storage` | `chrome.storage.` | local/sync/session |
| `tabs` | `chrome.tabs.` | titles/URLs beyond activeTab |
| `activeTab` | `chrome.scripting`, `chrome.tabs.sendMessage`, executeScript on click | no host perm needed; user-gesture only |
| `scripting` | `chrome.scripting.` | executeScript / insertCSS |
| `contextMenus` | `chrome.contextMenus.` | the right-click entry |
| `sidePanel` | `chrome.sidePanel.` | side panel open/behavior |
| `history` | `chrome.history.` | |
| `bookmarks` | `chrome.bookmarks.` | |
| `downloads` | `chrome.downloads.` | |
| `browsingData` | `chrome.browsingData.` | |
| `alarms` | `chrome.alarms.` | |
| `notifications` | `chrome.notifications.` | |
| `cookies` | `chrome.cookies.` | + needs host_permissions for the hosts |
| `declarativeNetRequest` | `chrome.declarativeNetRequest`, `rule_resources` in manifest | static rules count as "use" |
| `offscreen` | `chrome.offscreen.` | |
| `identity` | `chrome.identity.` | sensitive — extra review |
| `host_permissions` | `fetch(`, `XMLHttpRequest`, `connect-src`, DNR rule domains | narrow to observed origins; prefer `activeTab` |

A permission used only via the manifest (e.g. `contextMenus` created declaratively, a
`declarativeNetRequest` rules file, a `commands` shortcut) still counts as used — check the manifest
too, not just `.ts`/`.js`.

---

### storage
- **Use:** persist settings/data via `chrome.storage.local` or `chrome.storage.sync`.
- **Justification:** "Stores the user's settings and <feature> data locally so they persist across sessions. No data is sent to any server."
- **Privacy line:** "Your settings and data are stored locally in your browser via `chrome.storage` and never leave your device (unless you enable Chrome Sync, which is Google's own encrypted sync)."

### activeTab
- **Use:** one-time access to the current tab when the user invokes the extension (click / command). No host permission needed.
- **Justification:** "Grants temporary access to the active tab only when the user clicks the extension, so it can <feature> on the page they chose. No persistent or background access to any site."
- **Privacy line:** "The extension can read the current tab only when you explicitly invoke it, and does not run in the background on any site."

### scripting
- **Use:** inject scripts/CSS via `chrome.scripting.executeScript`.
- **Justification:** "Injects a script into the active tab to <feature> (e.g., extract the selected text / annotate the page). Runs only on user action."
- **Privacy line:** "Page scripts run only when you invoke the extension and only to perform <feature>; nothing is collected or transmitted."

### contextMenus
- **Use:** add a right-click menu entry.
- **Justification:** "Adds a right-click '<label>' entry so the user can trigger <feature> on selected text/links/pages."
- **Privacy line:** "Adds a right-click menu item; selections you act on are processed locally."

### sidePanel
- **Use:** open the extension UI in Chrome's side panel.
- **Justification:** "Opens the extension's interface in the browser side panel, where <feature> runs alongside the page."
- **Privacy line:** "The side panel hosts the extension UI; it does not read page content unless you explicitly send it."

### tabs
- **Use:** query/observe tabs (titles, URLs) — broader than `activeTab`. Only request if you truly need cross-tab info.
- **Justification:** "Reads tab titles/URLs to <feature, e.g., list and manage open tabs>. Required because the feature operates across multiple tabs, not just the active one."
- **Privacy line:** "Tab titles and URLs are read to provide <feature> and are processed locally; they are not transmitted."

### history
- **Use:** read/modify browsing history.
- **Justification:** "Reads history to <feature, e.g., identify dormant sites> and deletes entries the user chooses to remove. All processing is local."
- **Privacy line:** "Browsing history is read locally to provide <feature> and is never uploaded."

### bookmarks
- **Use:** read/modify bookmarks.
- **Justification:** "Reads and organizes bookmarks to <feature>. No bookmark data leaves the device."
- **Privacy line:** "Bookmarks are accessed locally for <feature> and are not transmitted."

### downloads
- **Use:** manage downloads.
- **Justification:** "Uses the downloads API to <feature, e.g., save exports / clear old downloads>."
- **Privacy line:** "Download entries are accessed locally to provide <feature>."

### browsingData
- **Use:** clear cookies/cache/storage.
- **Justification:** "Clears <cookies/cache/local storage> for sites the user selects as part of <feature>. The user controls exactly what is cleared."
- **Privacy line:** "Browsing data is cleared only for the sites and categories you choose; nothing is read or uploaded."

### alarms
- **Use:** schedule periodic work in the service worker.
- **Justification:** "Schedules recurring <feature, e.g., a periodic cleanup> via the alarms API."
- **Privacy line:** "Alarms schedule local background tasks; no data is involved."

### notifications
- **Use:** show system notifications.
- **Justification:** "Shows a notification when <feature event> completes."
- **Privacy line:** "Notifications are generated locally to inform you of <feature> events."

### cookies
- **Use:** read/write cookies for specific hosts.
- **Justification:** "Reads/sets cookies on <hosts> to <feature>. Limited to the hosts listed in host permissions."
- **Privacy line:** "Cookies are accessed only on <hosts> to provide <feature> and are not collected."

### declarativeNetRequest
- **Use:** block/redirect/modify requests via static rules (MV3-preferred over webRequest).
- **Justification:** "Uses declarative rules to <feature, e.g., block trackers>. Rules are static and evaluated by the browser; the extension does not read request contents."
- **Privacy line:** "Network rules are applied by the browser; the extension does not observe or transmit your browsing."

### offscreen
- **Use:** create an offscreen document for DOM/audio/clipboard work unavailable in a service worker.
- **Justification:** "Creates an offscreen document to <feature, e.g., decode audio / use the DOM> that MV3 service workers can't do directly."
- **Privacy line:** "An offscreen document performs <feature> locally; no data is sent anywhere."

### identity
- **Use:** OAuth via `chrome.identity`. **Sensitive — expect extra review.**
- **Justification:** "Authenticates the user with <provider> via OAuth to <feature>. Tokens are stored locally and used only to access <scope>."
- **Privacy line:** "Sign-in uses OAuth; tokens are stored locally. We access only <scope> and do not store your credentials."

---

## Host permissions

Declare the **narrowest** match patterns that work. Each host pattern needs its own justification.

- **Justification (per host):** "Requires access to `<pattern>` to <feature, e.g., download model weights from the CDN / read the API>. This is the only origin the extension contacts."
- **`<all_urls>` — avoid.** Only if the extension genuinely operates on every site (e.g., a universal reader). If used: "Operates on any page the user activates it on; access is used solely to <feature> and no browsing data is collected." Expect heightened review.
- **Privacy line:** "The extension contacts `<host>` only to <feature>; no personal data is sent."

## Data-usage disclosures (CWS "Privacy practices" tab)

For most of these extensions, all three are **No**:
- **Collected/used:** does the extension collect user data? (For local-only extensions: No.)
- **Sold/transferred to third parties:** No.
- **Used for purposes unrelated to core function / creditworthiness / lending:** No.

If the extension *does* send anything (e.g., to an API or model CDN), disclose exactly what, to where, and why.

## Remote-code statement

MV3 forbids remotely-hosted code. State explicitly: "All JavaScript is bundled in the package; the
extension does not load or execute remote code. (WASM, if used, is bundled and run via
`wasm-unsafe-eval` in the CSP.)"
