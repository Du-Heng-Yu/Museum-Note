import React, { useState, useCallback, useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Exhibition, Artifact } from '../types';
import { getExhibitionById, getArtifactsByExhibitionId, updateExhibition } from '../db';
import { parseJsonArray } from '../utils/json';
import { copyExhibitionCover } from '../utils/photo';
import { FONT_KAITI, FONT_TIMES } from '../constants/fonts';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitionDetail'>;
type SortKey = 'created' | 'year' | 'name';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 0.46);
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const CARD_H_PAD = 16;
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - CARD_H_PAD * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);
const CARD_IMG_SIZE = CARD_WIDTH - 8;
const COVER_SHEET_HEIGHT = 140;
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'created', label: '按添加时间（新-旧）' },
  { key: 'year', label: '按年代（早-晚）' },
  { key: 'name', label: '按首字母（A-Z）' },
];

export default function ExhibitionDetailScreen({ route, navigation }: Props) {
  const { exhibitionId } = route.params;
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  // 封面底部菜单
  const [coverSheetVisible, setCoverSheetVisible] = useState(false);
  const coverSlideAnim = useRef(new Animated.Value(COVER_SHEET_HEIGHT)).current;
  const [pendingCoverAction, setPendingCoverAction] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setExhibition(getExhibitionById(exhibitionId));
      setArtifacts(getArtifactsByExhibitionId(exhibitionId));
    }, [exhibitionId]),
  );

  const coverPhotoUri = useMemo(() => {
    if (exhibition?.cover_photo) return exhibition.cover_photo;
    for (const item of artifacts) {
      const firstPhoto = parseJsonArray(item.photos)[0];
      if (firstPhoto) return firstPhoto;
    }
    return null;
  }, [exhibition, artifacts]);

  const sortedArtifacts = useMemo(() => {
    const list = [...artifacts];

    if (sortKey === 'year') {
      return list.sort((a, b) => a.year - b.year || b.id - a.id);
    }

    if (sortKey === 'name') {
      return list.sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' }),
      );
    }

    return list.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return safeBTime - safeATime || b.id - a.id;
    });
  }, [artifacts, sortKey]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('ExhibitionEdit', { exhibitionId })}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>编辑</Text>
        </TouchableOpacity>
      ),
    });
  });
  const openCoverSheet = useCallback(() => {
    setCoverSheetVisible(true);
    Animated.spring(coverSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [coverSlideAnim]);

  const closeCoverSheet = useCallback(() => {
    Animated.timing(coverSlideAnim, {
      toValue: COVER_SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCoverSheetVisible(false);
    });
  }, [coverSlideAnim]);

  useEffect(() => {
    if (coverSheetVisible || !pendingCoverAction) return;

    const timer = setTimeout(async () => {
      setPendingCoverAction(false);
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: false,
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const privateUri = await copyExhibitionCover(result.assets[0].uri, exhibitionId);
          const uriWithCacheBust = `${privateUri}?t=${Date.now()}`;
          updateExhibition(exhibitionId, { cover_photo: uriWithCacheBust });
          setExhibition(getExhibitionById(exhibitionId));
        }
      } catch (e) {
        console.warn('[CoverUpload] 打开相册失败:', e);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [coverSheetVisible, pendingCoverAction, exhibitionId]);

  function handleUploadCover() {
    setPendingCoverAction(true);
    closeCoverSheet();
  }

  if (!exhibition) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>展览不存在或已被删除</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      onScrollBeginDrag={() => setIsSortMenuVisible(false)}
    >
      {/* 头图区域 */}
      <TouchableOpacity activeOpacity={0.8} onPress={openCoverSheet}>
        <View style={styles.heroContainer}>
          {coverPhotoUri ? (
            <Image source={{ uri: coverPhotoUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>点击添加展览封面</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* 展览信息头 */}
      <View style={styles.infoCard}>
        <Text style={styles.exName}>{exhibition.name}</Text>
        <Text style={styles.exMuseum}>{exhibition.museum}</Text>
        <Text style={styles.exDate}>参观日期：{exhibition.visit_date}</Text>
        {exhibition.description ? (
          <Text style={styles.exDesc}>{exhibition.description}</Text>
        ) : null}
      </View>

      {/* 文物网格 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>文物列表（共 {artifacts.length} 件文物）</Text>

        <View style={styles.sortWrap}>
          <TouchableOpacity
            style={styles.sortTrigger}
            activeOpacity={0.75}
            
            onPress={() => setIsSortMenuVisible((prev) => !prev)}
          >
            <Text style={styles.sortTriggerText}>排序</Text>
            <Text style={styles.sortTriggerCaret}>▾</Text>
          </TouchableOpacity>

          {isSortMenuVisible && (
            <View style={styles.sortMenu}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortMenuItem,
                    sortKey === option.key && styles.sortMenuItemActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSortKey(option.key);
                    setIsSortMenuVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      sortKey === option.key && styles.sortMenuItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {artifacts.length === 0 ? (
        <View style={styles.emptyArtifacts}>
          <Text style={styles.emptyArtifactsText}>
            该展览下暂无文物记录{'\n'}点击首页下方 + 开始录入
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {sortedArtifacts.map((item) => {
            const photos = parseJsonArray(item.photos);
            const thumb = photos.length > 0 ? photos[0] : null;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.artifactCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ArtifactDetail', { artifactId: item.id })}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.artifactImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.artifactImg, styles.placeholder]}>
                    <Text style={styles.placeholderText}>📷</Text>
                  </View>
                )}
                <Text style={styles.artifactName} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>

      {/* 封面上传 Bottom Sheet */}
      <Modal visible={coverSheetVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={closeCoverSheet}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.sheetContainer, { transform: [{ translateY: coverSlideAnim }] }]}
              >
                <View style={styles.sheetHandle} />
                <TouchableOpacity style={styles.sheetItem} onPress={handleUploadCover}>
                  <Text style={styles.sheetIcon}>🖼</Text>
                  <View>
                    <Text style={styles.sheetItemTitle}>上传展览封面</Text>
                    <Text style={styles.sheetItemSub}>从相册选择一张图片作为封面</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  headerBtn: { paddingHorizontal: Spacing.xs },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: Colors.accent },

  // 头图
  heroContainer: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: Colors.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontFamily: FONT_KAITI,
  },

  // 展览信息
  infoCard: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exName: {
    fontSize: FontSize.h1,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  exMuseum: { fontFamily: FONT_KAITI, fontSize: 15, color: Colors.text, opacity: 0.7, marginBottom: Spacing.xs },
  exDate: { fontFamily: FONT_KAITI, fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  exDesc: {  fontSize: FontSize.body, color: Colors.text, opacity: 0.8, lineHeight: 22, marginTop: Spacing.xs },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_KAITI, color: Colors.text },
  sortWrap: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 3,
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
  },
  sortTriggerText: {
    fontSize: FontSize.body,
    color: Colors.text,
    fontFamily: FONT_KAITI,
    marginRight: 4,
  },
  sortTriggerCaret: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sortMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    minWidth: 112,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 4,
  },
  sortMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 150,
  },
  sortMenuItemActive: {
    backgroundColor: Colors.card,
  },
  sortMenuItemText: {
    fontSize: FontSize.body,
    color: Colors.text,
    fontFamily: FONT_KAITI,
  },
  sortMenuItemTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_H_PAD,
    gap: GRID_GAP,
  },
  artifactCard: {
    width: CARD_WIDTH,
    backgroundColor: '#f6edd6',
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  artifactImg: {
    width: CARD_IMG_SIZE,
    height: CARD_IMG_SIZE,
    borderRadius: 6,
  },
  placeholder: {
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  placeholderText: { fontSize: 24 },
  artifactName: {
    fontSize: FontSize.caption,
    color: Colors.text,
    fontFamily: FONT_TIMES,
    marginTop: Spacing.xs,
    marginBottom: 2,
    textAlign: 'center',
  },

  // Empty artifacts
  emptyArtifacts: { alignItems: 'center', paddingTop: 40 },
  emptyArtifactsText: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: FONT_KAITI },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  sheetItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  sheetItemSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
