import { handlers } from "@/auth";

// Use Node.js runtime so Prisma adapter and DB work on Vercel (Edge can break DB connection)
export const runtime = "nodejs";

export const { GET, POST } = handlers;




