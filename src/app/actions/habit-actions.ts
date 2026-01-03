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
    try {
        const file = formData.get('csvFile') as File;

        if (!file || file.size === 0) {
            return { success: false, error: "No se ha seleccionado ningún archivo." };
        }

        const text = await file.text();

        // Check if text is empty or meaningless
        if (!text || text.trim().length === 0) {
            return { success: false, error: "El archivo está vacío." };
        }

        // Manual Delimiter Sniffing
        // This fixes the "columns length is 1" error when auto-detection fails
        const firstLine = text.split('\n')[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;

        let detectedDelimiter = ',';
        if (semiCount > commaCount && semiCount > tabCount) detectedDelimiter = ';';
        else if (tabCount > commaCount && tabCount > semiCount) detectedDelimiter = '\t';

        console.log(`Detected delimiter: '${detectedDelimiter}' (Comma: ${commaCount}, Semi: ${semiCount}, Tab: ${tabCount})`);

        const records = parse(text, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            delimiter: detectedDelimiter,
            relax_quotes: true,
            relax_column_count: true // Prevent crash if a row has extra/fewer fields
        }) as any[];

        const companyId = "foresvi-hq";

        let successCount = 0;
        let errorCount = 0;

        // Helper to find value case-insensitively
        const getValue = (record: any, keys: string[]) => {
            const recordKeys = Object.keys(record);
            for (const key of keys) {
                const foundKey = recordKeys.find(k => k.trim().toUpperCase() === key.toUpperCase());
                if (foundKey && record[foundKey]) return record[foundKey];
            }
            return "";
        };

        for (const record of records) {
            const name = getValue(record, ['HABITO', 'NAME', 'NOMBRE']);
            const topic = getValue(record, ['TEMA', 'TOPIC']);

            if (!name || !topic) {
                errorCount++;
                continue;
            }

            try {
                const existing = await prisma.habit.findFirst({
                    where: { name: name, companyId }
                });

                const habitData = {
                    topic,
                    cue: getValue(record, ['SEÑAL', 'CUE', 'SENAL']),
                    craving: getValue(record, ['ANHELO', 'CRAVING']),
                    response: getValue(record, ['RESPUESTA', 'RESPONSE', 'ACCION']),
                    reward: getValue(record, ['RECOMPENSA', 'REWARD']),
                    externalLink: getValue(record, ['LINK', 'ENLACE', 'URL', 'EXTERNAL_LINK']) || null,
                };

                if (existing) {
                    await prisma.habit.update({
                        where: { id: existing.id },
                        data: {
                            ...habitData,
                            deletedAt: null
                        }
                    });
                } else {
                    await prisma.habit.create({
                        data: {
                            name,
                            companyId,
                            ...habitData
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

    } catch (globalError: any) {
        console.error("Global CSV Import Error:", globalError);
        return { success: false, error: globalError.message || "Error desconocido al procesar el CSV" };
    }
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
