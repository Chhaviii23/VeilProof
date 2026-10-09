/**
 * Submit/Submitting screen — mirrors web /report/submitting
 * Calls the real backend API, then navigates to receipt.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, useColorScheme, SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useDraft } from '@/store/DraftContext';
import { api, type ReportCategory } from '@/services/api';

const STAGES = [
  'Encrypting evidence files…',
  'Removing identifying metadata…',
  'Submitting to VeilProof securely…',
  'Registering blockchain commitment…',
  'Finalising your case record…',
];

export default function SubmittingScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { draft, reset } = useDraft();
  const [stage, setStage] = useState(0);
  const didRun = useRef(false);

  // Store receipt here so we can navigate with it
  const receiptRef = useRef<{ reference: string; secret: string } | null>(null);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    submit();
  }, []);

  async function submit() {
    // Advance stages visually while backend call runs in parallel
    const stageInterval = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 900);

    try {
      const intake = await api.createIntake();
      const result = await api.finalizeReport(intake.intake_id, intake.capability, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category as ReportCategory,
        incident_date: draft.incidentDate.trim() || undefined,
        location: draft.location.trim() || undefined,
        involved_parties: draft.involvedParties.trim() || undefined,
        risk_factors: draft.riskFactors.length > 0 ? draft.riskFactors : ['no_risk'],
        no_immediate_risk: draft.riskFactors.includes('no_risk') || draft.riskFactors.length === 0,
        tracking_secret: draft.trackingSecret.trim(),
        objects: [],
      });

      clearInterval(stageInterval);
      setStage(STAGES.length - 1);

      receiptRef.current = { reference: result.case_reference, secret: draft.trackingSecret.trim() };

      setTimeout(() => {
        router.replace({
          pathname: '/submit/receipt',
          params: {
            reference: result.case_reference,
            secret: draft.trackingSecret.trim(),
            attachments: String(result.attachment_count),
            proof: result.proof_status,
          },
        });
        reset();
      }, 800);

    } catch (err: any) {
      clearInterval(stageInterval);
      Alert.alert(
        'Submission Failed',
        err.message || 'Could not connect to VeilProof. Please check your network and try again.',
        [{ text: 'Go back', onPress: () => router.back() }],
      );
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.center}>
        {/* Animated lock icon */}
        <View style={[styles.icon, { backgroundColor: '#1a3a2a' }]}>
          <Text style={{ fontSize: 44 }}>🔒</Text>
        </View>

        <Text style={[styles.title, { color: c.text }]}>Submitting securely</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Your identity is never transmitted. Do not close the app.
        </Text>

        {/* Stage progress */}
        <View style={[styles.stageBox, { backgroundColor: c.backgroundElement }]}>
          {STAGES.map((s, i) => (
            <View key={s} style={styles.stageRow}>
              <Text style={{ fontSize: 14, width: 20 }}>
                {i < stage ? '✓' : i === stage ? '⏳' : '○'}
              </Text>
              <Text style={[styles.stageText, {
                color: i < stage ? '#4ade80' : i === stage ? c.text : c.textSecondary,
                fontWeight: i === stage ? '600' : 'normal',
              }]}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBg, { backgroundColor: c.backgroundElement }]}>
          <View style={[styles.progressFill, { width: `${((stage + 1) / STAGES.length) * 100}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.three, gap: Spacing.three },
  icon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stageBox: { width: '100%', borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stageText: { fontSize: 14, flex: 1 },
  progressBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#e8531a', borderRadius: 3 },
});
