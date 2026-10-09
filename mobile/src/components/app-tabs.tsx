/**
 * Bottom tab bar component.
 * Uses expo-router/unstable-native-tabs for native look.
 * Tabs: Submit (index), Track (explore), Verify (verify)
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  return (
    <NativeTabs
      backgroundColor={c.background}
      indicatorColor={c.backgroundElement}
      labelStyle={{ selected: { color: '#e8531a' } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Submit</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="verify">
        <NativeTabs.Trigger.Label>Verify</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
