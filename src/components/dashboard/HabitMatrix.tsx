import { Bola } from "../ui/Bola";
import { cn } from "@/lib/utils";
import { Info, Edit2 } from "lucide-react";
import { useState, useOptimistic, startTransition, useRef, useEffect } from "react";
import { toggleProgressLog, BolaStatus } from "@/app/actions/dashboard-actions";

// Types - Use shared type or redefine
// BolaStatus imported

interface Habit {
    id: string; // This passed as habit.id but actually mapped in page.tsx could be habit ID.
    // Wait, page.tsx maps: ...habit, assignmentId.
    // So 'habit' object here has assignmentId.
    assignmentId: string;
    name: string;
    topic: string;
}

interface HabitMatrixProps {
    habits: any[]; // Using any to avoid strict type mismatch with prisma generated types for now
    logs: any[];
    weeks: string[]; // e.g. ["40", "41", ...]
    onEditHabit: (habit: any) => void;
}

const SCORES: Record<BolaStatus, number> = {
    NEGRA: 0.0,
    ROJA: 0.33,
    AMARILLA: 0.66,
    VERDE: 1.0,
};

export const HabitMatrix = ({ habits, logs, weeks, onEditHabit }: HabitMatrixProps) => {
    // Transform logs to a map for easy lookup: key = assignmentId-periodIdentifier
    // logs have: assignmentId, periodIdentifier, status
    // Map logs...
    const logsMap = logs.reduce((acc, log) => {
        const key = `${log.assignmentId}-${log.periodIdentifier}`;
        acc[key] = log.status;
        return acc;
    }, {} as Record<string, BolaStatus>);

    const getTopicRank = (topic: string) => {
        if (!topic) return 99;
        const t = topic.toUpperCase();

        // 1. Try leading number (User manual override e.g. "1. DESTINO")
        const match = t.match(/^(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }

        // 2. Keyword fallback for standard topics
        if (t.includes("DESTINO")) return 1;
        if (t.includes("DINERO")) return 2;
        if (t.includes("GESTION") || t.includes("TIEMPO")) return 3;
        if (t.includes("SERVICIO")) return 4;
        if (t.includes("MARKETING") || t.includes("VENTAS")) return 5;
        if (t.includes("SISTEMA")) return 6;
        if (t.includes("EQUIPO")) return 7;
        if (t.includes("SINERGIA")) return 8;
        if (t.includes("RESULTADOS")) return 9;

        return 99;
    };

    // Sort habits:
    // 1. NON-Consolidated first (Active)
    // 2. Topic Rank (Number or Keyword)
    // 3. Name Alphabetical
    const sortedHabits = [...habits].sort((a, b) => {
        if (a.isConsolidated !== b.isConsolidated) {
            return a.isConsolidated ? 1 : -1;
        }

        const rankA = getTopicRank(a.topic || "");
        const rankB = getTopicRank(b.topic || "");

        if (rankA !== rankB) {
            return rankA - rankB;
        }

        return (a.name || "").localeCompare(b.name || "");
    });

    // Optimistic UI could be complex with a map, let's try simple useState first initialized with logs
    // Actually, simple optimistic:
    const [optimisticLogs, addOptimisticLog] = useOptimistic(
        logsMap,
        (state, newLog: { key: string, status: BolaStatus }) => ({
            ...state,
            [newLog.key]: newLog.status
        })
    );

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest week on mount for mobile ux
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, []);

    const toggleStatus = async (habit: any, week: string, index: number) => {
        const periodIdentifier = week;
        const assignmentId = habit.assignmentId;
        const key = `${assignmentId}-${periodIdentifier}`;
        const currentStatus = optimisticLogs[key] || "NEGRA";

        let nextStatus: BolaStatus = "ROJA";

        // Logic: Green First Cycle (Optimized for success & solving loop issues)
        // NEGRA -> VERDE -> AMARILLA -> ROJA -> NEGRA
        if (currentStatus === "NEGRA") {
            nextStatus = "VERDE";
        } else if (currentStatus === "VERDE") {
            nextStatus = "AMARILLA";
        } else if (currentStatus === "AMARILLA") {
            nextStatus = "ROJA";
        } else if (currentStatus === "ROJA") {
            nextStatus = "NEGRA";
        }

        startTransition(() => {
            addOptimisticLog({ key, status: nextStatus });
        });

        await toggleProgressLog(assignmentId, periodIdentifier, currentStatus, nextStatus);
    };

    // ...



    // Calculate totals per WEEK (Column) based on visible balls
    const getWeeklyTotal = (week: string) => {
        let total = 0;
        habits.forEach(habit => {
            const assignmentId = habit.assignmentId;
            const logKey = `${assignmentId}-${week}`;

            // Explicitly cast to BolaStatus to satisfy TypeScript index signature
            let status = (optimisticLogs[logKey] || "NEGRA") as BolaStatus;

            // Respect consolidation for scoring
            if (status === "NEGRA" && habit.isConsolidated) {
                status = "VERDE";
            }

            total += SCORES[status];
        });
        return total.toFixed(2);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div ref={scrollContainerRef} className="overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            {/* Sticky Column Header */}
                            <th className="sticky left-0 top-0 z-10 bg-gray-50 p-4 font-bold text-gray-700 w-64 min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                Hábito
                            </th>
                            {/* Week Headers */}
                            {weeks.map((week, i) => (
                                <th key={week} className="p-2 font-semibold text-center text-gray-500 min-w-[60px]">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase">SEM</span>
                                        <span className={cn("text-lg", i === weeks.length - 1 && "text-brand-secondary font-bold")}>{week}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedHabits.map((habit) => (
                            <tr key={habit.id} className="group hover:bg-gray-50 transition-colors">
                                {/* Sticky Row Header (Habit Name) */}
                                <td className="sticky left-0 bg-white group-hover:bg-gray-50 p-4 shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 border-r border-gray-100">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold tracking-wider text-brand-primary uppercase opacity-60">
                                            {habit.topic.replace(/_/g, " ")}
                                        </span>
                                        <p className="font-semibold text-gray-900 leading-tight line-clamp-2">
                                            {habit.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <button
                                                onClick={() => onEditHabit(habit)}
                                                className="flex items-center gap-1 text-[10px] text-brand-secondary hover:underline"
                                            >
                                                <Edit2 className="w-3 h-3" /> Detalle
                                            </button>
                                            {habit.externalLink && (
                                                <a
                                                    href={habit.externalLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
                                                >
                                                    <Info className="w-3 h-3" /> Link
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* Status Cells */}
                                {weeks.map((week, index) => {
                                    const key = `${habit.assignmentId}-${week}`;
                                    const statusRaw = optimisticLogs[key] || "NEGRA";

                                    // Default Logic:
                                    // 1. Explicit Log -> Respect it.
                                    // 2. No Log (NEGRA) + Consolidated -> VERDE.
                                    // 3. No Log + Not Consolidated -> NEGRA.
                                    let displayStatus = statusRaw;
                                    if (statusRaw === "NEGRA" && habit.isConsolidated) {
                                        displayStatus = "VERDE";
                                    }

                                    return (
                                        <td key={week} className="p-2 text-center">
                                            <div className="flex justify-center">
                                                <Bola
                                                    status={displayStatus}
                                                    size="md"
                                                    className="hover:scale-110 active:scale-90 transition-all"
                                                    onClick={() => toggleStatus(habit, week, index)}
                                                />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Totals Row */}
                        <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                            <td className="sticky left-0 bg-gray-50 p-4 text-right text-gray-600 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-slate-100 z-10">
                                PUNTUACIÓN TOTAL
                            </td>
                            {weeks.map((week) => (
                                <td key={week} className="p-2 text-center text-brand-primary bg-slate-50">
                                    {getWeeklyTotal(week)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
