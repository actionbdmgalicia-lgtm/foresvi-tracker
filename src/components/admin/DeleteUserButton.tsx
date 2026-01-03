"use client";

import { Trash2 } from "lucide-react";
import { deleteUser } from "@/app/actions/admin-actions";

export function DeleteUserButton({ userId }: { userId: string }) {
    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que quieres eliminar este usuario? Podrás recuperarlo más tarde.")) {
            await deleteUser(userId);
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar Usuario"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
