
import { PrismaClient, HabitTopic } from '@prisma/client'
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Map Spanish CSV topics to Enum
const TOPIC_MAP: Record<string, HabitTopic> = {
    'DESTINO': 'DESTINO',
    'DINERO': 'DINERO',
    'GESTION DEL TIEMPO': 'GESTION_DEL_TIEMPO',
    'GESTION_DEL_TIEMPO': 'GESTION_DEL_TIEMPO',
    'SERVICIO': 'SERVICIO',
    'MARKETING Y VENTAS': 'MARKETING_Y_VENTAS',
    'MARKETING_Y_VENTAS': 'MARKETING_Y_VENTAS',
    'SISTEMATIZACION': 'SISTEMATIZACION',
    'EQUIPO': 'EQUIPO',
    'SINERGIA': 'SINERGIA',
    'RESULTADOS': 'RESULTADOS',
    'SALUD': 'DESTINO',
    'NICHO (MKT Y VENTA)': 'MARKETING_Y_VENTAS',
    'SISTEMA': 'SISTEMATIZACION',
};

async function main() {
    console.log('🌱 Iniciando carga de datos...');

    // 1. Crear Empresa Default
    const foresvi = await prisma.company.upsert({
        where: { id: 'foresvi-hq' },
        update: {},
        create: {
            id: 'foresvi-hq',
            name: 'FORESVI HQ',
        },
    });
    console.log('✅ Empresa creada: FORESVI HQ');

    // 2. Crear Grupo Default "Directivos"
    const grupoDirectivos = await prisma.group.upsert({
        where: { id: 'grupo-directivos' },
        update: {},
        create: {
            id: 'grupo-directivos',
            name: 'Directivos',
            companyId: foresvi.id,
        },
    });
    console.log('✅ Grupo creado: Directivos');

    // 3. Crear Usuario Admin con Password Hasheada
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // NOTA: Para usuarios existentes, si queremos resetear su pass al hacer seed:
    // cambiar update: {} por update: { password: hashedPassword }
    const admin = await prisma.user.upsert({
        where: { email: 'juanrepresa@foresvi.com' },
        update: {
            password: hashedPassword,
            role: 'COMPANY_ADMIN' // Force Admin role update
        },
        create: {
            email: 'juanrepresa@foresvi.com',
            name: 'Juan Represa',
            password: hashedPassword,
            role: 'COMPANY_ADMIN',
            companyId: foresvi.id,
            groupId: grupoDirectivos.id,
        },
    });
    console.log('✅ Usuario Admin creado/actualizado: juanrepresa@foresvi.com (Pass: admin123)');

    // 3. Limpiar Hábitos Anteriores (Para evitar duplicados en re-seed)
    console.log('🧹 Limpiando hábitos antiguos...');

    // Clean dependent tables first
    await prisma.progressLog.deleteMany({});

    // Primero borramos asignaciones para no romper FK
    await prisma.assignment.deleteMany({});
    await prisma.habit.deleteMany({
        where: { companyId: foresvi.id }
    });

    // 4. Leer CSV
    const csvFilePath = path.join(__dirname, 'plantilla_habitos.csv');
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ';', // CHANGED to semicolon
    }) as any[];

    console.log(`📂 Leídos ${records.length} hábitos del CSV...`);

    for (const record of records) {
        // Topic is now a string, so we just take the CSV value directly
        // We can normalize it slightly (uppercase) but we don't need the enum map anymore
        const topicString = record.Tema.toUpperCase();

        await prisma.habit.create({
            data: {
                companyId: foresvi.id,
                topic: topicString,
                name: record.Nombre,
                cue: record.Señal,
                craving: record.Anhelo,
                response: record.Acción,
                reward: record.Recompensa,
            }
        });
    }

    console.log('✅ Hábitos importados correctamente.');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
