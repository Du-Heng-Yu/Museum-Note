import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { initializeDatabase } from './src/db';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = async () => {
    try {
      setError(null);
      await initializeDatabase();
      setReady(true);
    } catch {
      setError('本地数据库初始化失败，请重试。');
      setReady(false);
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={styles.bootContainer}>
        {error ? (
          <>
            <Text style={styles.errorTitle}>启动失败</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={bootstrap}>
              <Text style={styles.retryButtonText}>重试</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>正在初始化观展助手...</Text>
          </>
        )}
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    gap: 14,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
