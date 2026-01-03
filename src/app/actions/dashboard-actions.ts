"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BolaStatus = "NEGRA" | "ROJA" | "AMARILLA" | "VERDE";

const SCORES: Record<BolaStatus, number> = {
    NEGRA: 0.0,
    ROJA: 0.33,
    AMARILLA: 0.66,
    VERDE: 1.0,
};

export async function toggleProgressLog(assignmentId: string, periodIdentifier: string, currentStatus: BolaStatus, desiredStatus?: BolaStatus) {
    if (!assignmentId) return;

    let nextStatus: BolaStatus;

    if (desiredStatus) {
        nextStatus = desiredStatus;
    } else {
        // Standard Rotation if no desired override
        nextStatus = "ROJA";
        if (currentStatus === "NEGRA") nextStatus = "ROJA";
        else if (currentStatus === "ROJA") nextStatus = "AMARILLA";
        else if (currentStatus === "AMARILLA") nextStatus = "VERDE";
        else if (currentStatus === "VERDE") nextStatus = "NEGRA";
    }

    const value = SCORES[nextStatus];

    // Upsert the log
    // Since unique constraint on [assignmentId, periodIdentifier], we can use upsert
    // But verify Prisma schema supports upsert on compound unique comfortably or logic it.

    // Check if exists?
    // prisma upsert needs a 'where' with unique field.
    // @@unique([assignmentId, periodIdentifier]) gives us a compound unique.

    await prisma.progressLog.upsert({
        where: {
            assignmentId_periodIdentifier: {
                assignmentId,
                periodIdentifier
            }
        },
        create: {
            assignmentId,
            periodIdentifier,
            status: nextStatus,
            value
        },
        update: {
            status: nextStatus,
            value
        }
    });

    revalidatePath("/");
}

export async function updateAssignmentCustomization(
    assignmentId: string,
    data: {
        customName?: string;
        customCue?: string;
        customCraving?: string;
        customResponse?: string;
        customReward?: string;
        customExternalLink?: string;
        isConsolidated?: boolean;
    }
) {
    if (!assignmentId) return;

    await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
            customName: data.customName,
            customCue: data.customCue,
            customCraving: data.customCraving,
            customResponse: data.customResponse,
            customReward: data.customReward,
            customExternalLink: data.customExternalLink,
            isConsolidated: data.isConsolidated
        }
    });

    revalidatePath("/");
}
