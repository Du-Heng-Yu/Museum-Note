/**
 * 全局设计令牌 — 基于 UI_color.md 规范
 * 所有页面颜色、间距、圆角、字号统一从这里引用
 */

// ── 配色 ──
export const Colors = {
  /** 主背景（暖米色纸张）*/
  bg: '#f1e9d4',
  /** 卡片 / 模块底色（羊皮纸浅棕）*/
  card: '#ebe4ca',
  /** 边框与分割线 */
  border: '#cec3aa',
  /** 主强调色（沉稳棕金）*/
  accent: '#a18656',
  /** 信息辅助蓝绿（仅少量可点击文本）*/
  info: '#3b86ca',
  /** 危险色（沉稳暗红）*/
  danger: '#ba211b',
  /** 主干文字 */
  text: '#33322E',
  /** 辅助 / 时间文本 */
  textSecondary: '#8C857B',
  /** 输入框背景 */
  inputBg: '#FDFCF8',
  /** 浮层 / 弹窗背景 */
  surface: '#FDFCF8',
  /** 白色 */
  white: '#FFFFFF',
  /** 半透明遮罩 */
  overlay: 'rgba(0,0,0,0.4)',
} as const;

// ── 圆角 ──
export const Radius = {
  /** 大模块（卡片、弹窗）*/
  lg: 12,
  /** 小模块（输入框、标签、缩略图）*/
  sm: 8,
} as const;

// ── 间距（4px 栅格）──
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// ── 字号层级 ──
export const FontSize = {
  /** H1 标题 */
  h1: 24,
  /** H2 副标题 */
  h2: 18,
  /** 正文 */
  body: 14,
  /** 辅助 / 标签 */
  caption: 12,
} as const;

// ── 按钮高度 ──
export const ButtonHeight = 48;

// ── Stack Header 全局配置 ──
export const StackHeaderOptions = {
  headerStyle: { backgroundColor: Colors.bg },
  headerTintColor: Colors.text,
  headerShadowVisible: false,
  headerBackTitleVisible: false,
} as const;
