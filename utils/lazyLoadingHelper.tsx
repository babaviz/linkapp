import React, { lazy, Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PerformanceConfig } from '../config/performance.config';

const DefaultLoadingComponent = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

export const lazyLoadScreen = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent: ComponentType = DefaultLoadingComponent
) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: P) => (
    <Suspense fallback={<LoadingComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export const lazyLoadComponent = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactElement
) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: P) => (
    <Suspense fallback={fallback || <DefaultLoadingComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

export const preloadScreen = async (
  importFunc: () => Promise<{ default: ComponentType<any> }>
) => {
  try {
    await importFunc();
    return true;
  } catch (error) {
    return false;
  }
};

export const preloadMultipleScreens = async (
  screens: Array<() => Promise<{ default: ComponentType<any> }>>
) => {
  try {
    await Promise.all(screens.map(screen => preloadScreen(screen)));
    return true;
  } catch (error) {
    return false;
  }
};

export const ConditionalLazyLoad = <P extends object>({
  condition,
  component: Component,
  fallback,
  ...props
}: {
  condition: boolean;
  component: ComponentType<P>;
  fallback?: React.ReactElement;
} & P) => {
  if (!condition) {
    return fallback || <DefaultLoadingComponent />;
  }
  
  return <Component {...(props as P)} />;
};

export const DeferredComponent = <P extends object>({
  component: Component,
  delay = 100,
  fallback,
  ...props
}: {
  component: ComponentType<P>;
  delay?: number;
  fallback?: React.ReactElement;
} & P) => {
  const [shouldRender, setShouldRender] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  if (!shouldRender) {
    return fallback || <DefaultLoadingComponent />;
  }
  
  return <Component {...(props as P)} />;
};

const componentCache = new Map<string, ComponentType<any>>();

export const getCachedComponent = (
  key: string,
  importFunc: () => Promise<{ default: ComponentType<any> }>
): ComponentType<any> | null => {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }
  
  importFunc().then(module => {
    componentCache.set(key, module.default);
  });
  
  return null;
};

export const clearComponentCache = (key?: string) => {
  if (key) {
    componentCache.delete(key);
  } else {
    componentCache.clear();
  }
};

export const getComponentCacheSize = () => componentCache.size;

export const LazyScreens = {
  DateMi: lazyLoadScreen(() => import('../screens/datemi/DateMiScreenLazy')),
  Jobs: lazyLoadScreen(() => import('../screens/jobs/JobsScreen')),
  Property: lazyLoadScreen(() => import('../screens/property/PropertyScreen')),
  Services: lazyLoadScreen(() => import('../screens/services/ServicesScreen')),
  Profile: lazyLoadScreen(() => import('../screens/profile/ProfileScreen')),
  Messages: lazyLoadScreen(() => import('../screens/EnhancedChatScreen')),
  Dashboard: lazyLoadScreen(() => import('../screens/dashboard/UserDashboardScreen')),
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export const LazyLoadingUtils = {
  lazyLoadScreen,
  lazyLoadComponent,
  preloadScreen,
  preloadMultipleScreens,
  getCachedComponent,
  clearComponentCache,
  getComponentCacheSize,
};
