import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const collectionRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await ctx.db.collection.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });

      return collection;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    const collections = await ctx.db.collection.findMany({
      include: {
        _count: {
          select: { components: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return collections;
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
