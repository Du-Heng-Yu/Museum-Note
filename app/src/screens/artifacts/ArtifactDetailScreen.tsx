import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { deleteArtifact, getArtifactById } from '../../db';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import type { Artifact } from '../../types/models';
import { formatYearLabel } from '../../utils/dynasty';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type ArtifactDetailRoute = RouteProp<RootStackParamList, 'ArtifactDetail'>;

export function ArtifactDetailScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<ArtifactDetailRoute>();
  const artifactId = route.params.artifactId;

  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        try {
          setLoading(true);
          const detail = await getArtifactById(artifactId);
          if (active) {
            setArtifact(detail);
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
    }, [artifactId])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: artifact?.title || '展品详情' });
  }, [artifact?.title, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!artifact) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.page}>
          <Text style={styles.title}>展品不存在</Text>
          <Text style={styles.bodyText}>这条记录可能已被删除。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>{artifact.title}</Text>
        <Text style={styles.metaText}>所属展览: {artifact.exhibitionTitle || '未知展览'}</Text>
        <Text style={styles.metaText}>
          年代: {formatYearLabel(artifact.year)} {artifact.dynasty ? `· ${artifact.dynasty}` : ''}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
          {artifact.imageUris.map((uri, index) => (
            <Image key={`${uri}-${index}`} source={{ uri }} style={[styles.image, index === 0 && styles.mainImage]} />
          ))}
        </ScrollView>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>展品说明</Text>
          <Text style={styles.bodyText}>{artifact.description || '暂无说明'}</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ExhibitionDetail', { exhibitionId: artifact.exhibitionId })}
          >
            <Text style={styles.primaryButtonText}>查看所属展览</Text>
          </Pressable>

          <Pressable
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert('删除展品', '确认删除当前展品吗？', [
                { text: '取消', style: 'cancel' },
                {
                  text: '删除',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteArtifact(artifact.id);
                    navigation.goBack();
                  },
                },
              ]);
            }}
          >
            <Text style={styles.dangerButtonText}>删除展品</Text>
          </Pressable>
        </View>
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
    gap: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  imageRow: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  image: {
    width: 260,
    height: 180,
    borderRadius: 12,
  },
  mainImage: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  block: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actionRow: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  dangerButton: {
    backgroundColor: '#fff4f4',
    borderColor: '#f0c5c5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
});
