import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

// FORGE: substitute these two strings. The right-hand values are concrete
// fallbacks so the starter is bootable as-is; the skill replaces the token
// in the template literal (or just edits the string).
const NAME = 'forge-extension'; // FORGE: {{NAME}}
const ONE_LINER = 'A Chrome MV3 extension starter.'; // FORGE: {{ONE_LINER}}

// This is the single source of truth for the MV3 manifest. @crxjs reads it
// through vite.config.ts and rewrites paths at build time. The version is
// synced from package.json so `npm version` bumps both.
export default defineManifest({
  manifest_version: 3,
  name: NAME,
  version: pkg.version,
  description: ONE_LINER,

  icons: {
    '16': 'public/icons/16.png',
    '32': 'public/icons/32.png',
    '48': 'public/icons/48.png',
    '128': 'public/icons/128.png',
  },

  // Toolbar popup surface.
  action: {
    default_popup: 'src/popup/index.html',
    default_title: NAME,
    default_icon: {
      '16': 'public/icons/16.png',
      '32': 'public/icons/32.png',
      '48': 'public/icons/48.png',
    },
  },

  // Full-page settings surface.
  options_page: 'src/options/index.html',

  // Background service worker (MV3, ES module).
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },

  // FORGE: add permissions here (e.g. 'storage', 'tabs', 'alarms', 'history').
  permissions: ['storage'],

  // FORGE: add host_permissions here (e.g. 'https://*/*') if the extension
  // needs cross-origin fetch or content-script injection.
  // host_permissions: [],

  // FORGE: uncomment for content script — declarative injection into pages.
  // content_scripts: [
  //   {
  //     matches: ['https://*/*'],
  //     js: ['src/content/content-script.ts'],
  //     run_at: 'document_idle',
  //   },
  // ],

  // MV3 Content Security Policy. 'self' only — no remote code, no eval.
  // FORGE: extend connect-src here if the extension calls a remote API.
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';",
  },
});
