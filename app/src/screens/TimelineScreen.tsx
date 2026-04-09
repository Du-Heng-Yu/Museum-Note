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
const CARD_H_PAD = 16;
const GRID_GAP = 5;
const GRID_COLUMNS = 3;
const MINI_CARD_WIDTH = 65;
const MINI_OVERLAP = 10;
const GRID_CONTENT_WIDTH = SCREEN_WIDTH - 24 - 1 - CARD_H_PAD * 2;
const ARTIFACT_CARD_WIDTH =
  Math.floor((GRID_CONTENT_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

// ── 字体常量来自 src/constants/fonts.ts ──

// ── 展开态配色 ──
const EXPANDED_BG = '#233f5d';
const EXPANDED_TEXT = '#d3bb86';

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

// ══════════════════════════════════════════
// 默认态：右侧小缩略图（带背景 + 衬线 + 阴影）
// ══════════════════════════════════════════
function MiniThumbnail({ artifact, index }: { artifact: Artifact; index: number }) {
  const photos = parseJsonArray(artifact.photos);
  const hasPhoto = photos.length > 0;

  return (
    <View style={[styles.miniCard, index > 0 && { marginLeft: -MINI_OVERLAP }]}>
      <View style={styles.miniCardInner}>
        <View style={styles.miniInnerBorder} pointerEvents="none" />
        {hasPhoto ? (
          <Image
            source={{ uri: photos[0] }}
            style={styles.miniPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.miniPhoto, styles.miniPlaceholder]}>
            <Text style={styles.miniPlaceholderIcon}>🏛</Text>
          </View>
        )}
        <Text style={styles.miniName} numberOfLines={1}>
          {artifact.name}
        </Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// 展开态：可点击文物卡片（同风格，更大）
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
// TimelineScreen
// ══════════════════════════════════════════
export default function TimelineScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [expandedDynastyId, setExpandedDynastyId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const cardYPositions = useRef<Record<number, number>>({});
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
    );
  }

  // ══════════════════════════════════════════
  // 主渲染
  // ══════════════════════════════════════════
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {sortedDynasties.map((dynasty) => {
        const items = artifactsByDynasty.get(dynasty.name) ?? [];
        const isExpanded = expandedDynastyId === dynasty.id;
        const bgColor = isExpanded ? EXPANDED_BG : getDynastyCardColor(dynasty.order);
        const textColor = isExpanded ? EXPANDED_TEXT : '#1a1a1a';
        const subTextColor = isExpanded ? EXPANDED_TEXT : '#1a1a1a';
        const borderColor = isExpanded ? 'rgba(211,187,134,0.3)' : '#d3c9b4';

        return (
          <View
            key={dynasty.id}
            style={[
              styles.dynastyCard,
              { backgroundColor: bgColor, borderColor },
            ]}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              cardYPositions.current[dynasty.id] = y;
              if (pendingScrollTarget.current === dynasty.id) {
                pendingScrollTarget.current = null;
                scrollRef.current?.scrollTo({ y, animated: true });
              }
            }}
          >
            {/* 展开态内边框 */}
            {isExpanded && (
              <View style={styles.innerBorder} pointerEvents="none" />
            )}

            {/* ── 顶部区域：点击展开/收起 ── */}
            <Pressable
              onPress={() => toggleExpand(dynasty.id)}
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleArea}>
                  <Text style={[styles.dynastyName, { color: textColor }]}>
                    {dynasty.name}
                  </Text>
                  <Text style={[styles.dynastyYears, { color: subTextColor }]}>
                    {formatYearRange(dynasty.startYear, dynasty.endYear)}
                  </Text>
                </View>

                {/* 默认态右侧缩略图 */}
                {!isExpanded && items.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.miniList}
                    contentContainerStyle={styles.miniListContent}
                    scrollEnabled
                  >
                    {items.map((artifact, idx) => (
                      <MiniThumbnail key={artifact.id} artifact={artifact} index={idx} />
                    ))}
                  </ScrollView>
                )}
              </View>
            </Pressable>

            {/* ── 展开态：文物网格 ── */}
            {isExpanded && items.length > 0 && (
              <View style={styles.expandedGrid}>
                {items.map((artifact) => (
                  <ExpandedArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onPress={() =>
                      navigation.navigate('ArtifactDetail', {
                        artifactId: artifact.id,
                      })
                    }
                  />
                ))}
              </View>
            )}

            {/* 展开态文物统计 */}
            {isExpanded && (
              <Text style={[styles.noArtifacts, { color: EXPANDED_TEXT }]}>
                {items.length === 0 ? '暂无文物记录' : `已记录${items.length}件文物`}
              </Text>
            )}
          </View>
        );
      })}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ══════════════════════════════════════════
// 样式
// ══════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },

  // ── 朝代卡片（带衬线边框）──
  dynastyCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: CARD_H_PAD,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 65,
  },
  cardTitleArea: {
    minWidth: 100,
    marginRight: 12,
  },
  dynastyName: {
    fontSize: 30,
    fontFamily: FONT_KAITI,
    letterSpacing: -1,
    color: '#1a1a1a',
  },
  dynastyYears: {
    fontSize: 16,
    fontFamily: FONT_TIMES,
    marginLeft: 4,
    color: '#1a1a1a',
  },

  // ── 默认态：小缩略图卡片（带背景 + 衬线 + 阴影）──
  miniList: {
    flex: 1,
    maxHeight: 120,
  },
  miniListContent: {
    alignItems: 'center',
    gap: 0,
  },
  miniCard: {
    marginTop: 4,
    width: MINI_CARD_WIDTH,
    alignItems: 'center',
    height: 66,
    elevation: 3,
        // 阴影
    shadowColor: '#8a8a8a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    overflow: 'hidden',
  },
  miniCardInner: {
    width: 53,
    backgroundColor: '#ede9d9',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#d3c9b4',
    padding: 3,
    alignItems: 'center',

  },
  miniInnerBorder: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 0.5,
    borderColor: '#d9d6c6',
    borderRadius: 10,
  },
  miniPhoto: {
    width: 42,
    height: 42,
    borderRadius: 5,
  },
  miniPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlaceholderIcon: {
    fontSize: 20,
  },
  miniName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 3,
    textAlign: 'center',
    // fontFamily: FONT_KAITI,
  },

  // ── 展开态：文物网格卡片（同风格，更大）──
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: 10,
    marginBottom: 4,
  },
  expandedCard: {
    width: ARTIFACT_CARD_WIDTH,
    alignItems: 'center',
    // 阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 2,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 2,
    // fontFamily: FONT_KAITI,
  },

  noArtifacts: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FONT_KAITI,
  },

  // ── 底部留白 ──
  bottomSpacer: {
    height: 90,
  },

  // ── 空状态 ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
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
