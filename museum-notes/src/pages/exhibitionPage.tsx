import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { type Artifact, type Exhibition, listArtifacts, listExhibitions } from '../db';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误';
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ExhibitionPage() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadData = async () => {
        try {
          const [nextExhibitions, nextArtifacts] = await Promise.all([
            listExhibitions(),
            listArtifacts(),
          ]);

          if (!active) {
            return;
          }

          setExhibitions(nextExhibitions);
          setArtifacts(nextArtifacts);
        } catch (error) {
          Alert.alert('加载失败', toErrorMessage(error));
        }
      };

      void loadData();

      return () => {
        active = false;
      };
    }, [])
  );

  const artifactCountByExhibition = useMemo(() => {
    const map = new Map<number, number>();

    for (const artifact of artifacts) {
      map.set(artifact.exhibitionId, (map.get(artifact.exhibitionId) ?? 0) + 1);
    }

    return map;
  }, [artifacts]);

  const latestPhotoByExhibition = useMemo(() => {
    const map = new Map<number, string>();

    for (const artifact of artifacts) {
      if (!artifact.photoUri) {
        continue;
      }

      if (!map.has(artifact.exhibitionId)) {
        map.set(artifact.exhibitionId, artifact.photoUri);
      }
    }

    return map;
  }, [artifacts]);

  if (exhibitions.length === 0) {
    return (
      <View style={styles.emptyExhibitionWrap}>
        <Text style={styles.emptyExhibitionTitle}>还没有展览</Text>
        <Text style={styles.emptyExhibitionHint}>点击底部 + 新建第一条文物并创建展览</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={exhibitions}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.exhibitionList}
      renderItem={({ item }) => {
        const artifactCount = artifactCountByExhibition.get(item.id) ?? 0;
        const previewPhoto = latestPhotoByExhibition.get(item.id);

        return (
          <Pressable
            style={styles.exhibitionCard}
            onPress={() => {
              Alert.alert('展览详情', `${item.name}\n文物数量：${artifactCount}`);
            }}
          >
            <View style={styles.exhibitionCoverWrap}>
              {previewPhoto ? (
                <Image source={{ uri: previewPhoto }} style={styles.exhibitionCover} />
              ) : (
                <View style={styles.exhibitionCoverFallback}>
                  <Text style={styles.exhibitionCoverFallbackText}>等待头图</Text>
                </View>
              )}
            </View>

            <View style={styles.exhibitionInfo}>
              <Text style={styles.exhibitionName}>{item.name}</Text>
              <Text style={styles.exhibitionMeta}>文物 {artifactCount} 件</Text>
              <Text style={styles.exhibitionMeta}>创建于 {formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  emptyExhibitionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#f4efe2',
  },
  emptyExhibitionTitle: {
    fontSize: 20,
    color: '#2a241b',
    fontWeight: '800',
  },
  emptyExhibitionHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#72695c',
    textAlign: 'center',
  },
  exhibitionList: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 10,
    backgroundColor: '#f4efe2',
  },
  exhibitionCard: {
    borderRadius: 16,
    backgroundColor: '#fff9ef',
    borderWidth: 1,
    borderColor: '#e9dcc7',
    overflow: 'hidden',
  },
  exhibitionCoverWrap: {
    height: 140,
    backgroundColor: '#e8dcc7',
  },
  exhibitionCover: {
    width: '100%',
    height: '100%',
  },
  exhibitionCoverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exhibitionCoverFallbackText: {
    color: '#6b6256',
    fontWeight: '700',
  },
  exhibitionInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  exhibitionName: {
    fontSize: 16,
    color: '#2a241b',
    fontWeight: '800',
  },
  exhibitionMeta: {
    color: '#756c60',
    fontSize: 12,
  },
});
