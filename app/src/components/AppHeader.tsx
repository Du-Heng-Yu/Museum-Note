import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONT_KAITI, FONT_TIMES } from '../constants/fonts';
import { Colors, Spacing } from '../constants/theme';

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
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bg,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  titleMain: {
    fontSize: 36,
    fontFamily: FONT_KAITI,
    color: Colors.text,
    letterSpacing: -2,
  },
  titleSub: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONT_TIMES,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
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
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 16,
  },
});
