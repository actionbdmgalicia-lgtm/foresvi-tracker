"use client";

import { useState } from "react";
import { createPrivateHabit } from "@/app/actions/habit-actions";
import { Plus, X, Save, Lock } from "lucide-react";

interface Props {
    userId: string;
}

const TOPICS = [
    "DESTINO",
    "DINERO",
    "GESTION_DEL_TIEMPO",
    "SERVICIO",
    "MARKETING_Y_VENTAS",
    "SISTEMATIZACION",
    "EQUIPO",
    "SINERGIA",
    "RESULTADOS"
];

export function CreatePrivateHabitButton({ userId }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await createPrivateHabit(userId, formData);
            setIsOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                title="Crear un hábito específico solo para este usuario"
            >
                <Lock className="w-4 h-4" /> Personalizar
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            Nuevo Hábito Personalizado
                        </h3>
                        <p className="text-sm text-gray-500">Este hábito será visible solo para este usuario.</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Tema</label>
                            <select name="topic" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase bg-white" required defaultValue="">
                                <option value="" disabled>SELECCIONA TEMA</option>
                                {TOPICS.map(t => (
                                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Nombre</label>
                            <input type="text" name="name" placeholder="Ej: Correr 5km" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Señal</label>
                        <textarea name="cue" rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="¿Cuándo lo harás?" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Anhelo</label>
                            <textarea name="craving" rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="¿Por qué?" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Respuesta</label>
                            <textarea name="response" rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="¿Qué harás exactamente?" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Recompensa</label>
                        <textarea name="reward" rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="¿Cómo te premiarás?" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Enlace Externo (Opcional)</label>
                        <input type="text" name="externalLink" placeholder="https://..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-blue-600" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-sm transition-colors disabled:opacity-50">
                            {isLoading ? "Guardando..." : "Crear y Asignar"}
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
