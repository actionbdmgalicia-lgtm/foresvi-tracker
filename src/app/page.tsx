import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/app/actions/auth-actions";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const userId = await getSessionUserId();
    console.log("Dashboard - Session User ID:", userId);

    if (!userId) {
      // Stop the loop: Manual Link
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Sesión no iniciada</h1>
            <p className="text-gray-500 mb-6 text-sm">No se ha detectado ninguna cookie de sesión válida.</p>
            <a href="/login" className="bg-brand-primary text-white font-bold py-2 px-6 rounded hover:bg-blue-900 transition-colors">
              Ir a Iniciar Sesión
            </a>
          </div>
        </div>
      );
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

    // Helper for robust sorting (matches HabitMatrix logic)
    const getTopicRank = (topic: string) => {
      if (!topic) return 99;
      const t = topic.toUpperCase();

      const match = t.match(/^\s*(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }

      if (t.includes("DESTINO")) return 1;
      if (t.includes("DINERO")) return 2;
      if (t.includes("GESTION") || t.includes("TIEMPO")) return 3;
      if (t.includes("SERVICIO")) return 4;
      if (t.includes("MARKETING") || t.includes("VENTAS")) return 5;
      if (t.includes("SISTEMA")) return 6;
      if (t.includes("EQUIPO")) return 7;
      if (t.includes("SINERGIA")) return 8;
      if (t.includes("RESULTADOS")) return 9;

      return 99;
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
        // 1. Consolidated Last
        if (a.isConsolidated !== b.isConsolidated) {
          return a.isConsolidated ? 1 : -1;
        }

        // 2. Topic Rank
        const rankA = getTopicRank(a.topic || "");
        const rankB = getTopicRank(b.topic || "");
        if (rankA !== rankB) return rankA - rankB;

        // 3. Name Alphabetical
        return (a.name || "").localeCompare(b.name || "");
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
