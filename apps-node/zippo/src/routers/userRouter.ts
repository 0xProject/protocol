import { t } from "./trpc";

import {
  getById,
  create,
  userGetByIdInputShape,
  userCreateInputShape,
} from "../services/userService";

/**
 * tRPC router for user procedures.
 */
export const userRouter = t.router({
  get: t.procedure.input(userGetByIdInputShape).query((req) => {
    return getById(req.input);
  }),
  create: t.procedure.input(userCreateInputShape).mutation((req) => {
    return create(req.input);
  }),
});
