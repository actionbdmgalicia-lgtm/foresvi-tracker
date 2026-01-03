"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as bcrypt from 'bcryptjs';

const COOKIE_NAME = "foresvi_session_user";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email y contraseña requeridos" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return { error: "Credenciales inválidas" };
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return { error: "Credenciales inválidas" };
        }

        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/"
        });

    } catch (error) {
        console.error("Login error", error);
        return { error: "Error interno del servidor" };
    }

    redirect("/");
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    redirect("/login");
}

export async function getSessionUserId() {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    return cookie?.value || null;
}
