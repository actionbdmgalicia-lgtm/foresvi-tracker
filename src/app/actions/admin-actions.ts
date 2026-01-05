"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as bcrypt from 'bcryptjs';

export async function createGroup(formData: FormData) {
    const name = formData.get("name") as string;
    const companyId = "foresvi-hq"; // Hardcoded for now, ideally from session

    if (!name) return;

    await prisma.group.create({
        data: {
            name,
            companyId,
        },
    });

    revalidatePath("/admin/groups");
}


export async function deleteGroup(id: string) {
    await prisma.group.delete({
        where: { id }
    });
    revalidatePath("/admin/groups");
}

export async function createUser(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const groupId = formData.get("groupId") as string;
    const companyId = "foresvi-hq"; // Hardcoded

    if (!name || !email) return;

    // Beta: Default password for all new users is "foresvi2026"
    // TODO: In production, generate random token or require password set via email
    const hashedPassword = await bcrypt.hash("foresvi2026", 10);

    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            companyId,
            groupId: groupId || null,
            role: "USER"
        },
    });

    revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
    await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() }
    });
    revalidatePath("/admin/users");
}

export async function restoreUser(id: string) {
    await prisma.user.update({
        where: { id },
        data: { deletedAt: null }
    });
    revalidatePath("/admin/users");
}

export async function updateUserGroup(userId: string, groupId: string) {
    if (!userId) return;

    // Allow setting to null/unassigned if groupId is empty string
    const targetGroupId = groupId === "" || groupId === "unassigned" ? null : groupId;

    await prisma.user.update({
        where: { id: userId },
        data: { groupId: targetGroupId }
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
}
