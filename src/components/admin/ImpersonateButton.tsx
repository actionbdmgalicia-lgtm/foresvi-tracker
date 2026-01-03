"use client";

import { Eye } from "lucide-react";
import { impersonateUser } from "@/app/actions/impersonate-action";

export function ImpersonateButton({ userId }: { userId: string }) {
    return (
        <button
            onClick={() => impersonateUser(userId)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            title="Ver panel como este usuario"
        >
            <Eye className="w-4 h-4" />
            <span className="uppercase tracking-wider">Ver Como</span>
        </button>
    );
}
