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

import { parse } from 'csv-parse/sync';

export async function importHabitsFromCSV(formData: FormData) {
    const file = formData.get('csvFile') as File;

    if (!file || file.size === 0) {
        throw new Error("No se ha seleccionado ningún archivo.");
    }

    const text = await file.text();
    const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as any[];

    const companyId = "foresvi-hq"; // Hardcoded for now

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
        // Map Spanish CSV headers to DB fields
        // Expected Headers: TEMA, HABITO, SEÑAL, ANHELO, RESPUESTA, RECOMPENSA, LINK
        const name = record['HABITO'] || record['Nombre'] || record['name'];
        const topic = record['TEMA'] || record['Tema'] || record['topic'];

        if (!name || !topic) {
            console.warn("Skipping invalid record:", record);
            errorCount++;
            continue;
        }

        try {
            // Upsert based on Name (assuming unique name per habit for simplicity, or just create)
            // To avoid duplicates, let's try to find first.
            const existing = await prisma.habit.findFirst({
                where: { name: name, companyId }
            });

            if (existing) {
                // Update
                await prisma.habit.update({
                    where: { id: existing.id },
                    data: {
                        topic,
                        cue: record['SEÑAL'] || record['Señal'] || record['cue'] || "",
                        craving: record['ANHELO'] || record['Anhelo'] || record['craving'] || "",
                        response: record['RESPUESTA'] || record['Respuesta'] || record['response'] || "",
                        reward: record['RECOMPENSA'] || record['Recompensa'] || record['reward'] || "",
                        externalLink: record['LINK'] || record['Link'] || record['externalLink'] || null,
                        deletedAt: null // Restore if it was deleted
                    }
                });
            } else {
                // Create
                await prisma.habit.create({
                    data: {
                        name,
                        topic,
                        cue: record['SEÑAL'] || record['Señal'] || record['cue'] || "",
                        craving: record['ANHELO'] || record['Anhelo'] || record['craving'] || "",
                        response: record['RESPUESTA'] || record['Respuesta'] || record['response'] || "",
                        reward: record['RECOMPENSA'] || record['Recompensa'] || record['reward'] || "",
                        externalLink: record['LINK'] || record['Link'] || record['externalLink'] || null,
                        companyId
                    }
                });
            }
            successCount++;
        } catch (e) {
            console.error("Error importing habit:", name, e);
            errorCount++;
        }
    }

    revalidatePath("/admin/habits");
    revalidatePath("/");
    return { success: true, count: successCount, errors: errorCount };
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
