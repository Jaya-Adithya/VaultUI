import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { componentRouter } from "@/server/api/routers/component";
import { collectionRouter } from "@/server/api/routers/collection";
import { versionRouter } from "@/server/api/routers/version";

export const appRouter = createTRPCRouter({
  component: componentRouter,
  collection: collectionRouter,
  version: versionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
