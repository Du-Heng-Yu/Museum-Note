import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';

// 在组件渲染前阻止 Splash Screen 自动隐藏
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // 并行加载字体 + 初始化数据库
        await Font.loadAsync({
          KaitiSimple: require('./assets/fonts/Kaiti-Simple.ttf'),
        });
        initDatabase();
        setAppReady(true);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[App] 初始化失败:', message);
        setDbError(message);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady || dbError) {
      await SplashScreen.hideAsync();
    }
  }, [appReady, dbError]);

  if (dbError) {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        <Text style={styles.errorText}>数据库初始化失败</Text>
        <Text style={styles.errorDetail}>{dbError}</Text>
      </View>
    );
  }

  if (!appReady) {
    return null; // SplashScreen 仍然显示
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style="auto" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
