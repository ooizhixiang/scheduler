import { Prisma } from '@prisma/client';

/**
 * Creates a Prisma Client Extension that auto-injects tenantId into all queries.
 *
 * WARNING: $queryRaw and $executeRaw completely bypass Prisma Client Extensions.
 * Any raw SQL must include `WHERE tenant_id = $1` manually.
 *
 * WARNING: When using $transaction, call it on the forTenant()-extended client.
 * The interactive transaction client inherits extensions from the parent.
 */
export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirstOrThrow({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async aggregate({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async groupBy({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId } as any;
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d: any) => ({ ...d, tenantId }));
          } else {
            args.data = { ...args.data, tenantId } as any;
          }
          return query(args);
        },
        async update({ args, query }) {
          return query(args);
        },
        async updateMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async delete({ args, query }) {
          return query(args);
        },
        async deleteMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
      },
    },
  });
}
