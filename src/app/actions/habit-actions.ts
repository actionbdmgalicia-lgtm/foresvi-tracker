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

        // SMART PARSING: Scan first 10 lines to find headers and delimiter
        const lines = text.split(/\r\n|\n|\r/);
        const searchDepth = Math.min(lines.length, 10);

        let bestDelimiter = ',';
        let maxDelimiterCount = 0;
        let headerLineIndex = 0;

        const delimiters = [',', ';', '\t'];

        for (let i = 0; i < searchDepth; i++) {
            const line = lines[i];
            if (!line) continue;

            for (const delim of delimiters) {
                // Count occurrences of this delimiter in this line
                const count = line.split(delim).length - 1;
                // Heuristic: Headers usually have at least 2 columns
                if (count > maxDelimiterCount && count >= 2) {
                    maxDelimiterCount = count;
                    bestDelimiter = delim;
                    headerLineIndex = i;
                }
            }
        }

        console.log(`Smart Import: Delimiter '${bestDelimiter}' found at line ${headerLineIndex + 1} with ${maxDelimiterCount} cols.`);

        // If no delimiter found, fallback to default (probably comma, or file is just one column)
        if (maxDelimiterCount === 0) {
            const firstLine = lines[0] || "";
            if (firstLine.includes(";")) bestDelimiter = ";";
            else if (firstLine.includes("\t")) bestDelimiter = "\t";
        }

        const records = parse(text, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            delimiter: bestDelimiter,
            from_line: headerLineIndex + 1, // csv-parse is 1-based
            relax_quotes: true,
            relax_column_count: true
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

        // Return debug info if everything failed
        const firstRecordKeys = records.length > 0 ? Object.keys(records[0]).join(", ") : "None";
        return {
            success: true,
            count: successCount,
            errors: errorCount,
            debugInfo: successCount === 0 ? `Cabeceras detectadas: [${firstRecordKeys}]` : undefined
        };

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

export async function createPrivateHabit(userId: string, formData: FormData) {
    const name = formData.get("name") as string;
    const topic = formData.get("topic") as string;

    if (!name || !topic) throw new Error("Nombre y Tema requeridos");

    const habit = await prisma.habit.create({
        data: {
            name,
            topic,
            cue: (formData.get("cue") as string) || "",
            craving: (formData.get("craving") as string) || "",
            response: (formData.get("response") as string) || "",
            reward: (formData.get("reward") as string) || "",
            externalLink: (formData.get("externalLink") as string) || null,
            companyId: "foresvi-hq",
            isGlobal: false,
            creatorId: userId
        }
    });

    await prisma.assignment.create({
        data: {
            userId,
            habitId: habit.id,
            isActive: true
        }
    });

    revalidatePath(`/admin/users/${userId}`);
}

export async function promoteHabitToGlobal(habitId: string) {
    if (!habitId) return;

    await prisma.habit.update({
        where: { id: habitId },
        data: {
            isGlobal: true,
            creatorId: null // Make it shared
        }
    });

    revalidatePath("/admin/habits");
    revalidatePath("/admin/users");
}
