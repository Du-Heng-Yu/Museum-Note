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
  container: { flex: 1, backgroundColor: '#f7f1e1' },
  content: { paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f1e1' },
  emptyText: { fontSize: 16, color: '#999' },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: '#4A90D9' },

  // 展览信息
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ede9d9',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#d3c9b4',
  },
  exName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  exMuseum: { fontSize: 15, color: '#555', marginBottom: 4 },
  exDate: { fontSize: 14, color: '#888', marginBottom: 8 },
  exDesc: { fontSize: 14, color: '#666', lineHeight: 22, marginTop: 4 },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_KAITI, color: '#1a1a1a' },
  sectionCount: { fontSize: 14, color: '#888' },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_H_PAD,
    gap: GRID_GAP,
  },
  artifactCard: {
    width: CARD_WIDTH,
    backgroundColor: '#ede9d9',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#d3c9b4',
    padding: 4,
    alignItems: 'center',
  },
  artifactImg: {
    width: CARD_IMG_SIZE,
    height: CARD_IMG_SIZE,
    borderRadius: 6,
  },
  placeholder: {
    backgroundColor: '#ddd6c6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 24 },
  artifactName: {
    fontSize: 12,
    color: '#333',
    fontFamily: FONT_KAITI,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },

  // Empty artifacts
  emptyArtifacts: { alignItems: 'center', paddingTop: 40 },
  emptyArtifactsText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },
});
