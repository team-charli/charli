import { Hono } from 'hono';
import { Env } from './env';

const app = new Hono<Env>();

app.get('/', (c) => c.text('Robo Test Mode Ready'));

export default app;
