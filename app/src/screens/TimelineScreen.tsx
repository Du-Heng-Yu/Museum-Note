import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { DYNASTIES } from '../constants/dynasties';

export default function TimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>时间轴</Text>
      <Text style={styles.hint}>点击下方 + 开始记录第一件文物</Text>
      <Text style={styles.debug}>
        朝代数据已加载：{DYNASTIES.length} 个朝代（{DYNASTIES[0].name} → {DYNASTIES[DYNASTIES.length - 1].name}）
      </Text>
      <TouchableOpacity
        style={styles.devBtn}
        onPress={() => navigation.navigate('DevTest')}
      >
        <Text style={styles.devBtnText}>进入数据层测试</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  hint: { fontSize: 14, color: '#888', marginBottom: 12 },
  debug: { fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  devBtn: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  devBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
