import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 text-ember mt-0.5">{icon}</div>
      <div>
        <p className="text-[15px] font-semibold text-ink-1">{title}</p>
        <p className="text-[14px] text-ink-2 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function HomePage() {
  const { state } = useApp();
  const hasReceipt = !!state.receipt;

  return (
    <main className="pb-20 md:pb-0">
      {/* Hero */}
      <section className="max-w-[760px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16">
        <div className="mb-2">
          <span className="inline-block px-2 py-0.5 rounded-[4px] bg-ember-soft text-ember text-[12px] font-medium">
            Demo — fictional data
          </span>
        </div>
        <h1 className="text-[32px] md:text-[44px] font-semibold text-ink-1 leading-tight tracking-tight max-w-[560px]">
          Speak up. Keep control of your evidence.
        </h1>
        <p className="text-[18px] text-ink-2 mt-5 max-w-[500px] leading-relaxed">
          No account, email, phone number or wallet required.
        </p>
        <p className="text-[15px] text-ink-2 mt-2 max-w-[440px] leading-relaxed">
          Share your concern. Keep your tracking secret private.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            to="/report/details"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[8px] text-[16px] font-semibold bg-ember text-white hover:bg-ember-press transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
          >
            Start a report
          </Link>
          {hasReceipt ? (
            <Link
              to="/report/receipt"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[8px] border border-rule-strong text-[16px] font-semibold text-ember bg-ember-soft hover:bg-ember-soft transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
            >
              Track latest demo complaint
            </Link>
          ) : (
            <Link
              to="/track"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[8px] border border-rule-strong text-[16px] font-semibold text-ink-1 bg-surface hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
            >
              Track a report
            </Link>
          )}
          <Link
            to="/verify"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[8px] border border-rule-strong text-[16px] font-semibold text-ink-1 bg-surface hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
          >
            Verify a receipt
          </Link>
        </div>
      </section>

      <div className="h-px bg-rule max-w-[760px] mx-auto" />

      {/* Features */}
      <section className="max-w-[760px] mx-auto px-5 md:px-8 py-12">
        <h2 className="text-[13px] font-medium text-ink-muted uppercase tracking-wide mb-8">How it works</h2>
        <div className="flex flex-col gap-8">
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l1.5 5h5l-4 3 1.5 5-4-3-4 3 1.5-5-4-3h5L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            }
            title="Review privacy clues"
            description="Before submitting, see what identifying information may be embedded in your files — GPS coordinates, author fields, device models — and remove it from working copies."
          />
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 9h10M5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            }
            title="Keep a proof receipt"
            description="Receive a case reference and a private tracking secret. A demo proof commitment records that your report existed at a specific time."
          />
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 10.5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Control evidence access"
            description="Two distinct investigators must each approve access before evidence is reviewed. You control what they see — investigators access only what was explicitly approved."
          />
        </div>
      </section>

      <div className="h-px bg-rule max-w-[760px] mx-auto" />

      {/* Safety notice */}
      <section className="max-w-[760px] mx-auto px-5 md:px-8 py-10">
        <p className="text-[14px] text-ink-2 leading-relaxed max-w-[560px]">
          Avoid identifying details in your report and attachments. Use a device and connection you trust.{' '}
          <Link to="/safety" className="text-ink-1 underline hover:text-ember transition-colors">
            Read safety guidance
          </Link>{' '}
          before you report.
        </p>
        <p className="text-[13px] text-ink-muted mt-4 italic">
          Investigator access?{' '}
          <Link to="/investigator/sign-in" className="text-ink-2 underline hover:text-ink-1 transition-colors">
            Sign in here
          </Link>
        </p>
      </section>
    </main>
  );
}
