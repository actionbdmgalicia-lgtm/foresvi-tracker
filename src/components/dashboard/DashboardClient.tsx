"use client";

import Link from "next/link";
import { HabitMatrix } from "@/components/dashboard/HabitMatrix";
import { EditHabitModal } from "@/components/dashboard/EditHabitModal";
import { useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import { Settings, LogOut } from "lucide-react";

// Dashboard props
interface DashboardProps {
  user: any;
  habits: any[];
  logs: any[];
  isImpersonating?: boolean;
}

// Helper to get week number and year from a date
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

function getWeekLabel(week: number, year: number) {
  return week.toString();
}

export default function DashboardClient({ user, habits, logs, isImpersonating }: DashboardProps) {
  const [view, setView] = useState<"Semanal" | "Mensual">("Semanal");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);

  // Date Range State: Anchor Date (End Date of the view)
  const [anchorDate, setAnchorDate] = useState(new Date());

  // Generate 13 weeks ending at anchorDate
  const generateWeeks = (endDate: Date) => {
    const weeks: string[] = [];
    const current = new Date(endDate);
    for (let i = 0; i < 14; i++) {
      const { week, year } = getWeekNumber(current);
      weeks.unshift(getWeekLabel(week, year));
      current.setDate(current.getDate() - 7);
    }
    return weeks;
  };

  const WEEKS_LABELS = generateWeeks(anchorDate);

  // Determine Month Label based on the Thursday of the week (ISO-8601 definitions)
  const getMonthLabel = (d: Date) => {
    const thursday = new Date(d);
    // Adjust to Thursday of this week
    const day = thursday.getDay() || 7; // 1-7 (Mon-Sun)
    if (day !== 4) {
      thursday.setHours(0, 0, 0, 0);
      thursday.setDate(thursday.getDate() + (4 - day));
    }
    return thursday.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
  };

  // 1. Generate Week->Month Map and Month Labels dynamically
  // We go back 52 weeks to be absolutely safe and cover all potential data
  const weekToMonthMap = new Map<string, string>();
  const uniqueMonthsSet = new Set<string>();
  const orderedMonths: string[] = [];

  {
    const current = new Date(anchorDate);
    // Iterate back 52 weeks (approx 1 year)
    for (let i = 0; i < 52; i++) {
      const { week, year } = getWeekNumber(current);
      const weekLabel = getWeekLabel(week, year);

      const monthLabel = getMonthLabel(current);
      weekToMonthMap.set(weekLabel, monthLabel);

      if (!uniqueMonthsSet.has(monthLabel)) {
        uniqueMonthsSet.add(monthLabel);
        orderedMonths.unshift(monthLabel);
      }
      current.setDate(current.getDate() - 7);
    }
  }

  // Take the last 4 months found. 
  // IMPORTANT: Since we iterated backwards 52 weeks, we likely found [.., ENE(prev), .., DIC, ENE(curr)].
  // uniqueMonthsSet logic above keeps the *first* time we see a label? 
  // No, we iterate Newest -> Oldest.
  // 1. Jan -> add ENE. orderedMonths=['ENE']
  // 2. Dec -> add DIC. orderedMonths=['DIC', 'ENE']
  // ...
  // 12. Feb -> add FEB. orderedMonths=['FEB', ..., 'ENE']
  // 13. Jan(prev) -> Set HAS 'ENE'. Do we add it? No.
  // So 'orderedMonths' only contains UNIQUE labels (12 max).
  // If we span > 1 year, we collapse Jan 2026 and Jan 2025 into "ENE".
  // This is acceptable for a generic "Month view" unless user explicitly needs year.
  // Given the current design doesn't show Year, this collision is expected/handled by collapsing.

  const MONTH_LABELS = orderedMonths.slice(-4);
  const currentLabels = view === "Semanal" ? WEEKS_LABELS : MONTH_LABELS;

  const handleEditHabit = (habit: any) => {
    setEditingHabit(habit);
    setIsEditModalOpen(true);
  };

  // 1. Map real logs for O(1) access
  const rawLogsMap = logs.reduce((acc, log) => {
    const key = `${log.assignmentId}-${log.periodIdentifier}`;
    acc[key] = log.status;
    return acc;
  }, {} as Record<string, string>);

  const SCORES: Record<string, number> = {
    NEGRA: 0.0,
    ROJA: 0.33,
    AMARILLA: 0.66,
    VERDE: 1.0,
  };

  const derivedMonthlyLogs = (() => {
    if (view === "Semanal") return [];

    // Aggregate logs by Habit + Month using ONLY EXPLICIT LOGS
    // MODE CALCULATION: Count occurrences of each status
    type MonthlyAgg = {
      counts: { NEGRA: number; ROJA: number; AMARILLA: number; VERDE: number };
      assignmentId: string;
      monthLabel: string;
    };
    const monthlyData: Record<string, MonthlyAgg> = {};

    logs.forEach(log => {
      // Get the month label for this log's week
      const monthLabel = weekToMonthMap.get(log.periodIdentifier);
      if (!monthLabel) return;

      // Use a safe delimiter or just ensuring uniqueness
      const key = `${log.assignmentId}|${monthLabel}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          counts: { NEGRA: 0, ROJA: 0, AMARILLA: 0, VERDE: 0 },
          assignmentId: log.assignmentId,
          monthLabel: monthLabel
        };
      }

      const status = log.status as keyof MonthlyAgg['counts'];
      if (monthlyData[key].counts[status] !== undefined) {
        monthlyData[key].counts[status]++;
      }
    });

    return Object.values(monthlyData).map((data) => {
      // Find the MODE (Most frequent status)
      let maxCount = -1;
      let modeStatus: keyof MonthlyAgg['counts'] = "NEGRA";

      const statuses: (keyof MonthlyAgg['counts'])[] = ["NEGRA", "ROJA", "AMARILLA", "VERDE"];
      statuses.forEach(s => {
        if (data.counts[s] > maxCount) {
          maxCount = data.counts[s];
          modeStatus = s;
        } else if (data.counts[s] === maxCount) {
          // Tie-breaker: Highest status wins
          modeStatus = s;
        }
      });

      return {
        assignmentId: data.assignmentId,
        periodIdentifier: data.monthLabel,
        status: modeStatus
      };
    });
  })();

  const effectiveLogs = view === "Semanal" ? logs : derivedMonthlyLogs;

  // 3. Calculate Chart Scores
  const effectiveLogsLookup = effectiveLogs.reduce((acc, log) => {
    const key = `${log.assignmentId}-${log.periodIdentifier}`;
    acc[key] = log.status;
    return acc;
  }, {} as Record<string, string>);

  const periodScores = currentLabels.map(label => {
    let score = 0;
    habits.forEach(h => {
      const statusRaw = effectiveLogsLookup[`${h.assignmentId}-${label}`] || "NEGRA";

      let effectiveStatus = statusRaw;
      if (h.isConsolidated && statusRaw === "NEGRA") {
        effectiveStatus = "VERDE";
      }

      const val = SCORES[effectiveStatus];
      score += (typeof val === 'number' ? val : 0);
    });
    return { label, score };
  });

  // Split habits
  const activeHabits = habits.filter(h => !h.isConsolidated);
  const consolidatedHabits = habits.filter(h => h.isConsolidated);
  const [showConsolidated, setShowConsolidated] = useState(false);

  const maxPeriodScore = Math.max(habits.length, 1);

  // Statistics
  const scoresOnly = periodScores.map(w => w.score);
  const minScore = Math.min(...scoresOnly);
  const maxScore = Math.max(...scoresOnly);
  const totalScore = scoresOnly.reduce((acc, curr) => acc + curr, 0);
  const avgScore = totalScore / (scoresOnly.length || 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-40 h-12">
              <Image src="/logo.png" alt="FORESVI Logo" fill className="object-contain object-left" priority />
            </div>
          </div>
          <div className="flex items-center gap-4">

            {/* ADMIN CONTROLS */}
            {isImpersonating ? (
              <button
                onClick={async () => {
                  const { stopImpersonating } = await import('@/app/actions/impersonate-action');
                  await stopImpersonating();
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors border border-amber-300 shadow-sm animate-pulse whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span className="md:hidden">Salir Modo Ver</span>
                <span className="hidden md:inline">Volver a Admin</span>
              </button>
            ) : (
              <Link href="/admin" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-primary uppercase tracking-wider" title="Panel de Administrador">
                <Settings className="w-5 h-5" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}

            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-brand-primary shadow-sm hidden sm:block">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=003349&color=fff`} alt="Profile" />
            </div>
            <a
              href={`/api/export/user/${user.id}`}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2"
              title="Descargar Informe Excel"
            >
              <span className="hidden md:inline">Informe</span>
              <span className="md:hidden">XLS</span>
            </a>
            <button
              onClick={async () => {
                const { logout } = await import('@/app/actions/auth-actions');
                await logout();
              }}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider ml-2 flex items-center gap-1"
              title="Cerrar Sesión"
            >
              <span className="hidden md:inline">Salir</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-brand-primary text-white py-6 px-6 shadow-xl relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-end gap-8">
            <div className="flex-1 w-full">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4">Evolución {view}</p>
              <div className="flex items-end justify-between h-24 gap-1.5 border-b border-blue-800/50 w-full">
                {periodScores.map((data, i) => {
                  const percentage = (data.score / maxPeriodScore) * 100;
                  const height = Math.max(percentage, 5);
                  const isCurrent = i === currentLabels.length - 1;
                  return (
                    <div key={data.label} className="flex flex-col items-center flex-1 gap-1 group cursor-pointer h-full justify-end" title={`${view} ${data.label}: ${data.score.toFixed(2)}`}>
                      <div className={clsx("w-full rounded-md transition-all duration-500 shadow-sm", isCurrent ? "bg-brand-secondary shadow-[0_0_15px_rgba(226,84,84,0.6)] animate-pulse" : "bg-white/30 hover:bg-white/60")} style={{ height: `${height}%` }}></div>
                      <span className="hidden sm:block text-[9px] text-blue-200 mt-1">{data.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-4 md:gap-2 min-w-[200px] justify-between md:justify-center border-t md:border-t-0 md:border-l border-blue-800/50 pt-4 md:pt-0 md:pl-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-blue-300 font-medium uppercase tracking-wider">Mínimo</span>
                <span className="text-lg font-bold text-white">{minScore.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-blue-300 font-medium uppercase tracking-wider">Media</span>
                <span className="text-2xl font-bold text-brand-secondary">{avgScore.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-blue-300 font-medium uppercase tracking-wider">Máximo</span>
                <span className="text-lg font-bold text-white">{maxScore.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-8 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex justify-start bg-gray-200 p-1 rounded-lg w-fit">
          {(["Semanal", "Mensual"] as const).map((tab) => (
            <button key={tab} onClick={() => setView(tab)} className={clsx("px-4 py-1.5 rounded-md text-sm font-medium transition-all", view === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900")}>
              {tab}
            </button>
          ))}
        </div>

        {view === "Semanal" && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha ref:</span>
            <input type="date" value={anchorDate.toISOString().split('T')[0]} onChange={(e) => { const date = e.target.valueAsDate; if (date) setAnchorDate(date); }} className="text-sm font-semibold text-gray-700 outline-none bg-transparent cursor-pointer" />
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {activeHabits.length > 0 ? (
          <HabitMatrix habits={activeHabits} logs={effectiveLogs} weeks={currentLabels} onEditHabit={handleEditHabit} />
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No hay hábitos en foco (activos).</p>
          </div>
        )}

        {consolidatedHabits.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <button onClick={() => setShowConsolidated(!showConsolidated)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-green-600 transition-colors mb-4">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{consolidatedHabits.length}</span>
              Hábitos Afianzados
              <span className="text-xs text-gray-400 font-normal">(Cuentan para tu nota, pero ya no requieren foco diario)</span>
              <span className="ml-auto text-xl">{showConsolidated ? '−' : '+'}</span>
            </button>

            {showConsolidated && (
              <div className="animate-fadeIn">
                <HabitMatrix habits={consolidatedHabits} logs={effectiveLogs} weeks={currentLabels} onEditHabit={handleEditHabit} />
              </div>
            )}
          </div>
        )}
      </div>

      <EditHabitModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} habit={editingHabit} />

      <div className="text-center py-4 text-[10px] text-gray-300 font-mono opacity-50">
        Foresvi Tracker v2.2.0 (Stable Sort)
      </div>
    </div>
  );
}
