import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DraftProvider } from '@/store/DraftContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  return (
    <DraftProvider>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: '#e8531a',
        headerTitleStyle: { color: c.text, fontWeight: '700' },
        contentStyle: { backgroundColor: c.background },
      }}>
        {/* Main tabs */}
        <Stack.Screen name="index" options={{ title: 'Submit Report', headerLargeTitle: true }} />
        <Stack.Screen name="explore" options={{ title: 'Track Report', headerLargeTitle: true }} />
        <Stack.Screen name="verify" options={{ title: 'Verify Proof', headerLargeTitle: true }} />
        <Stack.Screen name="submit" options={{ headerShown: false }} />
      </Stack>
    </DraftProvider>
  );
}
