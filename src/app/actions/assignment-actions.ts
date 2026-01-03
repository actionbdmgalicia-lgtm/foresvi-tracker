"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleHabitAssignment(userId: string, habitId: string, currentState: boolean) {
    if (currentState) {
        // Unassign - Soft delete only to preserve customization/logs history if needed
        // Or hard delete if no logs? For now, let's just deactivate.
        await prisma.assignment.updateMany({
            where: { userId, habitId },
            data: { isActive: false }
        });
    } else {
        // Assign
        const existing = await prisma.assignment.findFirst({
            where: { userId, habitId }
        });

        if (existing) {
            await prisma.assignment.update({
                where: { id: existing.id },
                data: { isActive: true }
            });
        } else {
            // New assignment - Check if we should copy base habit values to custom fields?
            // "los cambios que se hace en un usuario son personalizaciones que no afectan al GENERAL y tampoco los cambio del GENERAL afectan a las asignaciones anteriores"
            // This implies we should SNAPSHOT the current values into custom fields upon assignment?
            // OR, we just reference the habit, and if the user overrides, we save custom.
            // If the user does not override, they see the LIVE General habit.
            // But the user said "tampoco los cambio del GENERAL afectan a las asignaciones anteriores".
            // This strongly suggests SNAPSHOT (Copying).

            // Let's copy the current habit values into the custom fields so they are "frozen" for this user.
            const habit = await prisma.habit.findUnique({ where: { id: habitId } });
            if (!habit) throw new Error("Habit not found");

            await prisma.assignment.create({
                data: {
                    userId,
                    habitId,
                    isActive: true,
                    // Snapshoting Base Values into Custom Fields
                    customCue: habit.cue,
                    customCraving: habit.craving,
                    customResponse: habit.response,
                    customReward: habit.reward,
                    customExternalLink: habit.externalLink
                }
            });
        }
    }

    revalidatePath(`/admin/users/${userId}`);
}

export async function updateAssignmentCustomization(assignmentId: string, formData: FormData) {
    const customCue = formData.get("customCue") as string;
    const customCraving = formData.get("customCraving") as string;
    const customResponse = formData.get("customResponse") as string;
    const customReward = formData.get("customReward") as string;
    const customExternalLink = formData.get("customExternalLink") as string;

    await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
            customCue,
            customCraving,
            customResponse,
            customReward,
            customExternalLink: customExternalLink || null
        }
    });

    // We don't know the userId here easily without query, but we can revalidate the general path pattern
    // Or just revalidate the page via the client component calling this? 
    // Revalidating the specific user page requires userId.
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { userId: true } });
    if (assignment) {
        revalidatePath(`/admin/users/${assignment.userId}`);
    }
}
