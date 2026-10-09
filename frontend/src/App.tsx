import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useParams } from 'react-router-dom';
import { AppProvider, useInvestigator, useDraft } from './store/AppContext';
import { ToastContainer } from './components/ui/Toast';

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
import { SignInPage } from './pages/investigator/SignInPage';
import { CasesPage } from './pages/investigator/CasesPage';
import { CaseDetailPage } from './pages/investigator/CaseDetailPage';
import { ApprovalsPage } from './pages/investigator/ApprovalsPage';
import { EvidenceViewerPage } from './pages/investigator/EvidenceViewerPage';
import { AuditPage } from './pages/investigator/AuditPage';
import { ApprovalQueuePage } from './pages/investigator/ApprovalQueuePage';
import { AccountPage } from './pages/investigator/AccountPage';

// Privacy Officer pages
import { PrivacyQueuePage } from './pages/privacy-officer/PrivacyQueuePage';
import { CasePrivacyReviewPage } from './pages/privacy-officer/CasePrivacyReviewPage';

// Oversight Officer pages
import { OversightApprovalsPage } from './pages/oversight/OversightApprovalsPage';
import { OversightClosuresPage } from './pages/oversight/OversightClosuresPage';

// Utility
import { DemoPage } from './pages/DemoPage';
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

  const currentIndex = STEP_PATHS.indexOf(location.pathname);
  if (currentIndex > 0 && !draft.title.trim()) {
    return <Navigate to="/report/details" replace />;
  }

  const completedPaths = getCompletedPaths(location.pathname);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-rule sticky top-0 z-30">
        <div className="max-w-[760px] mx-auto px-5 md:px-8 h-14 flex items-center gap-4">
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

      <div className="max-w-[760px] mx-auto">
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
              {session && <span className="text-[13px] text-ink-muted">{session.investigator.name}</span>}
            </div>
          </div>
        </header>
        {/* Desktop header */}
        <header className="hidden lg:flex bg-surface border-b border-rule sticky top-0 z-30 h-14 items-center px-8 justify-between">
          <p className="text-[15px] font-semibold text-ink-1">{session?.investigator.role ?? 'Staff workspace'}</p>
          <div className="flex items-center gap-3">
            <NotificationBell />
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
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
