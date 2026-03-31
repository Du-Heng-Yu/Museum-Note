import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyState } from '../../components/EmptyState';
import { getMuseumArtifacts } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import type { Artifact } from '../../types/models';
import { formatYearLabel } from '../../utils/dynasty';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

interface ArtifactSection {
  title: string;
  data: Artifact[];
}

export function ArtifactModeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadArtifacts = useCallback(async () => {
    const records = await getMuseumArtifacts();
    setArtifacts(records);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        try {
          setLoading(true);
          const records = await getMuseumArtifacts();
          if (active) {
            setArtifacts(records);
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

  const filteredArtifacts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return artifacts;
    }
    return artifacts.filter((item) => {
      const matchName = item.title.toLowerCase().includes(keyword);
      const matchExhibition = (item.exhibitionTitle || '').toLowerCase().includes(keyword);
      const matchDynasty = (item.dynasty || '').toLowerCase().includes(keyword);
      return matchName || matchExhibition || matchDynasty;
    });
  }, [artifacts, searchText]);

  const sections = useMemo<ArtifactSection[]>(() => {
    const map = new Map<string, Artifact[]>();

    for (const artifact of filteredArtifacts) {
      const sectionTitle = artifact.dynasty?.trim() || '待整理';
      const prev = map.get(sectionTitle);
      if (prev) {
        prev.push(artifact);
      } else {
        map.set(sectionTitle, [artifact]);
      }
    }

    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredArtifacts]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadArtifacts();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.page}>
        <Text style={styles.title}>文物模式</Text>
        <Text style={styles.subtitle}>仅展示非辅助展品，按年代从古到今排列。</Text>

        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="搜索展品、展览或朝代"
          placeholderTextColor={colors.textSecondary}
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState title="还没有可展示的展品" description="请先在展览中添加非辅助展品。" />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => navigation.navigate('ArtifactDetail', { artifactId: item.id })}>
                <Image source={{ uri: item.coverImageUri }} style={styles.cover} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>年代: {formatYearLabel(item.year)}</Text>
                  <Text style={styles.cardMeta}>所属展览: {item.exhibitionTitle || '未命名展览'}</Text>
                </View>
              </Pressable>
            )}
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
  title: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: colors.textSecondary,
    fontSize: 13,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 16,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cover: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 12,
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
