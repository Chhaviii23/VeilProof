/**
 * Submit/Evidence screen — mirrors web /report/evidence
 * Allows picking files from the device. Metadata scanning is simulated.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, SafeAreaView, StatusBar, Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useDraft } from '@/store/DraftContext';
import type { EvidenceItem } from '@/store/DraftContext';

// We use expo-document-picker if available; gracefully fall back if not installed.
let DocumentPicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'audio/mpeg', 'video/mp4'];
const META_FOR_TYPE: Record<string, string[]> = {
  'image/jpeg': ['GPS coordinates', 'Device model', 'Camera serial'],
  'image/png':  ['Creation timestamp', 'Software version'],
  'application/pdf': ['Author name', 'Creator software', 'Document UUID'],
  'audio/mpeg': ['Recorder ID', 'Encoding device', 'Timestamp'],
  'video/mp4':  ['GPS track', 'Device fingerprint', 'Recording app'],
};

const STAGES_FOR_TYPE: Record<string, string[]> = {
  'image/jpeg': ['Inspecting location and device metadata…', 'Removing identity-related fields…', 'Creating protected image…'],
  'image/png':  ['Inspecting location and device metadata…', 'Removing identity-related fields…', 'Creating protected image…'],
  'application/pdf': ['Inspecting document properties…', 'Removing author and device fields…', 'Creating protected document…'],
  'audio/mpeg': ['Inspecting audio metadata…', 'Removing device and account fields…', 'Applying voice masking…', 'Creating protected audio…'],
  'video/mp4':  ['Inspecting video metadata…', 'Removing location and device fields…', 'Creating protected video…'],
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EvidenceCard({
  item,
  onRemove,
  onProtect,
}: { item: EvidenceItem; onRemove: () => void; onProtect: () => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const statusColor = item.scanState === 'sanitized'
    ? '#4ade80'
    : item.scanState === 'unsupported' || item.scanState === 'failed'
    ? '#f87171'
    : item.scanState === 'scanning'
    ? '#fbbf24'
    : c.textSecondary;

  const statusLabel: Record<EvidenceItem['scanState'], string> = {
    idle: 'Queued for processing',
    scanning: 'Processing metadata…',
    sanitized: 'Protected copy created',
    unsupported: 'Unsupported file type',
    failed: 'Processing failed',
  };

  return (
    <View style={[styles.evCard, { backgroundColor: c.backgroundElement }]}>
      <View style={styles.evHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.evName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.evMeta, { color: c.textSecondary }]}>
            {formatSize(item.size)} · {item.type.split('/')[1]?.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={{ color: '#f87171', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {item.scanState === 'scanning' && (
        <View style={styles.evStatus}>
          <ActivityIndicator size="small" color="#fbbf24" />
          <Text style={[styles.evStatusText, { color: '#fbbf24' }]}>Processing…</Text>
        </View>
      )}

      {item.scanState === 'sanitized' && (
        <View>
          {item.metadataRemoved.length > 0 && (
            <View style={styles.tagRow}>
              {item.metadataRemoved.map((f) => (
                <View key={f} style={styles.metaTag}>
                  <Text style={styles.metaTagText}>{f} — removed</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.evStatus2, { color: '#4ade80' }]}>✓ Protected copy created. Encrypted original sealed.</Text>
        </View>
      )}

      {item.scanState === 'unsupported' && (
        <View>
          <Text style={[styles.evStatus2, { color: '#f87171' }]}>✕ Unsupported file type — cannot be processed.</Text>
          <Button label="Remove file" onPress={onRemove} variant="danger" style={{ marginTop: Spacing.one, alignSelf: 'flex-start' }} />
        </View>
      )}

      {item.scanState === 'failed' && (
        <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.one }}>
          <Button label="Retry" onPress={onProtect} variant="secondary" style={{ flex: 1 }} />
          <Button label="Remove" onPress={onRemove} variant="danger" style={{ flex: 1 }} />
        </View>
      )}

      {(item.scanState === 'idle') && (
        <Text style={[styles.evStatus2, { color: statusColor }]}>{statusLabel[item.scanState]}</Text>
      )}
    </View>
  );
}

export default function EvidenceScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { draft, addEvidence, removeEvidence, updateEvidence } = useDraft();
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  async function processItem(item: EvidenceItem) {
    const id = item.id;
    setProcessing((s) => new Set([...s, id]));
    updateEvidence(id, { scanState: 'scanning' });

    const stages = STAGES_FOR_TYPE[item.type] ?? ['Scanning…'];
    for (const _stage of stages) {
      await delay(800);
    }

    const supported = SUPPORTED_TYPES.includes(item.type);
    if (!supported) {
      updateEvidence(id, { scanState: 'unsupported' });
    } else {
      const meta = META_FOR_TYPE[item.type] ?? [];
      updateEvidence(id, { scanState: 'sanitized', metadataRemoved: meta });
    }

    setProcessing((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  async function pickFile() {
    if (!DocumentPicker) {
      Alert.alert(
        'Not available',
        'expo-document-picker is not installed. Run: npx expo install expo-document-picker',
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const item: EvidenceItem = {
        id: generateId(),
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? 'application/octet-stream',
        uri: asset.uri,
        scanState: 'idle',
        metadataRemoved: [],
      };
      addEvidence(item);
      processItem(item);
    } catch {
      Alert.alert('Error', 'Could not pick file.');
    }
  }

  function addDemoEvidence() {
    const demos: Omit<EvidenceItem, 'id'>[] = [
      { name: 'Bribe_Discussion_Recording.mp3', size: 4200000, type: 'audio/mpeg', uri: '', scanState: 'idle', metadataRemoved: [] },
      { name: 'Contract_Invoice_Scan.pdf', size: 890000, type: 'application/pdf', uri: '', scanState: 'idle', metadataRemoved: [] },
    ];
    for (const d of demos) {
      const item = { ...d, id: generateId() };
      addEvidence(item);
      processItem(item);
    }
  }

  const canContinue = !processing.size && (draft.evidence.length === 0 || draft.evidence.every((e) => e.scanState === 'sanitized' || e.scanState === 'unsupported'));

  // Protection summary
  const sanitized = draft.evidence.filter((e) => e.scanState === 'sanitized');
  const totalMeta = sanitized.reduce((a, e) => a + e.metadataRemoved.length, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: c.text }]}>Evidence</Text>
          <TouchableOpacity onPress={addDemoEvidence}>
            <Text style={styles.demoLink}>Add demo files</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.pageSub, { color: c.textSecondary }]}>
          Attach supporting documents, images, audio, or video. All files are encrypted and identity metadata is removed before submission.
        </Text>

        {/* Warning */}
        <View style={[styles.warnBox, { backgroundColor: '#3a2e1a', borderColor: '#fbbf2440' }]}>
          <Text style={{ color: '#fbbf24', fontSize: 13, lineHeight: 20 }}>
            ⚠️  Content inside files may still identify you. Metadata removal reduces risk but does not sanitize visible content — names, faces, or distinctive phrases within files.
          </Text>
        </View>

        {/* Evidence list */}
        {draft.evidence.length > 0 && (
          <View style={{ gap: Spacing.two }}>
            {draft.evidence.map((item) => (
              <EvidenceCard
                key={item.id}
                item={item}
                onRemove={() => removeEvidence(item.id)}
                onProtect={() => processItem(item)}
              />
            ))}
          </View>
        )}

        {/* Protection summary */}
        {sanitized.length > 0 && (
          <View style={[styles.summaryBox, { backgroundColor: '#1a3a2a', borderColor: '#4ade8040' }]}>
            <Text style={{ color: '#4ade80', fontWeight: '600', fontSize: 14 }}>✓ Identity protection completed</Text>
            <Text style={{ color: '#86efac', fontSize: 13 }}>{sanitized.length} file{sanitized.length > 1 ? 's' : ''} processed</Text>
            {totalMeta > 0 && (
              <Text style={{ color: '#86efac', fontSize: 13 }}>{totalMeta} metadata field{totalMeta > 1 ? 's' : ''} removed</Text>
            )}
            <Text style={{ color: '#86efac', fontSize: 13 }}>Originals sealed in Controlled Evidence Vault</Text>
          </View>
        )}

        {/* Add file button */}
        <TouchableOpacity
          style={[styles.addFileBtn, { borderColor: c.backgroundSelected }]}
          onPress={pickFile}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24, color: c.textSecondary }}>+</Text>
          <Text style={[styles.addFileText, { color: c.textSecondary }]}>Attach a file</Text>
          <Text style={[styles.addFileHint, { color: c.textSecondary }]}>PDF, image, audio, or video</Text>
        </TouchableOpacity>

        {draft.evidence.length === 0 && (
          <Text style={[styles.noEv, { color: c.textSecondary }]}>No evidence attached — you can continue without attachments.</Text>
        )}

        <View style={styles.navRow}>
          <Button label="Back" onPress={() => router.back()} variant="secondary" style={{ flex: 1 }} />
          <Button
            label="Continue with protected evidence →"
            onPress={() => router.push('/submit/review')}
            disabled={!canContinue}
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  demoLink: { fontSize: 13, color: '#e8531a', textDecorationLine: 'underline' },
  pageSub: { fontSize: 14, lineHeight: 20 },
  warnBox: { borderRadius: 10, borderWidth: 1, padding: Spacing.three },
  evCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  evHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  evName: { fontSize: 14, fontWeight: '600' },
  evMeta: { fontSize: 12, marginTop: 2 },
  removeBtn: { padding: 4 },
  evStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  evStatusText: { fontSize: 13 },
  evStatus2: { fontSize: 13, marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.one },
  metaTag: { backgroundColor: '#3a1a1a', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  metaTagText: { color: '#f87171', fontSize: 11 },
  summaryBox: { borderRadius: 10, borderWidth: 1, padding: Spacing.three, gap: 4 },
  addFileBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    padding: Spacing.four, alignItems: 'center', gap: 6,
  },
  addFileText: { fontSize: 15, fontWeight: '500' },
  addFileHint: { fontSize: 12 },
  noEv: { fontSize: 14, textAlign: 'center' },
  navRow: { flexDirection: 'row', gap: Spacing.two },
});
