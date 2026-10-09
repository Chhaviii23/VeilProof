/**
 * Submit Tab — mirrors web /report/details
 * This is the entry point; navigation goes to /submit/risk → /submit/evidence → /submit/review → /submit/submitting → /submit/receipt
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useDraft } from '@/store/DraftContext';
import { CATEGORY_LABELS, ReportCategory } from '@/services/api';

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ReportCategory, string][];

const DEMO_EXAMPLE = {
  title: 'Procurement officer accepting bribes from vendor',
  category: 'corruption' as ReportCategory,
  description: 'Between March and August 2026, the senior procurement officer at the Mumbai regional office awarded a contract worth ₹4.2 crore to Nexus Supplies Pvt Ltd, despite their bid being 22% higher than competitors. Multiple colleagues witnessed cash exchanges at the officer’s residence. Two junior staff were pressured to alter bid evaluation records.',
  incidentDate: '2026-03-01',
  location: 'Mumbai, Maharashtra — Regional Procurement Office',
  involvedParties: 'Senior Procurement Officer (fictional), Nexus Supplies Pvt Ltd (fictional)',
};

function CategoryCard({ value, label, selected, onPress }: { value: ReportCategory; label: string; selected: boolean; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  return (
    <TouchableOpacity
      style={[styles.catCard, {
        backgroundColor: selected ? '#3a1e0e' : c.backgroundElement,
        borderColor: selected ? '#e8531a' : 'transparent',
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.catLabel, { color: selected ? '#e8531a' : c.text }]}>{label}</Text>
      {selected && <Text style={{ color: '#e8531a', fontSize: 16 }}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function DetailsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const router = useRouter();
  const { draft, updateDraft } = useDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = 'Title is required.';
    else if (draft.title.trim().length < 10) e.title = 'Title must be at least 10 characters.';
    else if (draft.title.trim().length > 120) e.title = 'Title must be 120 characters or fewer.';
    if (!draft.category) e.category = 'Please select a category.';
    if (!draft.description.trim()) e.description = 'Description is required.';
    else if (draft.description.trim().length < 50) e.description = `Description must be at least 50 characters (${draft.description.trim().length}/50).`;
    return e;
  }

  function blur(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  }

  function handleContinue() {
    const e = validate();
    setTouched({ title: true, category: true, description: true });
    setErrors(e);
    if (Object.keys(e).length === 0) router.push('/submit/risk');
  }

  function loadDemo() {
    updateDraft(DEMO_EXAMPLE);
    setErrors({});
    setTouched({});
  }

  const visibleErrors = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: c.text }]}>Report details</Text>
          <TouchableOpacity onPress={loadDemo}>
            <Text style={styles.demoLink}>Use fictional example</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <TextField
          label="Title"
          value={draft.title}
          onChangeText={(v) => { updateDraft({ title: v }); blur('title'); }}
          placeholder="Briefly describe the concern"
          error={visibleErrors.title}
          hint="10–120 characters"
          maxLength={120}
        />

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Category</Text>
          {CATEGORIES.map(([val, label]) => (
            <CategoryCard
              key={val}
              value={val}
              label={label}
              selected={draft.category === val}
              onPress={() => { updateDraft({ category: val }); setTouched((t) => ({ ...t, category: true })); setErrors(validate()); }}
            />
          ))}
          {visibleErrors.category && <Text style={styles.errorText}>{visibleErrors.category}</Text>}
        </View>

        {/* Description */}
        <TextField
          label="Description"
          value={draft.description}
          onChangeText={(v) => { updateDraft({ description: v }); blur('description'); }}
          placeholder="Describe what happened, when, who was involved, and any evidence you have..."
          error={visibleErrors.description}
          hint={`50–5,000 characters (${draft.description.trim().length} so far)`}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={5000}
        />

        {/* Incident date */}
        <TextField
          label="Incident date or approximate period"
          value={draft.incidentDate}
          onChangeText={(v) => updateDraft({ incidentDate: v })}
          placeholder="e.g. 2026-03-01"
          hint="Optional — YYYY-MM-DD"
          maxLength={20}
        />

        {/* Location */}
        <TextField
          label="Location"
          value={draft.location}
          onChangeText={(v) => updateDraft({ location: v })}
          placeholder="City, office, or region"
          hint="Optional"
          maxLength={200}
        />

        {/* Involved parties */}
        <TextField
          label="People or organizations involved"
          value={draft.involvedParties}
          onChangeText={(v) => updateDraft({ involvedParties: v })}
          placeholder="Use fictional names in this demo"
          hint="Optional — avoid real names"
          maxLength={500}
        />

        <Button label="Continue →" onPress={handleContinue} style={{ marginTop: Spacing.two }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  demoLink: { fontSize: 13, color: '#e8531a', textDecorationLine: 'underline' },
  fieldGroup: { gap: Spacing.one },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  errorText: { color: '#ef4444', fontSize: 12 },
});
