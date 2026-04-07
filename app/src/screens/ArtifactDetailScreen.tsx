import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Artifact, Exhibition } from '../types';
import { getArtifactById, deleteArtifact, getExhibitionById } from '../db';
import { parseJsonArray } from '../utils/json';
import { FONT_KAITI, FONT_TIMES } from '../constants/fonts';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtifactDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatYear(year: number): string {
  if (year < 0) return `BC${Math.abs(year)}`;
  return `${year}`;
}

export default function ArtifactDetailScreen({ route, navigation }: Props) {
  const { artifactId } = route.params;
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);

  useFocusEffect(
    useCallback(() => {
      const a = getArtifactById(artifactId);
      setArtifact(a);
      if (a) {
        setExhibition(getExhibitionById(a.exhibition_id));
      } else {
        setExhibition(null);
      }
    }, [artifactId]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ArtifactEdit', { artifactId })}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#c0392b' }]}>删除</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  });

  function handleDelete() {
    Alert.alert('确认删除', '删除后文物记录及照片将无法恢复，确认删除？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteArtifact(artifactId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!artifact) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>文物不存在或已被删除</Text>
      </View>
    );
  }

  const photos = parseJsonArray(artifact.photos);
  const tags = parseJsonArray(artifact.tags);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 照片横向滚动 */}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroller}
        >
          {photos.map((uri, i) => (
            <Image
              key={`${uri}-${i}`}
              source={{ uri }}
              style={styles.photo}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.infoSection}>
        {/* 文物名称 */}
        <Text style={styles.artifactName}>{artifact.name}</Text>

        {/* 年代 & 朝代 */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>年代</Text>
          <Text style={styles.metaValue}>
            {formatYear(artifact.year)} · {artifact.dynasty}
          </Text>
        </View>

        {/* 所属展览（可点击） */}
        {exhibition && (
          <TouchableOpacity
            style={styles.metaRow}
            activeOpacity={0.6}
            onPress={() =>
              navigation.navigate('ExhibitionDetail', {
                exhibitionId: exhibition.id,
              })
            }
          >
            <Text style={styles.metaLabel}>展览</Text>
            <Text style={[styles.metaValue, styles.linkText]}>
              {exhibition.name} · {exhibition.museum}
            </Text>
          </TouchableOpacity>
        )}

        {/* 文物说明 */}
        {artifact.description ? (
          <View style={styles.textBlock}>
            <Text style={styles.blockLabel}>文物说明</Text>
            <Text style={styles.blockText}>{artifact.description}</Text>
          </View>
        ) : null}

        {/* 个人备注 */}
        {artifact.note ? (
          <View style={styles.textBlock}>
            <Text style={styles.blockLabel}>个人备注</Text>
            <Text style={styles.blockText}>{artifact.note}</Text>
          </View>
        ) : null}

        {/* 标签 */}
        {tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.blockLabel}>标签</Text>
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f1e1' },
  content: { paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f1e1' },
  emptyText: { fontSize: 16, color: '#999' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { paddingHorizontal: 4 },
  headerBtnText: { fontSize: 16, fontWeight: '600', color: '#4A90D9' },

  // 照片
  photoScroller: { height: SCREEN_WIDTH * 0.75 },
  photo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75 },

  // 信息区
  infoSection: { padding: 16 },
  artifactName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d3c9b4',
  },
  metaLabel: {
    width: 60,
    fontSize: 14,
    color: '#888',
    fontFamily: FONT_KAITI,
  },
  metaValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontFamily: FONT_TIMES,
  },
  linkText: { color: '#4A90D9', textDecorationLine: 'underline' },

  textBlock: { marginTop: 20 },
  blockLabel: {
    fontSize: 14,
    color: '#888',
    fontFamily: FONT_KAITI,
    marginBottom: 6,
  },
  blockText: { fontSize: 15, color: '#333', lineHeight: 24 },

  tagsSection: { marginTop: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tagChip: {
    backgroundColor: '#ede9d9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#d3c9b4',
  },
  tagText: { fontSize: 13, color: '#5C5649' },
});
