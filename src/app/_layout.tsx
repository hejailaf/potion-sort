import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initAnalytics } from '@/analytics';
import { initGameCenter } from '@/gamecenter';
import { useNotificationSync } from '@/notifications';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  useNotificationSync();
  useEffect(() => {
    initAnalytics();
    initGameCenter();
  }, []);

  if (!fontsLoaded) return null; // local asset: resolves in one frame

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
