import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/auth";
import { guideInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getAdminSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = guideInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid guide data." },
      { status: 400 }
    );
  }

  const step = await prisma.guideStep.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      icon: parsed.data.icon,
      audience: parsed.data.audience,
      order: parsed.data.order,
      isPlaceholder: parsed.data.isPlaceholder
    }
  });

  return NextResponse.json({ ok: true, id: step.id });
}

