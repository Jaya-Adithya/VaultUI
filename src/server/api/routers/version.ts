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
    try {
      console.log("[Version Delete Server] ========== DELETE MUTATION CALLED ==========");
      console.log("[Version Delete Server] Input version ID:", input);
      console.log("[Version Delete Server] Input type:", typeof input);
      console.log("[Version Delete Server] Input length:", input?.length);
      
      // Get the version to check if it's the only one
      console.log("[Version Delete Server] Fetching version from database...");
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

      console.log("[Version Delete Server] Version query result:", version ? "Found" : "Not found");
      
      if (!version) {
        console.error("[Version Delete Server] ❌ Version not found for ID:", input);
        throw new Error("Version not found");
      }

      console.log("[Version Delete Server] ✅ Version found:");
      console.log("[Version Delete Server]   - Version ID:", version.id);
      console.log("[Version Delete Server]   - Version number:", version.version);
      console.log("[Version Delete Server]   - Component ID:", version.componentId);
      console.log("[Version Delete Server]   - Total versions:", version.component.versions.length);
      console.log("[Version Delete Server]   - All version numbers:", version.component.versions.map(v => v.version));

      // Don't allow deleting if it's the only version
      if (version.component.versions.length === 1) {
        console.error("[Version Delete Server] ❌ Cannot delete the only version");
        throw new Error("Cannot delete the only version of a component");
      }

      const componentId = version.componentId;
      console.log("[Version Delete Server] Starting transaction for component:", componentId);

      // Perform deletion and renumbering in a transaction
      await ctx.db.$transaction(async (tx) => {
        console.log("[Version Delete Server] [Transaction] Deleting version:", input);
        
        // Delete the version (files will be cascade deleted)
        const deleteResult = await tx.componentVersion.delete({
          where: { id: input },
        });
        console.log("[Version Delete Server] [Transaction] Delete result:", deleteResult);

        // Renumber all remaining versions starting from 1
        // Get all remaining versions ordered by their current version number
        console.log("[Version Delete Server] [Transaction] Fetching remaining versions...");
        const remainingVersions = await tx.componentVersion.findMany({
          where: { componentId },
          orderBy: { version: "asc" },
        });

        console.log("[Version Delete Server] [Transaction] Remaining versions count:", remainingVersions.length);
        console.log("[Version Delete Server] [Transaction] Remaining version IDs:", remainingVersions.map(v => ({ id: v.id, version: v.version })));

        // Update each version to have sequential numbers starting from 1
        for (let i = 0; i < remainingVersions.length; i++) {
          const newVersionNumber = i + 1;
          const currentVersion = remainingVersions[i]!;
          console.log(`[Version Delete Server] [Transaction] Processing version ${i + 1}/${remainingVersions.length}:`, {
            id: currentVersion.id,
            currentVersion: currentVersion.version,
            newVersion: newVersionNumber,
            needsUpdate: currentVersion.version !== newVersionNumber,
          });
          
          if (currentVersion.version !== newVersionNumber) {
            console.log(`[Version Delete Server] [Transaction] ⚙️ Renumbering version ${currentVersion.version} to ${newVersionNumber}`);
            const updateResult = await tx.componentVersion.update({
              where: { id: currentVersion.id },
              data: { version: newVersionNumber },
            });
            console.log(`[Version Delete Server] [Transaction] ✅ Updated version ${currentVersion.id} to version ${newVersionNumber}`);
          } else {
            console.log(`[Version Delete Server] [Transaction] ⏭️ Skipping version ${currentVersion.id} (already at version ${newVersionNumber})`);
          }
        }

        // Update component's updatedAt
        console.log("[Version Delete Server] [Transaction] Updating component updatedAt...");
        await tx.component.update({
          where: { id: componentId },
          data: { updatedAt: new Date() },
        });
        console.log("[Version Delete Server] [Transaction] ✅ Component updatedAt set");
      });

      console.log("[Version Delete Server] ✅ Transaction completed successfully");
      console.log("[Version Delete Server] ========== DELETE MUTATION SUCCESS ==========");
      return { success: true };
    } catch (error) {
      console.error("[Version Delete Server] ❌ ========== DELETE MUTATION ERROR ==========");
      console.error("[Version Delete Server] Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("[Version Delete Server] Error message:", error instanceof Error ? error.message : String(error));
      console.error("[Version Delete Server] Error stack:", error instanceof Error ? error.stack : "No stack");
      console.error("[Version Delete Server] Full error:", error);
      throw error;
    }
  }),
});
