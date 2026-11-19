
export const theme = {
  // Surfaces — light, Cloudflare-style
  bg:           '#f5f5f5',   // page background
  surface:      '#ffffff',   // cards, modals, panels
  surfaceAlt:   '#fafafa',   // panel headers, popovers

  // Borders — hairline grays
  border:       '#e0e0e0',
  borderStrong: '#d0d0d0',

  // Text — one ink, two grays
  text:         '#1a1a1a',
  textMuted:    '#6b7280',

  // Accent — Cloudflare orange
  accent:       '#f6821f',
  accentHover:  '#d96f15',

  // Status
  green:        '#16a34a',
  red:          '#dc2626',
  star:         '#f59e0b',   // warm amber, readable on white
  starDim:      '#9ca3af',
};

// Contract window between committee generations.
export const COMMITTEE_PERIOD_SECONDS = 4 * 7 * 24 * 60 * 60; // 4 weeks

export const MAX_PREFERENCES = 5;
