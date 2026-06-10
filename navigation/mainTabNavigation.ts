import { StackActions, TabActions } from '@react-navigation/native';

export type MainTabRouteName = 'PropertyHub' | 'JobsMain' | 'ServicesMain' | 'DateMiMain' | 'ProfileMain';

type NavigationLike = {
  getState?: () => any;
  getParent?: () => NavigationLike | undefined;
  dispatch?: (action: any) => void;
  navigate?: (name: string, params?: any) => void;
};

function findNavigationWithRoute(navigation: NavigationLike, routeName: string): NavigationLike {
  let current: NavigationLike | undefined = navigation;

  while (current) {
    const state = current.getState?.();
    const routeNames: unknown = state?.routeNames;

    if (Array.isArray(routeNames) && routeNames.includes(routeName)) {
      return current;
    }

    current = current.getParent?.();
  }

  return navigation;
}

/**
 * Navigate to a specific main tab without a visible two-step transition.
 *
 * When called from a root-stack screen that sits *above* `MainTabs` (like Chats),
 * `navigation.navigate('MainTabs', { screen })` can momentarily reveal the
 * previously-selected tab before switching to the target tab. This helper pre-sets
 * the tab state via a targeted `TabActions.jumpTo()` before navigating to `MainTabs`.
 */
export function navigateToMainTab(navigation: NavigationLike, tab: MainTabRouteName) {
  const rootNavigation = findNavigationWithRoute(navigation, 'MainTabs');

  const state = rootNavigation.getState?.();
  const routes: unknown = state?.routes;
  const currentIndex: unknown = state?.index;

  const stackRoutes = Array.isArray(routes) ? (routes as any[]) : [];
  const mainTabsIndex = stackRoutes.findIndex((r) => r?.name === 'MainTabs');
  const mainTabsRoute = mainTabsIndex >= 0 ? stackRoutes[mainTabsIndex] : undefined;

  const tabNavigatorKey: unknown = mainTabsRoute?.state?.key;
  const isCurrentlyOnMainTabs =
    typeof currentIndex === 'number' && mainTabsIndex >= 0 ? currentIndex === mainTabsIndex : false;

  const bringMainTabsToTop = () => {
    // If MainTabs exists in the current stack, pop back to it (faster + avoids duplicating routes).
    if (rootNavigation.dispatch && typeof currentIndex === 'number' && mainTabsIndex >= 0) {
      const pops = currentIndex - mainTabsIndex;
      if (pops > 0) {
        rootNavigation.dispatch(StackActions.pop(pops));
        return;
      }
    }

    // Otherwise, fall back to normal navigation.
    rootNavigation.navigate?.('MainTabs');
  };

  if (typeof tabNavigatorKey === 'string' && rootNavigation.dispatch) {
    // 1) Pre-set the tab state while MainTabs is still hidden.
    rootNavigation.dispatch({ ...TabActions.jumpTo(tab), target: tabNavigatorKey });

    // 2) If we're already on MainTabs, we're done (no stack transition needed).
    if (isCurrentlyOnMainTabs) {
      return;
    }

    // 3) Pop to MainTabs on the next frame so the jumpTo state is applied first.
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0);

    schedule(bringMainTabsToTop);
    return;
  }

  // Fallback: standard nested navigate.
  rootNavigation.navigate?.('MainTabs', { screen: tab });
}

