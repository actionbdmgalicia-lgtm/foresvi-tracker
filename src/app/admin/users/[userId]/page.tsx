import { prisma } from "@/lib/prisma";
import { toggleHabitAssignment } from "@/app/actions/assignment-actions";
import { Check, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { UserHabitCard } from "@/components/admin/UserHabitCard";
import { InviteLink } from "@/components/admin/InviteLink";
import { GroupSelector } from "@/components/admin/GroupSelector";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

interface Props {
    params: Promise<{
        userId: string;
    }>;
}

export default async function AssignmentPage({ params }: Props) {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { group: true }
    });

    if (!user) {
        return <div>Usuario no encontrado</div>;
    }

    const groups = await prisma.group.findMany({
        where: { companyId: user.companyId || "foresvi-hq" }
    });

    // Get all habits available for the company (or global)
    const allHabits = await prisma.habit.findMany({
        where: {
            companyId: user.companyId // Only exact match for now
        },
        orderBy: { topic: 'asc' }
    });

    // Get current assignments with snapshot details
    const userAssignments = await prisma.assignment.findMany({
        where: { userId, isActive: true }
    });

    // Create a map for fast lookup of assignment by habitId
    // We map the whole assignment object to access custom fields
    const assignmentsMap = userAssignments.reduce((acc, curr) => {
        acc[curr.habitId] = curr;
        return acc;
    }, {} as Record<string, typeof userAssignments[0]>);

    // Group habits by Topic
    const habitsByTopic = allHabits.reduce((acc, habit) => {
        if (!acc[habit.topic]) acc[habit.topic] = [];
        acc[habit.topic].push(habit);
        return acc;
    }, {} as Record<string, typeof allHabits>);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <Link href="/admin/users" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a Usuarios
            </Link>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center text-2xl font-bold shadow-md">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-gray-500">{user.email}</p>
                        <div className="flex gap-2 mt-2">
                            <GroupSelector userId={userId} currentGroupId={user.groupId} groups={groups} />
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {userAssignments.length} Hábitos Activos
                            </span>
                            <ImpersonateButton userId={userId} />
                        </div>
                    </div>
                </div>

                <div className="mt-2 border-t border-gray-100 pt-4">
                    <InviteLink email={user.email} />
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Asignación de Hábitos</h2>

            <div className="space-y-8">
                {Object.entries(habitsByTopic).sort(([topicA], [topicB]) => {
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
                    const orderA = TOPIC_ORDER[topicA] || 99;
                    const orderB = TOPIC_ORDER[topicB] || 99;
                    return orderA - orderB;
                }).map(([topic, habits]) => (
                    <div key={topic} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
                                {topic.replace(/_/g, " ")}
                            </h3>
                            <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-1 rounded-full">{habits.length} hábitos</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {habits.sort((a, b) => {
                                const aAssigned = !!assignmentsMap[a.id];
                                const bAssigned = !!assignmentsMap[b.id];
                                return (aAssigned === bAssigned) ? 0 : aAssigned ? -1 : 1;
                            }).map(habit => {
                                const assignment = assignmentsMap[habit.id];
                                const isAssigned = !!assignment;

                                return (
                                    <UserHabitCard
                                        key={habit.id}
                                        habit={habit}
                                        assignment={assignment}
                                        userId={userId}
                                        isAssigned={isAssigned}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
