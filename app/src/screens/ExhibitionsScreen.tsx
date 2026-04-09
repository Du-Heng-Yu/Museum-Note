import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, Exhibition } from '../types';
import { getAllExhibitions, getExhibitionArtifactCount } from '../db';
import { FONT_KAITI } from '../constants/fonts';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ExhibitionWithCount extends Exhibition {
  artifactCount: number;
}

export default function ExhibitionsScreen() {
  const navigation = useNavigation<Nav>();
  const [exhibitions, setExhibitions] = useState<ExhibitionWithCount[]>([]);

  useFocusEffect(
    useCallback(() => {
      const list = getAllExhibitions();
      setExhibitions(
        list.map((ex) => ({
          ...ex,
          artifactCount: getExhibitionArtifactCount(ex.id),
        })),
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
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardCount}>{item.artifactCount} 件文物</Text>
        </View>
        <Text style={styles.cardMuseum} numberOfLines={1}>
          {item.museum}
        </Text>
        <Text style={styles.cardDate}>{item.visit_date}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* 右上角新建按钮 */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>我的展览</Text>
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
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: FONT_KAITI,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardCount: { fontSize: FontSize.caption, color: Colors.textSecondary },
  cardMuseum: { fontSize: FontSize.body, color: Colors.text, marginBottom: Spacing.xs, opacity: 0.7 },
  cardDate: { fontSize: FontSize.caption, color: Colors.textSecondary },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, fontFamily: FONT_KAITI },
});
