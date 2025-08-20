import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { EmotionType, VisibilityType } from '@prisma/client';

import { createTRPCRouter, protectedProcedure, publicProcedure, rateLimitedProcedure } from '~/src/server/api/trpc';
import { emotionService } from '~/src/server/services/emotion-service';
import { h3Service } from '~/src/server/services/h3-service';

const EmotionTypeEnum = z.nativeEnum(EmotionType);
const VisibilityTypeEnum = z.nativeEnum(VisibilityType);

export const emotionsRouter = createTRPCRouter({
  add: rateLimitedProcedure
    .input(
      z.object({
        h3Index: z.string().min(1),
        emotion: EmotionTypeEnum,
        intensity: z.number().int().min(0).max(100),
        note: z.string().max(280).optional(),
        tags: z.array(z.string()).max(10).default([]),
        dwellSeconds: z.number().int().min(0).default(0),
        gpsAccuracy: z.number().int().min(1).default(10),
        visibility: VisibilityTypeEnum.default(VisibilityType.PUBLIC),
        ttlHours: z.number().int().min(1).max(168).optional(), // Max 1 week
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate H3 index
      if (!h3Service.isValidH3Index(input.h3Index)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid H3 index',
        });
      }

      // Check daily limit per cell
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCount = await ctx.db.emotionEntry.count({
        where: {
          userId,
          h3Index: input.h3Index,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (todayCount >= 3) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Maximum 3 emotions per location per day',
        });
      }

      // Calculate valence and expiration
      const valence = emotionService.getEmotionValence(input.emotion);
      const expiresAt = input.ttlHours 
        ? new Date(Date.now() + input.ttlHours * 60 * 60 * 1000)
        : null;

      // Create emotion entry
      const emotionEntry = await ctx.db.emotionEntry.create({
        data: {
          userId,
          h3Index: input.h3Index,
          emotion: input.emotion,
          intensity: input.intensity,
          valence,
          note: input.note,
          tags: input.tags,
          dwellSeconds: input.dwellSeconds,
          gpsAccuracy: input.gpsAccuracy,
          visibility: input.visibility,
          ttlHours: input.ttlHours,
          expiresAt,
        },
      });

      // Queue aggregate update (fire and forget)
      emotionService.scheduleAggregateUpdate(input.h3Index).catch(console.error);

      return emotionEntry;
    }),

  getByCell: publicProcedure
    .input(
      z.object({
        h3Index: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(20),
        includePrivate: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!h3Service.isValidH3Index(input.h3Index)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid H3 index',
        });
      }

      const whereClause: any = {
        h3Index: input.h3Index,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      };

      // Only include public emotions unless user requests their own private ones
      if (!input.includePrivate || !ctx.session) {
        whereClause.visibility = VisibilityType.PUBLIC;
      } else if (input.includePrivate && ctx.session) {
        whereClause.OR = [
          { visibility: VisibilityType.PUBLIC },
          { 
            AND: [
              { visibility: VisibilityType.PRIVATE },
              { userId: ctx.session.user.id }
            ]
          }
        ];
      }

      const emotions = await ctx.db.emotionEntry.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      // Get aggregate for this cell
      const aggregate = await ctx.db.emotionAggregate.findUnique({
        where: { h3Index: input.h3Index },
      });

      return {
        emotions,
        aggregate,
      };
    }),

  getMyEmotions: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        h3Index: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.session.user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      };

      if (input.h3Index) {
        where.h3Index = input.h3Index;
      }

      return ctx.db.emotionEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const emotion = await ctx.db.emotionEntry.findUnique({
        where: { id: input.id },
      });

      if (!emotion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Emotion not found',
        });
      }

      if (emotion.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete emotions from other users',
        });
      }

      await ctx.db.emotionEntry.delete({
        where: { id: input.id },
      });

      // Schedule aggregate update
      emotionService.scheduleAggregateUpdate(emotion.h3Index).catch(console.error);

      return { success: true };
    }),
});
