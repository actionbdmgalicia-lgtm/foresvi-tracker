import { useState, useEffect } from "react";
import { Info, X, Save, ExternalLink, CheckCircle } from "lucide-react";
import { updateAssignmentCustomization } from "@/app/actions/dashboard-actions";

interface Habit {
    assignmentId: string;
    id: string;
    name: string;
    topic: string;
    cue: string;
    craving: string;
    response: string;
    reward: string;
    externalLink?: string;
    isConsolidated?: boolean;
}

interface EditHabitModalProps {
    habit: Habit | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EditHabitModal = ({ habit, isOpen, onClose }: EditHabitModalProps) => {
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        customName: "",
        customCue: "",
        customCraving: "",
        customResponse: "",
        customReward: "",
        customExternalLink: "",
        isConsolidated: false
    });

    useEffect(() => {
        if (habit) {
            setFormData({
                customName: habit.name,
                customCue: habit.cue,
                customCraving: habit.craving,
                customResponse: habit.response,
                customReward: habit.reward,
                customExternalLink: habit.externalLink || "",
                isConsolidated: habit.isConsolidated || false
            });
        }
    }, [habit]);

    const handleSave = async () => {
        if (!habit?.assignmentId) return;
        setIsLoading(true);
        try {
            await updateAssignmentCustomization(habit.assignmentId, {
                customName: formData.customName,
                customCue: formData.customCue,
                customCraving: formData.customCraving,
                customResponse: formData.customResponse,
                customReward: formData.customReward,
                customExternalLink: formData.customExternalLink,
                isConsolidated: formData.isConsolidated
            });
            onClose();
        } catch (error) {
            console.error("Error updating habit", error);
            alert("Error al guardar cambios");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !habit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-brand-primary p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Editar Hábito Personal</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                        <Info className="w-4 h-4 inline mr-1 text-blue-500" />
                        Los cambios que hagas aquí solo se aplicarán a <strong>TU</strong> versión de este hábito.
                    </p>

                    {/* Consolidated Switch */}
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <CheckCircle className={`w-5 h-5 ${formData.isConsolidated ? 'text-green-600' : 'text-gray-400'}`} />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Hábito Afianzado</p>
                                <p className="text-xs text-gray-500 line-clamp-1">Ya lo haces automáticamente sin pensar.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.isConsolidated}
                                onChange={(e) => setFormData({ ...formData, isConsolidated: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.customName}
                                onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none font-medium text-gray-900"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Señal</label>
                                <textarea
                                    value={formData.customCue}
                                    onChange={(e) => setFormData({ ...formData, customCue: e.target.value })}
                                    rows={2}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anhelo</label>
                                <textarea
                                    value={formData.customCraving}
                                    onChange={(e) => setFormData({ ...formData, customCraving: e.target.value })}
                                    rows={2}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">Acción</label>
                                <textarea
                                    value={formData.customResponse}
                                    onChange={(e) => setFormData({ ...formData, customResponse: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 border border-blue-100 bg-blue-50 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recompensa</label>
                                <textarea
                                    value={formData.customReward}
                                    onChange={(e) => setFormData({ ...formData, customReward: e.target.value })}
                                    rows={2}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> Enlace Externo (Material/Video)
                                </label>
                                <input
                                    type="text"
                                    value={formData.customExternalLink}
                                    onChange={(e) => setFormData({ ...formData, customExternalLink: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none text-sm text-blue-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-blue-900 rounded-lg shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
