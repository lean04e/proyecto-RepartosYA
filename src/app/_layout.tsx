import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppThemeProvider, useAppTheme } from '@/hooks/app-theme';

// Evita que la pantalla de carga se oculte automáticamente antes de tiempo
// SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <AppThemeProvider>
      <ThemedTabLayout />
    </AppThemeProvider>
  );
}

function ThemedTabLayout() {
  const { isDarkMode } = useAppTheme();
  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
