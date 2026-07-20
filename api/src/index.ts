import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { directiveRoute } from './routes/directive';
import { auditRoute } from './routes/audit';
import { accountRoute } from './routes/account';

const fastify = Fastify({
  logger: {
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
  },
  trustProxy: true,
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
});

fastify.register(directiveRoute, { prefix: '/api' });
fastify.register(auditRoute, { prefix: '/api' });
fastify.register(accountRoute, { prefix: '/api' });

fastify.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Aretune API running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
