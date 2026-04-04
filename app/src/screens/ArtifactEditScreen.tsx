import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtifactEdit'>;

export default function ArtifactEditScreen({ route }: Props) {
  const artifactId = route.params?.artifactId;
  const isEdit = artifactId !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isEdit ? '编辑文物' : '新建文物'}</Text>
      {isEdit && <Text style={styles.info}>编辑文物 ID: {artifactId}</Text>}
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
