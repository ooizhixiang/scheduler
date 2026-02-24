import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default('noreply@scheduler.local'),

  API_PORT: z.coerce.number().default(3001),
  WEB_URL: z.string().default('http://localhost:3000'),

  DEFAULT_TENANT_ID: z
    .string()
    .default('00000000-0000-0000-0000-000000000001'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`\nEnvironment validation failed:\n${errors}\n`);
  }

  return result.data;
}
