import type { FacilityMeta , StakedMember } from "../types";

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




export const CONTRACTS_IN_ORDER = [
  'bafkreidglsdrujbietvdp4hjxcsecwn7rxfidlm5f7l42uyudiapeadzhy',
  'bafkreieh2xx3cvhg7wdntzifj53tzgdhdommsgogasbsrvuwaj272ompj4',
  'bafkreiazoh3pzxb7xkpfpahx2homftykipjwsnyxy6fojlixycwxmexc6e',
  'bafkreiebyahgas7fcbkn5l5btbyy4diegstg6vymn7rkdoqwkljvywegcy',
  'bafkreib4z6m55m7h43baf6vrpre6wbobmmkv4joqgvwou22dui6sdbtdji',
];

export const FACILITY_CONTRACTS_SIGNED: Record<string, number[]> = {
  '0x1234567890abcdef1234567890abcdef12345678': [1,1,1,1,1], // Atlas Point
  '0xabcdef1234567890abcdef1234567890abcdef12': [0,1,1,0,0], // Nimbus DC-04
  '0x9876543210fedcba9876543210fedcba98765432': [0,1,1,0,0], // AeroVance
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': [0,1,1,1,1], // Helios One
  '0xcafebabecafebabecafebabecafebabecafebabe': [0,1,1,0,0], // Northwind
  '0x1111111111111111111111111111111111111111': [0,1,1,0,0], // PetroNova
  '0x2222222222222222222222222222222222222222': [0,1,1,0,0], // AquaPure
  '0x3333333333333333333333333333333333333333': [0,1,1,1,1], // OrbitalNet
  '0x4444444444444444444444444444444444444444': [0,1,1,0,0], // VitalCare
  '0x5555555555555555555555555555555555555555': [0,1,1,1,1], // QuantaRing
};

/**
 * Hardcoded FacilityMeta keyed by facility address.
 * TODO: Replace with a real resolver (contract / API).
 */
export const FACILITY_META: Record<string, FacilityMeta> = {
  '0x1234567890abcdef1234567890abcdef12345678': {
    facilityAddress: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Atlas Point Nuclear Generating Station',
    location: 'Pickering, Ontario, Canada',
    sectorType: 'Nuclear Reactor',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreiahuey6bj56cemwkr3jg2gjwkpch4a5rdjgljfz25eqefsziokxte'],
  },
  '0xabcdef1234567890abcdef1234567890abcdef12': {
    facilityAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'Nimbus DC-04',
    location: 'Ashburn, Virginia, USA',
    sectorType: 'Data Center',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreih4fcekdf5hqxsme7ghafcoawoslsvy5747wql4kufhe2rwtndazm'],
  },
  '0x9876543210fedcba9876543210fedcba98765432': {
    facilityAddress: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'AeroVance A320 Fleet',
    location: 'Toulouse, France',
    sectorType: 'Aircraft',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreieopfjq7r33c743qtud4zomwyycottmmurf3exgznm3jbmajvyt3y'],
  },
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': {
    facilityAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    name: 'Helios One Solar Array',
    location: 'Blythe, California, USA',
    sectorType: 'Solar Power Plant',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreicfooqmktayamd3pxpei6hkxho7xcmnijbrk7hbcusl6reveix2iu'],
  },
  '0xcafebabecafebabecafebabecafebabecafebabe': {
    facilityAddress: '0xcafebabecafebabecafebabecafebabecafebabe',
    name: 'Northwind Ridge Wind Farm',
    location: 'Aberdeenshire, Scotland, UK',
    sectorType: 'Wind Farm',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreicb4kweu2xunaz3m3aipm7qwmlnkirxvulvl3ntwyjnkairus6h5y'],
  },
  '0x1111111111111111111111111111111111111111': {
    facilityAddress: '0x1111111111111111111111111111111111111111',
    name: 'PetroNova Refinery B',
    location: 'Rotterdam, Netherlands',
    sectorType: 'Chemical / Petrochemical Plant',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreifk7k75f72qomcjzk56bwab4l73gwxli2sgybscowc7upmstyiroq'],
  },
  '0x2222222222222222222222222222222222222222': {
    facilityAddress: '0x2222222222222222222222222222222222222222',
    name: 'AquaPure Treatment Works',
    location: 'Singapore',
    sectorType: 'Water Treatment Plant',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreih7v7b57qnv4pvfoayuzzegjwa567jlcalws45yskkaeiidhrp54m'],
  },
  '0x3333333333333333333333333333333333333333': {
    facilityAddress: '0x3333333333333333333333333333333333333333',
    name: 'OrbitalNet Constellation',
    location: 'Low Earth Orbit (Ground: Luxembourg)',
    sectorType: 'Satellite',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreiaxltukwkda3ztyhdzen3iahfpad2opskl56pva2ipnuftlm3u5pu'],
  },
  '0x4444444444444444444444444444444444444444': {
    facilityAddress: '0x4444444444444444444444444444444444444444',
    name: 'VitalCare ICU Wing',
    location: 'Boston, Massachusetts, USA',
    sectorType: 'Hospital Critical Care',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreign4jxo244jea6vj3gpyvt4y65hawbyu4bhmcflfmmpb2x7plttde'],
  },
  '0x5555555555555555555555555555555555555555': {
    facilityAddress: '0x5555555555555555555555555555555555555555',
    name: 'QuantaRing Synchrotron',
    location: 'Grenoble, France',
    sectorType: 'Particle Accelerator',
    createdAt: 0,
    isActive: true,
    docCids: ['bafkreih6nte2y3uuwjt3nvj76qtb4vccyvhl5knbm27faafq7yy6jfc6im'],
  },
};

