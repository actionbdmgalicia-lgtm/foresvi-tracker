"use client";

import { useState } from "react";
import { Bola } from "../ui/Bola";
import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type BolaStatus = "NEGRA" | "ROJA" | "AMARILLA" | "VERDE";

interface Habit {
    id: string;
    name: string;
    topic: string;
    cue: string;
    craving: string;
    response: string;
    reward: string;
    externalLink?: string;
}

interface HabitCardProps {
    habit: Habit;
    initialStatus?: BolaStatus;
    onStatusChange?: (newStatus: BolaStatus) => void;
}

const SCORES = {
    NEGRA: "0%",
    ROJA: "33%",
    AMARILLA: "66%",
    VERDE: "100%",
};

export const HabitCard = ({ habit, initialStatus = "NEGRA", onStatusChange }: HabitCardProps) => {
    const [status, setStatus] = useState<BolaStatus>(initialStatus);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);

    const handleStatusSelect = (newStatus: BolaStatus) => {
        setStatus(newStatus);
        setIsEvaluating(false);
        onStatusChange?.(newStatus);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            {/* Header / Main Row */}
            <div className="p-4 flex items-center justify-between gap-4">

                {/* Left: Status Interaction */}
                <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                    <div className="relative group">
                        <Bola
                            status={status}
                            size="lg"
                            onClick={() => setIsEvaluating(!isEvaluating)}
                        />
                        {/* Tooltip hint */}
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                            {SCORES[status]}
                        </span>
                    </div>
                </div>

                {/* Center: Habit Info */}
                <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wider text-brand-secondary uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            {habit.topic.replace(/_/g, " ")}
                        </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{habit.name}</h3>
                </div>

                {/* Right: Actions */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 text-gray-400 hover:text-brand-primary active:bg-gray-50 rounded-full transition-colors"
                >
                    <ChevronDown className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-180")} />
                </button>
            </div>

            {/* Evaluation Drawer */}
            <div className={cn(
                "bg-gray-50 border-t border-gray-100 transition-all duration-300 ease-in-out overflow-hidden",
                isEvaluating ? "max-h-24 opacity-100 py-3" : "max-h-0 opacity-0 py-0"
            )}>
                <div className="flex justify-center items-center gap-6 px-4">
                    {(["NEGRA", "ROJA", "AMARILLA", "VERDE"] as BolaStatus[]).map((s) => (
                        <div key={s} className="flex flex-col items-center gap-1 group">
                            <Bola
                                status={s}
                                size="md"
                                selected={status === s}
                                onClick={() => handleStatusSelect(s)}
                                className="hover:scale-125"
                            />
                            <span className={cn(
                                "text-[10px] font-medium transition-colors",
                                status === s ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                            )}>
                                {SCORES[s]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Details Expansion (Atomic Habits) */}
            <div className={cn(
                "bg-white border-t border-gray-50 transition-all duration-300 ease-in-out overflow-hidden",
                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-4 pt-2 space-y-3">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <Info className="w-3 h-3" /> Señal
                            </span>
                            <p className="text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-100">{habit.cue}</p>
                        </div>

                        <div className="space-y-1">
                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <Info className="w-3 h-3" /> Anhelo
                            </span>
                            <p className="text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-100">{habit.craving}</p>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <Info className="w-3 h-3" /> Acción (Respuesta) - <span className="text-brand-primary">Lo que debes hacer</span>
                            </span>
                            <p className="text-gray-900 font-medium bg-blue-50/50 p-3 rounded-md border border-blue-100 border-l-4 border-l-brand-primary">
                                {habit.response}
                            </p>
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <Info className="w-3 h-3" /> Recompensa
                            </span>
                            <p className="text-gray-700 bg-yellow-50/50 p-2 rounded-md border border-yellow-100">{habit.reward}</p>
                        </div>
                    </div>

                    {habit.externalLink && (
                        <div className="pt-2 flex justify-end">
                            <a
                                href={habit.externalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-secondary transition-colors"
                            >
                                Ver recurso externo <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
