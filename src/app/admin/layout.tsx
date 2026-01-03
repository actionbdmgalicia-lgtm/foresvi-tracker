import Link from "next/link";
import { Users, Briefcase, LayoutDashboard, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/app/actions/auth-actions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userId = await getSessionUserId();

    if (!userId) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user || (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN")) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-primary text-white hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold tracking-tight">FORESVI Admin</h1>
                    <p className="text-xs text-blue-300">Panel de Control</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors">
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                    </Link>
                    <Link href="/admin/groups" className="flex items-center gap-3 px-4 py-3 text-blue-100 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
                        <Briefcase className="w-5 h-5" /> Grupos
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-blue-100 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
                        <Users className="w-5 h-5" /> Usuarios
                    </Link>
                    <Link href="/admin/habits" className="flex items-center gap-3 px-4 py-3 text-blue-100 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
                        <Settings className="w-5 h-5" /> Gestión Hábitos
                    </Link>
                </nav>

                <div className="p-4 border-t border-blue-800 space-y-3">
                    <Link href="/" className="text-xs text-blue-300 hover:text-white flex items-center gap-2">
                        ← Volver a la App
                    </Link>
                    <form action={async () => {
                        "use server";
                        const { logout } = await import("@/app/actions/auth-actions");
                        await logout();
                    }}>
                        <button type="submit" className="text-xs text-red-300 hover:text-red-100 font-bold uppercase tracking-wider flex items-center gap-2 w-full">
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
