import React from 'react';
import {
  TextInput as RNTextInput,
  Text,
  View,
  StyleSheet,
  useColorScheme,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextField({ label, hint, error, containerStyle, ...rest }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: c.backgroundElement,
            color: c.text,
            borderColor: error ? '#ef4444' : 'transparent',
          },
        ]}
        placeholderTextColor={c.textSecondary}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '500' },
  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 15,
    borderWidth: 1.5,
    minHeight: 48,
  },
  error: { fontSize: 12, color: '#ef4444' },
  hint: { fontSize: 12 },
});
