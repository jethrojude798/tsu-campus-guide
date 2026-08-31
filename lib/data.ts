import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type PlainCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
};

type PlainPlace = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryAccent: string;
  isFeatured: boolean;
  isPlaceholder: boolean;
  mapX: number;
  mapY: number;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  accessibilityNotes: string | null;
  routeHint: string | null;
  contactNote: string | null;
  tags: string[];
  sortOrder: number;
};

type PlainGuideStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  audience: string;
  isPlaceholder: boolean;
};

type CampusStats = {
  placeCount: number;
  categoryCount: number;
  guideStepCount: number;
  placeholderShare: number;
};

const fallbackData = {
  categories: [
    { id: "demo-academic", name: "Academic", slug: "academic", description: "Demo learning locations.", accent: "#b8d5b5" },
    { id: "demo-support", name: "Support", slug: "support", description: "Demo student services.", accent: "#e5ad54" },
    { id: "demo-food", name: "Food", slug: "food", description: "Demo food locations.", accent: "#f0c58e" },
    { id: "demo-health", name: "Health", slug: "health", description: "Demo health support.", accent: "#d77c5e" }
  ],
  places: [],
  guideSteps: [
    { id: "guide-1", title: "Choose one first stop", description: "Start with your faculty, support office, or accommodation point instead of trying to learn everything at once.", icon: "1", order: 1, audience: "new-student", isPlaceholder: true },
    { id: "guide-2", title: "Save your regular places", description: "Build a short list of the locations you will return to most during your first week.", icon: "2", order: 2, audience: "new-student", isPlaceholder: true },
    { id: "guide-3", title: "Find help before you need it", description: "Locate health, safety, library, and student support points early.", icon: "3", order: 3, audience: "new-student", isPlaceholder: true },
    { id: "guide-4", title: "Keep a backup copy", description: "Save the guide for moments when your mobile connection is weak.", icon: "4", order: 4, audience: "new-student", isPlaceholder: true }
  ],
  stats: { placeCount: 0, categoryCount: 4, guideStepCount: 4, placeholderShare: 0 }
};

type PlaceWithRelations = Prisma.PlaceGetPayload<{ include: { category: true; tags: true } }>;
type GuideStepRecord = Prisma.GuideStepGetPayload<{}>;
type CategoryRecord = Prisma.CategoryGetPayload<{}>;

function toPlainPlace(place: PlaceWithRelations): PlainPlace {
  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    shortDescription: place.shortDescription,
    longDescription: place.longDescription,
    categoryId: place.categoryId,
    categoryName: place.category.name,
    categorySlug: place.category.slug,
    categoryAccent: place.category.accent,
    isFeatured: place.isFeatured,
    isPlaceholder: place.isPlaceholder,
    mapX: place.mapX,
    mapY: place.mapY,
    latitude: place.latitude,
    longitude: place.longitude,
    openingHours: place.openingHours,
    accessibilityNotes: place.accessibilityNotes,
    routeHint: place.routeHint,
    contactNote: place.contactNote,
    tags: place.tags.map((tag) => tag.label),
    sortOrder: place.sortOrder
  };
}

function toPlainGuideStep(step: GuideStepRecord): PlainGuideStep {
  return {
    id: step.id,
    title: step.title,
    description: step.description,
    icon: step.icon,
    order: step.order,
    audience: step.audience,
    isPlaceholder: step.isPlaceholder
  };
}

function toPlainCategory(category: CategoryRecord): PlainCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    accent: category.accent
  };
}

export async function getPublicCampusData() {
  try {
    const [categories, places, guideSteps, counts] = await Promise.all([
    prisma.category.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.place.findMany({
      include: {
        category: true,
        tags: true
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.guideStep.findMany({
      orderBy: [{ order: "asc" }, { title: "asc" }]
    }),
    prisma.place.count()
  ]);

  const placeholderCount = places.filter((place) => place.isPlaceholder).length;

    return {
    categories: categories.map(toPlainCategory),
    places: places.map(toPlainPlace),
    guideSteps: guideSteps.map(toPlainGuideStep),
    stats: {
      placeCount: counts,
      categoryCount: categories.length,
      guideStepCount: guideSteps.length,
      placeholderShare: counts > 0 ? Math.round((placeholderCount / counts) * 100) : 0
    }
    };
  } catch {
    return fallbackData;
  }
}

export async function getAdminCampusData() {
  const [publicData] = await Promise.all([getPublicCampusData()]);
  return publicData;
}

export async function getAdminUsers() {
  try {
    return await prisma.adminUser.findMany({
      select: { id: true, username: true, fullName: true, role: true },
      orderBy: { username: "asc" }
    });
  } catch {
    return [];
  }
}
