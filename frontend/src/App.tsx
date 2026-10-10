import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useParams } from 'react-router-dom';
import { AppProvider, useInvestigator, useDraft } from './store/AppContext';
import { ToastContainer } from './components/ui/Toast';
import { useStaffDataSync } from './services/staffData';

// Layout components
import { AppHeader } from './components/layout/AppHeader';
import { PublicBottomNav } from './components/layout/PublicNavigation';
import { InvestigatorSidebar } from './components/layout/InvestigatorNavigation';
import { NotificationBell } from './components/ui/Notifications';
import { WizardProgress } from './components/layout/WizardProgress';

// Public pages
import { HomePage } from './pages/public/HomePage';
import { SafetyPage } from './pages/public/SafetyPage';
import { TrackPage } from './pages/public/TrackPage';
import { TrackStatusPage } from './pages/public/TrackStatusPage';
import { VerifyPage } from './pages/public/VerifyPage';

// Report wizard
import { DetailsPage } from './pages/report/DetailsPage';
import { RiskPage } from './pages/report/RiskPage';
import { EvidencePage } from './pages/report/EvidencePage';
import { PrivacyPage } from './pages/report/PrivacyPage';
import { IdentityProtectionPage } from './pages/report/IdentityProtectionPage';
import { ReviewPage } from './pages/report/ReviewPage';
import { SubmittingPage } from './pages/report/SubmittingPage';
import { ReceiptPage } from './pages/report/ReceiptPage';

// Case Investigator pages
const SignInPage = React.lazy(() => import('./pages/investigator/SignInPage').then(m => ({ default: m.SignInPage })));
const CasesPage = React.lazy(() => import('./pages/investigator/CasesPage').then(m => ({ default: m.CasesPage })));
const CaseDetailPage = React.lazy(() => import('./pages/investigator/CaseDetailPage').then(m => ({ default: m.CaseDetailPage })));
const ApprovalsPage = React.lazy(() => import('./pages/investigator/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const EvidenceViewerPage = React.lazy(() => import('./pages/investigator/EvidenceViewerPage').then(m => ({ default: m.EvidenceViewerPage })));
const AuditPage = React.lazy(() => import('./pages/investigator/AuditPage').then(m => ({ default: m.AuditPage })));
const ApprovalQueuePage = React.lazy(() => import('./pages/investigator/ApprovalQueuePage').then(m => ({ default: m.ApprovalQueuePage })));
const AccountPage = React.lazy(() => import('./pages/investigator/AccountPage').then(m => ({ default: m.AccountPage })));

// Privacy Officer pages
const PrivacyQueuePage = React.lazy(() => import('./pages/privacy-officer/PrivacyQueuePage').then(m => ({ default: m.PrivacyQueuePage })));
const CasePrivacyReviewPage = React.lazy(() => import('./pages/privacy-officer/CasePrivacyReviewPage').then(m => ({ default: m.CasePrivacyReviewPage })));

// Oversight Officer pages
const OversightApprovalsPage = React.lazy(() => import('./pages/oversight/OversightApprovalsPage').then(m => ({ default: m.OversightApprovalsPage })));
const OversightClosuresPage = React.lazy(() => import('./pages/oversight/OversightClosuresPage').then(m => ({ default: m.OversightClosuresPage })));

// Utility
const DemoPage = React.lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
import { NotFoundPage } from './pages/NotFoundPage';

// Wizard steps config
const WIZARD_STEPS = [
  { label: 'Details', path: '/report/details' },
  { label: 'Risk', path: '/report/risk' },
  { label: 'Evidence', path: '/report/evidence' },
  { label: 'Identity Protection', path: '/report/identity-protection' },
  { label: 'Review & Submit', path: '/report/review' },
];

const STEP_PATHS = WIZARD_STEPS.map((s) => s.path);

function getCompletedPaths(currentPath: string): string[] {
  const idx = STEP_PATHS.indexOf(currentPath);
  return idx > 0 ? STEP_PATHS.slice(0, idx) : [];
}

// ─── Layouts ────────────────────────────────────────────────────────────────

function PublicLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
      <PublicBottomNav />
    </>
  );
}

function WizardLayout() {
  const location = useLocation();
  const { draft } = useDraft();

  const completedPaths = getCompletedPaths(location.pathname);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-rule sticky top-0 z-30">
        <div className="max-w-190 mx-auto px-5 md:px-8 h-14 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="shrink-0 text-ink-muted hover:text-ink-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 rounded-sm p-1 -ml-1"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <WizardProgress
              steps={WIZARD_STEPS}
              currentPath={location.pathname}
              completedPaths={completedPaths}
            />
          </div>
        </div>
      </header>

      <div className="max-w-190 mx-auto">
        <Outlet />
      </div>
    </div>
  );
}

function StaffCaseRedirect({ suffix }: { suffix: string }) {
  const { caseId } = useParams<{ caseId: string }>();
  return <Navigate to={`/investigator/cases/${caseId}${suffix}`} replace />;
}

