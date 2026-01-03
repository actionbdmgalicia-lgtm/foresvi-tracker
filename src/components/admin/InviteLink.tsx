"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Link as LinkIcon } from "lucide-react";

export function InviteLink({ email }: { email: string }) {
    const [copied, setCopied] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const inviteUrl = `${origin}/login?email=${encodeURIComponent(email)}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!origin) return <div className="h-10 animate-pulse bg-gray-100 rounded md:w-96 w-full"></div>;

    return (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden w-full">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                    <LinkIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-0.5">Enlace de Acceso Directo</p>
                    <div className="bg-blue-100/50 px-2 py-1.5 rounded border border-blue-200">
                        <p className="text-xs text-blue-800 truncate font-mono select-all">
                            {inviteUrl || "Generando enlace..."}
                        </p>
                    </div>
                </div>
            </div>
            <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm shrink-0"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar Enlace"}
            </button>
        </div>
    );
}
