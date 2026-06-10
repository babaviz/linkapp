type NavigationStateLike = {
  index?: number;
  routes?: Array<{ name?: string }>;
};

type DateMiNavigationLike = {
  getState?: () => NavigationStateLike | undefined;
  navigate?: (name: string, params?: unknown) => void;
};

function getCurrentRouteName(navigation: DateMiNavigationLike): string | null {
  const state = navigation.getState?.();
  if (!state || typeof state.index !== 'number' || !Array.isArray(state.routes)) {
    return null;
  }

  const route = state.routes[state.index];
  return typeof route?.name === 'string' ? route.name : null;
}

export function navigateToDateMiConversations(navigation: DateMiNavigationLike): void {
  const currentRouteName = getCurrentRouteName(navigation);
  if (currentRouteName === 'DateMiConversations') {
    return;
  }

  navigation.navigate?.('DateMiConversations');
}

