import { createCallerFactory, createTRPCRouter } from '~/src/server/api/trpc';
import { emotionsRouter } from './routers/emotions';
import { mapRouter } from './routers/map';
import { userRouter } from './routers/user';
import { seasonalRouter } from './routers/seasonal';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  emotions: emotionsRouter,
  map: mapRouter,
  user: userRouter,
  seasonal: seasonalRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
