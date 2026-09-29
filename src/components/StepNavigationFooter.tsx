import React from 'react';
import { ChevronRight, ChevronLeft, ArrowRight, ArrowLeft } from 'lucide-react';

export type AppViewMode = 'api_bot' | 'location' | 'criteria' | 'engine' | 'radar';

interface StepNavigationFooterProps {
  currentStep: AppViewMode;
  onNavigate: (step: AppViewMode) => void;
  isAr?: boolean;
}

export const StepNavigationFooter: React.FC<StepNavigationFooterProps> = ({
  currentStep,
  onNavigate,
  isAr = true,
}) => {
  const stepOrder: { id: AppViewMode; label: string }[] = [
    { id: 'api_bot', label: isAr ? 'ربط الحساب' : 'Ninja Auth' },
    { id: 'location', label: isAr ? 'اللوكيشن والتغطية' : 'Location & Radar' },
    { id: 'criteria', label: isAr ? 'معايير الشفتات' : 'Criteria' },
    { id: 'engine', label: isAr ? 'محرك السرعة' : 'Speed Engine' },
    { id: 'radar', label: isAr ? 'الرصد الحي' : 'Live Shift Radar' },
  ];

  const currentIndex = stepOrder.findIndex((s) => s.id === currentStep);
  const prevStep = currentIndex > 0 ? stepOrder[currentIndex - 1] : null;
  const nextStep = currentIndex < stepOrder.length - 1 ? stepOrder[currentIndex + 1] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 mt-6">
      <div>
        {prevStep ? (
          <button
            type="button"
            onClick={() => onNavigate(prevStep.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 transition-all cursor-pointer active:scale-95"
          >
            {isAr ? <ArrowRight className="w-4 h-4 text-slate-400" /> : <ArrowLeft className="w-4 h-4 text-slate-400" />}
            <span>{isAr ? `السابق: ${prevStep.label}` : `Back: ${prevStep.label}`}</span>
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {stepOrder.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onNavigate(s.id)}
            className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
              s.id === currentStep
                ? 'bg-cyan-400 scale-125 shadow-sm shadow-cyan-400/50'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={s.label}
          />
        ))}
      </div>

      <div>
        {nextStep ? (
          <button
            type="button"
            onClick={() => onNavigate(nextStep.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg shadow-cyan-600/20"
          >
            <span>{isAr ? `التالي: ${nextStep.label}` : `Next: ${nextStep.label}`}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('radar')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <span>{isAr ? 'الرصد الحي جاهز للانطلاق ⚡' : 'Live Radar Ready ⚡'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
