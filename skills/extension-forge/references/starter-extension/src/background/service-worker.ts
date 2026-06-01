import { getSettings, setSettings } from '../lib/chromeStorage';
import type { Message, Response } from '../lib/messaging';

// FORGE: the MV3 background service worker. It is event-driven and may be
// terminated between events — never hold long-lived in-memory state here; read
// it back from chrome.storage. Register listeners at the top level.

chrome.runtime.onInstalled.addListener(() => {
  // FORGE: first-run setup. Persisting defaults makes them inspectable.
  void getSettings().then((s) => setSettings(s));
});

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse: (r: Response) => void) => {
    (async () => {
      try {
        switch (msg.type) {
          case 'ping': {
            sendResponse({ ok: true, data: 'pong' });
            break;
          }
          case 'do-work': {
            // FORGE: real background work goes here.
            const settings = await getSettings();
            sendResponse({ ok: true, data: settings });
            break;
          }
          default: {
            sendResponse({ ok: false, error: 'unknown message' });
          }
        }
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    // Return true to keep the message channel open for the async response.
    return true;
  },
);
