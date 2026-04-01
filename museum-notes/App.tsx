import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import AddArtifactPage from './src/pages/addArtifactPage';
import ExhibitionPage from './src/pages/exhibitionPage';
import HistoryPage from './src/pages/historyPage';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type MainTabsProps = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误';
}

function MainTabs({ navigation }: MainTabsProps) {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const closeCreateMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const closeMenuAndWait = useCallback(async () => {
    closeCreateMenu();
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 220);
    });
  }, [closeCreateMenu]);

  const goToAddArtifact = useCallback(
    (params?: RootStackParamList['addArtifactPage']) => {
      if (params) {
        navigation.navigate('addArtifactPage', params);
        return;
      }

      navigation.navigate('addArtifactPage');
    },
    [navigation]
  );

  const onPickFromLibrary = useCallback(async () => {
    await closeMenuAndWait();

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请允许相册权限。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const photoUris = result.assets
        .map((asset) => asset.uri)
        .filter((uri): uri is string => Boolean(uri));

      if (photoUris.length === 0) {
        return;
      }

      goToAddArtifact({ initialPhotoUris: photoUris });
    } catch (error) {
      Alert.alert('操作失败', toErrorMessage(error));
    }
  }, [closeMenuAndWait, goToAddArtifact]);

  const onOpenCamera = useCallback(async () => {
    await closeMenuAndWait();

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请允许相机权限。');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const photoUri = result.assets[0]?.uri;
      if (!photoUri) {
        return;
      }

      goToAddArtifact({ initialPhotoUris: [photoUri] });
    } catch (error) {
      Alert.alert('操作失败', toErrorMessage(error));
    }
  }, [closeMenuAndWait, goToAddArtifact]);

  const onTextRecord = useCallback(async () => {
    await closeMenuAndWait();
    goToAddArtifact({ focusNameInput: true });
  }, [closeMenuAndWait, goToAddArtifact]);

  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <Text style={styles.brand}>博物馆笔记</Text>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarStyle: styles.modeSwitcher,
          tabBarItemStyle: styles.modeItem,
          tabBarLabelStyle: styles.modeText,
          tabBarIndicatorStyle: styles.modeIndicator,
          tabBarActiveTintColor: '#4f4639',
          tabBarInactiveTintColor: '#4f4639',
          tabBarPressColor: 'transparent',
        }}
      >
        <Tab.Screen
          name="historyPage"
          component={HistoryPage}
          options={{
            title: '历史',
          }}
        />
        <Tab.Screen
          name="exhibitionPage"
          component={ExhibitionPage}
          options={{
            title: '展览',
          }}
        />
      </Tab.Navigator>

      <View style={styles.bottomBar}>
        <Pressable style={styles.addButton} onPress={() => setMenuVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCreateMenu}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={styles.menuBackdrop} onPress={closeCreateMenu} />

          <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
            <Text style={styles.menuTitle}>新增方式</Text>

            <Pressable style={styles.menuOption} onPress={() => void onPickFromLibrary()}>
              <Text style={styles.menuOptionText}>从相册选择</Text>
            </Pressable>

            <Pressable style={styles.menuOption} onPress={() => void onOpenCamera()}>
              <Text style={styles.menuOptionText}>相机</Text>
            </Pressable>

            <Pressable style={styles.menuOption} onPress={() => void onTextRecord()}>
              <Text style={styles.menuOptionText}>文字记录</Text>
            </Pressable>

            <Pressable style={[styles.menuOption, styles.menuCancel]} onPress={closeCreateMenu}>
              <Text style={[styles.menuOptionText, styles.menuCancelText]}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="addArtifactPage" component={AddArtifactPage} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#f4efe2',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#f4efe2',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#232018',
  },
  modeSwitcher: {
    backgroundColor: '#e2d8c5',
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  modeItem: {
    minHeight: 42,
  },
  modeText: {
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'none',
  },
  modeIndicator: {
    backgroundColor: '#232018',
    height: 3,
    borderRadius: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1f1b13',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#f4efe2',
  },
  addButtonText: {
    color: '#fff8ea',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '500',
    marginTop: -2,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff9ef',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderColor: '#eadcc6',
  },
  menuTitle: {
    color: '#3b3226',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5d6bf',
    backgroundColor: '#fdf5e8',
    paddingVertical: 13,
    alignItems: 'center',
  },
  menuOptionText: {
    color: '#2d261b',
    fontSize: 16,
    fontWeight: '700',
  },
  menuCancel: {
    marginTop: 4,
    backgroundColor: '#efe3cd',
    borderColor: '#decfb6',
  },
  menuCancelText: {
    color: '#5c5244',
  },
});
