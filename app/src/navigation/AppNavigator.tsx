import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Text,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList, BottomTabParamList } from '../types';
import { Colors, Radius, Spacing, StackHeaderOptions } from '../constants/theme';
import { FONT_KAITI } from '../constants/fonts';

import AppHeader from '../components/AppHeader';
import TimelineScreen from '../screens/TimelineScreen';
import ExhibitionsScreen from '../screens/ExhibitionsScreen';
import ArtifactDetailScreen from '../screens/ArtifactDetailScreen';
import ArtifactEditScreen from '../screens/ArtifactEditScreen';
import CameraScreen from '../screens/CameraScreen';
import ExhibitionDetailScreen from '../screens/ExhibitionDetailScreen';
import ExhibitionEditScreen from '../screens/ExhibitionEditScreen';
import DevTestScreen from '../screens/DevTestScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const SHEET_HEIGHT = 260;

type PendingAction = 'album' | 'camera' | 'text' | null;

/** FAB + Bottom Sheet */
function FABWithSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const openSheet = useCallback(() => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [slideAnim]);

  // Sheet 关闭后，根据 pendingAction 执行对应操作
  useEffect(() => {
    if (visible || pendingAction === null) return;

    const timer = setTimeout(async () => {
      const action = pendingAction;
      setPendingAction(null);

      if (action === 'album') {
        try {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            navigation.navigate('ArtifactEdit', {
              photos: result.assets.map((a) => a.uri),
            });
          }
        } catch (e) {
          console.warn('[Album] 打开相册失败:', e);
        }
      } else if (action === 'camera') {
        navigation.navigate('Camera', {});
      } else if (action === 'text') {
        navigation.navigate('ArtifactEdit', {});
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [visible, pendingAction, navigation]);

  function handleAlbum() {
    setPendingAction('album');
    closeSheet();
  }

  function handleCamera() {
    setPendingAction('camera');
    closeSheet();
  }

  function handleTextOnly() {
    setPendingAction('text');
    closeSheet();
  }

  return (
    <>
      <View style={styles.fabWrapper}>
        <TouchableOpacity style={styles.fab} onPress={openSheet} activeOpacity={0.7}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}
              >
                <View style={styles.sheetHandle} />
                <TouchableOpacity style={styles.sheetItem} onPress={handleAlbum}>
                  <Text style={styles.sheetIcon}>🖼</Text>
                  <View>
                    <Text style={styles.sheetItemTitle}>从相册选择</Text>
                    <Text style={styles.sheetItemSub}>选择多张照片快速记录</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={handleCamera}>
                  <Text style={styles.sheetIcon}>📷</Text>
                  <View>
                    <Text style={styles.sheetItemTitle}>相机拍摄</Text>
                    <Text style={styles.sheetItemSub}>拍照同时保存到相册</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={handleTextOnly}>
                  <Text style={styles.sheetIcon}>📝</Text>
                  <View>
                    <Text style={styles.sheetItemTitle}>文字记录</Text>
                    <Text style={styles.sheetItemSub}>仅填写文物信息，不拍照</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

/** 底部 Tab 导航 */
function BottomTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <AppHeader />
      </SafeAreaView>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: styles.tabBarLabel,
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
      <FABWithSheet />
    </View>
  );
}

/** 根导航：Tab + Stack 页面 */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          ...StackHeaderOptions,
          headerTitleStyle: { fontFamily: FONT_KAITI, fontSize: 18, color: Colors.text },
        }}
      >
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
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: false }}
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
        <Stack.Screen
          name="DevTest"
          component={DevTestScreen}
          options={{ title: '数据层测试' }}
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
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 0,
  },
  tabBarLabel: {
    fontFamily: FONT_KAITI,
    fontSize: 12,
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
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 30,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: 34,
    paddingTop: Spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  sheetIcon: {
    fontSize: 24,
    marginRight: Spacing.lg,
  },
  sheetItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  sheetItemSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
