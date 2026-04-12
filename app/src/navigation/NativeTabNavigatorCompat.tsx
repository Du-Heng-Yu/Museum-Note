/**
 * 兼容 react-native-screens 4.16 (Expo SDK 54) 的原生底部标签导航器。
 *
 * 使用 BottomTabs / BottomTabsScreen (UITabBarController) 渲染，
 * iOS 26+ 自动获得 Liquid Glass 效果，旧 iOS 使用标准原生标签栏。
 *
 * 图标仅接受 iOS SF Symbol 或 image 格式（不支持 React 组件图标）。
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  createNavigatorFactory,
  CommonActions,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';
import type {
  DefaultNavigatorOptions,
  TabNavigationState,
  TabRouterOptions,
  ParamListBase,
} from '@react-navigation/native';
import { SafeAreaProviderCompat } from '@react-navigation/elements';
import { BottomTabs, BottomTabsScreen } from 'react-native-screens';
import { Platform, useColorScheme } from 'react-native';

// ---------------------------------------------------------------------------
// Icon mapping: React Navigation native-tabs format → react-native-screens 4.16
// ---------------------------------------------------------------------------

type RNScreensIcon =
  | { sfSymbolName: string }
  | { imageSource: any }
  | { templateSource: any }
  | undefined;

/**
 * 将 React Navigation 原生标签图标格式映射为 react-native-screens BottomTabsScreen 接受的格式。
 */
function mapIcon(raw: any): RNScreensIcon {
  if (!raw) return undefined;

  // Already in BottomTabsScreen format
  if (raw.sfSymbolName || raw.imageSource || raw.templateSource) return raw;

  // React Navigation format: { type: 'sfSymbol', name: 'house' }
  if (raw.type === 'sfSymbol' && raw.name) {
    return { sfSymbolName: raw.name };
  }

  // React Navigation format: { type: 'image', source: require(...), tinted?: boolean }
  if (raw.type === 'image' && raw.source) {
    return raw.tinted === false
      ? { imageSource: raw.source }
      : { templateSource: raw.source };
  }

  // React element → not supported by native tabs
  if (React.isValidElement(raw)) return undefined;

  return undefined;
}

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------

type NativeTabNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  any, // ScreenOptions – 宽泛类型,由调用方约束
  any,
  any
> &
  TabRouterOptions;

function NativeTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
}: NativeTabNavigatorProps) {
  const {
    state,
    navigation,
    descriptors,
    NavigationContent,
  } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
  });

  // Handle native tab press → sync to RN state
  const handleNativeFocusChange = useCallback(
    (e: any) => {
      const tabKey: string = e.nativeEvent.tabKey;
      const route = state.routes.find((r) => r.key === tabKey);
      if (!route) return;

      navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

      const idx = state.routes.findIndex((r) => r.key === tabKey);
      if (state.index !== idx) {
        navigation.dispatch({
          ...CommonActions.navigate(route.name, route.params),
          target: state.key,
        });
      }
    },
    [state, navigation],
  );

  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <NavigationContent>
      <SafeAreaProviderCompat>
        <BottomTabs onNativeFocusChange={handleNativeFocusChange}>
          {state.routes.map((route, index) => {
            const { options, render } = descriptors[route.key];
            const isFocused = state.index === index;
            const {
              title,
              tabBarLabel,
              tabBarIcon,
              tabBarBadge,
              tabBarBlurEffect,
              tabBarStyle,
              lazy = true,
            } = options as any;

            // Icon -------------------------------------------------------
            let icon: RNScreensIcon;
            let selectedIcon: RNScreensIcon;

            if (typeof tabBarIcon === 'function') {
              icon = mapIcon(tabBarIcon({ focused: false, color: '', size: 24 }));
              selectedIcon = mapIcon(tabBarIcon({ focused: true, color: '', size: 24 }));
            } else if (tabBarIcon) {
              icon = mapIcon(tabBarIcon);
            }

            // Label ------------------------------------------------------
            const label =
              typeof tabBarLabel === 'string'
                ? tabBarLabel
                : typeof tabBarLabel === 'function'
                  ? undefined // 不支持函数式 label
                  : title ?? route.name;

            // Tab bar appearance (per-screen on iOS) ----------------------
            const { backgroundColor: tabBarBg, shadowColor: tabBarShadow } =
              (tabBarStyle as any) || {};

            const blurEffect =
              tabBarBlurEffect ?? (dark ? 'systemMaterialDark' : 'systemMaterial');

            const appearance = {
              tabBarBackgroundColor: tabBarBg,
              tabBarShadowColor: tabBarShadow,
              tabBarBlurEffect: blurEffect,
            };

            return (
              <BottomTabsScreen
                key={route.key}
                tabKey={route.key}
                title={label}
                icon={icon}
                selectedIcon={selectedIcon}
                isFocused={isFocused}
                badgeValue={tabBarBadge?.toString()}
                standardAppearance={appearance}
                scrollEdgeAppearance={appearance}
              >
                <LazyScreen lazy={lazy} visible={isFocused}>
                  {render()}
                </LazyScreen>
              </BottomTabsScreen>
            );
          })}
        </BottomTabs>
      </SafeAreaProviderCompat>
    </NavigationContent>
  );
}

// ---------------------------------------------------------------------------
// Lazy screen wrapper (只在首次可见后才渲染)
// ---------------------------------------------------------------------------

function LazyScreen({
  lazy,
  visible,
  children,
}: {
  lazy: boolean;
  visible: boolean;
  children: React.ReactNode;
}) {
  const [hasRendered, setHasRendered] = useState(!lazy);

  useEffect(() => {
    if (visible && !hasRendered) setHasRendered(true);
  }, [visible, hasRendered]);

  if (!hasRendered) return null;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Export factory (与 createBottomTabNavigator 同样使用方式)
// ---------------------------------------------------------------------------

export const createNativeBottomTabNavigatorCompat = createNavigatorFactory(
  NativeTabNavigator as any,
);
