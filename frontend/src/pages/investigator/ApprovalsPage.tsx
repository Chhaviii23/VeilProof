import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

export function ApprovalsPage() {
  const { caseId } = useParams<{ caseId: string }>();
  return <Navigate to={`/investigator/cases/${caseId}`} replace />;
}
