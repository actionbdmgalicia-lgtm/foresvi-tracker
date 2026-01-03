"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateHabit(formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const topic = formData.get("topic") as any; // Allow any for now, better to validate Enum
    const cue = formData.get("cue") as string;
    const craving = formData.get("craving") as string;
    const response = formData.get("response") as string;
    const reward = formData.get("reward") as string;
    const externalLink = formData.get("externalLink") as string;

    if (!id || !name) {
        throw new Error("Missing required fields");
    }

    try {
        await prisma.habit.update({
            where: { id },
            data: {
                name,
                topic,
                cue,
                craving,
                response,
                reward,
                externalLink: externalLink || null, // Handle empty string as null
            },
        });
    } catch (error) {
        console.error("Failed to update habit:", error);
        throw new Error("Failed to update habit");
    }

    revalidatePath("/admin/habits");
    revalidatePath("/admin/users/[userId]"); // Revalidate assignment pages too
    revalidatePath("/"); // Revalidate dashboard
}

export async function createHabit(formData: FormData) {
    const name = formData.get("name") as string;
    const topic = formData.get("topic") as string;
    const cue = formData.get("cue") as string;
    const craving = formData.get("craving") as string;
    const response = formData.get("response") as string;
    const reward = formData.get("reward") as string;
    const externalLink = formData.get("externalLink") as string;
    const companyId = "foresvi-hq"; // Hardcoded for prototype

    if (!name || !topic) {
        throw new Error("Nombre y Tema son obligatorios");
    }

    await prisma.habit.create({
        data: {
            name,
            topic,
            cue: cue || "",
            craving: craving || "",
            response: response || "",
            reward: reward || "",
            externalLink: externalLink || null,
            companyId
        }
    });

    revalidatePath("/admin/habits");
    revalidatePath("/");
}

export async function importHabitsFromCSV(formData: FormData) {
    // This action would handle CSV parsing
    // For now, we will just log that it's not implemented fully or mock it if needed
    // In a real app, this would read the file from FormData, parse it (papaparse or csv-parse), 
    // and recreate/upsert habits.

    // Placeholder implementation
    console.log("Importing CSV...");
    // Need to read 'csvFile' from formData if user uploaded one.
    // Since the big button is currently just a trigger without <input type="file">, 
    // we would need to implement the file selection UI first.
    // For this instruction, I'll just leave it as a placeholder action linked to the button 
    // to prevent crashes, but it won't do much yet without the client side file input.
    revalidatePath("/admin/habits");
}

// NEW: Soft Delete Implementation
export async function deleteHabit(habitId: string) {
    if (!habitId) throw new Error("ID required");

    try {
        // Soft delete: Mark as deleted and inactive
        await prisma.habit.update({
            where: { id: habitId },
            data: { deletedAt: new Date() }
        });

    } catch (error) {
        console.error("Failed to archive habit:", error);
        throw new Error("Error al archivar el hábito. Inténtalo de nuevo.");
    }

    revalidatePath("/admin/habits");
    revalidatePath("/");
}

export async function restoreHabit(habitId: string) {
    if (!habitId) throw new Error("ID required");
    try {
        await prisma.habit.update({
            where: { id: habitId },
            data: { deletedAt: null }
        });
    } catch (error) {
        console.error("Failed to restore habit:", error);
        throw new Error("Error al restaurar.");
    }
    revalidatePath("/admin/habits");
}

export async function getHabitAssignments(habitId: string) {
    const assignments = await prisma.assignment.findMany({
        where: { habitId },
        include: { user: { select: { name: true, email: true } } }
    });
    return assignments.map(a => a.user);
}
