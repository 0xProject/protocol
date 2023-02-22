import { t } from './trpc';
import { userRouter } from './userRouter';

const router = t.router;

export const appRouter = router({
    user: userRouter,
});

export type AppRouter = typeof appRouter;
