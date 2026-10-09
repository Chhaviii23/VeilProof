/**
 * Submit/Review screen — mirrors web /report/review
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useDraft } from '@/store/DraftContext';
import { CATEGORY_LABELS } from '@/services/api';
import { TextField } from '@/components/ui/TextField';

const RISK_LABELS: Record<string, string> = {
  no_risk: 'No immediate risk',
  workplace_retaliation: 'Workplace retaliation concern',
  job_threat: 'Job termination or forced transfer threat',
  physical_threat: 'Physical threat received',
  family_threat: 'Family threat received',
  public_safety: 'Immediate public-safety danger',
};

function Field({ label, value }: { label: string; value?: string }) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  if (!value) return null;
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: c.text, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  return (
    <View style={[styles.sectionCard, { backgroundColor: c.backgroundElement }]}>
      <View style={[styles.sectionHeader, { borderBottomColor: c.backgroundSelected }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit}>
            <Text style={{ color: '#e8531a', fontSize: 13 }}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function ReviewScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { draft, updateDraft } = useDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasBaseErrors = !draft.title.trim() || !draft.category || draft.description.trim().length < 50;

  function validate() {
    const e: Record<string, string> = {};
    if (draft.trackingSecret.trim().length < 8) e.secret = 'Tracking secret must be at least 8 characters.';
    if (!draft.acknowledged) e.ack = 'You must acknowledge before submitting.';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) router.push('/submit/submitting');
  }

  const sanitized = draft.evidence.filter((e) => e.scanState === 'sanitized');
  const totalMeta = sanitized.reduce((a, e) => a + e.metadataRemoved.length, 0);

  if (hasBaseErrors) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.pageTitle, { color: c.text }]}>Review report</Text>
          <View style={[styles.errorBox, { backgroundColor: '#3a1a1a', borderColor: '#ef444440' }]}>
            <Text style={{ color: '#f87171', fontSize: 15, fontWeight: '600' }}>⚠ Required fields are incomplete.</Text>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={{ color: '#e8531a', fontSize: 14, marginTop: 8, textDecorationLine: 'underline' }}>Go back to report details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: c.text }]}>Review and submit</Text>

        {/* Report details */}
        <SectionCard title="Report details" onEdit={() => router.push('/')}>
          <Field label="Title" value={draft.title} />
          <Field label="Category" value={CATEGORY_LABELS[draft.category as keyof typeof CATEGORY_LABELS]} />
          <Field label="Description" value={draft.description} />
          {draft.incidentDate ? <Field label="Incident date" value={draft.incidentDate} /> : null}
          {draft.location ? <Field label="Location" value={draft.location} /> : null}
          {draft.involvedParties ? <Field label="Involved parties" value={draft.involvedParties} /> : null}
          {draft.riskFactors.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Risk factors</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {draft.riskFactors.map((f) => (
                  <View key={f} style={[styles.riskPill, { backgroundColor: c.backgroundSelected }]}>
                    <Text style={{ color: c.text, fontSize: 12 }}>{RISK_LABELS[f] ?? f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </SectionCard>

        {/* Evidence */}
        <SectionCard title="Evidence" onEdit={() => router.push('/submit/evidence')}>
          {draft.evidence.length === 0
            ? <Text style={{ color: c.textSecondary, fontSize: 14 }}>No evidence attached.</Text>
            : draft.evidence.map((ev) => (
              <View key={ev.id} style={{ gap: 2 }}>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>{ev.name}</Text>
                {ev.scanState === 'sanitized' && (
                  <Text style={{ color: '#4ade80', fontSize: 12 }}>✓ Protected copy created · {ev.metadataRemoved.length} fields removed</Text>
                )}
              </View>
            ))
          }
          {sanitized.length > 0 && (
            <View style={[styles.protBox, { backgroundColor: '#1a3a2a', borderColor: '#4ade8040' }]}>
              <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '600' }}>✓ Identity protection applied</Text>
              <Text style={{ color: '#86efac', fontSize: 12 }}>{sanitized.length} file{sanitized.length > 1 ? 's' : ''} protected · {totalMeta} metadata fields removed</Text>
            </View>
          )}
        </SectionCard>

        {/* Recipient */}
        <SectionCard title="Recipient organization">
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '500' }}>Public Integrity Office</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>Demo — fictional organization</Text>
        </SectionCard>

        {/* Tracking secret */}
        <SectionCard title="Create your tracking secret">
          <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 18 }}>
            This passphrase is the only way to track your report. We never store it. Choose something memorable but private.
          </Text>
          <TextField
            label="Tracking secret (min. 8 characters)"
            value={draft.trackingSecret}
            onChangeText={(v) => { updateDraft({ trackingSecret: v }); setErrors((e) => ({ ...e, secret: '' })); }}
            placeholder="e.g. BlueSky#2026!Witness"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.secret}
            maxLength={200}
          />
        </SectionCard>

        {/* Acknowledgement */}
        <TouchableOpacity
          style={[styles.ackRow, { backgroundColor: c.backgroundElement, borderColor: draft.acknowledged ? '#e8531a' : c.backgroundSelected }]}
          onPress={() => { updateDraft({ acknowledged: !draft.acknowledged }); setErrors((e) => ({ ...e, ack: '' })); }}
          activeOpacity={0.7}
        >
          <View style={[styles.ackCheck, {
            borderColor: draft.acknowledged ? '#e8531a' : c.textSecondary,
            backgroundColor: draft.acknowledged ? '#e8531a' : 'transparent',
          }]}>
            {draft.acknowledged && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ color: c.text, fontSize: 14, flex: 1, lineHeight: 20 }}>
            I understand this is a demo and have used fictional information.
          </Text>
        </TouchableOpacity>
        {errors.ack && <Text style={{ color: '#ef4444', fontSize: 12 }}>{errors.ack}</Text>}

        <View style={styles.navRow}>
          <Button label="Back" onPress={() => router.back()} variant="secondary" style={{ flex: 1 }} />
          <Button
            label="Submit demo report →"
            onPress={handleSubmit}
            disabled={!draft.acknowledged}
            style={{ flex: 2 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  sectionCard: { borderRadius: 12, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.three, borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionBody: { padding: Spacing.three, gap: Spacing.two },
  riskPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  protBox: { borderRadius: 8, borderWidth: 1, padding: Spacing.two, gap: 3, marginTop: 4 },
  ackRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    padding: Spacing.three, borderRadius: 10, borderWidth: 1.5,
  },
  ackCheck: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  navRow: { flexDirection: 'row', gap: Spacing.two },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: Spacing.three },
});
