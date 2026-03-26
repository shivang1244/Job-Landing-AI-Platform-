# Architecture Notes

- `apps/web`: Next.js dashboard + API routes for MVP.
- `apps/web/lib/data-store.ts`: local JSON datastore used for quick iteration.
- `apps/worker`: Python service skeleton for future async jobs and connectors.

Planned upgrade path:
1. Replace local datastore with Postgres + Prisma.
2. Move search/matching/notifications into worker queues.
3. Add auth + billing + tenant limits.
