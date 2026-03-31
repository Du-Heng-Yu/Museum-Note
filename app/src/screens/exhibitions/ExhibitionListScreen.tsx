import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyState } from '../../components/EmptyState';
import { getExhibitions } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import type { Exhibition } from '../../types/models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ExhibitionListScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExhibitions = useCallback(async () => {
    const records = await getExhibitions();
    setExhibitions(records);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        try {
          setLoading(true);
          const records = await getExhibitions();
          if (active) {
            setExhibitions(records);
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
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadExhibitions();
    } finally {
      setRefreshing(false);
    }
  }, [loadExhibitions]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>展览模式</Text>
            <Text style={styles.subtitle}>按展览维度管理你的观展记录</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('CreateExhibition')}>
            <Text style={styles.primaryButtonText}>新建展览</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={exhibitions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={exhibitions.length === 0 ? styles.emptyContent : styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate('ExhibitionDetail', { exhibitionId: item.id })}
              >
                {item.coverImageUri ? (
                  <Image source={{ uri: item.coverImageUri }} style={styles.coverImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>无封面</Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>地点: {item.locationName}</Text>
                  <Text style={styles.cardMeta}>更新: {formatDateTime(item.updatedAt)}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyState
                title="还没有展览记录"
                description="先创建一个展览，然后继续添加展品或文字板。"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 140,
  },
  placeholderImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
