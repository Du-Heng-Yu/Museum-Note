import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExhibitionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的展览</Text>
      <Text style={styles.hint}>
        还没有展览记录，可点击右上角 + 新建展览，或点击下方 + 录入第一件文物
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  hint: { fontSize: 14, color: '#888', textAlign: 'center' },
});
