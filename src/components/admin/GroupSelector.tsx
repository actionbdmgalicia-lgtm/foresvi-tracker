"use client";

import { useTransition } from "react";
import { updateUserGroup } from "@/app/actions/admin-actions";
import { Check, ChevronDown, Users } from "lucide-react";

interface Group {
    id: string;
    name: string;
}

interface GroupSelectorProps {
    userId: string;
    currentGroupId: string | null;
    groups: Group[];
}

export function GroupSelector({ userId, currentGroupId, groups }: GroupSelectorProps) {
    const [isPending, startTransition] = useTransition();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroupId = e.target.value;
        startTransition(async () => {
            await updateUserGroup(userId, newGroupId);
        });
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <select
                    disabled={isPending}
                    value={currentGroupId || "unassigned"}
                    onChange={handleChange}
                    className="appearance-none bg-blue-50 border border-blue-100 text-blue-800 text-xs font-medium rounded-full py-1 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                    <option value="unassigned">Sin Grupo</option>
                    {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="w-3 h-3 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {isPending && (
                <span className="text-xs text-gray-400 animate-pulse">
                    Guardando...
                </span>
            )}
        </div>
    );
}
