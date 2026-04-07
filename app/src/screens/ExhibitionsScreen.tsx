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
  container: { flex: 1, backgroundColor: '#f7f1e1' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONT_KAITI,
    color: '#1a1a1a',
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#a98a5d',
    borderRadius: 16,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#ede9d9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: '#d3c9b4',
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
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  cardCount: { fontSize: 13, color: '#888' },
  cardMuseum: { fontSize: 14, color: '#555', marginBottom: 4 },
  cardDate: { fontSize: 13, color: '#999' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 24 },
});
