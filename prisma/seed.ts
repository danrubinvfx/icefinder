import { PrismaClient } from "@prisma/client";
import { FACILITIES } from "../src/lib/domain";

const prisma = new PrismaClient();

async function main() {
  for (const f of FACILITIES) {
    await prisma.facility.upsert({
      where: { slug: f.slug },
      update: {
        name: f.name,
        municipality: f.municipality,
        address: f.address,
        lat: f.lat,
        lng: f.lng,
        bookingPlatform: f.bookingPlatform,
      },
      create: {
        slug: f.slug,
        name: f.name,
        municipality: f.municipality,
        address: f.address,
        lat: f.lat,
        lng: f.lng,
        bookingPlatform: f.bookingPlatform,
      },
    });
  }
  console.log(`Seeded ${FACILITIES.length} Burnaby facilities.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
