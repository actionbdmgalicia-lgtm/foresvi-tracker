import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/app/actions/auth-actions";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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
}
