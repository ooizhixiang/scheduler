import { z } from 'zod';

const pemKeySchema = z
  .string()
  .min(1)
  .transform((val) =>
    val.startsWith('base64:')
      ? Buffer.from(val.slice(7), 'base64').toString('utf8')
      : val.replace(/\\n/g, '\n'),
  )
  .refine((val) => val.includes('-----BEGIN') && val.includes('-----END'), {
    message: 'Value must be a valid PEM-encoded key',
  });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  JWT_PRIVATE_KEY: pemKeySchema,
  JWT_PUBLIC_KEY: pemKeySchema,
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
