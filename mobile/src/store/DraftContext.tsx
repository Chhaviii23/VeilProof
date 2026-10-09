import React, { createContext, useContext, useReducer } from 'react';
import type { ReportCategory } from '@/services/api';

export interface EvidenceItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
  scanState: 'idle' | 'scanning' | 'sanitized' | 'unsupported' | 'failed';
  metadataRemoved: string[];
}

export interface Draft {
  title: string;
  category: ReportCategory | '';
  description: string;
  incidentDate: string;
  location: string;
  involvedParties: string;
  riskFactors: string[];
  evidence: EvidenceItem[];
  trackingSecret: string;
  acknowledged: boolean;
}

const INITIAL_DRAFT: Draft = {
  title: '',
  category: '',
  description: '',
  incidentDate: '',
  location: '',
  involvedParties: '',
  riskFactors: [],
  evidence: [],
  trackingSecret: '',
  acknowledged: false,
};

type Action =
  | { type: 'UPDATE_DRAFT'; payload: Partial<Draft> }
  | { type: 'UPDATE_EVIDENCE'; id: string; patch: Partial<EvidenceItem> }
  | { type: 'ADD_EVIDENCE'; item: EvidenceItem }
  | { type: 'REMOVE_EVIDENCE'; id: string }
  | { type: 'RESET' };

function reducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'UPDATE_DRAFT': return { ...state, ...action.payload };
    case 'ADD_EVIDENCE': return { ...state, evidence: [...state.evidence, action.item] };
    case 'REMOVE_EVIDENCE': return { ...state, evidence: state.evidence.filter((e) => e.id !== action.id) };
    case 'UPDATE_EVIDENCE': return {
      ...state,
      evidence: state.evidence.map((e) => e.id === action.id ? { ...e, ...action.patch } : e),
    };
    case 'RESET': return INITIAL_DRAFT;
    default: return state;
  }
}

interface DraftCtx {
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
  addEvidence: (item: EvidenceItem) => void;
  removeEvidence: (id: string) => void;
  updateEvidence: (id: string, patch: Partial<EvidenceItem>) => void;
  reset: () => void;
}

const Ctx = createContext<DraftCtx | null>(null);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, dispatch] = useReducer(reducer, INITIAL_DRAFT);
  return (
    <Ctx.Provider value={{
      draft,
      updateDraft: (payload) => dispatch({ type: 'UPDATE_DRAFT', payload }),
      addEvidence: (item) => dispatch({ type: 'ADD_EVIDENCE', item }),
      removeEvidence: (id) => dispatch({ type: 'REMOVE_EVIDENCE', id }),
      updateEvidence: (id, patch) => dispatch({ type: 'UPDATE_EVIDENCE', id, patch }),
      reset: () => dispatch({ type: 'RESET' }),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}
