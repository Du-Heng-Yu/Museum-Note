export interface DynastyRange {
  name: string;
  startYear: number;
  endYear: number;
}

export const DYNASTY_RANGES: DynastyRange[] = [
  { name: '先秦', startYear: -2100, endYear: -221 },
  { name: '秦', startYear: -221, endYear: -206 },
  { name: '西汉', startYear: -202, endYear: 8 },
  { name: '新', startYear: 9, endYear: 23 },
  { name: '东汉', startYear: 25, endYear: 220 },
  { name: '三国', startYear: 220, endYear: 280 },
  { name: '西晋', startYear: 266, endYear: 316 },
  { name: '东晋', startYear: 317, endYear: 420 },
  { name: '南北朝', startYear: 420, endYear: 589 },
  { name: '隋', startYear: 581, endYear: 618 },
  { name: '唐', startYear: 618, endYear: 907 },
  { name: '五代十国', startYear: 907, endYear: 979 },
  { name: '北宋', startYear: 960, endYear: 1127 },
  { name: '南宋', startYear: 1127, endYear: 1279 },
  { name: '元', startYear: 1271, endYear: 1368 },
  { name: '明', startYear: 1368, endYear: 1644 },
  { name: '清', startYear: 1644, endYear: 1912 },
  { name: '近现代', startYear: 1912, endYear: 2100 },
];

export const DYNASTY_OPTIONS = DYNASTY_RANGES.map((item) => item.name);
