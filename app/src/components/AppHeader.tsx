import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONT_KAITI, FONT_TIMES } from '../constants/fonts';

export default function AppHeader() {
  return (
    <View style={styles.container}>
      {/* 左侧标题 */}
      <View style={styles.titleGroup}>
        <Text style={styles.titleMain}>博物馆笔记</Text>
        <Text style={styles.titleSub}>Museum Notes</Text>
      </View>

      {/* 右侧按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
          <Text style={styles.iconText}>🔍</Text>
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#f7f1e1',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  titleMain: {
    fontSize: 40,
    fontFamily: FONT_KAITI,
    color: '#1a1a1a',
    letterSpacing: -3,
  },
  titleSub: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONT_TIMES,
    color: '#1a1a1a',
    letterSpacing: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0DCD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
  },
});
