import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import {
  deleteArtifact,
  deleteExhibition,
  deleteTextPanel,
  getExhibitionById,
  getExhibitionContents,
  moveContent,
} from '../../db';
import { EmptyState } from '../../components/EmptyState';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { formatYearLabel } from '../../utils/dynasty';
import type { Exhibition, ExhibitionContentItem } from '../../types/models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type ExhibitionDetailRoute = RouteProp<RootStackParamList, 'ExhibitionDetail'>;

export function ExhibitionDetailScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<ExhibitionDetailRoute>();
  const exhibitionId = route.params.exhibitionId;

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [contents, setContents] = useState<ExhibitionContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [detail, contentItems] = await Promise.all([
      getExhibitionById(exhibitionId),
      getExhibitionContents(exhibitionId),
    ]);
    setExhibition(detail);
    setContents(contentItems);
  }, [exhibitionId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        try {
          setLoading(true);
          const [detail, contentItems] = await Promise.all([
            getExhibitionById(exhibitionId),
            getExhibitionContents(exhibitionId),
          ]);
          if (active) {
            setExhibition(detail);
            setContents(contentItems);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void run();

      return () => {
        active = false;
      };
    }, [exhibitionId])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: exhibition?.title || '展览详情',
      headerRight: () => (
        <Pressable
          onPress={() => {
            Alert.alert('删除展览', '删除后将同时移除该展览下的所有展品与文字板，确认继续吗？', [
              { text: '取消', style: 'cancel' },
              {
                text: '删除',
                style: 'destructive',
                onPress: async () => {
                  await deleteExhibition(exhibitionId);
                  navigation.goBack();
                },
              },
            ]);
          }}
        >
          <Text style={styles.headerDeleteText}>删除</Text>
        </Pressable>
      ),
    });
  }, [exhibition?.title, exhibitionId, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const onMove = async (item: ExhibitionContentItem, direction: 'up' | 'down') => {
    await moveContent(exhibitionId, item.contentType, item.contentId, direction);
    await loadData();
  };

  const onDeleteContent = (item: ExhibitionContentItem) => {
    Alert.alert('删除确认', '确认删除这条内容吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          if (item.contentType === 'artifact') {
            await deleteArtifact(item.contentId);
          } else {
            await deleteTextPanel(item.contentId);
          }
          await loadData();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exhibition) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <EmptyState title="展览不存在" description="这条展览可能已被删除。" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.heroCard}>
          {exhibition.coverImageUri ? (
            <Image source={{ uri: exhibition.coverImageUri }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>无封面图</Text>
            </View>
          )}
          <Text style={styles.heroTitle}>{exhibition.title}</Text>
          <Text style={styles.heroSubtitle}>{exhibition.locationName}</Text>
          {exhibition.exhibitionType ? <Text style={styles.heroTag}>{exhibition.exhibitionType}</Text> : null}
        </View>

        {exhibition.preface ? (
          <View style={styles.textCard}>
            <Text style={styles.sectionTitle}>前言</Text>
            <Text style={styles.bodyText}>{exhibition.preface}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate('CreateArtifact', { exhibitionId })}>
            <Text style={styles.actionButtonText}>添加展品</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate('CreateTextPanel', { exhibitionId })}>
            <Text style={styles.actionButtonText}>添加文字板</Text>
          </Pressable>
        </View>

        {contents.length === 0 ? (
          <EmptyState title="内容还为空" description="先添加一件展品或一块文字板。" />
        ) : (
          <View style={styles.listWrapper}>
            {contents.map((item, index) => (
              <View key={item.orderId} style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <Text style={styles.contentTypeLabel}>{item.contentType === 'artifact' ? '展品' : '文字板'}</Text>
                  <View style={styles.contentHeaderActions}>
                    <Pressable
                      onPress={() => onMove(item, 'up')}
                      style={[styles.ghostButton, index === 0 && styles.ghostButtonDisabled]}
                      disabled={index === 0}
                    >
                      <Text style={styles.ghostButtonText}>上移</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onMove(item, 'down')}
                      style={[styles.ghostButton, index === contents.length - 1 && styles.ghostButtonDisabled]}
                      disabled={index === contents.length - 1}
                    >
                      <Text style={styles.ghostButtonText}>下移</Text>
                    </Pressable>
                    <Pressable style={styles.deleteButton} onPress={() => onDeleteContent(item)}>
                      <Text style={styles.deleteButtonText}>删除</Text>
                    </Pressable>
                  </View>
                </View>

                {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.contentImage} /> : null}

                <Pressable
                  onPress={() => {
                    if (item.contentType === 'artifact') {
                      navigation.navigate('ArtifactDetail', { artifactId: item.contentId });
                    }
                  }}
                  disabled={item.contentType !== 'artifact'}
                >
                  <Text style={styles.contentTitle}>{item.title}</Text>
                </Pressable>

                {item.contentType === 'artifact' ? (
                  <Text style={styles.contentMeta}>
                    年代: {formatYearLabel(item.year)} {item.dynasty ? `· ${item.dynasty}` : ''}
                  </Text>
                ) : null}

                {item.description ? <Text style={styles.bodyText}>{item.description}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {exhibition.epilogue ? (
          <View style={styles.textCard}>
            <Text style={styles.sectionTitle}>尾声</Text>
            <Text style={styles.bodyText}>{exhibition.epilogue}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDeleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  heroCard: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  heroImage: {
    width: '100%',
    height: 180,
    marginBottom: 12,
  },
  heroPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroPlaceholderText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 14,
  },
  heroTag: {
    marginTop: 8,
    marginHorizontal: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.cardMuted,
    color: colors.textPrimary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  textCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bodyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  listWrapper: {
    gap: 10,
  },
  contentCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  contentHeaderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  contentTypeLabel: {
    backgroundColor: colors.cardMuted,
    color: colors.textPrimary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  ghostButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ghostButtonDisabled: {
    opacity: 0.4,
  },
  ghostButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff4f4',
    borderWidth: 1,
    borderColor: '#f0c5c5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  contentImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  contentTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  contentMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
