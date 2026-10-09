import React, { useState } from 'react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { DEMO_RECEIPT_FIXTURE, DEMO_MODIFIED_RECEIPT_FIXTURE } from '../../services/fixtures';

type VerifyResult = 'match' | 'mismatch' | 'pending' | 'unsupported' | 'invalid' | null;

const resultConfig: Record<Exclude<VerifyResult, null>, { title: string; description: string; status: string }> = {
  match: {
    title: 'Receipt matches proof record',
    description: 'The demo receipt is consistent with the recorded proof commitment. This check verifies integrity of the receipt, not the truth of the allegation.',
    status: 'verified',
  },
  mismatch: {
    title: 'Receipt does not match',
    description: 'The content of this receipt differs from the recorded proof. The receipt may have been modified.',
    status: 'mismatch',
  },
  pending: {
    title: 'Proof commitment pending',
    description: 'The proof for this receipt has not yet been confirmed. Check again later.',
    status: 'pending',
  },
  unsupported: {
    title: 'Unsupported receipt version',
    description: 'This receipt format is not supported. Please use a receipt downloaded from VeilProof.',
    status: 'locked',
  },
  invalid: {
    title: 'Invalid receipt',
    description: 'The file does not appear to be a valid VeilProof receipt.',
    status: 'locked',
  },
};

function verifyReceipt(data: unknown): VerifyResult {
  if (!data || typeof data !== 'object') return 'invalid';
  const obj = data as Record<string, unknown>;

  if (!('caseReference' in obj) || !('proofTransactionRef' in obj)) return 'invalid';
  if (obj.proofStatus === 'pending') return 'pending';

  // Compare against the matching fixture
  const canonical = DEMO_RECEIPT_FIXTURE.proofTransactionRef;
  if (obj.proofTransactionRef === canonical) return 'match';
  return 'mismatch';
}

export function VerifyPage() {
  const [result, setResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  async function verifyData(data: unknown, name = '') {
    setLoading(true);
    setFileName(name);
    await new Promise((r) => setTimeout(r, 600));
    setResult(verifyReceipt(data));
    setLoading(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await verifyData(data, file.name);
    } catch {
      setResult('invalid');
      setFileName(file.name);
    }
  }

  return (
    <main className="max-w-[600px] mx-auto px-5 md:px-8 py-12 pb-20 md:pb-12">
      <h1 className="text-[28px] md:text-[34px] font-semibold text-ink-1 leading-tight">Verify a receipt</h1>
      <p className="text-[16px] text-ink-2 mt-2 leading-relaxed max-w-[480px]">
        Check whether a demo receipt matches its recorded proof commitment.
      </p>

      <div className="mt-3 p-3 bg-info-bg rounded-[8px]">
        <p className="text-[13px] text-info">
          Demo security simulation — labeled clearly. A match checks evidence integrity. It does not establish whether the allegation is true.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <p className="text-[14px] font-medium text-ink-1">Load a demo receipt</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="secondary" size="sm" onClick={() => verifyData(DEMO_RECEIPT_FIXTURE, 'demo-matching.json')} disabled={loading}>
            Matching receipt
          </Button>
          <Button variant="secondary" size="sm" onClick={() => verifyData(DEMO_MODIFIED_RECEIPT_FIXTURE, 'demo-modified.json')} disabled={loading}>
            Modified receipt
          </Button>
          <Button variant="secondary" size="sm" onClick={() => verifyData({ invalid: true }, 'demo-invalid.json')} disabled={loading}>
            Invalid receipt
          </Button>
        </div>

        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-rule" />
          <span className="text-[12px] text-ink-muted">or upload</span>
          <div className="h-px flex-1 bg-rule" />
        </div>

        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-rule hover:border-rule-strong rounded-[12px] p-8 cursor-pointer transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-muted">
            <path d="M12 15V3M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 18v2a1 1 0 001 1h14a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[14px] text-ink-2">Upload a receipt JSON file</span>
          <input type="file" accept=".json" className="sr-only" onChange={handleFile} />
        </label>
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-ink-muted">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying…
        </div>
      )}

      {result && !loading && (
        <div className="mt-8 border border-rule rounded-[12px] bg-surface p-5">
          <div className="flex items-center gap-3 mb-3">
            <StatusBadge status={resultConfig[result].status as any} />
            {fileName && <span className="text-[13px] font-mono text-ink-muted">{fileName}</span>}
          </div>
          <p className="text-[16px] font-semibold text-ink-1">{resultConfig[result].title}</p>
          <p className="text-[14px] text-ink-2 mt-1 leading-relaxed">{resultConfig[result].description}</p>

          <button
            onClick={() => setResult(null)}
            className="mt-4 text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors"
          >
            Verify another receipt
          </button>
        </div>
      )}
    </main>
  );
}
