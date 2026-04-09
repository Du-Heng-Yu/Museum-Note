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
  12: '#D8C5B5', // 三国·魏 — 暖棕渐深
  13: '#D8C5B5', // 三国·蜀 — 同上
  14: '#D8C5B5', // 三国·吴 — 同上
  15: '#e5c9be', // 西晋 — 温暖浅棕
  16: '#e5c9be', // 东晋 — 温暖浅棕
  17: '#e5c9be', // 南北朝 — 温暖浅棕
  18: '#e0d1ad', // 隋 — 过渡色
  19: '#e0d1ad', // 唐 — 深蓝（参考展开图）
  20: '#e0d1ad', // 五代十国 — 暖米色
  21: '#bfd3c8', // 北宋 — 浅桃/salmon
  22: '#bfd3c8', // 辽 — 浅桃
  23: '#cfdcd4', // 南宋 — 浅桃
  24: '#cfdcd4', // 金 — 浅桃
  25: '#f0cfb9', // 元 — 浅暖
  26: '#e6d8b4', // 明 — 暖米/棕
  27: '#e6d8b4', // 清 — 偏粉米
  28: '#d7d6d4', // 中华民国 — 浅奶油
  29: '#d7d6d4', // 中华人民共和国 — 暖米/桃
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
