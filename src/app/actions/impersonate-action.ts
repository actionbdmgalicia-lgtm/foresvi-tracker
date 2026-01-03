"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "foresvi_session_user";
const IMPERSONATOR_COOKIE = "foresvi_impersonator_id";

export async function impersonateUser(userId: string) {
    if (!userId) return;

    const cookieStore = await cookies();
    const currentAdminId = cookieStore.get(COOKIE_NAME)?.value;

    if (currentAdminId) {
        // Save the admin ID into a separate cookie so we can restore it later
        cookieStore.set(IMPERSONATOR_COOKIE, currentAdminId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/"
        });
    }

    // Overwrite the main session to "become" the user
    cookieStore.set(COOKIE_NAME, userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/"
    });

    redirect("/");
}

export async function stopImpersonating() {
    const cookieStore = await cookies();
    const originalAdminId = cookieStore.get(IMPERSONATOR_COOKIE)?.value;

    if (originalAdminId) {
        // Restore Admin Session
        cookieStore.set(COOKIE_NAME, originalAdminId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7,
            path: "/"
        });

        // Clean up
        cookieStore.delete(IMPERSONATOR_COOKIE);
    }

    redirect("/admin");
}
