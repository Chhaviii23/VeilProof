import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, TrackStatusResponse } from '@/services/api';

const STATUS_LABELS: Record<string, string> = {
  received_securely: 'Received Securely',
  privacy_review: 'Privacy Review',
  assigned_for_investigation: 'Assigned for Investigation',
  under_investigation: 'Under Investigation',
  additional_review_required: 'Additional Review Required',
  resolution_prepared: 'Resolution Prepared',
  closed: 'Closed',
};

const STATUS_TYPE: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'error'> = {
  received_securely: 'info',
  privacy_review: 'warning',
  assigned_for_investigation: 'info',
  under_investigation: 'info',
  additional_review_required: 'warning',
  resolution_prepared: 'success',
  closed: 'neutral',
};

const PROOF_TYPE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  failed: 'error',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function TimelineItem({ update, c }: { update: TrackStatusResponse['public_updates'][0]; c: typeof Colors.dark }) {
  return (
    <View style={[styles.timelineItem, { borderLeftColor: '#e8531a' }]}>
      <Text style={[styles.timelineDate, { color: c.textSecondary }]}>{formatDate(update.added_at)}</Text>
      <StatusBadge
        label="Status"
        value={STATUS_LABELS[update.status] ?? update.status}
        type={STATUS_TYPE[update.status] ?? 'neutral'}
      />
      {update.text && (
        <Text style={[styles.timelineText, { color: c.text }]}>{update.text}</Text>
      )}
    </View>
  );
}

export default function TrackScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const [reference, setReference] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TrackStatusResponse | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleTrack() {
    const e: Record<string, string> = {};
    if (!reference.trim()) e.reference = 'Enter your case reference';
    if (secret.trim().length < 8) e.secret = 'Enter your tracking secret';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    setStatus(null);
    try {
      const session = await api.trackSession(reference.trim().toUpperCase(), secret.trim());
      setSessionToken(session.session_token);
      const data = await api.trackStatus(session.session_token);
      setStatus(data);
    } catch (err: any) {
      Alert.alert('Not Found', err.message || 'Could not find your case. Check your reference and secret.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const data = await api.trackStatus(sessionToken);
      setStatus(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not refresh status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: '#e8531a' }]}>VeilProof</Text>
          <Text style={[styles.pageTitle, { color: c.text }]}>Track Your Report</Text>
          <Text style={[styles.pageSub, { color: c.textSecondary }]}>
            Enter your case reference and tracking secret to check the status.
          </Text>
        </View>

        {/* Lookup form */}
        <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
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
            secureTextEntry={false}
            autoCorrect={false}
            autoCapitalize="none"
            error={errors.secret}
            containerStyle={{ marginTop: Spacing.two }}
          />
          <Button
            label={status ? 'Check Again' : 'Track Report'}
            onPress={handleTrack}
            loading={loading}
            style={{ marginTop: Spacing.three }}
          />
        </View>

        {/* Results */}
        {status && (
          <View style={{ gap: Spacing.three }}>
            {/* Status overview */}
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: c.text }]}>Case Status</Text>
                <Button label="Refresh" onPress={handleRefresh} loading={loading} variant="secondary" style={{ paddingVertical: 6, paddingHorizontal: Spacing.two, minHeight: 0 }} />
              </View>

              <Text style={[styles.caseRef, { color: '#e8531a', fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) }]}>
                {status.case_reference}
              </Text>

              <View style={{ gap: Spacing.one, marginTop: Spacing.two }}>
                <StatusBadge
                  label="Status"
                  value={STATUS_LABELS[status.status] ?? status.status}
                  type={STATUS_TYPE[status.status] ?? 'neutral'}
                />
                <StatusBadge
                  label="Priority"
                  value={status.priority.charAt(0).toUpperCase() + status.priority.slice(1)}
                  type={status.priority === 'critical' ? 'error' : 'neutral'}
                />
              </View>

              <Text style={[styles.lastUpdated, { color: c.textSecondary }]}>
                Last updated: {formatDate(status.updated_at)}
              </Text>
            </View>

            {/* Evidence protection */}
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Evidence Protection</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Files protected</Text>
                <Text style={[styles.infoValue, { color: c.text }]}>{status.protection_summary.evidence_count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Metadata fields stripped</Text>
                <Text style={[styles.infoValue, { color: c.text }]}>{status.protection_summary.metadata_fields_removed}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Provenance</Text>
                <Text style={[styles.infoValue, { color: '#4ade80' }]}>{status.protection_summary.provenance}</Text>
              </View>
            </View>

            {/* Blockchain proof */}
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Blockchain Proof</Text>
              <StatusBadge
                label="Proof"
                value={status.proof_summary.proof_status.charAt(0).toUpperCase() + status.proof_summary.proof_status.slice(1)}
                type={PROOF_TYPE[status.proof_summary.proof_status] ?? 'neutral'}
              />
              {status.proof_summary.tx_ref && (
                <View style={{ gap: 4, marginTop: Spacing.two }}>
                  <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Transaction</Text>
                  <Text style={[styles.mono, { color: c.text }]} numberOfLines={1}>{status.proof_summary.tx_ref}</Text>
                </View>
              )}
              {status.proof_summary.network && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: c.textSecondary }]}>Network</Text>
                  <Text style={[styles.infoValue, { color: c.text }]}>{status.proof_summary.network}</Text>
                </View>
              )}
            </View>

            {/* Timeline */}
            {status.public_updates.length > 0 && (
              <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>Case Timeline</Text>
                {[...status.public_updates].reverse().map((u) => (
                  <TimelineItem key={u.id} update={u} c={c} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { alignItems: 'center', paddingVertical: Spacing.three, gap: 6 },
  logo: { fontSize: 20, fontWeight: '800' },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  caseRef: { fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  lastUpdated: { fontSize: 12, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  mono: { fontSize: 12, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }) },
  timelineItem: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.two,
    gap: 6,
    paddingVertical: Spacing.one,
  },
  timelineDate: { fontSize: 12 },
  timelineText: { fontSize: 13, lineHeight: 20 },
});
