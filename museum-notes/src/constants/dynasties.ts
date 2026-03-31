export type DynastySegment = {
  key: string;
  label: string;
  fromYear: number;
  toYear: number;
  rangeLabel: string;
};

// Timeline order follows the product requirement: modern at top to paleolithic at bottom.
export const DYNASTY_SEGMENTS: DynastySegment[] = [
  {
    key: 'modern',
    label: '现代',
    fromYear: 1912,
    toYear: 2026,
    rangeLabel: '1912 - 2026',
  },
  {
    key: 'late-imperial',
    label: '近代',
    fromYear: 1840,
    toYear: 1911,
    rangeLabel: '1840 - 1911',
  },
  {
    key: 'qing',
    label: '清',
    fromYear: 1636,
    toYear: 1840,
    rangeLabel: '1636 - 1840',
  },
  {
    key: 'ming',
    label: '明',
    fromYear: 1368,
    toYear: 1635,
    rangeLabel: '1368 - 1635',
  },
  {
    key: 'yuan',
    label: '元',
    fromYear: 1271,
    toYear: 1367,
    rangeLabel: '1271 - 1367',
  },
  {
    key: 'song',
    label: '宋',
    fromYear: 960,
    toYear: 1270,
    rangeLabel: '960 - 1270',
  },
  {
    key: 'tang',
    label: '唐',
    fromYear: 618,
    toYear: 959,
    rangeLabel: '618 - 959',
  },
  {
    key: 'sui',
    label: '隋',
    fromYear: 581,
    toYear: 617,
    rangeLabel: '581 - 617',
  },
  {
    key: 'wei-jin',
    label: '魏晋南北朝',
    fromYear: 220,
    toYear: 580,
    rangeLabel: '220 - 580',
  },
  {
    key: 'han',
    label: '汉',
    fromYear: -206,
    toYear: 219,
    rangeLabel: '前206 - 219',
  },
  {
    key: 'qin',
    label: '秦',
    fromYear: -221,
    toYear: -207,
    rangeLabel: '前221 - 前207',
  },
  {
    key: 'warring-states',
    label: '战国',
    fromYear: -475,
    toYear: -222,
    rangeLabel: '前475 - 前222',
  },
  {
    key: 'spring-autumn',
    label: '春秋',
    fromYear: -770,
    toYear: -476,
    rangeLabel: '前770 - 前476',
  },
  {
    key: 'zhou',
    label: '西周',
    fromYear: -1046,
    toYear: -771,
    rangeLabel: '前1046 - 前771',
  },
  {
    key: 'shang',
    label: '商',
    fromYear: -1600,
    toYear: -1047,
    rangeLabel: '前1600 - 前1047',
  },
  {
    key: 'xia',
    label: '夏',
    fromYear: -2070,
    toYear: -1601,
    rangeLabel: '前2070 - 前1601',
  },
  {
    key: 'neolithic',
    label: '新石器时代',
    fromYear: -10000,
    toYear: -2071,
    rangeLabel: '前10000 - 前2071',
  },
  {
    key: 'paleolithic',
    label: '旧石器时代',
    fromYear: -2500000,
    toYear: -10001,
    rangeLabel: '前250万 - 前10001',
  },
];

export function findDynastyByYear(year: number): DynastySegment | null {
  return (
    DYNASTY_SEGMENTS.find((segment) => year >= segment.fromYear && year <= segment.toYear) ?? null
  );
}

export function getDynastyByLabel(label: string): DynastySegment | null {
  return DYNASTY_SEGMENTS.find((segment) => segment.label === label) ?? null;
}

export function formatYearLabel(year: number): string {
  if (year < 0) {
    return `前${Math.abs(year)}年`;
  }

  return `${year}年`;
}
