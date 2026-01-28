import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Schema for a single file
const fileSchema = z.object({
  filename: z.string().min(1),
  language: z.string(),
  code: z.string(),
  order: z.number().default(0),
});

export const componentRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        framework: z.string(),
        language: z.string(),
        files: z.array(fileSchema).min(1), // At least one file required
        isRenderable: z.boolean(),
        collectionIds: z.array(z.string()).optional(),
        packageInstallCommand: z.string().optional(),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const component = await ctx.db.component.create({
          data: {
            title: input.title,
            description: input.description,
            framework: input.framework,
            language: input.language,
            isRenderable: input.isRenderable,
            packageInstallCommand: input.packageInstallCommand,
            coverImage: input.coverImage,
            versions: {
              create: {
                version: 1,
                files: {
                  create: input.files.map((file, index) => ({
                    filename: file.filename,
                    language: file.language,
                    code: file.code,
                    order: file.order ?? index,
                  })),
                },
              },
            },
            ...(input.collectionIds && input.collectionIds.length > 0
              ? {
                collections: {
                  create: input.collectionIds.map((collectionId) => ({
                    collectionId,
                  })),
                },
              }
              : {}),
          } as any,
          include: {
            versions: {
              include: {
                files: {
                  orderBy: { order: "asc" },
                },
              },
            },
            collections: {
              include: {
                collection: true,
              },
            },
          },
        });

        return component;
      } catch (error) {
        console.error("Error creating component:", error);
        throw error;
      }
    }),

  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          framework: z.string().optional(),
          status: z.string().optional(),
          collectionId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const components = await ctx.db.component.findMany({
        where: {
          deletedAt: null,
          ...(input?.search
            ? {
              OR: [
                { title: { contains: input.search, mode: "insensitive" } },
                {
                  description: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
            : {}),
          ...(input?.framework ? { framework: input.framework } : {}),
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.collectionId
            ? {
              collections: {
                some: { collectionId: input.collectionId },
              },
            }
            : {}),
        },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              files: {
                orderBy: { order: "asc" },
              },
            },
          },
          collections: {
            include: {
              collection: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return components;
    }),

  getById: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const component = await ctx.db.component.findUnique({
      where: { id: input },
      include: {
        versions: {
          orderBy: { version: "desc" },
          include: {
            files: {
              orderBy: { order: "asc" },
            },
          },
        },
        collections: {
          include: {
            collection: true,
          },
        },
      },
    });

    return component;
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const component = await ctx.db.component.update({
          where: { id: input.id },
          data: {
            ...(input.title ? { title: input.title } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
          } as any,
        });

        return component;
      } catch (error) {
        console.error("Error updating component:", error);
        throw error;
      }
    }),

  softDelete: publicProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const component = await ctx.db.component.update({
        where: { id: input },
        data: { deletedAt: new Date() },
      });

      return component;
    }),

  restore: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const component = await ctx.db.component.update({
      where: { id: input },
      data: { deletedAt: null },
    });

    return component;
  }),
});
