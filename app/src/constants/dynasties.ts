import { Dynasty } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * 中国历史朝代常量（夏 → 近现代）
 * 年份负数表示公元前（BC），正数表示公元后（AD）
 * 不入库，仅作为前端常量使用
 */
export const DYNASTIES: Dynasty[] = [
  { id: 1,  name: '夏',       startYear: -2070, endYear: -1600, order: 1 },
  { id: 2,  name: '商',       startYear: -1600, endYear: -1046, order: 2 },
  { id: 3,  name: '西周',     startYear: -1046, endYear: -771,  order: 3 },
  { id: 4,  name: '东周·春秋', startYear: -770,  endYear: -476,  order: 4 },
  { id: 5,  name: '东周·战国', startYear: -475,  endYear: -221,  order: 5 },
  { id: 6,  name: '秦',       startYear: -221,  endYear: -207,  order: 6 },
  { id: 7,  name: '西汉',     startYear: -206,  endYear: 8,     order: 7 },
  { id: 8,  name: '新',       startYear: 9,     endYear: 23,    order: 8 },
  { id: 9,  name: '东汉',     startYear: 25,    endYear: 220,   order: 9 },
  { id: 10, name: '三国·魏',  startYear: 220,   endYear: 265,   order: 10 },
  { id: 11, name: '三国·蜀',  startYear: 221,   endYear: 263,   order: 11 },
  { id: 12, name: '三国·吴',  startYear: 222,   endYear: 280,   order: 12 },
  { id: 13, name: '西晋',     startYear: 265,   endYear: 316,   order: 13 },
  { id: 14, name: '东晋',     startYear: 317,   endYear: 420,   order: 14 },
  { id: 15, name: '南北朝',   startYear: 420,   endYear: 589,   order: 15 },
  { id: 16, name: '隋',       startYear: 581,   endYear: 618,   order: 16 },
  { id: 17, name: '唐',       startYear: 618,   endYear: 907,   order: 17 },
  { id: 18, name: '五代十国', startYear: 907,   endYear: 960,   order: 18 },
  { id: 19, name: '北宋',     startYear: 960,   endYear: 1127,  order: 19 },
  { id: 20, name: '南宋',     startYear: 1127,  endYear: 1279,  order: 20 },
  { id: 21, name: '辽',       startYear: 916,   endYear: 1125,  order: 21 },
  { id: 22, name: '金',       startYear: 1115,  endYear: 1234,  order: 22 },
  { id: 23, name: '元',       startYear: 1271,  endYear: 1368,  order: 23 },
  { id: 24, name: '明',       startYear: 1368,  endYear: 1644,  order: 24 },
  { id: 25, name: '清',       startYear: 1636,  endYear: 1912,         order: 25 },
  { id: 26, name: '近现代',   startYear: 1912,  endYear: CURRENT_YEAR, order: 26 },
];
