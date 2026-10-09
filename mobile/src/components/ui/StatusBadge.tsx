import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
}

export function StatusBadge({ label, value, type = 'neutral' }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const bgColor: Record<string, string> = {
    success: '#1a3a2a',
    error: '#3a1a1a',
    warning: '#3a2e1a',
    info: '#1a2a3a',
    neutral: c.backgroundElement,
  };
  const textColor: Record<string, string> = {
    success: '#4ade80',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',
    neutral: c.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColor[type] }]}>
      <Text style={[styles.label, { color: textColor[type] }]}>{label}: </Text>
      <Text style={[styles.value, { color: textColor[type] }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
  },
});
