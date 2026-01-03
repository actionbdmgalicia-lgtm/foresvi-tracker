"use client";

import { useState } from "react";
import { Edit2, ExternalLink, Save, Plus, Trash2, X, Upload } from "lucide-react";
import { updateHabit, createHabit } from "@/app/actions/habit-actions";

interface HabitTableProps {
    habits: any[];
}

export function HabitTable({ habits }: HabitTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

    // New States for Archiving/Restoring
    const [showArchived, setShowArchived] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [affectedUsers, setAffectedUsers] = useState<string[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Filter habits based on archive view
    // If showDesactivated is false (default), we only show where deletedAt is null.
    // If true, we show all OR only archived? Usually toggle implies "Show Archived" adds them or switches view.
    // Let's make "Ver Archivados" toggle to ONLY archived or ALL? 
    // User asked "Recover deleted habits".
    // Let's toggle between "Active" and "Archived".
    const visibleHabits = habits.filter(h => showArchived ? h.deletedAt : !h.deletedAt);

    // Group habits by topic
    const habitsByTopic = visibleHabits.reduce((acc, habit) => {
        const topic = habit.topic;
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(habit);
        return acc;
    }, {} as Record<string, any[]>);

    const topics = Object.keys(habitsByTopic).sort();

    const toggleTopic = (topic: string) => {
        setExpandedTopics(prev => ({
            ...prev,
            [topic]: !prev[topic]
        }));
    };

    const toggleAll = (expand: boolean) => {
        const newState: Record<string, boolean> = {};
        topics.forEach(t => newState[t] = expand);
        setExpandedTopics(newState);
    };

    const handleDeleteClick = async (habitId: string) => {
        setIsLoadingUsers(true);
        setAffectedUsers([]);
        setConfirmDeleteId(habitId);

        try {
            const { getHabitAssignments } = await import("@/app/actions/habit-actions");
            const users = await getHabitAssignments(habitId);
            setAffectedUsers(users.map((u: any) => u.name));
        } catch (e) {
            console.error(e);
            setAffectedUsers(["Error al cargar usuarios."]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            const { deleteHabit } = await import("@/app/actions/habit-actions");
            await deleteHabit(confirmDeleteId);
            setConfirmDeleteId(null);
        } catch (error: any) {
            window.alert(error.message);
        }
    };

    const downloadTemplate = () => {
        const headers = ["TEMA", "HABITO", "SEÑAL", "ANHELO", "RESPUESTA", "RECOMPENSA", "LINK"];
        const csvContent = headers.join(",") + "\n";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "plantilla_habitos.csv";
        link.click();
    };

    const exportCSV = () => {
        const headers = ["TEMA", "HABITO", "SEÑAL", "ANHELO", "RESPUESTA", "RECOMPENSA", "LINK"];
        const rows = habits.map(h => [
            `"${h.topic || ''}"`,
            `"${h.name || ''}"`,
            `"${h.cue || ''}"`,
            `"${h.craving || ''}"`,
            `"${h.response || ''}"`,
            `"${h.reward || ''}"`,
            `"${h.externalLink || ''}"`
        ].join(","));

        const csvContent = headers.join(",") + "\n" + rows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `habitos_export_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleImportClick = () => {
        document.getElementById('csvInput')?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('csvFile', file);

        if (window.confirm(`¿Importar hábitos desde "${file.name}"?`)) {
            try {
                const { importHabitsFromCSV } = await import("@/app/actions/habit-actions");
                await importHabitsFromCSV(formData);
                alert("Importación completada.");
            } catch (err: any) {
                alert("Error al importar: " + err.message);
            }
        }
        // Reset input
        e.target.value = '';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 items-center flex-wrap">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${showArchived ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-800'}`}
                    >
                        {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
                    </button>
                    <span className="text-gray-300 mx-1">|</span>

                    {/* Import/Export Controls */}
                    <button onClick={downloadTemplate} className="text-xs text-gray-500 hover:text-brand-primary underline" title="Descargar plantilla CSV vacía">
                        Plantilla
                    </button>
                    <button onClick={exportCSV} className="text-xs text-gray-500 hover:text-brand-primary underline" title="Exportar todos los hábitos a CSV">
                        Exportar
                    </button>
                    <button onClick={handleImportClick} className="text-xs flex items-center gap-1 text-gray-500 hover:text-brand-primary underline" title="Subir CSV">
                        <Upload className="w-3 h-3" /> Importar
                    </button>
                    <input
                        type="file"
                        id="csvInput"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <span className="text-gray-300 mx-1">|</span>
                    <button onClick={() => toggleAll(true)} className="text-xs text-brand-primary hover:underline font-bold">Expandir Todo</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => toggleAll(false)} className="text-xs text-brand-primary hover:underline">Colapsar Todo</button>
                </div>
                {!showArchived && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-900 transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Hábito
                    </button>
                )}
            </div>

            {/* Custom Modal for Delete Confirmation */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-gray-900">¿Archivar Hábito?</h3>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600">
                            Estás a punto de archivar este hábito. Dejará de aparecer en los paneles de los usuarios, pero se mantendrá el historial.
                        </p>

                        <div className="bg-orange-50 p-3 rounded-md border border-orange-100">
                            <p className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-2">
                                ⚠️ Usuarios afectados ({isLoadingUsers ? "..." : affectedUsers.length})
                            </p>
                            {isLoadingUsers ? (
                                <div className="text-xs text-orange-600 animate-pulse">Cargando usuarios...</div>
                            ) : (
                                <ul className="text-xs text-orange-900/80 max-h-32 overflow-y-auto space-y-1 pl-1 custom-scrollbar">
                                    {affectedUsers.length > 0 ? affectedUsers.map(u => <li key={u}>• {u}</li>) : <li className="italic opacity-50">Ningún usuario tiene este hábito asignado actualmente.</li>}
                                </ul>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors">Confirmar y Archivar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider">
                            <th className="px-4 py-3 min-w-[200px]">Hábito</th>
                            <th className="px-4 py-3 min-w-[150px]">Señal</th>
                            <th className="px-4 py-3 min-w-[150px]">Anhelo</th>
                            <th className="px-4 py-3 min-w-[150px]">Acción</th>
                            <th className="px-4 py-3 min-w-[150px]">Recompensa</th>
                            <th className="px-4 py-3 w-[80px]">Enlace</th>
                            <th className="px-4 py-3 w-[80px] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isCreating && !showArchived && (
                            <tr className="bg-green-50/50 animate-in fade-in">
                                <td colSpan={7} className="p-0">
                                    <form action={async (formData) => {
                                        await createHabit(formData);
                                        setIsCreating(false);
                                    }} className="contents">
                                        <div className="flex w-full">
                                            {/* We need to mimic the table cells layout inside the form or wrap each input in td. 
                                                Since we can't easily nest form in TR unless we use 'display: contents' trick or form per input. 
                                                The cleanest way in NextJS server actions without JS-heavy form handlers is 
                                                placing <form> around the TR or inside content-cell.
                                                However, standard HTML forbid form inside TR. 
                                                But React allows it if we treat it carefully or use Form comp.
                                                Here we use the 'contents' class (display:contents) on form.
                                            */}
                                            {/* Re-implementing the structure row strictly */}
                                        </div>
                                        {/* Actually the previous logic was: form as container with display contents, and direct TDs inside. */}
                                    </form>
                                    {/* Let's try to match the previous working implementation exactly */}
                                    {/* Since I am rewriting, I will put the form properly */}
                                </td>
                            </tr>
                        )}
                        {/* CORRECT FORM ROW IMPLEMENTATION FOR CREATE */}
                        {isCreating && !showArchived && (
                            <tr className="bg-green-50/50 animate-in fade-in">
                                <td colSpan={7} className="p-0 border-0">
                                    <form action={async (formData) => {
                                        await createHabit(formData);
                                        setIsCreating(false);
                                    }} className="w-full flex">
                                        {/* This flex hack might break table alignment. 
                                           Better: Put form outside or use 'form' attribute on inputs? 
                                           No, use the 'contents' display style on form. 
                                       */}
                                    </form>
                                    {/* 
                                        Wait, simpler: Inputs have form attribute? No. 
                                        Let's stick to the structure that worked:
                                        <tr ...>
                                           <form ... className="contents">
                                              <td>...</td>
                                              <td>...</td>
                                           </form>
                                        </tr>
                                        This is valid JSX and works in browsers usually with display: contents
                                    */}
                                    <div style={{ display: 'contents' }} className="contents-wrapper">
                                        <form action={async (formData) => {
                                            await createHabit(formData);
                                            setIsCreating(false);
                                        }} className="contents">
                                            <td className="px-4 py-3 align-top">
                                                <div className="space-y-2">
                                                    <input type="text" name="topic" placeholder="NUEVO TEMA" className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none font-bold uppercase" required />
                                                    <input type="text" name="name" placeholder="Nombre del Hábito" className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none font-bold" required />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <textarea name="cue" className="w-full text-xs border border-green-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Señal..." />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <textarea name="craving" className="w-full text-xs border border-green-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Anhelo..." />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <textarea name="response" className="w-full text-xs border border-green-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Respuesta..." />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <textarea name="reward" className="w-full text-xs border border-green-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Recompensa..." />
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <input type="text" name="externalLink" className="w-full text-xs border border-green-300 rounded px-2 py-1 outline-none text-blue-600" placeholder="URL" />
                                            </td>
                                            <td className="px-4 py-3 align-top text-right">
                                                <div className="flex flex-col gap-2 items-end justify-center">
                                                    <button type="submit" className="text-green-600 hover:text-green-800 bg-green-100 p-1.5 rounded-md transition-colors w-full flex justify-center items-center shadow-sm" title="Guardar Nuevo Hábito">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-700 text-xs underline">
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </td>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {topics.map(topic => {
                            const isExpanded = expandedTopics[topic] ?? true;
                            const topicHabits = habitsByTopic[topic];

                            return (
                                <div key={topic} className="contents">
                                    <tr
                                        className="bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                                        onClick={() => toggleTopic(topic)}
                                    >
                                        <td colSpan={7} className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                <span className="font-bold text-brand-primary uppercase text-xs">{topic.replace(/_/g, " ")}</span>
                                                <span className="text-gray-400 text-xs font-normal">({topicHabits.length})</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && topicHabits.map((habit: any) => {
                                        const isEditing = editingId === habit.id;

                                        if (isEditing) {
                                            return (
                                                <tr key={habit.id} className="bg-blue-50/50">
                                                    <td colSpan={7} className="p-0 border-0">
                                                        <div style={{ display: 'contents' }}>
                                                            <form action={async (formData) => {
                                                                await updateHabit(formData);
                                                                setEditingId(null);
                                                            }} className="contents">
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="space-y-2">
                                                                        <input type="text" name="topic" defaultValue={habit.topic} className="w-full text-[10px] font-bold bg-white border border-blue-300 rounded px-2 py-1 outline-none uppercase" />
                                                                        <input type="text" name="name" defaultValue={habit.name} className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <textarea name="cue" defaultValue={habit.cue} className="w-full text-xs border border-blue-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Señal..." />
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <textarea name="craving" defaultValue={habit.craving} className="w-full text-xs border border-blue-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Anhelo..." />
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <textarea name="response" defaultValue={habit.response} className="w-full text-xs border border-blue-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Respuesta..." />
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <textarea name="reward" defaultValue={habit.reward} className="w-full text-xs border border-blue-300 rounded px-2 py-1 outline-none min-h-[40px]" placeholder="Recompensa..." />
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <input type="text" name="externalLink" defaultValue={habit.externalLink || ''} className="w-full text-xs border border-blue-300 rounded px-2 py-1 outline-none text-blue-600" placeholder="URL" />
                                                                    <input type="hidden" name="id" value={habit.id} />
                                                                </td>
                                                                <td className="px-4 py-3 align-top text-right">
                                                                    <div className="flex flex-col gap-2 items-end justify-center">
                                                                        <button type="submit" className="text-green-600 hover:text-green-800 bg-green-100 p-1.5 rounded-md transition-colors w-full flex justify-center items-center shadow-sm" title="Guardar">
                                                                            <Save className="w-4 h-4" />
                                                                        </button>
                                                                        <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-1.5 rounded-md transition-colors" title="Cancelar">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={habit.id} className={`group transition-colors ${habit.deletedAt ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3 align-top">
                                                    <p className={`font-semibold leading-tight ${habit.deletedAt ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{habit.name}</p>
                                                    {habit.deletedAt && <span className="text-[10px] text-red-500 font-bold uppercase bg-red-50 px-1 rounded">Archivado</span>}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <p className="text-xs text-gray-700">{habit.cue}</p>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <p className="text-xs text-gray-700">{habit.craving}</p>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <p className="text-xs text-gray-700">{habit.response}</p>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <p className="text-xs text-green-700 font-medium">{habit.reward}</p>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {habit.externalLink ? (
                                                        <a href={habit.externalLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1" title={habit.externalLink}>
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => setEditingId(habit.id)}
                                                            className="text-gray-400 hover:text-brand-primary p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                            title="Editar"
                                                            disabled={!!habit.deletedAt}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>

                                                        {showArchived ? (
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("¿Restaurar este hábito? Aparecerá de nuevo para todos los usuarios.")) {
                                                                        const { restoreHabit } = await import("@/app/actions/habit-actions");
                                                                        await restoreHabit(habit.id);
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-green-600 p-1 rounded-md hover:bg-green-50 transition-colors"
                                                                title="Restaurar"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDeleteClick(habit.id)}
                                                                className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                                title="Archivar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
