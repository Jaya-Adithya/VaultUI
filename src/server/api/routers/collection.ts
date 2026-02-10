import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const collectionRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(), // Make slug optional, generate if missing
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-generate slug if not provided
      const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 7);

      const collection = await ctx.db.collection.create({
        data: {
          name: input.name,
          slug: slug,
          parentId: input.parentId,
        },
      });

      return collection;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    const collections = await ctx.db.collection.findMany({
      orderBy: { name: "asc" },
    });

    // Calculate count of non-deleted components for each collection
    const collectionsWithCount = await Promise.all(
      collections.map(async (collection) => {
        const nonDeletedCount = await ctx.db.componentCollection.count({
          where: {
            collectionId: collection.id,
            component: {
              deletedAt: null,
            },
          },
        });

        return {
          ...collection,
          _count: {
            components: nonDeletedCount,
          },
        };
      })
    );

    return collectionsWithCount;
  }),

  getBySlug: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const collection = await ctx.db.collection.findUnique({
      where: { slug: input },
      include: {
        components: {
          include: {
            component: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return collection;
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.update({
        where: { id: input.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.slug ? { slug: input.slug } : {}),
        },
      });

      return collection;
    }),

  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // First remove all component associations
    await ctx.db.componentCollection.deleteMany({
      where: { collectionId: input },
    });

    // Then delete the collection
    const collection = await ctx.db.collection.delete({
      where: { id: input },
    });

    return collection;
  }),

  addComponent: publicProcedure
    .input(
      z.object({
        collectionId: z.string(),
        componentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if component exists and is not deleted
      const component = await ctx.db.component.findUnique({
        where: { id: input.componentId },
        select: { id: true, deletedAt: true },
      });

      if (!component) {
        throw new Error("Component not found");
      }

      if (component.deletedAt !== null) {
        throw new Error("Cannot add deleted component to collection");
      }

      // Check if collection exists
      const collection = await ctx.db.collection.findUnique({
        where: { id: input.collectionId },
        select: { id: true },
      });

      if (!collection) {
        throw new Error("Collection not found");
      }

      // Check if the component is already in the collection
      const existingLink = await ctx.db.componentCollection.findUnique({
        where: {
          componentId_collectionId: {
            componentId: input.componentId,
            collectionId: input.collectionId,
          },
        },
      });

      if (existingLink) {
        // Already in collection, return the existing link
        return existingLink;
      }

      // Create the link
      const link = await ctx.db.componentCollection.create({
        data: {
          collectionId: input.collectionId,
          componentId: input.componentId,
        },
      });

      return link;
    }),

  removeComponent: publicProcedure
    .input(
      z.object({
        collectionId: z.string(),
        componentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.componentCollection.delete({
        where: {
          componentId_collectionId: {
            componentId: input.componentId,
            collectionId: input.collectionId,
          },
        },
      });

      return link;
    }),
});
