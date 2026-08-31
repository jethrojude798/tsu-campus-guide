import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/auth";
import { z } from "zod";

const adminInputSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters.").regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, underscores, or hyphens."),
  fullName: z.string().trim().min(2, "Full name is required."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export async function POST(request: Request) {
  const user = await getAdminSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = adminInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid admin details." }, { status: 400 });

  try {
    const admin = await prisma.adminUser.create({
      data: {
        username: parsed.data.username,
        fullName: parsed.data.fullName,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: "admin"
      },
      select: { id: true, username: true, fullName: true, role: true }
    });
    return NextResponse.json({ ok: true, admin });
  } catch (error) {
    console.error("Failed to create admin", error);
    return NextResponse.json({ error: "That username may already be in use." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAdminSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Admin id is required." }, { status: 400 });
  if (body.id === user.id) return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });

  await prisma.adminUser.delete({ where: { id: body.id } });
  return NextResponse.json({ ok: true });
}
