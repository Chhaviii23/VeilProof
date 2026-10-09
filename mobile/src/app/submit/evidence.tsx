import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { useDraft } from '@/store/DraftContext';

export default function EvidenceScreen() {
  const router = useRouter();
  const { draft, removeEvidence } = useDraft();
  const [error, setError] = useState('');
  async function openWeb() {
    const url = process.env.EXPO_PUBLIC_WEB_URL;
    if (!url) { setError('The web reporting address is not configured. Set EXPO_PUBLIC_WEB_URL for this installation.'); return; }
    try { await Linking.openURL(`${url.replace(/\/$/, '')}/report/details`); }
    catch { setError('Could not open web reporting. Check the configured address.'); }
  }
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>Evidence and identity protection</Text>
    <Text style={styles.text}>Use web reporting to upload evidence, review detected names and faces, select audio intervals, and download protected copies. The browser flow also works on phones.</Text>
    <Text style={styles.text}>This native flow submits report text only. Your current draft stays here; opening web reporting starts a separate draft.</Text>
    <Button label="Open full web reporting" onPress={openWeb} />
    {draft.evidence.map(item => <View key={item.id} style={{ gap: 8 }}><Text style={styles.text}>{item.name} has not been uploaded.</Text><Button label="Remove unsubmitted attachment" onPress={() => removeEvidence(item.id)} variant="secondary" /></View>)}
    <Button label="Continue with text only" disabled={draft.evidence.length > 0} onPress={() => router.push('/submit/review')} variant="secondary" />
    {error ? <Text style={{ color: '#ef4444' }}>{error}</Text> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 24, gap: 20, backgroundColor: '#111827', flexGrow: 1 }, title: { fontSize: 24, fontWeight: '600', color: '#fff' }, text: { fontSize: 15, lineHeight: 23, color: '#d1d5db' } });
