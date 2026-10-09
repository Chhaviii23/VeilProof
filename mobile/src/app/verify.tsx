import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, VerifyResponse } from '@/services/api';

export default function VerifyScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const [mode, setMode] = useState<'paste' | 'track'>('track');

  // Track mode (use case reference + secret to fetch & verify automatically)
  const [reference, setReference] = useState('');
  const [secret, setSecret] = useState('');

  // Paste mode (paste the raw JSON proof package)
  const [rawJson, setRawJson] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleVerifyByTrack() {
    const e: Record<string, string> = {};
    if (!reference.trim()) e.reference = 'Enter your case reference';
    if (secret.trim().length < 8) e.secret = 'Enter your tracking secret';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setResult(null);
    try {
      const session = await api.trackSession(reference.trim().toUpperCase(), secret.trim());
      const pkg = await api.proofPackage(session.session_token);
      const verified = await api.verifyProof(pkg.package);
      setResult(verified);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Could not fetch or verify the proof package.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyByPaste() {
    const e: Record<string, string> = {};
    if (!rawJson.trim()) { e.json = 'Paste the proof JSON'; setErrors(e); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(rawJson.trim()); } catch {
      setErrors({ json: 'Invalid JSON — paste the exact proof package' });
      return;
    }
    setErrors({});
    setLoading(true);
    setResult(null);
    try {
      const verified = await api.verifyProof(parsed);
      setResult(verified);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Could not verify the proof package.');
    } finally {
      setLoading(false);
    }
  }

  const overallOk = result
    ? result.schema_ok && result.commitment_match
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: '#e8531a' }]}>VeilProof</Text>
          <Text style={[styles.pageTitle, { color: c.text }]}>Verify Proof</Text>
          <Text style={[styles.pageSub, { color: c.textSecondary }]}>
            Verify that evidence has not been tampered with using its blockchain commitment.
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: c.backgroundElement }]}>
          {(['track', 'paste'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); setResult(null); setErrors({}); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : c.textSecondary }]}>
                {m === 'track' ? '🔑 By Case Reference' : '📋 Paste Proof JSON'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Track mode */}
        {mode === 'track' && (
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Verify by case reference</Text>
            <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
              We'll fetch the proof package automatically using your credentials.
            </Text>
            <TextField
              label="Case Reference"
              value={reference}
              onChangeText={(t) => { setReference(t); setErrors((e) => ({ ...e, reference: '' })); }}
              placeholder="e.g. VP-2026-XXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.reference}
            />
            <TextField
              label="Tracking Secret"
              value={secret}
              onChangeText={(t) => { setSecret(t); setErrors((e) => ({ ...e, secret: '' })); }}
              placeholder="Your tracking passphrase"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.secret}
              containerStyle={{ marginTop: Spacing.two }}
            />
            <Button
              label="Verify Integrity"
              onPress={handleVerifyByTrack}
              loading={loading}
              style={{ marginTop: Spacing.three }}
            />
          </View>
        )}

        {/* Paste mode */}
        {mode === 'paste' && (
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Paste proof package</Text>
            <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
              Paste the JSON proof package downloaded from the VeilProof web portal or shared with you.
            </Text>
            <TextField
              label="Proof JSON"
              value={rawJson}
              onChangeText={(t) => { setRawJson(t); setErrors((e) => ({ ...e, json: '' })); }}
              placeholder={'{\n  "commitment": "...",\n  "chain_id": ...\n}'}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              error={errors.json}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }), fontSize: 12 } as any}
            />
            <Button
              label="Verify Integrity"
              onPress={handleVerifyByPaste}
              loading={loading}
              style={{ marginTop: Spacing.three }}
            />
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            {/* Overall verdict */}
            <View style={[styles.verdictBanner, {
              backgroundColor: overallOk ? '#1a3a2a' : '#3a1a1a',
              borderColor: overallOk ? '#4ade80' : '#f87171',
            }]}>
              <Text style={{ fontSize: 32 }}>{overallOk ? '✅' : '❌'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verdictTitle, { color: overallOk ? '#4ade80' : '#f87171' }]}>
                  {overallOk ? 'Integrity Verified' : 'Verification Failed'}
                </Text>
                <Text style={[styles.verdictDesc, { color: overallOk ? '#86efac' : '#fca5a5' }]}>
                  {overallOk
                    ? 'This evidence has not been tampered with since it was committed to the blockchain.'
                    : 'The proof does not match the blockchain commitment. The evidence may have been altered.'}
                </Text>
              </View>
            </View>

            {/* Detail checks */}
            <Text style={[styles.cardTitle, { color: c.text, marginTop: Spacing.two }]}>Check Details</Text>
            <CheckRow label="Schema valid" pass={result.schema_ok} c={c} />
            <CheckRow label="Blockchain commitment" pass={result.commitment_match} c={c} />
            {result.original_match !== null && (
              <CheckRow label="Original file hash" pass={result.original_match!} c={c} />
            )}
            {result.protected_match !== null && (
              <CheckRow label="Protected copy hash" pass={result.protected_match!} c={c} />
            )}

            {/* Scope and anchor */}
            <View style={[styles.anchorCard, { backgroundColor: c.backgroundSelected }]}>
              <Text style={[styles.anchorLabel, { color: c.textSecondary }]}>Scope</Text>
              <Text style={[styles.anchorValue, { color: c.text }]}>{result.supplied_scope}</Text>
              {typeof result.anchor === 'object' && result.anchor !== null &&
                Object.entries(result.anchor).slice(0, 4).map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', gap: Spacing.one }}>
                    <Text style={[styles.anchorLabel, { color: c.textSecondary }]}>{k}</Text>
                    <Text style={[styles.anchorValue, { color: c.text, flex: 1 }]} numberOfLines={1}>
                      {String(v)}
                    </Text>
                  </View>
                ))
              }
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckRow({ label, pass, c }: { label: string; pass: boolean; c: typeof Colors.dark }) {
  return (
    <View style={styles.checkRow}>
      <Text style={{ fontSize: 16 }}>{pass ? '✅' : '❌'}</Text>
      <Text style={[styles.checkLabel, { color: c.text }]}>{label}</Text>
      <StatusBadge label="" value={pass ? 'Pass' : 'Fail'} type={pass ? 'success' : 'error'} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { alignItems: 'center', paddingVertical: Spacing.three, gap: 6 },
  logo: { fontSize: 20, fontWeight: '800' },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modeToggle: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: Spacing.two, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#e8531a' },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  verdictBanner: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  verdictTitle: { fontSize: 18, fontWeight: '700' },
  verdictDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkLabel: { flex: 1, fontSize: 14 },
  anchorCard: { borderRadius: 8, padding: Spacing.two, gap: 4, marginTop: Spacing.one },
  anchorLabel: { fontSize: 11, fontWeight: '600' },
  anchorValue: { fontSize: 12, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
});
