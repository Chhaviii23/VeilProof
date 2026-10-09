import React from 'react';
import { Navigate } from 'react-router-dom';

export function ApprovalQueuePage() {
  return <Navigate to="/investigator/cases" replace />;
}