/**
 * Hardcoded FacilityMeta keyed by facility address.
 * TODO: Replace with a real resolver (contract / API).
 */
export const FACILITY_LANDING_PAGES: Record<string, string> = {
  '0x1234567890abcdef1234567890abcdef12345678': 'https://misty-silence-e1cd.joabichou788.workers.dev/',
  '0xabcdef1234567890abcdef1234567890abcdef12': 'https://super-haze-657c.joabichou788.workers.dev/',
  '0x9876543210fedcba9876543210fedcba98765432': 'https://rough-cloud-494f.joabichou788.workers.dev/',
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': 'https://yellow-moon-983c.joabichou788.workers.dev/',
  '0xcafebabecafebabecafebabecafebabecafebabe': 'https://little-leaf-c0be.joabichou788.workers.dev/',
  '0x1111111111111111111111111111111111111111': 'https://orange-lake-5d55.joabichou788.workers.dev/',
  '0x2222222222222222222222222222222222222222': 'https://sparkling-cell-ccc2.joabichou788.workers.dev/',
  '0x3333333333333333333333333333333333333333': 'https://small-forest-a5ea.joabichou788.workers.dev/',
  '0x4444444444444444444444444444444444444444': 'https://sweet-smoke-0ff1.joabichou788.workers.dev/',
  '0x5555555555555555555555555555555555555555': 'https://damp-grass-ccff.joabichou788.workers.dev/',
};

export const FACILITY_DOCS: Record<string, string[]> = {
  '0x1234567890abcdef1234567890abcdef12345678': [
    'bafkreidglsdrujbietvdp4hjxcsecwn7rxfidlm5f7l42uyudiapeadzhy',
    'bafkreieh2xx3cvhg7wdntzifj53tzgdhdommsgogasbsrvuwaj272ompj4',
  ],
  '0xabcdef1234567890abcdef1234567890abcdef12': [
    'bafkreiazoh3pzxb7xkpfpahx2homftykipjwsnyxy6fojlixycwxmexc6e',
  ],
  '0x9876543210fedcba9876543210fedcba98765432': [],
  // ...fill the rest, or leave missing (returns [])
};



export const FACILITY_DAO_MEMBERS: Record<string, StakedMember[]> = {
  // Atlas Point Nuclear Generating Station — 3 members
  '0x1234567890abcdef1234567890abcdef12345678': [
    { wallet: '0xA11ce0000000000000000000000000000000A11c', amount: 25_000_000 },
    { wallet: '0xB0b0000000000000000000000000000000000B0b0', amount: 100_000_000 },
    { wallet: '0xC4r0l000000000000000000000000000000C4r0', amount: 100_000_000 },
  ],

  // Nimbus DC-04 — 2 members
  '0xabcdef1234567890abcdef1234567890abcdef12': [
    { wallet: '0xD4ve00000000000000000000000000000000D4ve', amount: 25_000_000 },
    { wallet: '0xEve0000000000000000000000000000000000Eve0', amount: 100_000_000 },
  ],

  // AeroVance A320 Fleet — 1 member
  '0x9876543210fedcba9876543210fedcba98765432': [
    { wallet: '0xF1nn00000000000000000000000000000000F1nn', amount: 25_000_000 },
  ],

  // Helios One Solar Array — 3 members
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef': [
    { wallet: '0x60a10000000000000000000000000000000060a1', amount: 25_000_000 },
    { wallet: '0x60a20000000000000000000000000000000060a2', amount: 100_000_000 },
    { wallet: '0x60a30000000000000000000000000000000060a3', amount: 100_000_000 },
  ],

  // Northwind Ridge Wind Farm — 2 members
  '0xcafebabecafebabecafebabecafebabecafebabe': [
    { wallet: '0x90b10000000000000000000000000000000090b1', amount: 25_000_000 },
    { wallet: '0x90b20000000000000000000000000000000090b2', amount: 100_000_000 },
  ],

  // PetroNova Refinery B — 1 member
  '0x1111111111111111111111111111111111111111': [
    { wallet: '0xc1a100000000000000000000000000000000c1a1', amount: 25_000_000 },
  ],

  // AquaPure Treatment Works — 0 members (no one staked yet)
  '0x2222222222222222222222222222222222222222': [],

  // OrbitalNet Constellation — 3 members
  '0x3333333333333333333333333333333333333333': [
    { wallet: '0x0b1a000000000000000000000000000000000b1a', amount: 25_000_000 },
    { wallet: '0x0b1b000000000000000000000000000000000b1b', amount: 100_000_000 },
    { wallet: '0x0b1c000000000000000000000000000000000b1c', amount: 100_000_000 },
  ],

  // VitalCare ICU Wing — 2 members
  '0x4444444444444444444444444444444444444444': [
    { wallet: '0x1c100000000000000000000000000000001c10', amount: 25_000_000 },
    { wallet: '0x1c200000000000000000000000000000001c20', amount: 100_000_000 },
  ],

  // QuantaRing Synchrotron — 1 member
  '0x5555555555555555555555555555555555555555': [
    { wallet: '0x9a1a0000000000000000000000000000009a1a', amount: 25_000_000 },
  ],
};


export const CURRENT_USER_ADDRESS = '0xA11ce0000000000000000000000000000000A11c';

// Contract window between committee generations.
export const COMMITTEE_PERIOD_SECONDS = 4 * 7 * 24 * 60 * 60; // 4 weeks

export const MAX_PREFERENCES = 5;


export const LAST_GENERATION_UNIX = Math.floor(
  Date.UTC(2026, 10, 1, 0, 0, 0) / 1000
); 