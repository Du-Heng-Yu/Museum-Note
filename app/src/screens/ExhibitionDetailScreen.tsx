import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Exhibition, Artifact } from '../types';
import { getExhibitionById, getArtifactsByExhibitionId } from '../db';
import { parseJsonArray } from '../utils/json';
import { FONT_KAITI } from '../constants/fonts';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitionDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const CARD_H_PAD = 16;
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - CARD_H_PAD * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);
const CARD_IMG_SIZE = CARD_WIDTH - 8;

export default function ExhibitionDetailScreen({ route, navigation }: Props) {
  const { exhibitionId } = route.params;
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useFocusEffect(
    useCallback(() => {
      setExhibition(getExhibitionById(exhibitionId));
      setArtifacts(getArtifactsByExhibitionId(exhibitionId));
    }, [exhibitionId]),
  );

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

  if (!exhibition) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>展览不存在或已被删除</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <Text style={styles.sectionTitle}>文物记录</Text>
        <Text style={styles.sectionCount}>{artifacts.length} 件</Text>
      </View>

      {artifacts.length === 0 ? (
        <View style={styles.emptyArtifacts}>
          <Text style={styles.emptyArtifactsText}>
            该展览下暂无文物记录{'\n'}点击下方 + 开始录入
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {artifacts.map((item) => {
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  headerBtn: { paddingHorizontal: Spacing.xs },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: Colors.accent },

  // 展览信息
  infoCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  exName: {
    fontSize: FontSize.h1,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  exMuseum: { fontSize: 15, color: Colors.text, opacity: 0.7, marginBottom: Spacing.xs },
  exDate: { fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  exDesc: { fontSize: FontSize.body, color: Colors.text, opacity: 0.8, lineHeight: 22, marginTop: Spacing.xs },

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
  sectionCount: { fontSize: FontSize.body, color: Colors.textSecondary },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_H_PAD,
    gap: GRID_GAP,
  },
  artifactCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.xs,
    alignItems: 'center',
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
    fontFamily: FONT_KAITI,
    marginTop: Spacing.xs,
    marginBottom: 2,
    textAlign: 'center',
  },

  // Empty artifacts
  emptyArtifacts: { alignItems: 'center', paddingTop: 40 },
  emptyArtifactsText: { fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: FONT_KAITI },
});
