import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../../components/ui/FormField';
import { SelectField } from '../../components/ui/SelectField';
import { Button } from '../../components/ui/Button';
import { useDraft } from '../../store/AppContext';
import { DEMO_EXAMPLE_REPORT } from '../../services/fixtures';
import type { ReportCategory } from '../../types';
import { CATEGORY_LABELS } from '../../types';

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const today = new Date().toISOString().split('T')[0];

interface FieldErrors {
  title?: string;
  category?: string;
  description?: string;
  incidentDate?: string;
}

export function DetailsPage() {
  const { draft, updateDraft } = useDraft();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validate(d = draft): FieldErrors {
    const e: FieldErrors = {};
    if (!d.title.trim()) e.title = 'Title is required.';
    else if (d.title.trim().length < 10) e.title = 'Title must be at least 10 characters.';
    else if (d.title.trim().length > 120) e.title = 'Title must be 120 characters or fewer.';
    if (!d.category) e.category = 'Please select a category.';
    if (!d.description.trim()) e.description = 'Description is required.';
    else if (d.description.trim().length < 50) e.description = `Description must be at least 50 characters (${d.description.trim().length}/50).`;
    else if (d.description.trim().length > 5000) e.description = 'Description must be 5,000 characters or fewer.';
    if (d.incidentDate && d.incidentDate > today) e.incidentDate = 'Incident date cannot be in the future.';
    return e;
  }

  function handleBlur(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const e2 = validate();
    setTouched({ title: true, category: true, description: true, incidentDate: true });
    setErrors(e2);
    if (Object.keys(e2).length > 0) {
      const firstField = Object.keys(e2)[0];
      document.getElementById(firstField)?.focus();
      return;
    }
    navigate('/report/risk');
  }

  function loadExample() {
    updateDraft(DEMO_EXAMPLE_REPORT);
    setErrors({});
    setTouched({});
  }

  const visibleErrors: FieldErrors = Object.fromEntries(
    Object.entries(errors).filter(([k]) => touched[k])
  ) as FieldErrors;

  return (
    <main className="max-w-[720px] mx-auto px-5 md:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-semibold text-ink-1">Report details</h1>
        <button
          type="button"
          onClick={loadExample}
          className="text-[13px] text-ink-muted hover:text-ember underline transition-colors"
        >
          Use fictional example
        </button>
      </div>

      <form onSubmit={handleContinue} className="flex flex-col gap-5" noValidate>
        <TextInput
          label="Title"
          value={draft.title}
          onChange={(v) => updateDraft({ title: v })}
          onBlur={() => handleBlur('title')}
          placeholder="Briefly describe the concern"
          error={visibleErrors.title}
          hint="10–120 characters"
          maxLength={120}
          required
        />

        <SelectField
          label="Category"
          value={draft.category}
          onChange={(v) => updateDraft({ category: v as ReportCategory })}
          onBlur={() => handleBlur('category')}
          options={categoryOptions}
          placeholder="Select a category"
          error={visibleErrors.category}
          required
        />

        <TextInput
          label="Description"
          type="textarea"
          value={draft.description}
          onChange={(v) => updateDraft({ description: v })}
          onBlur={() => handleBlur('description')}
          placeholder="Describe the concern in detail. Include what happened, when, and who was involved."
          error={visibleErrors.description}
          hint="50–5,000 characters"
          maxLength={5000}
          rows={6}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextInput
            label="Incident date or approximate period"
            type="date"
            value={draft.incidentDate}
            onChange={(v) => updateDraft({ incidentDate: v })}
            onBlur={() => handleBlur('incidentDate')}
            error={visibleErrors.incidentDate}
            hint="Optional"
          />
          <TextInput
            label="Location"
            value={draft.location}
            onChange={(v) => updateDraft({ location: v })}
            placeholder="City, office, or region"
            hint="Optional"
          />
        </div>

        <TextInput
          label="People or organizations involved"
          value={draft.involvedParties}
          onChange={(v) => updateDraft({ involvedParties: v })}
          placeholder="Use fictional names in this demo"
          hint="Optional — avoid real names in this prototype"
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg">
            Continue
          </Button>
        </div>
      </form>
    </main>
  );
}
