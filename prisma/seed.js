const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEMO_ADMIN_PASSWORD || "demo-password";
  const username = process.env.DEMO_ADMIN_USERNAME || "demo-admin";

  await prisma.placeTag.deleteMany();
  await prisma.place.deleteMany();
  await prisma.guideStep.deleteMany();
  await prisma.category.deleteMany();
  await prisma.adminUser.deleteMany();

  const admin = await prisma.adminUser.create({
    data: {
      username,
      fullName: "TSU Demo Admin",
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin"
    }
  });

  const categoryDefinitions = [
    () => ({
        name: "Academic",
        slug: "academic",
        description: "Teaching, learning, and study locations in the demo layout.",
        accent: "#7dd3fc"
    }),
    () => ({
        name: "Hostel",
        slug: "hostel",
        description: "Demo student accommodation points.",
        accent: "#fda4af"
    }),
    () => ({
        name: "Food",
        slug: "food",
        description: "Demo food and refreshment points.",
        accent: "#fbbf24"
    }),
    () => ({
        name: "Health",
        slug: "health",
        description: "Demo wellness and clinic support points.",
        accent: "#34d399"
    }),
    () => ({
        name: "Admin",
        slug: "admin",
        description: "Demo administrative offices and service desks.",
        accent: "#c084fc"
    }),
    () => ({
        name: "Transport",
        slug: "transport",
        description: "Demo entry and transport pickup points.",
        accent: "#60a5fa"
    }),
    () => ({
        name: "Security",
        slug: "security",
        description: "Demo campus safety points.",
        accent: "#fb7185"
    }),
    () => ({
        name: "Support",
        slug: "support",
        description: "Demo student support services.",
        accent: "#a78bfa"
    })
  ];
  const categories = [];
  for (const data of categoryDefinitions) {
    categories.push(await prisma.category.create({ data: data() }));
  }

  const bySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

  const places = [
    {
      slug: "demo-main-gate",
      name: "Demo Main Gate",
      shortDescription: "Primary entry point in the placeholder campus layout.",
      longDescription:
        "This is a clearly labeled demo entry point used to anchor the map navigation experience. Replace it with a verified TSU gate location after campus surveying.",
      categoryId: bySlug.transport.id,
      isFeatured: true,
      mapX: 190,
      mapY: 850,
      openingHours: "24/7 demo placeholder",
      accessibilityNotes: "Flat approach in the schematic layout.",
      routeHint: "Use this as the default starting point for demo routes.",
      contactNote: "Verified gate details still needed.",
      sortOrder: 1,
      tags: ["entry", "pickup", "demo"]
    },
    {
      slug: "demo-student-hub",
      name: "Demo Student Hub",
      shortDescription: "Student-facing help desk and information center placeholder.",
      longDescription:
        "A flexible support location for orientation, quick questions, and service referrals. The content is demo-only and intentionally generic.",
      categoryId: bySlug.support.id,
      mapX: 560,
      mapY: 320,
      openingHours: "Weekdays, demo hours",
      accessibilityNotes: "Accessible entrance is a placeholder note.",
      routeHint: "A common first stop for new students in the demo workflow.",
      contactNote: "Replace with real student affairs guidance.",
      sortOrder: 2,
      tags: ["help", "orientation", "support"]
    },
    {
      slug: "demo-library",
      name: "Demo Library",
      shortDescription: "Quiet study zone for reading and coursework.",
      longDescription:
        "This demo library point represents where a verified library location could appear. The app should be updated with real TSU data before external release.",
      categoryId: bySlug.academic.id,
      isFeatured: true,
      mapX: 780,
      mapY: 260,
      openingHours: "Demo study hours",
      accessibilityNotes: "Library entrance and ramps are placeholder notes.",
      routeHint: "Useful for research, group work, and quiet study.",
      contactNote: "Add real opening hours and floor details later.",
      sortOrder: 3,
      tags: ["study", "books", "quiet"]
    },
    {
      slug: "demo-lecture-block-a",
      name: "Demo Lecture Block A",
      shortDescription: "Sample academic block for classes and tutorials.",
      longDescription:
        "This placeholder building shows how lecture halls can be surfaced in the map. It is not a verified TSU room list.",
      categoryId: bySlug.academic.id,
      mapX: 1040,
      mapY: 440,
      openingHours: "Weekday timetable placeholder",
      accessibilityNotes: "Stairs and accessible route both marked as demo only.",
      routeHint: "A likely destination after finding your department.",
      contactNote: "Verify room numbers before launch.",
      sortOrder: 4,
      tags: ["classes", "tutorials", "rooms"]
    },
    {
      slug: "demo-ict-center",
      name: "Demo ICT Center",
      shortDescription: "Technology and account support placeholder.",
      longDescription:
        "A generic location for login help, registration support, and digital services. This exists to demonstrate scalable location handling.",
      categoryId: bySlug.support.id,
      mapX: 950,
      mapY: 180,
      openingHours: "Demo weekday hours",
      accessibilityNotes: "Support desk access is a placeholder.",
      routeHint: "Helpful if a new student needs digital onboarding support.",
      contactNote: "Link to real ICT contacts later.",
      sortOrder: 5,
      tags: ["wifi", "accounts", "tech"]
    },
    {
      slug: "demo-health-centre",
      name: "Demo Health Centre",
      shortDescription: "Basic wellness and first-aid support placeholder.",
      longDescription:
        "The health center point is intentionally generic until real campus medical information is verified and approved.",
      categoryId: bySlug.health.id,
      mapX: 350,
      mapY: 650,
      openingHours: "Demo clinic hours",
      accessibilityNotes: "Short route from the demo hostel cluster.",
      routeHint: "Important for emergency preparedness and routine checks.",
      contactNote: "Add verified clinic phone numbers later.",
      sortOrder: 6,
      tags: ["clinic", "first aid", "wellness"]
    },
    {
      slug: "demo-cafeteria-row",
      name: "Demo Cafeteria Row",
      shortDescription: "Food stalls and meal stops in the placeholder layout.",
      longDescription:
        "Use this demo zone to show food options, pricing notes, and closing times once verified TSU vendor data is available.",
      categoryId: bySlug.food.id,
      mapX: 840,
      mapY: 700,
      openingHours: "Demo lunch and dinner windows",
      accessibilityNotes: "Seating access is only illustrative.",
      routeHint: "A practical stop between lectures and hostel return.",
      contactNote: "Add vendor-specific info later.",
      sortOrder: 7,
      tags: ["food", "snacks", "canteen"]
    },
    {
      slug: "demo-hostel-north",
      name: "Demo Hostel North",
      shortDescription: "Placeholder accommodation for the schematic campus layout.",
      longDescription:
        "This is a generic student residence marker used to demonstrate hostel search and route focus without inventing real TSU housing facts.",
      categoryId: bySlug.hostel.id,
      mapX: 260,
      mapY: 250,
      openingHours: "Residential access placeholder",
      accessibilityNotes: "Entry paths are schematic only.",
      routeHint: "A common first stop for residents returning to campus.",
      contactNote: "Replace with verified hostel names and rules.",
      sortOrder: 8,
      tags: ["residence", "rooms", "students"]
    },
    {
      slug: "demo-security-post",
      name: "Demo Security Post",
      shortDescription: "Campus safety contact point in the demo map.",
      longDescription:
        "This sample security point shows how emergency or safety services can be presented in the guide.",
      categoryId: bySlug.security.id,
      mapX: 180,
      mapY: 720,
      openingHours: "24/7 demo security access",
      accessibilityNotes: "Emergency route is schematic.",
      routeHint: "Useful when learning important support points on arrival.",
      contactNote: "Add verified emergency numbers later.",
      sortOrder: 9,
      tags: ["safety", "help", "emergency"]
    }
  ];

  for (const place of places) {
    await prisma.place.create({
      data: {
        slug: place.slug,
        name: place.name,
        shortDescription: place.shortDescription,
        longDescription: place.longDescription,
        categoryId: place.categoryId,
        isFeatured: place.isFeatured ?? false,
        isPlaceholder: true,
        mapX: place.mapX,
        mapY: place.mapY,
        openingHours: place.openingHours,
        accessibilityNotes: place.accessibilityNotes,
        routeHint: place.routeHint,
        contactNote: place.contactNote,
        sortOrder: place.sortOrder,
        tags: {
          createMany: {
            data: place.tags.map((label) => ({ label }))
          }
        }
      }
    });
  }

  const guideSteps = [
    {
      title: "Confirm your first destination",
      description:
        "Start with one verified stop such as your faculty, hostel, or support office before trying to memorize the whole campus.",
      icon: "1",
      audience: "new-student",
      order: 1
    },
    {
      title: "Save your frequent routes",
      description:
        "Keep a shortlist of the routes you repeat most often so you can move around campus confidently during your first week.",
      icon: "2",
      audience: "new-student",
      order: 2
    },
    {
      title: "Check service points early",
      description:
        "Locate the library, health support, and student services ahead of time so you know where to go when you need help.",
      icon: "3",
      audience: "new-student",
      order: 3
    },
    {
      title: "Keep a backup offline copy",
      description:
        "Download or screenshot the guide for times when data is weak or you are moving around the campus without a signal.",
      icon: "4",
      audience: "new-student",
      order: 4
    },
    {
      title: "Report missing facts",
      description:
        "Treat this guide as a living resource. Any unverified item should be replaced with a checked campus record before public release.",
      icon: "5",
      audience: "new-student",
      order: 5
    }
  ];

  for (const step of guideSteps) {
    await prisma.guideStep.create({
      data: {
        ...step,
        isPlaceholder: true
      }
    });
  }

  console.log(`Seeded demo data for ${admin.username} and ${places.length} places.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
