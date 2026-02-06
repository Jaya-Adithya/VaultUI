import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

// Schema for a single file
const fileSchema = z.object({
  filename: z.string().min(1),
  language: z.string(),
  code: z.string(),
  order: z.number().default(0),
});

export const versionRouter = createTRPCRouter({
  add: protectedProcedure
    .input(
      z.object({
        componentId: z.string(),
        files: z.array(fileSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the latest version number
      const latestVersion = await ctx.db.componentVersion.findFirst({
        where: { componentId: input.componentId },
        orderBy: { version: "desc" },
      });

      const newVersionNumber = (latestVersion?.version ?? 0) + 1;

      // Create new version with files
      const version = await ctx.db.componentVersion.create({
        data: {
          componentId: input.componentId,
          version: newVersionNumber,
          files: {
            create: input.files.map((file, index) => ({
              filename: file.filename,
              language: file.language,
              code: file.code,
              order: file.order ?? index,
            })),
          },
        },
        include: {
          files: {
            orderBy: { order: "asc" },
          },
        },
      });

      // Update component's updatedAt
      await ctx.db.component.update({
        where: { id: input.componentId },
        data: { updatedAt: new Date() },
      });

      return version;
    }),

  list: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const versions = await ctx.db.componentVersion.findMany({
      where: { componentId: input },
      orderBy: { version: "desc" },
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    return versions;
  }),

  getById: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const version = await ctx.db.componentVersion.findUnique({
      where: { id: input },
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    return version;
  }),

  getLatest: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const version = await ctx.db.componentVersion.findFirst({
      where: { componentId: input },
      orderBy: { version: "desc" },
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    return version;
  }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const isDev = process.env.NODE_ENV === "development";
    try {
      const version = await ctx.db.componentVersion.findUnique({
        where: { id: input },
        include: {
          component: {
            include: {
              versions: { orderBy: { version: "asc" } },
            },
          },
        },
      });

      if (!version) {
        if (isDev) console.error("[Version Delete] Version not found:", input);
        throw new Error("Version not found");
      }

      if (version.component.versions.length === 1) {
        if (isDev) console.error("[Version Delete] Cannot delete the only version");
        throw new Error("Cannot delete the only version of a component");
      }

      const componentId = version.componentId;

      await ctx.db.$transaction(async (tx) => {
        await tx.componentVersion.delete({ where: { id: input } });
        const remainingVersions = await tx.componentVersion.findMany({
          where: { componentId },
          orderBy: { version: "asc" },
        });
        for (let i = 0; i < remainingVersions.length; i++) {
          const currentVersion = remainingVersions[i]!;
          const newVersionNumber = i + 1;
          if (currentVersion.version !== newVersionNumber) {
            await tx.componentVersion.update({
              where: { id: currentVersion.id },
              data: { version: newVersionNumber },
            });
          }
        }
        await tx.component.update({
          where: { id: componentId },
          data: { updatedAt: new Date() },
        });
      });

      return { success: true };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Version Delete] Error:", error instanceof Error ? error.message : error);
      }
      throw error;
    }
  }),
});
