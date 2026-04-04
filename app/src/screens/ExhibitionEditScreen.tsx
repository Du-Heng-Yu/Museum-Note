import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ExhibitionEdit'>;

export default function ExhibitionEditScreen({ route }: Props) {
  const exhibitionId = route.params?.exhibitionId;
  const isEdit = exhibitionId !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEdit ? '编辑展览' : '新建展览'}</Text>
      {isEdit && <Text style={styles.info}>编辑展览 ID: {exhibitionId}</Text>}
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
