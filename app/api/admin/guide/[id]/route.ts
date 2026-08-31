import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/auth";
import { guideInputSchema } from "@/lib/validators";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: Params) {
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

  await prisma.guideStep.update({
    where: {
      id: params.id
    },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      icon: parsed.data.icon,
      audience: parsed.data.audience,
      order: parsed.data.order,
      isPlaceholder: parsed.data.isPlaceholder
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAdminSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await prisma.guideStep.delete({
    where: {
      id: params.id
    }
  });

  return NextResponse.json({ ok: true });
}

