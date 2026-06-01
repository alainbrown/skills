# Privacy Policy for {{NAME}}

_Last updated: {{YEAR}}-MM-DD_

{{NAME}} is a Chrome extension that {{ONE_LINER}}. This policy explains what
the extension does, and does not do, with your data.

## The short version

**{{NAME}} does not collect, sell, or transmit your personal data.** Everything
it does happens locally inside your own browser. There are no accounts, no
analytics, and no third-party trackers.

## What {{NAME}} stores

Everything {{NAME}} stores lives on your device, in your browser's per-extension
storage:

- **Settings** — your preferences are kept in `chrome.storage.local`.
<!-- FORGE: per-permission privacy lines from permissions-reference.md.
     For each permission the extension declares, paste its "Privacy line"
     here as a bullet (replace <feature> with the real feature). Example:
- **Browsing history** (`history`) — read locally to <feature> and never uploaded. -->

None of this is transmitted anywhere unless explicitly stated below.

## What it sends over the network

**Nothing.** {{NAME}} makes no network requests. It contains no remote code and
talks to no servers.

<!-- FORGE: if the extension DOES make a network request (e.g. downloading
     model weights from a CDN, or calling an API), replace the line above and
     disclose exactly what is sent, to where, and why. Be specific. -->

## What it does NOT do

{{NAME}} does **not**:

- Read or modify the pages you visit beyond what the listed permissions require.
- Send any data to the developer or to any third party.
- Use any analytics, error-reporting services, or trackers.
- Execute any remotely-hosted code — all code is bundled in the package.

## Deleting your data

- **In the browser:** uninstall the extension at `chrome://extensions`.
  Removing it removes all of its local storage with it.

## Children

{{NAME}} is general-purpose and does not knowingly collect personal information
from children — because it does not collect personal information from anyone.

## Changes

Material changes are reflected in the "Last updated" date above and in the
project's commit history.

## Contact

Source code, issues, and the history of this policy live at
[github.com/{{OWNER}}/{{REPO}}](https://github.com/{{OWNER}}/{{REPO}}).
