import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, Exhibition } from '../types';
import { getAllExhibitions, getArtifactsByExhibitionId } from '../db';
import { FONT_KAITI } from '../constants/fonts';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';
import { parseJsonArray } from '../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ExhibitionWithCount extends Exhibition {
  artifactCount: number;
  coverPhotoUri: string | null;
}

export default function ExhibitionsScreen() {
  const navigation = useNavigation<Nav>();
  const [exhibitions, setExhibitions] = useState<ExhibitionWithCount[]>([]);

  useFocusEffect(
    useCallback(() => {
      const list = getAllExhibitions();
      setExhibitions(
        list.map((ex) => {
          const artifacts = getArtifactsByExhibitionId(ex.id);
          const firstArtifact = artifacts[0];
          const firstPhoto = firstArtifact
            ? parseJsonArray(firstArtifact.photos)[0] ?? null
            : null;

          return {
            ...ex,
            artifactCount: artifacts.length,
            coverPhotoUri: firstPhoto,
          };
        }),
      );
    }, []),
  );

  function renderItem({ item }: { item: ExhibitionWithCount }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ExhibitionDetail', { exhibitionId: item.id })}
      >
        <View style={styles.cardBody}>
          {item.coverPhotoUri ? (
            <Image source={{ uri: item.coverPhotoUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={styles.thumbPlaceholderText}>🏛</Text>
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <Text style={styles.cardMuseum} numberOfLines={1}>
              {item.museum}
            </Text>
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardCount}>共 {item.artifactCount} 件文物</Text>
              <Text style={styles.cardDate}>{item.visit_date}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* 右上角新建按钮 */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>我的展览 My Exhibitions</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ExhibitionEdit', {})}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ 添加展览</Text>
        </TouchableOpacity>
      </View>

      {exhibitions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            还没有展览记录{'\n'}可点击右上角 + 新建展览{'\n'}或点击下方 + 录入第一件文物
          </Text>
        </View>
      ) : (
        <FlatList
          data={exhibitions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: FontSize.h2,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: Colors.text,
  },
  addBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.body, fontWeight: '600' },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: '#e8d9b655',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: Radius.sm,
    marginRight: Spacing.md,
    backgroundColor: Colors.inputBg,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 24,
    opacity: 0.65,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    marginBottom: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: FONT_KAITI,
    color: Colors.text,
  },
  cardMuseum: {
    fontSize: FontSize.body,
    color: Colors.text,
    opacity: 0.7,
    marginBottom: Spacing.xs,
    fontFamily: FONT_KAITI,
  },
  cardCount: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontFamily: FONT_KAITI,
  },
  cardDate: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
        fontFamily: FONT_KAITI,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, fontFamily: FONT_KAITI },
});
