import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Check if any users exist
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    console.log("📋 No users found. Creating initial superadmin user...");
    
    // Create initial superadmin user
    // IMPORTANT: Change this password after first login!
    const defaultEmail = process.env.SEED_ADMIN_EMAIL || "admin@position2.com";
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@1234";
    const defaultName = process.env.SEED_ADMIN_NAME || "Admin";
    
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: defaultName,
        password: hashedPassword,
        role: "superadmin",
        emailVerified: new Date(),
      },
    });
    
    console.log(`✅ Created superadmin user: ${admin.email}`);
    console.log(`   ⚠️  Default password is set. Please change it after first login!`);
    return;
  }

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
