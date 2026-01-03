import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createGroup, deleteGroup } from "@/app/actions/admin-actions";
import { Trash2, Plus, Users } from "lucide-react";

export default async function GroupsPage() {
    const groups = await prisma.group.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Grupos</h1>
                    <p className="text-gray-500 text-sm">Organiza a los usuarios en departamentos o equipos.</p>
                </div>

                {/* Create Form inline for speed */}
                <form action={createGroup} className="flex gap-2">
                    <input
                        name="name"
                        placeholder="Nuevo Grupo..."
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                        required
                    />
                    <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-900 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Crear
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                    <div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
                        {/* Overlay Link for main card */}
                        <Link href={`/admin/users?groupId=${group.id}`} className="absolute inset-0 z-0" aria-label={`Ver usuarios de ${group.name}`} />

                        <div className="p-6 relative pointer-events-none z-0">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand-primary">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-1">{group.name}</h3>
                            <p className="text-sm text-gray-500">
                                {group._count.users} usuarios activos
                            </p>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                                <span className="text-xs font-semibold text-brand-secondary underline decoration-transparent">
                                    Ver Usuarios →
                                </span>
                            </div>
                        </div>

                        {/* Separate Delete Button (Clickable) */}
                        <div className="absolute top-6 right-6 z-10">
                            <form action={deleteGroup.bind(null, group.id)}>
                                <button className="text-gray-300 hover:text-red-500 transition-colors p-1 cursor-pointer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                ))}

                {groups.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <p>No hay grupos creados aún.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