function StaffGuard() {
  const { session } = useInvestigator();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/investigator/sign-in" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

function StaffLayout() {
  const { session } = useInvestigator();
  const sync = useStaffDataSync();
  const [refreshing, setRefreshing] = React.useState(false);

  async function refreshWorkspace() {
    setRefreshing(true);
    try { await sync(); } finally { setRefreshing(false); }
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <InvestigatorSidebar />
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-surface border-b border-rule sticky top-0 z-30">
          <div className="h-14 flex items-center px-5 gap-3">
            <span className="text-[16px] font-semibold text-ink-1">VeilProof</span>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={refreshWorkspace}
                disabled={refreshing}
                className="text-[12px] text-ember hover:underline disabled:opacity-50"
                aria-label="Refresh updates"
              >
                {refreshing ? '…' : 'Refresh'}
              </button>
              {session && <span className="text-[13px] text-ink-muted">{session.investigator.name}</span>}
            </div>
          </div>
        </header>
        {/* Desktop header */}
        <header className="hidden lg:flex bg-surface border-b border-rule sticky top-0 z-30 h-14 items-center px-8 justify-between">
          <p className="text-[15px] font-semibold text-ink-1">{session?.investigator.role ?? 'Staff workspace'}</p>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              type="button"
              onClick={refreshWorkspace}
              disabled={refreshing}
              className="text-[12px] text-ember hover:underline disabled:opacity-50"
              title="Load the latest case, approval, and notification state"
            >
              {refreshing ? 'Refreshing…' : 'Refresh updates'}
            </button>
            {session && <span className="text-[13px] text-ink-muted">{session.investigator.name} · {session.investigator.organization}</span>}
          </div>
        </header>

        <main className="p-5 md:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/track/status" element={<TrackStatusPage />} />
        <Route path="/verify" element={<VerifyPage />} />
      </Route>

      {/* Report wizard */}
      <Route element={<WizardLayout />}>
        <Route path="/report/details" element={<DetailsPage />} />
        <Route path="/report/risk" element={<RiskPage />} />
        <Route path="/report/evidence" element={<EvidencePage />} />
        <Route path="/report/privacy" element={<PrivacyPage />} />
        <Route path="/report/identity-protection" element={<IdentityProtectionPage />} />
        <Route path="/report/review" element={<ReviewPage />} />
      </Route>

      {/* Submission — no wizard chrome */}
      <Route path="/report/submitting" element={<SubmittingPage />} />
      <Route path="/report/receipt" element={<ReceiptPage />} />

      {/* Staff sign-in */}
      <Route path="/investigator/sign-in" element={<SignInPage />} />

      {/* Protected staff workspace */}
      <Route element={<StaffGuard />}>
        <Route element={<StaffLayout />}>
          {/* Case Investigator */}
          <Route path="/investigator/cases" element={<CasesPage />} />
          <Route path="/investigator/cases/:caseId" element={<CaseDetailPage />} />
          <Route path="/investigator/cases/:caseId/approvals" element={<ApprovalsPage />} />
          <Route path="/investigator/cases/:caseId/evidence/:evidenceId" element={<EvidenceViewerPage />} />
          <Route path="/investigator/cases/:caseId/evidence/:evidenceId/:mode" element={<EvidenceViewerPage />} />
          <Route path="/investigator/cases/:caseId/audit" element={<AuditPage />} />
          <Route path="/investigator/approvals" element={<ApprovalQueuePage />} />
          <Route path="/investigator/account" element={<AccountPage />} />

          {/* Privacy Officer */}
          <Route path="/privacy-officer/queue" element={<PrivacyQueuePage />} />
          <Route path="/privacy-officer/cases/:caseId/review" element={<CasePrivacyReviewPage />} />

          {/* Oversight Officer */}
          <Route path="/oversight/approvals" element={<OversightApprovalsPage />} />
          <Route path="/oversight/closures" element={<OversightClosuresPage />} />

          {/* Staff route aliases */}
          <Route path="/staff/privacy-queue" element={<Navigate to="/privacy-officer/queue" replace />} />
          <Route path="/staff/cases" element={<Navigate to="/investigator/cases" replace />} />
          <Route path="/staff/cases/:caseId" element={<StaffCaseRedirect suffix="" />} />
          <Route path="/staff/cases/:caseId/access" element={<StaffCaseRedirect suffix="#evidence-vault" />} />
          <Route path="/investigator/cases/:caseId/access" element={<StaffCaseRedirect suffix="#evidence-vault" />} />
          <Route path="/staff/access-requests" element={<Navigate to="/privacy-officer/queue" replace />} />
          <Route path="/staff/protection-queue" element={<Navigate to="/oversight/approvals" replace />} />
        </Route>
      </Route>

      {/* Utility */}
      <Route path="/demo" element={<DemoPage />} />
      <Route
        path="*"
        element={
          <>
            <AppHeader />
            <NotFoundPage />
            <PublicBottomNav />
          </>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastContainer />
        <React.Suspense fallback={<main className="p-8 text-ink-2" role="status">Loading…</main>}><AppRoutes /></React.Suspense>
      </AppProvider>
    </BrowserRouter>
  );
}
