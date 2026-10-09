import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function SubmitLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: c.background },
      headerTintColor: '#e8531a',
      headerTitleStyle: { color: c.text, fontWeight: '700' },
      headerBackTitle: 'Back',
      contentStyle: { backgroundColor: c.background },
    }}>
      <Stack.Screen name="risk" options={{ title: 'Risk & Urgency' }} />
      <Stack.Screen name="evidence" options={{ title: 'Evidence' }} />
      <Stack.Screen name="review" options={{ title: 'Review Report' }} />
      <Stack.Screen name="submitting" options={{ title: 'Submitting', headerShown: false }} />
      <Stack.Screen name="receipt" options={{ title: 'Submitted', headerBackVisible: false }} />
    </Stack>
  );
}
