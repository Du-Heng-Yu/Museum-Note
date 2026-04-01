import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import AddArtifactPage from './src/pages/addArtifactPage';
import ExhibitionPage from './src/pages/exhibitionPage';
import HistoryPage from './src/pages/historyPage';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type MainTabsProps = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

function MainTabs({ navigation }: MainTabsProps) {
  const insets = useSafeAreaInsets();

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
        <Pressable
          style={styles.addButton}
          onPress={() => {
            navigation.navigate('addArtifactPage');
          }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
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
});
