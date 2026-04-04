import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitionDetail'>;

export default function ExhibitionDetailScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>展览详情</Text>
      <Text style={styles.info}>展览 ID: {route.params.exhibitionId}</Text>
      <Text style={styles.hint}>（占位页面，待后续实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  info: { fontSize: 16, marginBottom: 8 },
  hint: { fontSize: 14, color: '#888' },
});
