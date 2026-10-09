import React from 'react';
import { Link } from 'react-router-dom';

function SafetyPoint({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-4 py-5 border-b border-rule last:border-0">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-ember mt-0.5">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-[15px] font-semibold text-ink-1">{title}</p>
        <p className="text-[14px] text-ink-2 mt-1 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

export function SafetyPage() {
  return (
    <main className="max-w-[680px] mx-auto px-5 md:px-8 py-12 pb-20 md:pb-12">
      <Link to="/" className="text-[13px] text-ink-muted hover:text-ink-1 transition-colors flex items-center gap-1 mb-8">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to home
      </Link>

      <h1 className="text-[30px] md:text-[36px] font-semibold text-ink-1 leading-tight">Safety guidance</h1>
      <p className="text-[16px] text-ink-2 mt-3 leading-relaxed">
        Read this before submitting a report. Protecting yourself starts before you open this page.
      </p>

      <div className="mt-10 border border-rule rounded-[12px] bg-surface px-5">
        <ul className="flex flex-col">
          <SafetyPoint
            title="Use a device and connection you trust"
            body="Avoid work or shared devices. If possible, use a personal device on a home network or a trusted VPN. Public Wi-Fi or monitored networks may expose your activity."
          />
          <SafetyPoint
            title="Avoid unnecessary identifying details"
            body="Include only what is needed to understand the concern. Extra names, locations, or contextual details may narrow down who the reporter could be."
          />
          <SafetyPoint
            title="Faces, names and document content can reveal identity"
            body="Even after metadata is removed, the content of files may identify you — a distinctive phrase, knowledge only you had, or visible faces in images. Review every file carefully."
          />
          <SafetyPoint
            title="Keep your tracking secret private"
            body="The tracking secret is separate from your case reference. Store it securely offline. It cannot be recovered by email or support. Do not share it with anyone."
          />
          <SafetyPoint
            title="Use fictional information in this prototype"
            body="This application is a demonstration. Do not enter real names, real locations, real evidence, or any genuinely sensitive information. All data is for illustration only."
          />
        </ul>
      </div>

      <div className="mt-8 p-5 bg-warning-bg border border-warning/30 rounded-[12px]">
        <p className="text-[14px] text-warning font-medium">No digital service can guarantee complete anonymity.</p>
        <p className="text-[14px] text-ink-2 mt-1 leading-relaxed">
          VeilProof reduces certain identification risks but cannot eliminate them. Metadata removal, proof commitments, and access controls are security layers — not absolute guarantees.
        </p>
      </div>

      <div className="mt-8">
        <Link
          to="/report/details"
          className="text-[15px] font-semibold text-ember hover:text-ember-press underline transition-colors"
        >
          I understand — start a report
        </Link>
      </div>
    </main>
  );
}
