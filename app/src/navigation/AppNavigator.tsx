import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import type { RootStackParamList, BottomTabParamList } from '../types';

import TimelineScreen from '../screens/TimelineScreen';
import ExhibitionsScreen from '../screens/ExhibitionsScreen';
import ArtifactDetailScreen from '../screens/ArtifactDetailScreen';
import ArtifactEditScreen from '../screens/ArtifactEditScreen';
import ExhibitionDetailScreen from '../screens/ExhibitionDetailScreen';
import ExhibitionEditScreen from '../screens/ExhibitionEditScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/** FAB 占位按钮（仅视觉占位，功能在第 3 步实现） */
function FABPlaceholder() {
  return (
    <View style={styles.fabWrapper}>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          // 第 3 步实现 Bottom Sheet 弹出
          console.log('[FAB] 点击 +（待实现）');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/** 底部 Tab 导航 */
function BottomTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#333',
          tabBarInactiveTintColor: '#999',
        }}
      >
        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            tabBarLabel: '时间轴',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>📅</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Exhibitions"
          component={ExhibitionsScreen}
          options={{
            tabBarLabel: '我的展览',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color }}>🏛</Text>
            ),
          }}
        />
      </Tab.Navigator>
      <FABPlaceholder />
    </View>
  );
}

/** 根导航：Tab + 4 个 Stack 页面 */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={BottomTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ArtifactDetail"
          component={ArtifactDetailScreen}
          options={{ title: '文物详情' }}
        />
        <Stack.Screen
          name="ArtifactEdit"
          component={ArtifactEditScreen}
          options={{ title: '编辑文物' }}
        />
        <Stack.Screen
          name="ExhibitionDetail"
          component={ExhibitionDetailScreen}
          options={{ title: '展览详情' }}
        />
        <Stack.Screen
          name="ExhibitionEdit"
          component={ExhibitionEditScreen}
          options={{ title: '编辑展览' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
});
