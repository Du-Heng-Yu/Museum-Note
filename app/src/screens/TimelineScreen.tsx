import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  LayoutAnimation,
  StyleSheet,
  Dimensions,
  Platform,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, Artifact, Dynasty } from '../types';
import { getAllArtifacts } from '../db';
import { DYNASTIES } from '../constants/dynasties';
import { getDynastyCardColor } from '../constants/dynastyColors';
import { FONT_KAITI, FONT_TIMES } from '../constants/fonts';
import { parseJsonArray } from '../utils';
import { Colors, Spacing, FontSize, Radius } from '../constants/theme';

// ── Android LayoutAnimation ──
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── 时间轴布局 ──
const YEAR_COL_W = 44;
const LINE_COL_W = 22;
const SCROLL_PAD_R = 14;
const CARD_H_PAD = 12;
const CARD_V_PAD = 8;
const GRID_GAP = 5;
const GRID_COLUMNS = 3;
const ITEMS_PER_PAGE = GRID_COLUMNS * 3;
const ROW_SPACING = 8;

const CARD_AREA_W = SCREEN_WIDTH - YEAR_COL_W - LINE_COL_W - SCROLL_PAD_R;
const GRID_CONTENT_W = CARD_AREA_W - CARD_H_PAD * 2;
const ARTIFACT_CARD_WIDTH =
  Math.floor((GRID_CONTENT_W - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

// ── 时间轴线 ──
const DOT_SIZE = 8;
const DOT_SIZE_ACTIVE = 10;
const DOT_TOP = 22;
const LINE_W = 1.5;

// ── 展开态配色 ──
const EXPANDED_BG = '#2f4858';
const EXPANDED_TEXT = '#f3ce7d';

// ══════════════════════════════════════════
// 年份格式化
// ══════════════════════════════════════════
function formatYear(year: number): string {
  if (year < 0) return `BC${Math.abs(year)}`;
  return `${year}`;
}

function formatYearRange(startYear: number, endYear: number): string {
  return `${formatYear(startYear)}-${formatYear(endYear)}`;
}

function formatTimelineYear(year: number): string {
  const absYear = Math.abs(year);
  const prefix = year < 0 ? '前' : '';
  if (absYear >= 10000) {
    const wan = Math.round(absYear / 10000);
    return `${prefix}${wan}万`;
  }
  return `${prefix}${absYear}`;
}

// ══════════════════════════════════════════
// 展开态：可点击文物卡片
// ══════════════════════════════════════════
function ExpandedArtifactCard({
  artifact,
  onPress,
}: {
  artifact: Artifact;
  onPress: () => void;
}) {
  const photos = parseJsonArray(artifact.photos);
  const hasPhoto = photos.length > 0;
  const photoSize = ARTIFACT_CARD_WIDTH - 8;

  return (
    <TouchableOpacity
      style={styles.expandedCard}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.expandedCardInner}>
        <View style={styles.expandedInnerBorder} pointerEvents="none" />
        {hasPhoto ? (
          <Image
            source={{ uri: photos[0] }}
            style={[styles.expandedPhoto, { width: photoSize, height: photoSize }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.expandedPhoto,
              styles.expandedPlaceholder,
              { width: photoSize, height: photoSize },
            ]}
          >
            <Text style={styles.expandedPlaceholderIcon}>🏛</Text>
          </View>
        )}
        <Text style={styles.expandedName} numberOfLines={2}>
          {artifact.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════
// 分页文物网格
// ══════════════════════════════════════════
function PagedArtifactGrid({
  items,
  onPressArtifact,
}: {
  items: Artifact[];
  onPressArtifact: (id: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = useMemo(() => {
    const result: Artifact[][] = [];
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      result.push(items.slice(i, i + ITEMS_PER_PAGE));
    }
    return result;
  }, [items]);

  const totalPages = pages.length;

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / GRID_CONTENT_W);
      setCurrentPage(page);
    },
    [],
  );

  return (
    <View style={styles.pagedGridContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ width: GRID_CONTENT_W }}
        nestedScrollEnabled
      >
        {pages.map((pageItems, pageIdx) => (
          <View key={pageIdx} style={[styles.gridPage, { width: GRID_CONTENT_W }]}>
            {pageItems.map((artifact) => (
              <ExpandedArtifactCard
                key={artifact.id}
                artifact={artifact}
                onPress={() => onPressArtifact(artifact.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      {totalPages > 1 && (
        <View style={styles.dotsRow}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[styles.pageDot, currentPage === i && styles.pageDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════
// TimelineScreen
// ══════════════════════════════════════════
export default function TimelineScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [expandedDynastyId, setExpandedDynastyId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const rowYPositions = useRef<Record<number, number>>({});
  const pendingScrollTarget = useRef<number | null>(null);

  // ── 数据刷新 ──
  useFocusEffect(
    useCallback(() => {
      setArtifacts(getAllArtifacts());
    }, []),
  );

  // ── 按朝代分组 ──
  const artifactsByDynasty = useMemo(() => {
    const map = new Map<string, Artifact[]>();
    for (const a of artifacts) {
      const list = map.get(a.dynasty) ?? [];
      list.push(a);
      map.set(a.dynasty, list);
    }
    return map;
  }, [artifacts]);

  // ── 按 order 降序（近 → 远）──
  const sortedDynasties = useMemo(
    () => [...DYNASTIES].sort((a, b) => b.order - a.order),
    [],
  );

  // ── 展开/收起切换 ──
  const toggleExpand = useCallback((dynastyId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDynastyId((prev) => {
      const next = prev === dynastyId ? null : dynastyId;
      if (next !== null) {
        pendingScrollTarget.current = dynastyId;
      }
      return next;
    });
  }, []);

  // ══════════════════════════════════════════
  // 空状态
  // ══════════════════════════════════════════
  if (artifacts.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>时间轴</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyScroll}>📜</Text>
          <TouchableOpacity
            onLongPress={() => navigation.navigate('DevTest')}
            activeOpacity={1}
          >
            <Text style={styles.emptyTitle}>历史长卷已铺开</Text>
          </TouchableOpacity>
          <Text style={styles.emptyHint}>
            {'点击下方 + 号\n录入你的第一件文物记录'}
          </Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // 主渲染
  // ══════════════════════════════════════════
  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>时间轴 Timeline</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedDynasties.map((dynasty, index) => {
          const items = artifactsByDynasty.get(dynasty.name) ?? [];
          const isExpanded = expandedDynastyId === dynasty.id;
          const isFirst = index === 0;
          const isLast = index === sortedDynasties.length - 1;
          const bgColor = isExpanded
            ? EXPANDED_BG
            : getDynastyCardColor(dynasty.order);
          const textColor = isExpanded ? EXPANDED_TEXT : '#1a1a1a';
          const borderColor = isExpanded
            ? 'rgba(211,187,134,0.3)'
            : '#d3c9b4';
          const countColor = isExpanded ? EXPANDED_TEXT : Colors.textSecondary;

          return (
            <View
              key={dynasty.id}
              style={[
                styles.timelineRow,
                !isLast && { paddingBottom: ROW_SPACING },
              ]}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                rowYPositions.current[dynasty.id] = y;
                if (pendingScrollTarget.current === dynasty.id) {
                  pendingScrollTarget.current = null;
                  scrollRef.current?.scrollTo({ y, animated: true });
                }
              }}
            >
              {/* ── 年份列 ── */}
              <View style={styles.yearCol}>
                <Text
                  style={[
                    styles.yearText,
                    isExpanded && { color: Colors.accent },
                  ]}
                  numberOfLines={1}
                >
                  {formatTimelineYear(dynasty.startYear)}
                </Text>
              </View>

              {/* ── 时间轴线列 ── */}
              <View style={styles.lineCol}>
                {!isFirst && (
                  <View
                    style={[
                      styles.lineSegment,
                      {
                        top: -ROW_SPACING,
                        height: DOT_TOP + DOT_SIZE / 2 + ROW_SPACING,
                      },
                    ]}
                  />
                )}
                {!isLast && (
                  <View
                    style={[
                      styles.lineSegment,
                      {
                        top: DOT_TOP + DOT_SIZE / 2,
                        bottom: -ROW_SPACING,
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.timelineDot,
                    isExpanded && styles.timelineDotActive,
                  ]}
                />
              </View>

              {/* ── 卡片列 ── */}
              <View style={styles.cardCol}>
                <View
                  style={[
                    styles.dynastyCard,
                    { backgroundColor: bgColor, borderColor },
                  ]}
                >
                  {isExpanded && (
                    <View style={styles.innerBorder} pointerEvents="none" />
                  )}

                  {/* 卡片头部 */}
                  <Pressable
                    onPress={() => toggleExpand(dynasty.id)}
                    style={({ pressed }) =>
                      pressed ? { opacity: 0.7 } : undefined
                    }
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.dynastyName, { color: textColor }]}>
                        {dynasty.name}
                      </Text>
                    </View>
                    <View style={styles.cardMetaRow}>
                      <Text
                        style={[styles.dynastyYears, { color: textColor }]}
                      >
                        {formatYearRange(dynasty.startYear, dynasty.endYear)}
                      </Text>
                      <Text
                        style={[styles.artifactCount, { color: countColor }]}
                      >
                        共 {items.length} 件文物
                      </Text>
                    </View>
                  </Pressable>

                  {/* 展开态：分页文物网格 */}
                  {isExpanded && items.length > 0 && (
                    <PagedArtifactGrid
                      items={items}
                      onPressArtifact={(id) =>
                        navigation.navigate('ArtifactDetail', {
                          artifactId: id,
                        })
                      }
                    />
                  )}

                  {isExpanded && items.length === 0 && (
                    <Text
                      style={[styles.noArtifacts, { color: EXPANDED_TEXT }]}
                    >
                      暂无文物记录
                    </Text>
                  )}

                  {/* 展开/收起箭头 */}
                  <Pressable
                    onPress={() => toggleExpand(dynasty.id)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.chevronPressable,
                      pressed && { opacity: 0.5 },
                    ]}
                  >
                    <View
                      style={[
                        styles.chevronIcon,
                        {
                          borderColor: isExpanded
                            ? EXPANDED_TEXT
                            : Colors.textSecondary,
                          transform: [
                            { rotate: isExpanded ? '135deg' : '-45deg' },
                          ],
                        },
                      ]}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.timelineSourceNote}>
          *时间轴划分参考来源：中国国家博物馆《中国古代历史年表》
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════
// 样式
// ══════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── 顶部标题栏 ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: FontSize.h2,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: Colors.text,
  },

  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: SCROLL_PAD_R,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },

  // ── 时间轴行 ──
  timelineRow: {
    flexDirection: 'row',
  },

  // ── 年份列 ──
  yearCol: {
    width: YEAR_COL_W,
    alignItems: 'flex-end',
    // paddingRight: 0,
    paddingTop: DOT_TOP - 4,
  },
  yearText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: FONT_KAITI,
  },

  // ── 时间轴线列 ──
  lineCol: {
    width: LINE_COL_W,
    position: 'relative',
    alignSelf: 'stretch',
  },
  lineSegment: {
    position: 'absolute',
    left: LINE_COL_W / 2 - LINE_W / 2,
    width: LINE_W,
    backgroundColor: Colors.border,
  },
  timelineDot: {
    position: 'absolute',
    top: DOT_TOP,
    left: LINE_COL_W / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.accent,
  },
  timelineDotActive: {
    width: DOT_SIZE_ACTIVE,
    height: DOT_SIZE_ACTIVE,
    borderRadius: DOT_SIZE_ACTIVE / 2,
    left: LINE_COL_W / 2 - DOT_SIZE_ACTIVE / 2,
    top: DOT_TOP - (DOT_SIZE_ACTIVE - DOT_SIZE) / 2,
    backgroundColor: EXPANDED_TEXT,
  },

  // ── 卡片列 ──
  cardCol: {
    flex: 1,
  },

  // ── 朝代卡片 ──
  dynastyCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: CARD_H_PAD,
    paddingTop: CARD_V_PAD,
    paddingBottom: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  innerBorder: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 0.5,
    borderColor: '#d3bb86',
    borderRadius: 11,
  },
  cardHeader: {
    marginTop: 2,
  },
  dynastyName: {
    fontSize: 26,
    fontFamily: FONT_KAITI,
    letterSpacing: -1,
    lineHeight: 32,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dynastyYears: {
    fontSize: 14,
    fontFamily: FONT_TIMES,
  },
  artifactCount: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontFamily: FONT_KAITI,
  },

  // ── 展开/收起箭头 ──
  chevronPressable: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  chevronIcon: {
    width: 8,
    height: 8,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
  },

  // ── 分页网格 ──
  pagedGridContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  gridPage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pageDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EXPANDED_TEXT,
  },

  // ── 展开态文物卡片 ──
  expandedCard: {
    width: ARTIFACT_CARD_WIDTH,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 3,
  },
  expandedCardInner: {
    width: '100%',
    backgroundColor: '#ede9d9',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#d9d6c6',
    padding: 3,
    alignItems: 'center',
    overflow: 'hidden',
  },
  expandedInnerBorder: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 0.5,
    borderColor: '#d9d2bc',
    borderRadius: 9,
    zIndex: 1,
  },
  expandedPhoto: {
    borderRadius: 6,
  },
  expandedPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedPlaceholderIcon: {
    fontSize: 28,
    color: '#C0B8A8',
  },
  expandedName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },

  noArtifacts: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FONT_KAITI,
  },

  timelineSourceNote: {
    marginTop: 35,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    opacity: 0.95,
    fontFamily: FONT_KAITI,
  },

  // ── 底部留白 ──
  bottomSpacer: {
    height: 25,
  },

  // ── 空状态 ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyScroll: {
    fontSize: 52,
    marginBottom: Spacing.xl,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: FontSize.h2 + 2,
    fontWeight: '600',
    fontFamily: FONT_KAITI,
    color: Colors.text,
    letterSpacing: 3,
    marginBottom: 14,
  },
  emptyHint: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: FONT_KAITI,
  },
});