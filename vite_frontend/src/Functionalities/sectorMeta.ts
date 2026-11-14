// ============== sectorMeta.ts ==============

export interface SectorMeta {
  icon: string;
  accent: string; // tailwind text color class
  bg: string;     // tailwind bg class for the badge
}

const DEFAULT: SectorMeta = {
  icon: '🏭',
  accent: 'text-ink',
  bg: 'bg-[#eef0f3]',
};

const SECTORS: Record<string, SectorMeta> = {
  'nuclear reactor': { icon: '☢️', accent: 'text-[#a12626]', bg: 'bg-[#fdecec]' },
  'solar farm':      { icon: '☀️', accent: 'text-[#b7791f]', bg: 'bg-[#fff8e6]' },
  'wind farm':       { icon: '🌬️', accent: 'text-[#2563eb]', bg: 'bg-[#eaf1fd]' },
  'hydroelectric':   { icon: '💧', accent: 'text-[#0e7490]', bg: 'bg-[#e6f6fa]' },
  'natural gas':     { icon: '🔥', accent: 'text-[#b45309]', bg: 'bg-[#fdf0e6]' },
  'coal plant':      { icon: '⚫', accent: 'text-[#374151]', bg: 'bg-[#eef0f3]' },
  'data center':     { icon: '🖥️', accent: 'text-[#6d28d9]', bg: 'bg-[#f1ecfd]' },
  'manufacturing':   { icon: '🏗️', accent: 'text-[#374151]', bg: 'bg-[#eef0f3]' },
};

export function getSectorMeta(sectorType: string): SectorMeta {
  return SECTORS[sectorType.trim().toLowerCase()] ?? DEFAULT;
}