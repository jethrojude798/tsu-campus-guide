import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/auth";
import { placeInputSchema, splitTags } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getAdminSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = placeInputSchema.safeParse({
    ...body,
    tags: Array.isArray(body?.tags) ? body.tags : splitTags(body?.tags)
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join(".") || "Form"}: ${issue?.message ?? "Invalid place data."}` },
      { status: 400 }
    );
  }

  try {
    const place = await prisma.place.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        shortDescription: parsed.data.shortDescription,
        longDescription: parsed.data.longDescription,
        categoryId: parsed.data.categoryId,
        mapX: parsed.data.mapX,
        mapY: parsed.data.mapY,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        openingHours: parsed.data.openingHours || null,
        accessibilityNotes: parsed.data.accessibilityNotes || null,
        routeHint: parsed.data.routeHint || null,
        contactNote: parsed.data.contactNote || null,
        isFeatured: parsed.data.isFeatured,
        isPlaceholder: parsed.data.isPlaceholder,
        sortOrder: parsed.data.sortOrder,
        tags: {
          createMany: {
            data: parsed.data.tags.map((label) => ({ label }))
          }
        }
      }
    });

    return NextResponse.json({ ok: true, id: place.id });
  } catch (error) {
    console.error("Failed to create place", error);
    const message = error instanceof Error ? error.message : "The location could not be saved.";
    const friendlyMessage = message.includes("Unique constraint")
      ? "That slug is already in use. Choose a different slug."
      : message.includes("Foreign key constraint")
        ? "Choose a valid category before saving."
        : "The location could not be saved. Check your database connection.";
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
