import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

export const userRouter = createTRPCRouter({
    getAll: protectedProcedure
        .query(async ({ ctx }) => {
            // Check if the user is a superadmin using the session role
            if (ctx.session.user.role !== "superadmin") {
                throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view users" });
            }

            return ctx.db.user.findMany({
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    createdAt: true,
                }
            });
        }),

    setRole: protectedProcedure
        .input(z.object({
            userId: z.string(),
            role: z.enum(["user", "developer", "superadmin"]),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if the user is a superadmin
            if (ctx.session.user.role !== "superadmin") {
                throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to manage roles" });
            }

            // Prevent changing your own role (optional safety)
            if (ctx.session.user.id === input.userId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own role" });
            }

            return ctx.db.user.update({
                where: { id: input.userId },
                data: { role: input.role },
            });
        }),

    createUser: protectedProcedure
        .input(z.object({
            email: z.string().email(),
            name: z.string().min(1),
            password: z.string().min(8),
            role: z.enum(["user", "developer", "superadmin"]).default("user"),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if the user is a superadmin
            if (ctx.session.user.role !== "superadmin") {
                throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to create users" });
            }

            // Validate email domain
            if (!input.email.endsWith("@position2.com")) {
                throw new TRPCError({ 
                    code: "BAD_REQUEST", 
                    message: "Email must be from @position2.com domain" 
                });
            }

            // Check if user already exists
            const existingUser = await ctx.db.user.findUnique({
                where: { email: input.email },
            });

            if (existingUser) {
                throw new TRPCError({ 
                    code: "CONFLICT", 
                    message: "User with this email already exists" 
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(input.password, 10);

            // Create user
            const newUser = await ctx.db.user.create({
                data: {
                    email: input.email,
                    name: input.name,
                    password: hashedPassword,
                    role: input.role,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    createdAt: true,
                },
            });

            return newUser;
        }),

    getProfileStats: protectedProcedure
        .query(async ({ ctx }) => {
            const memberSince = ctx.session.user.id
                ? (await ctx.db.user.findUnique({ where: { id: ctx.session.user.id }, select: { createdAt: true } }))?.createdAt
                : new Date();

            return {
                componentCount: 0,
                collectionCount: 0,
                memberSince: memberSince || new Date(),
            };
        }),
});
