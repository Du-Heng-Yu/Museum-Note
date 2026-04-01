import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { DYNASTY_SEGMENTS, formatYearLabel } from '../constants/dynasties';
import { type Artifact, listArtifacts } from '../db';
import { getPrimaryArtifactPhotoUri } from '../utils/artifactPhotos';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误';
}

export default function HistoryPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadArtifacts = async () => {
        try {
          const rows = await listArtifacts();
          if (!active) {
            return;
          }
          setArtifacts(rows);
        } catch (error) {
          Alert.alert('加载失败', toErrorMessage(error));
        }
      };

      void loadArtifacts();

      return () => {
        active = false;
      };
    }, [])
  );

  const artifactsByDynasty = useMemo(() => {
    const map = new Map<string, Artifact[]>();

    for (const artifact of artifacts) {
      const current = map.get(artifact.dynasty) ?? [];
      current.push(artifact);
      map.set(artifact.dynasty, current);
    }

    return map;
  }, [artifacts]);

  return (
    <ScrollView contentContainerStyle={styles.historyContainer}>
      {DYNASTY_SEGMENTS.map((segment) => {
        const rows = artifactsByDynasty.get(segment.label) ?? [];
        const hasArtifacts = rows.length > 0;

        return (
          <View
            key={segment.key}
            style={[styles.timelineSection, !hasArtifacts && styles.timelineSectionEmpty]}
          >
            <View style={styles.timelineMeta}>
              <Text style={styles.timelineDynasty}>{segment.label}</Text>
              <Text style={styles.timelineRange}>{segment.rangeLabel}</Text>
            </View>

            {hasArtifacts ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timelineCards}
              >
                {rows.map((artifact) => {
                  const primaryPhotoUri = getPrimaryArtifactPhotoUri(artifact.photoUri);

                  return (
                    <Pressable
                      key={artifact.id}
                      style={styles.artifactCard}
                      onPress={() => {
                        Alert.alert(
                          artifact.name,
                          `${artifact.dynasty} · ${formatYearLabel(artifact.year)}\n${artifact.note ?? '暂无说明'}`
                        );
                      }}
                    >
                      {primaryPhotoUri ? (
                        <Image source={{ uri: primaryPhotoUri }} style={styles.artifactImage} />
                      ) : (
                        <View style={styles.artifactImageFallback}>
                          <Text style={styles.artifactImageFallbackText}>无图</Text>
                        </View>
                      )}

                      <Text numberOfLines={1} style={styles.artifactName}>
                        {artifact.name}
                      </Text>
                      <Text style={styles.artifactYear}>{formatYearLabel(artifact.year)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyTimelineInline}>
                <Text style={styles.emptyTimelineText}>暂无文物</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  historyContainer: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 14,
    backgroundColor: '#f4efe2',
  },
  timelineSection: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#fff9ef',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eadcc6',
  },
  timelineSectionEmpty: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  timelineMeta: {
    width: 78,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  timelineDynasty: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2a241b',
  },
  timelineRange: {
    marginTop: 3,
    fontSize: 11,
    color: '#7b7267',
    lineHeight: 16,
  },
  timelineCards: {
    gap: 10,
    paddingRight: 2,
  },
  emptyTimelineInline: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTimelineText: {
    color: '#9b9183',
    fontSize: 13,
    fontWeight: '600',
  },
  artifactCard: {
    width: 122,
    borderRadius: 12,
    backgroundColor: '#f8efdf',
    padding: 7,
    borderWidth: 1,
    borderColor: '#e5d8c1',
  },
  artifactImage: {
    width: '100%',
    height: 92,
    borderRadius: 8,
    backgroundColor: '#dfd2bd',
  },
  artifactImageFallback: {
    width: '100%',
    height: 92,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eadcc6',
  },
  artifactImageFallbackText: {
    color: '#6d6458',
    fontWeight: '700',
  },
  artifactName: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#2a241b',
  },
  artifactYear: {
    marginTop: 2,
    fontSize: 11,
    color: '#7a7063',
  },
});
