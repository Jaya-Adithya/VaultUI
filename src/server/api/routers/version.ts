import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Schema for a single file
const fileSchema = z.object({
  filename: z.string().min(1),
  language: z.string(),
  code: z.string(),
  order: z.number().default(0),
});

export const versionRouter = createTRPCRouter({
  add: publicProcedure
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

  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // Get the version to check if it's the only one
    const version = await ctx.db.componentVersion.findUnique({
      where: { id: input },
      include: {
        component: {
          include: {
            versions: {
              orderBy: { version: "asc" },
            },
          },
        },
      },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    // Don't allow deleting if it's the only version
    if (version.component.versions.length === 1) {
      throw new Error("Cannot delete the only version of a component");
    }

    const componentId = version.componentId;

    // Perform deletion and renumbering in a transaction
    await ctx.db.$transaction(async (tx) => {
      // Delete the version (files will be cascade deleted)
      await tx.componentVersion.delete({
        where: { id: input },
      });

      // Renumber all remaining versions starting from 1
      // Get all remaining versions ordered by their current version number
      const remainingVersions = await tx.componentVersion.findMany({
        where: { componentId },
        orderBy: { version: "asc" },
      });

      // Update each version to have sequential numbers starting from 1
      for (let i = 0; i < remainingVersions.length; i++) {
        const newVersionNumber = i + 1;
        if (remainingVersions[i]!.version !== newVersionNumber) {
          await tx.componentVersion.update({
            where: { id: remainingVersions[i]!.id },
            data: { version: newVersionNumber },
          });
        }
      }

      // Update component's updatedAt
      await tx.component.update({
        where: { id: componentId },
        data: { updatedAt: new Date() },
      });
    });

    return { success: true };
  }),
});
