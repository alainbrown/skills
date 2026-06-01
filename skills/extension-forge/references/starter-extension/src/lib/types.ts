// FORGE: shared domain types. Extend Settings with the extension's real
// configurable fields; the storage layer and the options UI both key off it.

export interface Settings {
  // Example field — a user-toggleable feature flag. Replace/extend.
  enabled: boolean;
  // Example field — a free-text label echoed in the UI. Replace/extend.
  label: string;
}
