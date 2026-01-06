import { prisma } from "@/lib/prisma";
import { updateHabit, createHabit, importHabitsFromCSV } from "@/app/actions/habit-actions";
import { Edit2, ExternalLink, Plus, Info, Upload } from "lucide-react";
import { HabitTable } from "@/components/admin/HabitTable";

export const dynamic = 'force-dynamic';

export default async function AdminHabitsPage() {
    // Fetch all habits
    const habits = await prisma.habit.findMany({
        include: {
            _count: {
                select: { assignments: true }
            }
        },
        orderBy: { topic: 'asc' }
    });

    const TOPIC_ORDER: Record<string, number> = {
        'DESTINO': 1,
        'DINERO': 2,
        'GESTION_DEL_TIEMPO': 3,
        'SERVICIO': 4,
        'MARKETING_Y_VENTAS': 5,
        'SISTEMATIZACION': 6,
        'EQUIPO': 7,
        'SINERGIA': 8,
        'RESULTADOS': 9
    };

    const sortedHabits = habits.sort((a, b) => {
        const orderA = TOPIC_ORDER[a.topic] || 99;
        const orderB = TOPIC_ORDER[b.topic] || 99;
        return orderA - orderB;
    });

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Biblioteca de Hábitos</h1>
                    <p className="text-sm text-gray-500">Edita los textos base. Esto NO sobrescribe personalizaciones de usuarios existentes.</p>
                </div>

                <div className="flex gap-3">
                    {/* Import Controls are now inside HabitTable */}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <HabitTable habits={sortedHabits} />
            </div>
        </div>
    );
}
