/**
 * 朝代卡片背景颜色序列
 * 颜色参考：doc/朝代卡片颜色.png
 * 按 dynasty order 索引（order 1 = 旧石器时代, order 29 = 中华人民共和国）
 */

// 索引 0 未使用（order 从 1 开始），索引 1~29 对应 order 1~29
const DYNASTY_CARD_COLORS: Record<number, string> = {
  1:  '#c5b6a3', // 旧石器时代 — 灰色
  2:  '#BDB8A5', // 新石器时代 — 灰绿
  3:  '#C5C0AD', // 夏 — 浅灰绿/sage
  4:  '#A8B0A0', // 商 — 橄榄绿
  5:  '#9AAA98', // 西周 — sage 绿
  6:  '#A5B5A0', // 东周·春秋 — 浅sage
  7:  '#A0AE9A', // 东周·战国 — sage 绿
  8:  '#D4A8A0', // 秦 — 偏粉/salmon
  9:  '#CCAF9A', // 西汉 — 暖棕
  10: '#CCAF9A', // 新 — 暖棕
  11: '#CCAF9A', // 东汉 — 暖棕
  12: '#D8C5B5', // 三国 — 暖棕渐深
  13: '#D8C5B5', // 西晋 — 温暖浅棕
  14: '#D8C5B5', // 东晋 — 温暖浅棕
  15: '#D8C5B5', // 十六国 — 温暖浅棕
  16: '#D8C5B5', // 南北朝 — 温暖浅棕
  17: '#c1c5c6', // 隋 — 过渡色
  18: '#c1c5c6', // 唐 — 过渡色
  19: '#c1c5c6', // 五代十国 — 暖米色
  20: '#ccd3d4bf', // 辽 — 浅桃/salmon
  21: '#ccd3d4bf', // 北宋 — 浅桃/salmon
  22: '#ccd3d4bf', // 南宋 — 浅桃
  23: '#ddca9fdb', // 西夏 — 浅桃
  24: '#ddca9fdb', // 金 — 浅暖
  25: '#ddca9fdb', // 元 — 浅暖
  26: '#e8d9b6ed', // 明 — 暖米/棕
  27: '#e8d9b6ed', // 清 — 偏粉米
  28: '#e8d9b655', // 中华民国 — 浅奶油
  29: '#e8d9b655', // 中华人民共和国 — 冷灰蓝
};

/**
 * 根据朝代 order 获取卡片背景色
 */
export function getDynastyCardColor(order: number): string {
  return DYNASTY_CARD_COLORS[order] ?? '#E0D8CC';
}

/**
 * 判断是否为深色背景（展开/选中态统一使用深色）
 * 默认态所有朝代都用黑色文字
 */
export function isDarkBackground(_order: number): boolean {
  return false;
}
