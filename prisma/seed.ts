import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Find the first user (oldest user by creation date)
  const firstUser = await prisma.user.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!firstUser) {
    console.log("⚠️  No users found in database. Skipping seed.");
    return;
  }

  // Check if first user is already a superadmin
  if (firstUser.role === "superadmin") {
    console.log(`✅ User ${firstUser.email} is already a superadmin.`);
    return;
  }

  // Update first user to superadmin
  const updatedUser = await prisma.user.update({
    where: { id: firstUser.id },
    data: { role: "superadmin" },
  });

  console.log(`✅ Successfully set ${updatedUser.email} as superadmin.`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

