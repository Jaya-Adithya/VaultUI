import { handlers } from "@/auth";
import { NextRequest } from "next/server";

// Use Node.js runtime so Prisma adapter and DB work on Vercel (Edge can break DB connection)
export const runtime = "nodejs";

// Wrap handlers with logging for debugging
export async function GET(request: NextRequest) {
    console.log("[Auth GET]", request.nextUrl.pathname, request.nextUrl.search);
    try {
        return await handlers.GET(request);
    } catch (error) {
        console.error("[Auth GET Error]", error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    console.log("[Auth POST]", request.nextUrl.pathname);
    try {
        return await handlers.POST(request);
    } catch (error) {
        console.error("[Auth POST Error]", error);
        throw error;
    }
}




