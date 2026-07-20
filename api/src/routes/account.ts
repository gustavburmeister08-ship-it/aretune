import { createClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';
import { AuthenticationError, requireAuthenticatedUser } from '../lib/auth';

export async function accountRoute(fastify: FastifyInstance) {
  fastify.delete('/account', async (request, reply) => {
    try {
      const userId = await requireAuthenticatedUser(request);
      const url = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceRoleKey) throw new Error('Account deletion is not configured');
      const admin = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      for (const bucket of ['avatars', 'social-media']) {
        const { data: objects, error: listError } = await admin.storage
          .from(bucket)
          .list(userId, { limit: 1000 });
        if (listError) throw listError;
        if (objects?.length) {
          const { error: removeError } = await admin.storage
            .from(bucket)
            .remove(objects.map((object) => `${userId}/${object.name}`));
          if (removeError) throw removeError;
        }
      }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(401).send({ error: error.message });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete account' });
    }
  });
}
