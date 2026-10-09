/**
 * Submit/Risk screen — mirrors web /report/risk
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

const RISK_OPTIONS = [
  { key: 'no_risk', label: 'No immediate risk', description: 'You do not believe you face retaliation or danger at this time.' },
  { key: 'workplace_retaliation', label: 'Workplace retaliation concern', description: 'You have experienced or expect negative action at work for raising this concern.' },
  { key: 'job_threat', label: 'Job termination or forced transfer threat', description: 'You have been threatened with dismissal, demotion, or forced reassignment.' },
  { key: 'physical_threat', label: 'Physical threat received', description: 'You have received a credible threat to your personal safety.', critical: true },
  { key: 'family_threat', label: 'Family threat received', description: 'A threat has been made against a member of your family.', critical: true },
  { key: 'public_safety', label: 'Immediate public-safety danger', description: 'The matter poses a risk to the health or safety of members of the public.', critical: true },
];

const CRITICAL_KEYS = new Set(['physical_threat', 'family_threat', 'public_safety']);

export default function RiskScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { draft, updateDraft } = useDraft();
  const [selected, setSelected] = useState<string[]>(draft.riskFactors);

  function toggle(key: string) {
    setSelected((prev) => {
      if (key === 'no_risk') return prev.includes('no_risk') ? [] : ['no_risk'];
      const without = prev.filter((k) => k !== 'no_risk');
      return without.includes(key) ? without.filter((k) => k !== key) : [...without, key];
    });
  }

  function applyDemo() {
    setSelected(['physical_threat', 'family_threat', 'public_safety']);
  }

  function handleContinue() {
    updateDraft({ riskFactors: selected });
    router.push('/submit/evidence');
  }

  const isCritical = selected.some((k) => CRITICAL_KEYS.has(k));
  const hasSelection = selected.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: c.text }]}>Risk and urgency</Text>
          <TouchableOpacity onPress={applyDemo}>
            <Text style={styles.demoLink}>Apply demo</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.pageSub, { color: c.textSecondary }]}>
          Select any risks that apply. This information is kept confidential and helps us prioritise your case — it is not shared publicly.
        </Text>

        <View style={{ gap: Spacing.one }}>
          {RISK_OPTIONS.map(({ key, label, description, critical }) => {
            const isSelected = selected.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.riskCard, {
                  backgroundColor: isSelected
                    ? (critical ? '#3a1a1a' : '#3a1e0e')
                    : c.backgroundElement,
                  borderColor: isSelected
                    ? (critical ? '#ef4444' : '#e8531a')
                    : 'transparent',
                }]}
                onPress={() => toggle(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, {
                  borderColor: isSelected ? (critical ? '#ef4444' : '#e8531a') : c.textSecondary,
                  backgroundColor: isSelected ? (critical ? '#ef4444' : '#e8531a') : 'transparent',
                }]}>
                  {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.riskLabel, { color: isSelected ? (critical ? '#f87171' : '#e8531a') : c.text }]}>
                      {label}
                    </Text>
                    {critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>Critical</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.riskDesc, { color: c.textSecondary }]}>{description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Priority indicator */}
        {hasSelection && (
          <View style={[styles.priorityBox, {
            backgroundColor: isCritical ? '#3a1a1a' : c.backgroundElement,
            borderColor: isCritical ? '#ef4444' : c.backgroundSelected,
          }]}>
            <Text style={{ fontSize: 16 }}>{isCritical ? '⚠️' : 'ℹ️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.priorityTitle, { color: isCritical ? '#f87171' : c.text }]}>
                {isCritical ? 'Critical priority — immediate review' : 'Standard priority'}
              </Text>
              <Text style={[styles.priorityDesc, { color: c.textSecondary }]}>
                {isCritical
                  ? 'Your case will be flagged for immediate attention. Whistleblower protection measures will be applied.'
                  : 'Your case will be reviewed in the normal queue. You can update your risk assessment through the tracking portal.'}
              </Text>
            </View>
          </View>
        )}

        {!hasSelection && (
          <Text style={[styles.hint, { color: c.textSecondary }]}>Select at least one option to continue.</Text>
        )}

        <View style={styles.navRow}>
          <Button label="Back" onPress={() => router.back()} variant="secondary" style={{ flex: 1 }} />
          <Button label="Continue →" onPress={handleContinue} disabled={!hasSelection} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  demoLink: { fontSize: 13, color: '#e8531a', textDecorationLine: 'underline' },
  pageSub: { fontSize: 14, lineHeight: 20 },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  riskLabel: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  riskDesc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  criticalBadge: {
    backgroundColor: '#3a1a1a', borderColor: '#ef444450', borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  criticalBadgeText: { color: '#f87171', fontSize: 10, fontWeight: '700' },
  priorityBox: {
    flexDirection: 'row', gap: Spacing.two, borderWidth: 1.5,
    borderRadius: 10, padding: Spacing.three, alignItems: 'flex-start',
  },
  priorityTitle: { fontSize: 14, fontWeight: '600' },
  priorityDesc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  hint: { fontSize: 12 },
  navRow: { flexDirection: 'row', gap: Spacing.two },
});
