import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { AppThemeProvider, useAppTheme } from '@/hooks/app-theme';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRootLayout />
    </AppThemeProvider>
  );
}

function ThemedRootLayout() {
  const { isDarkMode } = useAppTheme();
  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="repartidorDashboard" />
        <Stack.Screen name="options" />
      </Stack>
    </ThemeProvider>
  );
}
