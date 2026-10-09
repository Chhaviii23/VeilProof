import React from 'react';
import { Link } from 'react-router-dom';

interface Step {
  label: string;
  path: string;
}

interface WizardProgressProps {
  steps: Step[];
  currentPath: string;
  completedPaths: string[];
}

export function WizardProgress({ steps, currentPath, completedPaths }: WizardProgressProps) {
  const currentIndex = steps.findIndex((s) => s.path === currentPath);

  return (
    <nav aria-label="Report steps" className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = completedPaths.includes(step.path);
        const isCurrent = step.path === currentPath;
        const isAvailable = isCompleted || isCurrent;

        return (
          <React.Fragment key={step.path}>
            {i > 0 && (
              <div className={`h-px flex-1 ${i <= currentIndex ? 'bg-ember' : 'bg-rule'} transition-colors`} />
            )}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {isAvailable && isCompleted ? (
                <Link
                  to={step.path}
                  className="w-7 h-7 rounded-full bg-ember flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
                  aria-label={`${step.label} (completed)`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-ember text-white'
                      : 'bg-surface-2 text-ink-muted border border-rule'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {i + 1}
                </div>
              )}
              <span className={`text-[11px] font-medium hidden sm:block ${isCurrent ? 'text-ink-1' : 'text-ink-muted'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
