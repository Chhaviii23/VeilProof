/**
 * Submit/Receipt screen — mirrors web /report/receipt
 * Shows case reference and tracking secret with a warning to save them.
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  useColorScheme, SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function ReceiptScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { reference, secret, attachments, proof } = useLocalSearchParams<{
    reference: string; secret: string; attachments: string; proof: string;
  }>();

  const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Success icon */}
        <View style={[styles.iconWrap, { backgroundColor: '#1a3a2a' }]}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>Report submitted securely</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Your identity is protected. Save these details now — this is the only time they will be shown.
        </Text>

        {/* Receipt card */}
        <View style={[styles.receiptCard, { backgroundColor: c.backgroundElement }]}>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: c.textSecondary }]}>Case Reference</Text>
            <Text style={[styles.receiptValue, { color: '#e8531a', fontFamily: MONO }]}>{reference}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: c.backgroundSelected }]} />

          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: c.textSecondary }]}>Tracking Secret</Text>
            <Text style={[styles.receiptValue, { color: c.text, fontFamily: MONO }]}>{secret}</Text>
          </View>

          {attachments !== '0' && (
            <>
              <View style={[styles.divider, { backgroundColor: c.backgroundSelected }]} />
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: c.textSecondary }]}>Evidence files</Text>
                <Text style={[styles.receiptValue, { color: c.text }]}>{attachments} file{attachments !== '1' ? 's' : ''} secured</Text>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: c.backgroundSelected }]} />

          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: c.textSecondary }]}>Blockchain proof</Text>
            <Text style={[styles.receiptValue, {
              color: proof === 'confirmed' ? '#4ade80' : proof === 'failed' ? '#f87171' : '#fbbf24',
            }]}>
              {proof === 'confirmed' ? 'Confirmed ✓' : proof === 'failed' ? 'Failed ✕' : 'Pending…'}
            </Text>
          </View>
        </View>

        {/* Warning box */}
        <View style={[styles.warnBox, { backgroundColor: '#3a2e1a', borderColor: '#fbbf2440' }]}>
          <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '700' }}>⚠️  Save these now</Text>
          <Text style={{ color: '#fcd34d', fontSize: 13, lineHeight: 20, marginTop: 4 }}>
            Write down your case reference and tracking secret. This is the only time they will be shown.{'\n\n'}
            You will need both to track the status of your report through the Track tab.
          </Text>
        </View>

        {/* What happens next */}
        <View style={[styles.nextCard, { backgroundColor: c.backgroundElement }]}>
          <Text style={[styles.nextTitle, { color: c.text }]}>What happens next</Text>
          {[
            ['🔍', 'Privacy review', 'A Privacy & Evidence Officer will review your submission and apply appropriate protections.'],
            ['👤', 'Investigation', 'Once released, your case will be assigned to an Anti-Corruption Officer.'],
            ['🔔', 'Track progress', 'Use the Track tab with your case reference and tracking secret to follow updates.'],
          ].map(([icon, heading, desc]) => (
            <View key={heading} style={styles.nextRow}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{heading}</Text>
                <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 18 }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          label="Submit another report"
          onPress={() => router.replace('/')}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, alignItems: 'stretch' },
  iconWrap: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  receiptCard: { borderRadius: 12, overflow: 'hidden' },
  receiptRow: { padding: Spacing.three, gap: 6 },
  receiptLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  receiptValue: { fontSize: 20, fontWeight: '700' },
  divider: { height: 1 },
  warnBox: { borderRadius: 10, borderWidth: 1, padding: Spacing.three },
  nextCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.three },
  nextTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
});
