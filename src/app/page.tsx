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

    if (!user) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error de Sesión (Usuario no encontrado)</h1>
        <p className="text-gray-600 mb-6">Tu sesión parece válida pero el usuario no existe en la base de datos.</p>
        <a href="/api/auth/cleanup" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition-colors">
          Resetear y Salir
        </a>
      </div>
    );

    // 2. Fetch Assigned Habits
    // Only Active assignments
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        habit: true
      }
    });

    // Define the explicit topic order based on user request
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

    // Map to the shape expected by Dashboard (Habit + Customizations)
    const habits = assignments.map(a => {
      if (!a.habit) return null; // Safety check
      return {
        ...a.habit,
        name: a.customName || a.habit.name,
        cue: a.customCue || a.habit.cue,
        craving: a.customCraving || a.habit.craving,
        response: a.customResponse || a.habit.response,
        reward: a.customReward || a.habit.reward,
        externalLink: a.customExternalLink || a.habit.externalLink,
        isConsolidated: a.isConsolidated,
        assignmentId: a.id // track assignment ID for logging
      };
    })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => {
        const orderA = TOPIC_ORDER[a.topic] || 99;
        const orderB = TOPIC_ORDER[b.topic] || 99;
        return orderA - orderB;
      });

    const activeAssignmentIds = assignments.map(a => a.id);
    const logs = await prisma.progressLog.findMany({
      where: {
        assignmentId: { in: activeAssignmentIds }
      }
    });

    // Check for impersonation cookie
    const cookieStore = await cookies();
    const isImpersonating = cookieStore.has("foresvi_impersonator_id");

    // 3. Render Client Component
    return (
      <DashboardClient
        user={user}
        habits={habits}
        logs={logs}
        isImpersonating={isImpersonating}
      />
    );
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    console.error(error);
    return <div>Error Fatal: {JSON.stringify(error)}</div>;
  }
}
