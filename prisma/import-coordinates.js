const { PrismaClient } = require("@prisma/client");

// Use the direct Supabase connection for this one-time bulk update.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } }
});

const locations = [
  ["Faculty of Health Sciences", 8.895008, 11.311243, "academic"],
  ["Agric Hostel", 8.896933, 11.312195, "hostel"],
  ["Senate Building", 8.897644, 11.314079, "admin"],
  ["Clinic", 8.898407, 11.314517, "health"],
  ["LT1 E", 8.898446, 11.316234, "academic"],
  ["ICT", 8.899836, 11.315928, "support"],
  ["Faculty of Sciences", 8.899714, 11.316974, "academic"],
  ["LT1C LT1D", 8.900256, 11.316545, "academic"],
  ["Laboratory Complex", 8.902428, 11.316496, "academic"],
  ["Sports Complex", 8.901147, 11.314050, "support"],
  ["Second Gate", 8.903538, 11.314633, "transport"],
  ["First Gate", 8.905189, 11.314930, "transport"],
  ["JJT Hostel", 8.903598, 11.315715, "hostel"],
  ["Undergraduate Hostel", 8.903095, 11.316284, "hostel"]
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  await prisma.place.deleteMany({ where: { isPlaceholder: true } });
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category.id]));

  for (const [name, latitude, longitude, categorySlug] of locations) {
    const slug = slugify(name);
    const categoryId = categoryBySlug[categorySlug];
    if (!categoryId) throw new Error(`Missing category: ${categorySlug}`);

    const existing = await prisma.place.findFirst({ where: { OR: [{ slug }, { name }] } });
    const data = {
      name,
      categoryId,
      latitude,
      longitude,
      isPlaceholder: false
    };
    if (existing) {
      await prisma.place.update({ where: { id: existing.id }, data });
    } else {
      await prisma.place.create({
        data: {
        slug,
        name,
        shortDescription: "Campus location added from verified coordinates.",
        longDescription: "Location record supplied for the TSU Campus Guide. Additional details can be completed in Admin.",
        categoryId,
        isPlaceholder: false,
        mapX: 0,
        mapY: 0,
        latitude,
        longitude,
        sortOrder: 10,
        tags: { create: [{ label: "campus" }] }
        }
      });
    }
  }

  console.log(`Imported ${locations.length} campus coordinates without deleting existing records.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
