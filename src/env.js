import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes('YOUR_MYSQL_URL_HERE'),
        'You forgot to change the default URL'
      ),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url()
    ),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    
    // Geo Configuration
    H3_RESOLUTION: z.coerce.number().int().min(1).max(15).default(10),
    H3_SMOOTHING_RESOLUTION: z.coerce.number().int().min(1).max(15).default(9),
    
    // Emotion Scoring
    HALF_LIFE_DAYS: z.coerce.number().positive().default(30),
    TRUST_MIN: z.coerce.number().positive().default(0.5),
    TRUST_MAX: z.coerce.number().positive().default(1.5),
    
    // Volatility
    VOLATILE_TTL_HOURS_DEFAULT: z.coerce.number().positive().default(24),
    ENABLE_VOLATILITY: z
      .string()
      .transform((val) => val === 'true')
      .default('true'),
    
    // Seasonal Features
    ENABLE_SEASONAL_RITUALS: z
      .string()
      .transform((val) => val === 'true')
      .default('true'),
    ENABLE_HIDDEN_CONTENT: z
      .string()
      .transform((val) => val === 'true')
      .default('true'),
    
    // Rate Limiting
    EMOTION_SUBMISSIONS_PER_HOUR: z.coerce.number().positive().default(10),
    EMOTION_SUBMISSIONS_PER_CELL_PER_DAY: z.coerce.number().positive().default(3),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    
    H3_RESOLUTION: process.env.H3_RESOLUTION,
    H3_SMOOTHING_RESOLUTION: process.env.H3_SMOOTHING_RESOLUTION,
    
    HALF_LIFE_DAYS: process.env.HALF_LIFE_DAYS,
    TRUST_MIN: process.env.TRUST_MIN,
    TRUST_MAX: process.env.TRUST_MAX,
    
    VOLATILE_TTL_HOURS_DEFAULT: process.env.VOLATILE_TTL_HOURS_DEFAULT,
    ENABLE_VOLATILITY: process.env.ENABLE_VOLATILITY,
    
    ENABLE_SEASONAL_RITUALS: process.env.ENABLE_SEASONAL_RITUALS,
    ENABLE_HIDDEN_CONTENT: process.env.ENABLE_HIDDEN_CONTENT,
    
    EMOTION_SUBMISSIONS_PER_HOUR: process.env.EMOTION_SUBMISSIONS_PER_HOUR,
    EMOTION_SUBMISSIONS_PER_CELL_PER_DAY: process.env.EMOTION_SUBMISSIONS_PER_CELL_PER_DAY,
  },
  /**
   * Run `build` or `dev` with SKIP_ENV_VALIDATION to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
