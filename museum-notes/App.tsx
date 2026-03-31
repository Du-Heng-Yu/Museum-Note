import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getDatabaseStats, initializeDatabase } from './src/db';

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; exhibitionCount: number; artifactCount: number }
  | { status: 'error'; message: string };

export default function App() {
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initializeDatabase();
        const stats = await getDatabaseStats();

        if (isMounted) {
          setBootstrapState({
            status: 'ready',
            exhibitionCount: stats.exhibitionCount,
            artifactCount: stats.artifactCount,
          });
        }
      } catch (error) {
        if (isMounted) {
          setBootstrapState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown database error',
          });
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const title =
    bootstrapState.status === 'ready'
      ? '数据库初始化成功'
      : bootstrapState.status === 'error'
      ? '数据库初始化失败'
      : '正在初始化数据库...';

  const subtitle =
    bootstrapState.status === 'ready'
      ? `展览 ${bootstrapState.exhibitionCount} 条 / 文物 ${bootstrapState.artifactCount} 条`
      : bootstrapState.status === 'error'
      ? bootstrapState.message
      : '请稍候';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#5a5a5a',
  },
});
