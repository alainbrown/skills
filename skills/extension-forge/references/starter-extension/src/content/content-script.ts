// FORGE: optional content script. This file is NOT active until you uncomment
// the `content_scripts` block in manifest.config.ts (search "FORGE: uncomment
// for content script"). It runs in the page context and can read/modify the
// DOM and message the service worker via chrome.runtime.sendMessage.

export {};

// Example: announce presence to the service worker on load.
// chrome.runtime.sendMessage({ type: 'ping' });

console.debug('[forge-extension] content script loaded');
