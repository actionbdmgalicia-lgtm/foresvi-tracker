import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/app/actions/auth-actions";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    const sessionUserId = await getSessionUserId();

    if (!sessionUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basic authorization
    const requester = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (sessionUserId !== userId && requester?.role !== "COMPANY_ADMIN" && requester?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { group: true }
    });

    if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch Assignments & Habits
    const assignments = await prisma.assignment.findMany({
        where: { userId: userId, isActive: true },
        include: { habit: true },
        orderBy: { habit: { topic: 'asc' } }
    });

    // Fetch Logs
    const logs = await prisma.progressLog.findMany({
        where: { assignment: { userId: userId } },
        orderBy: { loggedAt: 'desc' }
    });

    // --- CREATE WORKBOOK ---
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FORESVI";
    workbook.created = new Date();

    // --- SHEET 1: RESUMEN ---
    const sheetOverview = workbook.addWorksheet("Resumen");
    sheetOverview.columns = [{ width: 20 }, { width: 40 }];

    // Add Title
    sheetOverview.mergeCells('A1:B1');
    const titleCell = sheetOverview.getCell('A1');
    titleCell.value = "INFORME DE HÁBITOS - FORESVI";
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003349' } }; // Brand Blue
    titleCell.alignment = { horizontal: 'center' };

    sheetOverview.addRow([]);
    sheetOverview.addRow(["Usuario", targetUser.name]);
    sheetOverview.addRow(["Email", targetUser.email]);
    sheetOverview.addRow(["Grupo", targetUser.group?.name || "-"]);
    sheetOverview.addRow(["Fecha Informe", new Date().toLocaleDateString()]);
    sheetOverview.addRow([]);
    sheetOverview.addRow(["Hábitos Activos", assignments.length]);

    // Style Labels
    ['A3', 'A4', 'A5', 'A6', 'A8'].forEach(cell => {
        sheetOverview.getCell(cell).font = { bold: true };
    });

    // --- SHEET 2: DETALLE HÁBITOS ---
    const sheetHabits = workbook.addWorksheet("Detalle Hábitos");
    sheetHabits.columns = [
        { header: 'TEMA', key: 'topic', width: 20 },
        { header: 'HÁBITO', key: 'name', width: 30 },
        { header: 'SEÑAL', key: 'cue', width: 25 },
        { header: 'ANHELO', key: 'craving', width: 25 },
        { header: 'ACCIÓN', key: 'response', width: 25 },
        { header: 'RECOMPENSA', key: 'reward', width: 25 },
        { header: 'ENLACE', key: 'link', width: 30 },
        { header: 'ESTADO', key: 'status', width: 15 },
    ];

    // Header Style
    sheetHabits.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetHabits.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003349' } };

    assignments.forEach(a => {
        const h = a.habit;
        sheetHabits.addRow({
            topic: h.topic,
            name: a.customName || h.name,
            cue: a.customCue || h.cue,
            craving: a.customCraving || h.craving,
            response: a.customResponse || h.response,
            reward: a.customReward || h.reward,
            link: a.customExternalLink || h.externalLink,
            status: a.isConsolidated ? "Afianzado" : "Activo"
        });
    });

    // --- SHEET 3: EVOLUCIÓN VISUAL (MATRIZ WEB) ---
    const sheetEvolution = workbook.addWorksheet("Evolución Visual");

    // 1. Determine Periods Sorted Chronologically (Oldest -> Newest)
    // We infer order by the earliest 'loggedAt' timestamp associated with each period label
    const periodMiniMap = new Map<string, number>();
    logs.forEach(l => {
        const existing = periodMiniMap.get(l.periodIdentifier);
        const currentTs = new Date(l.loggedAt).getTime();
        // We want the min date for this period to sort correctly
        if (existing === undefined || currentTs < existing) {
            periodMiniMap.set(l.periodIdentifier, currentTs);
        }
    });

    // Sort periods ascending (Oldest first, matching Web Left-to-Right)
    const sortedPeriods = Array.from(periodMiniMap.keys()).sort((a, b) => {
        return (periodMiniMap.get(a) || 0) - (periodMiniMap.get(b) || 0);
    });

    // 2. Define Columns
    // First col is Habit Name, rest are Periods
    const periodColumns = sortedPeriods.map(p => ({
        header: p,
        key: p,
        width: 6,
        style: { alignment: { horizontal: 'center' as const } }
    }));

    sheetEvolution.columns = [
        { header: 'HÁBITO', key: 'habit', width: 40 },
        ...periodColumns
    ];

    // Style Header Row
    const evoHeader = sheetEvolution.getRow(1);
    evoHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    evoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003349' } };
    evoHeader.alignment = { horizontal: 'center' };

    // 3. Add Data Rows (One per Habit)
    // Create a fast lookup for logs: assignmentId-period -> status
    const logLookup = new Map<string, string>();
    logs.forEach(l => logLookup.set(`${l.assignmentId}-${l.periodIdentifier}`, l.status));

    assignments.forEach(a => {
        const rowValues: any = {
            habit: (a.customName || a.habit.name).toUpperCase()
        };

        sortedPeriods.forEach(p => {
            // Find status
            let status = logLookup.get(`${a.id}-${p}`);

            // Logic for Consolidated: If no log (undefined/NEGRA) + Consolidated => VERDE
            if (!status && a.isConsolidated) {
                status = "VERDE";
            }
            // If explicit status is NEGRA, it stays NEGRA unless consolidated logic above handles the 'missing' case.
            // Wait, if status IS 'NEGRA' (explicit log), and Consolidated, logic says treating it as VERDE in dashboard calculation.
            // Let's match Dashboard logic:
            // if (status === "NEGRA" && habit.isConsolidated) status = "VERDE";

            if ((!status || status === 'NEGRA') && a.isConsolidated) {
                status = "VERDE";
            }

            rowValues[p] = status || "NEGRA";
        });

        sheetEvolution.addRow(rowValues);
    });

    // 4. Conditional Formatting (Colors)
    sheetEvolution.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        row.eachCell((cell, colNumber) => {
            if (colNumber === 1) return; // Skip Habit Name Column

            const val = cell.value;
            let color = '';

            // Using standard palette colors matching the Web
            if (val === 'VERDE') color = 'FF4ADE80'; // Green 400
            else if (val === 'AMARILLA') color = 'FFFACC15'; // Yellow 400
            else if (val === 'ROJA') color = 'FFF87171'; // Red 400
            else if (val === 'NEGRA') color = 'FFF3F4F6'; // Gray 100

            if (color) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: color }
                };

                // Text styling (make it subtle or match bg to hide, but text is useful for accessibility/printing)
                // Let's use a dark gray for text so it's readable but the color is the main thing
                cell.font = { size: 8, color: { argb: 'FF374151' } }; // Gray 700

                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                    left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                    bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                    right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
                };
            }
        });
    });

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            "Content-Disposition": `attachment; filename="informe_visual_${targetUser.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx"`,
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
    });
}
