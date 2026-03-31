import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { ArtifactDetailScreen } from '../screens/artifacts/ArtifactDetailScreen';
import { ArtifactModeScreen } from '../screens/artifacts/ArtifactModeScreen';
import { CreateArtifactScreen } from '../screens/artifacts/CreateArtifactScreen';
import { CreateExhibitionScreen } from '../screens/exhibitions/CreateExhibitionScreen';
import { ExhibitionDetailScreen } from '../screens/exhibitions/ExhibitionDetailScreen';
import { ExhibitionListScreen } from '../screens/exhibitions/ExhibitionListScreen';
import { CreateTextPanelScreen } from '../screens/textPanels/CreateTextPanelScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <MainTabs.Screen
        name="ExhibitionHome"
        component={ExhibitionListScreen}
        options={{
          title: '展览',
        }}
      />
      <MainTabs.Screen
        name="ArtifactHome"
        component={ArtifactModeScreen}
        options={{
          title: '文物',
        }}
      />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            color: colors.textPrimary,
            fontWeight: '700',
          },
          headerTintColor: colors.textPrimary,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="CreateExhibition" component={CreateExhibitionScreen} options={{ title: '新建展览' }} />
        <RootStack.Screen name="ExhibitionDetail" component={ExhibitionDetailScreen} options={{ title: '展览详情' }} />
        <RootStack.Screen name="CreateArtifact" component={CreateArtifactScreen} options={{ title: '添加展品' }} />
        <RootStack.Screen name="CreateTextPanel" component={CreateTextPanelScreen} options={{ title: '添加文字板' }} />
        <RootStack.Screen name="ArtifactDetail" component={ArtifactDetailScreen} options={{ title: '展品详情' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
