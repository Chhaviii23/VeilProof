import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptPanel } from '../../components/ui/ReceiptPanel';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useApp } from '../../store/AppContext';

export function ReceiptPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);

  const receipt = state.receipt;

  if (!receipt) {
    return (
      <main className="max-w-[600px] mx-auto px-5 md:px-8 py-12">
        <p className="text-[16px] text-ink-2">No receipt found.</p>
        <p className="text-[14px] text-ink-muted mt-2">
          Your receipt may have been cleared. If you submitted a report, use your case reference and tracking secret to track it.
        </p>
        <button
          onClick={() => navigate('/track')}
          className="mt-4 text-[14px] text-ember underline"
        >
          Track a report
        </button>
      </main>
    );
  }

  function handleTrack() {
    navigate('/track/status');
  }

  function handleFinish() {
    setConfirmClear(true);
  }

  function confirmFinish() {
    dispatch({ type: 'RESET_DRAFT' });
    dispatch({ type: 'CLEAR_RECEIPT' });
    navigate('/');
  }

  return (
    <main className="max-w-[680px] mx-auto px-5 md:px-8 py-8 pb-20 md:pb-8">
      <ReceiptPanel
        receipt={receipt}
        onTrack={handleTrack}
        onFinish={handleFinish}
      />

      <ConfirmationDialog
        open={confirmClear}
        title="Clear this session?"
        description="Your receipt will be removed from this device. Make sure you have saved or copied your tracking secret before clearing."
        confirmLabel="Clear session"
        cancelLabel="Keep receipt"
        variant="danger"
        onConfirm={confirmFinish}
        onCancel={() => setConfirmClear(false)}
      />
    </main>
  );
}
