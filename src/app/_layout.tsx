import {
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/baloo-2';
import { Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { initAnalytics } from '@/analytics';
import { initGameCenter } from '@/gamecenter';
import { useNotificationSync } from '@/notifications';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_700Bold,
  });
  useNotificationSync();
  useEffect(() => {
    initAnalytics();
    initGameCenter();
  }, []);

  if (!fontsLoaded) return null; // local asset: resolves in one frame

  // initialWindowMetrics gives SafeAreaView its insets on the first frame, so the
  // HUD never flashes under the status bar during a cold launch (playtest B1)
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="shop" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
