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
  places: [
    {
      id: "place-faculty-of-health-sciences",
      slug: "faculty-of-health-sciences",
      name: "Faculty of Health Sciences",
      shortDescription: "Faculty of Health Sciences at Taraba State University.",
      longDescription: "Faculty of Health Sciences campus location.",
      categoryId: "cat-academic",
      categoryName: "Academic",
      categorySlug: "academic",
      categoryAccent: "#7dd3fc",
      isFeatured: true,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.895008,
      longitude: 11.311243,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["academic", "campus"],
      sortOrder: 1
    },
    {
      id: "place-agric-hostel",
      slug: "agric-hostel",
      name: "Agric Hostel",
      shortDescription: "Agric Hostel at Taraba State University.",
      longDescription: "Agric Hostel campus location.",
      categoryId: "cat-hostel",
      categoryName: "Hostel",
      categorySlug: "hostel",
      categoryAccent: "#fda4af",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.896933,
      longitude: 11.312195,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["hostel", "campus"],
      sortOrder: 2
    },
    {
      id: "place-senate-building",
      slug: "senate-building",
      name: "Senate Building",
      shortDescription: "Senate Building at Taraba State University.",
      longDescription: "Senate Building campus location.",
      categoryId: "cat-admin",
      categoryName: "Admin",
      categorySlug: "admin",
      categoryAccent: "#cbd5e1",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.897644,
      longitude: 11.314079,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["admin", "campus"],
      sortOrder: 3
    },
    {
      id: "place-clinic",
      slug: "clinic",
      name: "Clinic",
      shortDescription: "Clinic at Taraba State University.",
      longDescription: "Clinic campus location.",
      categoryId: "cat-health",
      categoryName: "Health",
      categorySlug: "health",
      categoryAccent: "#34d399",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.898407,
      longitude: 11.314517,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["health", "campus"],
      sortOrder: 4
    },
    {
      id: "place-lt1-e",
      slug: "lt1-e",
      name: "LT1 E",
      shortDescription: "LT1 E at Taraba State University.",
      longDescription: "LT1 E campus location.",
      categoryId: "cat-academic",
      categoryName: "Academic",
      categorySlug: "academic",
      categoryAccent: "#7dd3fc",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.898446,
      longitude: 11.316234,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["academic", "campus"],
      sortOrder: 5
    },
    {
      id: "place-ict",
      slug: "ict",
      name: "ICT",
      shortDescription: "ICT at Taraba State University.",
      longDescription: "ICT campus location.",
      categoryId: "cat-support",
      categoryName: "Support",
      categorySlug: "support",
      categoryAccent: "#fbbf24",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.899836,
      longitude: 11.315928,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["support", "campus"],
      sortOrder: 6
    },
    {
      id: "place-faculty-of-sciences",
      slug: "faculty-of-sciences",
      name: "Faculty of Sciences",
      shortDescription: "Faculty of Sciences at Taraba State University.",
      longDescription: "Faculty of Sciences campus location.",
      categoryId: "cat-academic",
      categoryName: "Academic",
      categorySlug: "academic",
      categoryAccent: "#7dd3fc",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.899714,
      longitude: 11.316974,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["academic", "campus"],
      sortOrder: 7
    },
    {
      id: "place-lt1c-lt1d",
      slug: "lt1c-lt1d",
      name: "LT1C LT1D",
      shortDescription: "LT1C LT1D at Taraba State University.",
      longDescription: "LT1C LT1D campus location.",
      categoryId: "cat-academic",
      categoryName: "Academic",
      categorySlug: "academic",
      categoryAccent: "#7dd3fc",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.900256,
      longitude: 11.316545,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["academic", "campus"],
      sortOrder: 8
    },
    {
      id: "place-laboratory-complex",
      slug: "laboratory-complex",
      name: "Laboratory Complex",
      shortDescription: "Laboratory Complex at Taraba State University.",
      longDescription: "Laboratory Complex campus location.",
      categoryId: "cat-academic",
      categoryName: "Academic",
      categorySlug: "academic",
      categoryAccent: "#7dd3fc",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.902428,
      longitude: 11.316496,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["academic", "campus"],
      sortOrder: 9
    },
    {
      id: "place-sports-complex",
      slug: "sports-complex",
      name: "Sports Complex",
      shortDescription: "Sports Complex at Taraba State University.",
      longDescription: "Sports Complex campus location.",
      categoryId: "cat-support",
      categoryName: "Support",
      categorySlug: "support",
      categoryAccent: "#fbbf24",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.901147,
      longitude: 11.31405,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["support", "campus"],
      sortOrder: 10
    },
    {
      id: "place-second-gate",
      slug: "second-gate",
      name: "Second Gate",
      shortDescription: "Second Gate at Taraba State University.",
      longDescription: "Second Gate campus location.",
      categoryId: "cat-transport",
      categoryName: "Transport",
      categorySlug: "transport",
      categoryAccent: "#a78bfa",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.903538,
      longitude: 11.314633,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["transport", "campus"],
      sortOrder: 11
    },
    {
      id: "place-first-gate",
      slug: "first-gate",
      name: "First Gate",
      shortDescription: "First Gate at Taraba State University.",
      longDescription: "First Gate campus location.",
      categoryId: "cat-transport",
      categoryName: "Transport",
      categorySlug: "transport",
      categoryAccent: "#a78bfa",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.905189,
      longitude: 11.31493,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["transport", "campus"],
      sortOrder: 12
    },
    {
      id: "place-jjt-hostel",
      slug: "jjt-hostel",
      name: "JJT Hostel",
      shortDescription: "JJT Hostel at Taraba State University.",
      longDescription: "JJT Hostel campus location.",
      categoryId: "cat-hostel",
      categoryName: "Hostel",
      categorySlug: "hostel",
      categoryAccent: "#fda4af",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.903598,
      longitude: 11.315715,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["hostel", "campus"],
      sortOrder: 13
    },
    {
      id: "place-undergraduate-hostel",
      slug: "undergraduate-hostel",
      name: "Undergraduate Hostel",
      shortDescription: "Undergraduate Hostel at Taraba State University.",
      longDescription: "Undergraduate Hostel campus location.",
      categoryId: "cat-hostel",
      categoryName: "Hostel",
      categorySlug: "hostel",
      categoryAccent: "#fda4af",
      isFeatured: false,
      isPlaceholder: false,
      mapX: 0,
      mapY: 0,
      latitude: 8.903095,
      longitude: 11.316284,
      openingHours: "8:00 AM - 6:00 PM",
      accessibilityNotes: "Ground floor access",
      routeHint: "Follow campus walkway",
      contactNote: null,
      tags: ["hostel", "campus"],
      sortOrder: 14
    }
  ],
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
