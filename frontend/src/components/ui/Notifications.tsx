import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../store/AppContext';
import type { AppNotification } from '../../types';

const toneClasses: Record<AppNotification['tone'], string> = {
  critical: 'border-error/30 bg-error-bg',
  success: 'border-success/30 bg-success-bg',
  warning: 'border-warning/30 bg-warning-bg',
  info: 'border-info/30 bg-info-bg',
};
const toneText: Record<AppNotification['tone'], string> = { critical: 'text-error', success: 'text-success', warning: 'text-warning', info: 'text-info' };

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function NotificationBanners() {
  const { unread, markRead } = useNotifications();
  if (unread.length === 0) return null;
  return (
    <div className="flex flex-col gap-3" role="region" aria-label="New notifications">
      {unread.slice(0, 3).map((n) => (
        <div key={n.id} className={`border rounded-[12px] p-4 flex items-start gap-4 flex-wrap ${toneClasses[n.tone]}`}>
          <div className="flex-1 min-w-[220px]">
            <p className={`text-[14px] font-semibold ${toneText[n.tone]}`}>{n.title}</p>
            <p className="text-[13px] text-ink-2 mt-0.5">{n.body}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={n.link} onClick={() => markRead(n.id)} className="px-3 py-1.5 bg-ember text-white rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity">Open</Link>
            <button type="button" onClick={() => markRead(n.id)} className="text-[13px] text-ink-muted hover:text-ink-1">Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationBell() {
  const { all, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open} className="relative w-9 h-9 flex items-center justify-center rounded-[6px] text-ink-2 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 13V8a5 5 0 0110 0v5l1.5 1.5h-13L4 13zM7.5 16.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {unread.length > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-ember text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">{unread.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[340px] max-w-[calc(100vw-2rem)] bg-surface border border-rule rounded-[10px] shadow-md z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink-1">Notifications</p>
            {unread.length > 0 && <button type="button" onClick={markAllRead} className="text-[12px] text-ember hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-rule">
            {all.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-ink-muted text-center">No notifications yet.</p>
            ) : all.map((n) => (
              <button key={n.id} type="button" onClick={() => { markRead(n.id); setOpen(false); navigate(n.link); }} className="w-full text-left px-4 py-3 hover:bg-surface-hover flex gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-rule' : 'bg-ember'}`} aria-hidden />
                <span className="min-w-0">
                  <span className={`block text-[13px] ${n.read ? 'text-ink-2' : 'font-semibold text-ink-1'}`}>{n.title}</span>
                  <span className="block text-[12px] text-ink-muted truncate">{n.body}</span>
                  <span className="block text-[11px] text-ink-muted mt-0.5 tabular-nums">{timeLabel(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
