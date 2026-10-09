import React, { useState, useMemo } from 'react';
import { CaseTable } from '../../components/ui/CaseTable';
import { CaseCard } from '../../components/ui/CaseCard';
import { Button } from '../../components/ui/Button';
import { EmptyState, SearchIcon, InboxIcon } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/SelectField';
import { useCases, useInvestigator } from '../../store/AppContext';
import { NotificationBanners } from '../../components/ui/Notifications';
import type { CaseRecord } from '../../types';
import { CATEGORY_LABELS, INVESTIGATION_STATUS_LABELS } from '../../types';

const categoryOptions = [
  { value: '', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
];
const statusOptions = [
  { value: '', label: 'All statuses' },
  ...Object.entries(INVESTIGATION_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];
const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export function CasesPage() {
  const everyCase = useCases();
  const { session } = useInvestigator();
  const code = session?.investigator.officerCode;
  const allCases = useMemo(() => everyCase.filter((c) => !!code && c.assignedOfficerCode === code), [everyCase, code]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  const cases = useMemo<CaseRecord[]>(() => {
    let results = [...allCases];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter((c) => c.reference.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
    }
    if (category) results = results.filter((c) => c.category === category);
    if (status) results = results.filter((c) => c.status === status);
    results.sort((a, b) => {
      const at = new Date(a.receivedAt).getTime();
      const bt = new Date(b.receivedAt).getTime();
      return sort === 'oldest' ? at - bt : bt - at;
    });
    return results;
  }, [allCases, search, category, status, sort]);

  const hasFilters = !!(search || category || status || sort !== 'newest');

  function clearFilters() {
    setSearch('');
    setCategory('');
    setStatus('');
    setSort('newest');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink-1">Assigned cases</h1>
          {code && <p className="text-[13px] text-ink-muted mt-1">{session?.investigator.name} · {code} · protected copies only</p>}
        </div>
        <span className="text-[12px] text-ink-muted italic">Demo — fictional data</span>
      </div>

      <NotificationBanners />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[13px] font-medium text-ink-2 block mb-1">Search</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference or title…"
            className="w-full border border-rule-strong rounded-[8px] px-3 py-2.5 text-[14px] bg-surface text-ink-1 placeholder-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 min-h-[44px]"
          />
        </div>
        <div className="w-44">
          <SelectField label="Category" value={category} onChange={setCategory} options={categoryOptions} />
        </div>
        <div className="w-44">
          <SelectField label="Status" value={status} onChange={setStatus} options={statusOptions} />
        </div>
        <div className="w-36">
          <SelectField label="Sort" value={sort} onChange={(v) => setSort(v as 'newest' | 'oldest')} options={sortOptions} />
        </div>
        {hasFilters && (
          <Button variant="tertiary" size="sm" onClick={clearFilters} className="mb-0.5">
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      {!hasFilters && (
        <p className="text-[13px] text-ink-muted -mt-3">
          {allCases.length} case{allCases.length !== 1 ? 's' : ''} total
        </p>
      )}

      {/* Content */}
      {cases.length === 0 && (
        <EmptyState
          icon={hasFilters ? <SearchIcon /> : <InboxIcon />}
          title={hasFilters ? 'No cases match your filters' : 'No cases assigned yet'}
          description={
            hasFilters
              ? 'Try different search terms or clear the filters.'
              : 'Cases appear here once the Privacy & Evidence Officer assigns them to you.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {cases.length > 0 && (
        <>
          <div className="hidden lg:block">
            <CaseTable cases={cases} />
          </div>
          <div className="lg:hidden flex flex-col gap-3">
            {cases.map((c) => <CaseCard key={c.id} caseRecord={c} />)}
          </div>
          {hasFilters && (
            <p className="text-[13px] text-ink-muted">{cases.length} of {allCases.length} case{allCases.length !== 1 ? 's' : ''}</p>
          )}
        </>
      )}
    </div>
  );
}
