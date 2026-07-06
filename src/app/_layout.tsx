import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initAnalytics } from '@/analytics';
import { initGameCenter } from '@/gamecenter';
import { useNotificationSync } from '@/notifications';

export default function RootLayout() {
  useNotificationSync();
  useEffect(() => {
    initAnalytics();
    initGameCenter();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
