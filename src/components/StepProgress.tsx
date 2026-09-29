import React from 'react';
import {
  Upload,
  Columns,
  FolderTree,
  Filter,
  Grid,
  ListFilter,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { ValidationSummary } from '../types/configuration';

export interface StepItem {
  id: number;
  label: string;
  icon: React.ReactNode;
}

interface StepProgressProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  validationSummary: ValidationSummary;
  isWorkbookLoaded: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onSelectStep,
  validationSummary,
  isWorkbookLoaded,
}) => {
  const steps: StepItem[] = [
    { id: 1, label: '1. Upload Excel', icon: <Upload className="w-3.5 h-3.5" /> },
    { id: 2, label: '2. Map Columns', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 3, label: '3. Selection Sets', icon: <FolderTree className="w-3.5 h-3.5" /> },
    { id: 4, label: '4. Conditions', icon: <Filter className="w-3.5 h-3.5" /> },
    { id: 5, label: '5. Clash Matrix', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 6, label: '6. Clash Tests', icon: <ListFilter className="w-3.5 h-3.5" /> },
    { id: 7, label: '7. Validation', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 8, label: '8. Export XML', icon: <Download className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="step-progress-container bg-[#050A15]/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-2 overflow-x-auto shadow-inner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[780px] space-x-1.5">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id && isWorkbookLoaded;
          const isDisabled = !isWorkbookLoaded && step.id > 1;

          // Badges for validation step
          const hasErrors = step.id === 7 && validationSummary.errorCount > 0;
          const hasWarnings = step.id === 7 && validationSummary.warningCount > 0;

          return (
            <button
              key={step.id}
              id={`step-nav-btn-${step.id}`}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectStep(step.id)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 relative cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40 font-semibold'
                  : isCompleted
                  ? 'bg-slate-900/70 text-slate-200 hover:bg-slate-800/80 hover:text-white border border-white/[0.08]'
                  : isDisabled
                  ? 'opacity-35 cursor-not-allowed text-slate-500 border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <span className={`mr-1.5 ${isActive ? 'text-white' : 'text-slate-400'}`}>{step.icon}</span>
              <span className="whitespace-nowrap">{step.label}</span>

              {hasErrors && (
                <span className="ml-1.5 flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                  {validationSummary.errorCount}
                </span>
              )}
              {!hasErrors && hasWarnings && (
                <span className="ml-1.5 flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  {validationSummary.warningCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

