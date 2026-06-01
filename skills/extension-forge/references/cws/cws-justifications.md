# Chrome Web Store — dashboard justification strings

Paste these into the "Privacy practices" tab of the developer dashboard. Each
declared permission needs a justification; reviewers compare them against actual
usage. Keep each justification tied to a concrete, user-facing feature.

## Single purpose

<!-- FORGE: one sentence. State the single thing the extension does. A single,
     narrow purpose is a CWS requirement — if you can't say it in one sentence,
     the extension is doing too much for one listing. -->
> {{NAME}} {{ONE_LINER}}.

## Store listing copy

Paste into the listing fields. Stay within Chrome Web Store limits:

| Field | Limit | Value |
|-------|-------|-------|
| Name | 75 chars | {{NAME}} |
| Summary (short description) | 132 chars | <!-- FORGE: one punchy sentence, ≤132 chars --> |
| Category | — | <!-- FORGE: pick one CWS category --> |
| Description | 16,000 chars | <!-- FORGE: 1-2 paragraphs: what it does, who it's for, key features as a bullet list, privacy stance --> |

## Permission justifications

> **Audit first.** Before writing these, run the permission audit (see
> `references/permissions-reference.md` § "Permission audit"). Justify ONLY the
> permissions that survive — i.e. those the code actually uses. A justification
> for a permission the reviewer can't find in your code is an automatic rejection.

<!-- FORGE: one block per permission declared in manifest.config.ts AND confirmed
     used by the audit. Copy the matching "Justification" from
     references/permissions-reference.md and replace <feature> with the real
     feature. Example below — delete it and paste the real ones. -->

**storage**
> Stores the user's settings and <feature> data locally via `chrome.storage.local`
> so they persist across sessions. No data is sent to any server.

## Host permission justification

<!-- FORGE: one block per host pattern in host_permissions. If the extension
     declares NO host permissions, write: "None — the extension requests no host
     permissions." Otherwise justify the narrowest pattern that works. -->

> None — {{NAME}} requests no host permissions and contacts no external hosts.

## Data usage

Three disclosures for the certification checkboxes:

- **Collected or used:** No. {{NAME}} does not collect or use user data. All
  processing happens locally on the device.
- **Sold or transferred to third parties:** No. No data is sold or transferred
  to anyone.
- **Used for purposes unrelated to the single purpose** (including
  creditworthiness or lending): No. The extension does nothing beyond its
  stated single purpose.

### Data types

The dashboard asks you to check which categories of data the extension handles.
For a local-only extension, every box is **unchecked**. Use this table to be
explicit (check a row only if the extension actually touches that category):

| Data type | Handled? | If yes: what + why |
|-----------|----------|--------------------|
| Personally identifiable info (name, address, email…) | No | — |
| Health information | No | — |
| Financial / payment info | No | — |
| Authentication info (passwords, credentials) | No | — |
| Personal communications (email, messages) | No | — |
| Location | No | — |
| Web history | No | — |
| User activity (clicks, keystrokes, mouse position) | No | — |
| Website content (text, images, the page the user is on) | No | <!-- FORGE: e.g. a reader/highlighter touches selected page text LOCALLY — if so, mark Yes and state it stays on-device --> |

<!-- FORGE: if the extension DOES handle/transmit any of the above, mark the row
     Yes, change the matching disclosure answer above, and state exactly what,
     to where, and why. Handling data locally still requires checking the box. -->

## Remote code

> {{NAME}} executes no remote code. All JavaScript and WebAssembly is bundled in
> the package. The extension does not load or execute remotely-hosted code.
> (WASM, if used, is bundled and run via `wasm-unsafe-eval` in the CSP.)

## Privacy policy URL

Host `PRIVACY.md` at a public URL (e.g. the GitHub raw/blob link, or the
marketing site's `privacy.html`) and enter it in the listing.
