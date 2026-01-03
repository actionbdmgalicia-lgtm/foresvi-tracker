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

    // --- SHEET 3: EVOLUCIÓN VISUAL (CALENDARIO) ---
    const sheetEvolution = workbook.addWorksheet("Evolución Visual");

    // 1. Prepare Columns: Period + Each Habit
    const habitColumns = assignments.map(a => ({
        header: (a.customName || a.habit.name).toUpperCase(), // Vertical headers usually look better in upper
        key: a.id,
        width: 5, // Narrow columns for "visual" look
    }));

    sheetEvolution.columns = [
        { header: 'PERIODO', key: 'period', width: 15 },
        ...habitColumns
    ];

    // Rotate Habit Headers for compactness
    const headerRow = sheetEvolution.getRow(1);
    headerRow.height = 120; // Tall header
    headerRow.alignment = { textRotation: 90, vertical: 'bottom', horizontal: 'center' };
    headerRow.font = { bold: true };

    // 2. Data Rows
    const distinctPeriods = Array.from(new Set(logs.map(l => l.periodIdentifier))).sort().reverse();
    const periodMap = new Map<string, any>(); // Period -> { period: string, habitId: status }

    // Init rows
    distinctPeriods.forEach(p => periodMap.set(p, { period: p }));

    // Fill data
    logs.forEach(log => {
        const rowData = periodMap.get(log.periodIdentifier);
        if (rowData) {
            rowData[log.assignmentId] = log.status;
        }
    });

    // Add Rows
    distinctPeriods.forEach(p => {
        sheetEvolution.addRow(periodMap.get(p));
    });

    // 3. CONDITIONAL FORMATTING (Visual Traffic Light)
    // ExcelJS iterate rows to apply styles
    sheetEvolution.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        row.eachCell((cell, colNumber) => {
            if (colNumber === 1) return; // Skip Period Column

            const val = cell.value;
            let color = '';

            if (val === 'VERDE') color = 'FF4ADE80'; // Green 400
            else if (val === 'AMARILLA') color = 'FFFACC15'; // Yellow 400
            else if (val === 'ROJA') color = 'FFF87171'; // Red 400
            else if (val === 'NEGRA' || val === null) color = 'FFE5E7EB'; // Gray 200

            if (color) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: color }
                };
                // Hide text for purely visual look? Or keep it for accessibility? 
                // Let's keep text but make it small/transparent if requested visually, 
                // but usually seeing text "VERDE" helps if printing B&W.
                // Let's center it.
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
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
