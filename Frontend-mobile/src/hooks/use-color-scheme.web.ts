import { useAppTheme } from './app-theme';

export function useColorScheme() {
  const { isDarkMode } = useAppTheme();
  return isDarkMode ? 'dark' : 'light';
}
