import { prisma } from "@/lib/prisma";
import { createUser, deleteUser } from "@/app/actions/admin-actions";
import Link from "next/link";
import { DeleteUserButton } from "@/components/admin/DeleteUserButton";
import { UserPlus, Users, Eye, EyeOff } from "lucide-react";


interface Props {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function UsersPage({ searchParams }: Props) {
    const params = await searchParams;
    const groupId = params?.groupId as string;
    const showDeleted = params?.showDeleted === 'true';

    const whereClause: any = {};

    if (groupId) whereClause.groupId = groupId;

    if (showDeleted) {
        whereClause.deletedAt = { not: null };
    } else {
        whereClause.deletedAt = null;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        include: {
            group: true,
            _count: {
                select: {
                    assignments: {
                        where: { isActive: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const groups = await prisma.group.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-500 text-sm">Crea usuarios y asígnalos a grupos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create User Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-8">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-brand-secondary" /> Nuevo Usuario
                        </h3>
                        <form action={createUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                                <input name="name" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej. Ana García" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input name="email" type="email" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="ana@empresa.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar a Grupo</label>
                                <select name="groupId" className="w-full p-2 border border-blue-200 bg-blue-50 rounded-lg text-sm font-medium outline-none">
                                    <option value="">-- Sin Grupo --</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-brand-primary text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-900 transition-colors">
                                Crear Usuario
                            </button>
                        </form>
                    </div>
                </div>

                {/* Users List */}
                <div className="lg:col-span-2 space-y-4">
                    {users.map((user) => (
                        <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{user.name}</h4>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-500">{user.email}</span>
                                        {user.group && (
                                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                {user.group.name}
                                            </span>
                                        )}
                                        {user.role === 'COMPANY_ADMIN' && (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link href={`/admin/users/${user.id}`} className="px-3 py-1.5 text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                                    {user._count.assignments} hábitos
                                </Link>
                                <DeleteUserButton userId={user.id} />
                            </div>
                        </div>
                    ))}

                    {users.length === 0 && (
                        <div className="text-center py-12 text-gray-400">No hay usuarios.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
