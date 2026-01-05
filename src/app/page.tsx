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

    if (!user) {
      // If we have a cookie ID but no user in DB (e.g. after re-seed)
      // We redirect to a route handler that cleans the cookie
      redirect("/api/auth/cleanup");
    }

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
    const habits = assignments.map(a => ({
      ...a.habit,
      // Override with custom fields if present
      name: a.customName || a.habit.name,
      cue: a.customCue || a.habit.cue,
      craving: a.customCraving || a.habit.craving,
      response: a.customResponse || a.habit.response,
      reward: a.customReward || a.habit.reward,
      externalLink: a.customExternalLink || a.habit.externalLink,
      isConsolidated: a.isConsolidated,
      assignmentId: a.id // track assignment ID for logging
    })).sort((a, b) => {
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
    // If it's a redirect (which is thrown as an error in Next.js), rethrow it
    if (error.message === 'NEXT_REDIRECT') throw error;
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;

    console.error("Dashboard Error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error al cargar el panel</h1>
          <p className="text-sm text-gray-600 mb-4">Ha ocurrido un problema técnico.</p>
          <div className="text-left bg-red-50 p-3 rounded border border-red-100 mb-4">
            <code className="text-xs text-red-800 block whitespace-pre-wrap break-words font-mono">
              {error.message || JSON.stringify(error)}
            </code>
          </div>
          <a href="/login" className="text-sm font-bold text-brand-primary hover:underline">Volver a Login</a>
        </div>
      </div>
    );
  }
}
