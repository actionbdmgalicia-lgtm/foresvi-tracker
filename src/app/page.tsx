import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/app/actions/auth-actions";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      redirect("/login");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { group: true }
    });

    if (!user) redirect("/api/auth/cleanup");

    // TEMPORARY DEBUG: Skip complex queries to isolate crash
    return (
      <div className="p-8">
        <h1 className="font-bold text-2xl">Bienvenido {user.name}</h1>
        <p>El sistema se está actualizando. Si ves esto, tu usuario funciona correctamente.</p>
        <p>Restaurando panel...</p>
      </div>
    );

    /* 
    // OLD CODE COMMENTED OUT
    // ... (rest of the logic)
    */
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    console.error(error);
    return <div>Error Fatal: {JSON.stringify(error)}</div>;
  }
}
