import { orgRouter } from "~/server/api/routers/org";
import { orgMemberRouter } from "~/server/api/routers/orgMember";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { projectRouter } from "./routers/project";
import { cmsSchemaRouter } from "./routers/cmsSchema";
import { projectLanguageRouter } from "./routers/projectLanguage";
import { cmsContentRouter } from "./routers/cmsContent";
import { blogPostRouter } from "./routers/blogPost";
import { blogContentRouter } from "./routers/blogContent";
import { projectApiKeyRouter } from "./routers/projectApiKey";
import { projectDashboardRouter } from "./routers/projectDashboard";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  org: orgRouter,
  project: projectRouter,
  orgMember: orgMemberRouter,
  cmsSchema: cmsSchemaRouter,
  projectLanguage: projectLanguageRouter,
  cmsContent: cmsContentRouter,
  blogPost: blogPostRouter,
  blogContent: blogContentRouter,
  projectApiKey: projectApiKeyRouter,
  projectDashboard: projectDashboardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.org.getAll();
 */
export const createCaller = createCallerFactory(appRouter);
