import { Hono } from 'hono';
import type { Env } from '../types/env';

type AppEnv = {
  Bindings: Env;
};

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', (c) => c.text('ok', 200));
