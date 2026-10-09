import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDraft } from '../../store/AppContext';
import { RISK_FACTOR_LABELS, CRITICAL_RISK_FACTORS } from '../../types';

const RISK_OPTIONS = [
  { key: 'no_risk', description: 'You do not believe you face retaliation or danger at this time.' },
  { key: 'workplace_retaliation', description: 'You have experienced or expect negative action at work for raising this concern.' },
  { key: 'job_threat', description: 'You have been threatened with dismissal, demotion, or forced reassignment.' },
  { key: 'physical_threat', description: 'You have received a credible threat to your personal safety.' },
  { key: 'family_threat', description: 'A threat has been made against a member of your family.' },
  { key: 'public_safety', description: 'The matter poses a risk to the health or safety of members of the public.' },
];

function isCritical(factors: string[]): boolean {
  return factors.some((f) => CRITICAL_RISK_FACTORS.has(f));
}

export function RiskPage() {
  const { draft, updateDraft } = useDraft();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(draft.riskFactors.length > 0 ? draft.riskFactors : []);
  const [demoApplied, setDemoApplied] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => {
      if (key === 'no_risk') return prev.includes('no_risk') ? [] : ['no_risk'];
      const without = prev.filter((k) => k !== 'no_risk');
      return without.includes(key) ? without.filter((k) => k !== key) : [...without, key];
    });
  }

  function applyDemo() {
    setSelected(['physical_threat', 'family_threat', 'public_safety']);
    setDemoApplied(true);
  }

  function handleContinue() {
    updateDraft({ riskFactors: selected });
    navigate('/report/evidence');
  }

  const critical = isCritical(selected);
  const hasSelection = selected.length > 0;

  return (
    <main className="px-5 md:px-8 py-8 pb-24 md:pb-8 max-w-[640px]">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-ink-1 mb-2">Risk and urgency</h1>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Select any risks that apply. This information is kept confidential and helps us prioritise your case and apply appropriate protections — it is not shared publicly.
        </p>
      </div>

      {/* Demo shortcut */}
      {!demoApplied && (
        <div className="mb-5 p-4 bg-ember-soft rounded-[10px] flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-ember mb-0.5">Demo mode</p>
            <p className="text-[12px] text-ink-2">Pre-select physical threat, family threat and public-safety danger to see critical-priority classification.</p>
          </div>
          <button
            onClick={applyDemo}
            className="text-[12px] font-medium text-ember border border-ember/40 rounded-[6px] px-3 py-1.5 hover:bg-ember/10 transition-colors shrink-0"
          >
            Apply demo
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-6">
        {RISK_OPTIONS.map(({ key, description }) => {
          const isSelected = selected.includes(key);
          const isCriticalFactor = CRITICAL_RISK_FACTORS.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`w-full text-left px-4 py-3.5 rounded-[10px] border transition-all ${
                isSelected
                  ? isCriticalFactor
                    ? 'border-error/50 bg-error-bg ring-1 ring-error/20'
                    : 'border-ember/50 bg-ember-soft ring-1 ring-ember/20'
                  : 'border-rule bg-surface hover:border-ink-muted/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4.5 h-4.5 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? isCriticalFactor
                      ? 'border-error bg-error'
                      : 'border-ember bg-ember'
                    : 'border-rule bg-canvas'
                }`}>
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-[14px] font-medium leading-tight ${isSelected ? (isCriticalFactor ? 'text-error' : 'text-ember') : 'text-ink-1'}`}>
                    {RISK_FACTOR_LABELS[key]}
                    {isCriticalFactor && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-error bg-error-bg px-1.5 py-0.5 rounded-full border border-error/20">
                        Critical
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-ink-muted mt-0.5">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Priority classification */}
      {hasSelection && (
        <div className={`mb-6 p-4 rounded-[10px] border ${
          critical
            ? 'bg-error-bg border-error/30'
            : 'bg-surface-2 border-rule'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {critical ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-error shrink-0">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            <p className={`text-[13px] font-semibold ${critical ? 'text-error' : 'text-ink-1'}`}>
              {critical ? 'Critical priority — immediate review' : 'Standard priority'}
            </p>
          </div>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            {critical
              ? 'Your case will be flagged for immediate attention. A case manager will review it as a priority. Whistleblower protection measures will be applied.'
              : 'Your case will be reviewed in the normal queue. You can update your risk assessment at any time through the tracking portal.'}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="primary" onClick={handleContinue} disabled={!hasSelection}>
          Continue
        </Button>
        <button
          onClick={() => navigate('/report/details')}
          className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors"
        >
          Back
        </button>
      </div>

      {!hasSelection && (
        <p className="text-[12px] text-ink-muted mt-3">Select at least one option to continue.</p>
      )}
    </main>
  );
}
