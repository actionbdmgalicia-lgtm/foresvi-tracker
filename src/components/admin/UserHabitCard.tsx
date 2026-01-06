"use client";

import { useState } from "react";
import { Edit2, Check, X, ChevronDown, ChevronUp, Lock, Globe, Users } from "lucide-react";
import clsx from "clsx";
import { toggleHabitAssignment, updateAssignmentCustomization } from "@/app/actions/assignment-actions";
import { promoteHabitToGlobal } from "@/app/actions/habit-actions";

interface UserHabitCardProps {
    habit: any;
    assignment: any; // The assignment object if exists (including custom fields)
    userId: string;
    isAssigned: boolean;
}

export function UserHabitCard({ habit, assignment, userId, isAssigned }: UserHabitCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // If assigned, we use the custom values from assignment, fallback to habit base values
    // Actually, per our new logic, assignment should have snapshot values.
    // If it's a legacy assignment without snapshot, fallback to habit.

    const cue = assignment?.customCue || habit.cue;
    const craving = assignment?.customCraving || habit.craving;
    const response = assignment?.customResponse || habit.response;
    const reward = assignment?.customReward || habit.reward;
    const externalLink = assignment?.customExternalLink || habit.externalLink;

    return (
        <div className={clsx(
            "rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-colors",
            isAssigned ? "bg-green-50/20" : "bg-white",
            !habit.isGlobal && "bg-pink-50/30 border-pink-100" // Highlight private habits slightly
        )}>
            <div className="p-4 flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{habit.name}</p>
                        {!habit.isGlobal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 shadow-sm" title="Este hábito es visible SOLO para este usuario">
                                <Lock className="w-3 h-3" /> Privado
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 items-center">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 h-fit" title="Usuarios totales asignados">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{habit._count?.assignments || 0}</span>
                        </div>
                        <p className="text-xs text-gray-500"><strong className="text-brand-secondary">Señal:</strong> {cue}</p>
                        <p className="text-xs text-gray-500"><strong className="text-green-600">Recompensa:</strong> {reward}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    {/* Generalize Button - Only for Private Habits */}
                    {!habit.isGlobal && (
                        <form action={async () => {
                            if (confirm("¿Estás seguro de que quieres hacer este hábito GLOBAL? Se hará visible para toda la empresa en el Admin Panel.")) {
                                await promoteHabitToGlobal(habit.id);
                            }
                        }}>
                            <button
                                type="submit"
                                className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                title="Promocionar a Global (Hacer disponible para todos)"
                            >
                                <Globe className="w-4 h-4" />
                            </button>
                        </form>
                    )}

                    {/* Expand/Edit Button - Only if Assigned */}
                    {isAssigned && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
                            title="Personalizar Hábito"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={async () => {
                            await toggleHabitAssignment(userId, habit.id, isAssigned);
                        }}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border-2",
                            isAssigned
                                ? "bg-green-500 border-green-500 text-white hover:bg-green-600 hover:scale-110"
                                : "bg-white border-gray-200 text-gray-300 hover:border-brand-primary hover:text-brand-primary hover:scale-110"
                        )}
                        title={isAssigned ? "Desasignar Hábito" : "Asignar Hábito"}
                    >
                        {isAssigned ? <Check className="w-5 h-5 font-bold" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                    </button>
                </div>
            </div>

            {/* Customization Form */}
            {isExpanded && isAssigned && assignment && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-inner">
                        <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Personalización para este usuario (Snapshot)</h4>

                        <form action={async (formData) => {
                            await updateAssignmentCustomization(assignment.id, formData);
                            setIsExpanded(false);
                        }} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Señal</label>
                                <input type="text" name="customCue" defaultValue={cue} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-brand-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Anhelo</label>
                                <input type="text" name="customCraving" defaultValue={craving} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-brand-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Acción</label>
                                <input type="text" name="customResponse" defaultValue={response} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-brand-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Recompensa</label>
                                <input type="text" name="customReward" defaultValue={reward} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-brand-primary outline-none" />
                            </div>
                            <div className="col-span-full">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Enlace Externo</label>
                                <input type="text" name="customExternalLink" defaultValue={externalLink || ''} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:border-brand-primary outline-none text-blue-600" />
                            </div>

                            <div className="col-span-full flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-brand-primary hover:bg-blue-900 rounded shadow-sm"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
