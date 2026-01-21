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
});
