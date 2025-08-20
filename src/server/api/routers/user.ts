import { z } from 'zod';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

import { createTRPCRouter, protectedProcedure } from '~/src/server/api/trpc';

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        _count: {
          select: {
            emotionEntries: {
              where: {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ],
              },
            },
            milestones: true,
          },
        },
      },
    });

    return user;
  }),

  getTimeline: protectedProcedure
    .input(
      z.object({
        weeks: z.number().int().min(1).max(52).default(12),
        groupBy: z.enum(['week', 'month']).default('week'),
      })
    )
    .query(async ({ ctx, input }) => {
      const endDate = new Date();
      const startDate = subWeeks(endDate, input.weeks);

      // Get user's emotions in the time range
      const emotions = await ctx.db.emotionEntry.findMany({
        where: {
          userId: ctx.session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by week/month
      const groupedData = new Map<string, {
        period: string;
        date: Date;
        emotions: typeof emotions;
        avgValence: number;
        avgIntensity: number;
        totalEmotions: number;
        dominantEmotion: string | null;
      }>();

      emotions.forEach(emotion => {
        const periodStart = input.groupBy === 'week' 
          ? startOfWeek(emotion.createdAt)
          : new Date(emotion.createdAt.getFullYear(), emotion.createdAt.getMonth(), 1);
        
        const periodKey = periodStart.toISOString();

        if (!groupedData.has(periodKey)) {
          groupedData.set(periodKey, {
            period: periodKey,
            date: periodStart,
            emotions: [],
            avgValence: 0,
            avgIntensity: 0,
            totalEmotions: 0,
            dominantEmotion: null,
          });
        }

        const group = groupedData.get(periodKey)!;
        group.emotions.push(emotion);
      });

      // Calculate statistics for each period
      const timeline = Array.from(groupedData.values()).map(group => {
        const totalValence = group.emotions.reduce((sum, e) => sum + e.valence, 0);
        const totalIntensity = group.emotions.reduce((sum, e) => sum + e.intensity, 0);
        
        // Count emotions
        const emotionCounts = group.emotions.reduce((acc, e) => {
          acc[e.emotion] = (acc[e.emotion] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const dominantEmotion = Object.entries(emotionCounts)
          .reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0] || null;

        return {
          ...group,
          avgValence: group.emotions.length > 0 ? totalValence / group.emotions.length : 0,
          avgIntensity: group.emotions.length > 0 ? totalIntensity / group.emotions.length : 0,
          totalEmotions: group.emotions.length,
          dominantEmotion,
          emotionDistribution: emotionCounts,
        };
      }).sort((a, b) => a.date.getTime() - b.date.getTime());

      // Get milestones in the same period
      const milestones = await ctx.db.userMilestone.findMany({
        where: {
          userId: ctx.session.user.id,
          occurredAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { occurredAt: 'asc' },
      });

      // Calculate overall statistics
      const overallStats = {
        totalEmotions: emotions.length,
        avgValence: emotions.length > 0 
          ? emotions.reduce((sum, e) => sum + e.valence, 0) / emotions.length 
          : 0,
        avgIntensity: emotions.length > 0
          ? emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
          : 0,
        uniqueLocations: new Set(emotions.map(e => e.h3Index)).size,
        milestonesCount: milestones.length,
      };

      return {
        timeline,
        milestones,
        overallStats,
        dateRange: { start: startDate, end: endDate },
      };
    }),

  getMilestones: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const milestones = await ctx.db.userMilestone.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { occurredAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.userMilestone.count({
        where: { userId: ctx.session.user.id },
      });

      return {
        milestones,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });

      return updatedUser;
    }),

  getEmotionalJourney: protectedProcedure
    .input(
      z.object({
        h3Index: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
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

      const emotions = await ctx.db.emotionEntry.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: input.limit,
      });

      // Calculate emotional journey metrics
      if (emotions.length < 2) {
        return {
          emotions,
          journey: {
            valenceTrend: 0,
            intensityTrend: 0,
            volatility: 0,
            progression: [],
          },
        };
      }

      // Calculate running averages and trends
      const progression = [];
      let runningValence = emotions[0]!.valence;
      let runningIntensity = emotions[0]!.intensity;
      const smoothingFactor = 0.3;

      for (let i = 0; i < emotions.length; i++) {
        if (i > 0) {
          runningValence = smoothingFactor * emotions[i]!.valence + 
                          (1 - smoothingFactor) * runningValence;
          runningIntensity = smoothingFactor * emotions[i]!.intensity + 
                            (1 - smoothingFactor) * runningIntensity;
        }

        progression.push({
          date: emotions[i]!.createdAt,
          valence: emotions[i]!.valence,
          intensity: emotions[i]!.intensity,
          runningValence,
          runningIntensity,
          emotion: emotions[i]!.emotion,
        });
      }

      // Calculate trends (simple linear regression)
      const n = progression.length;
      const sumX = progression.reduce((sum, _, i) => sum + i, 0);
      const sumY_valence = progression.reduce((sum, p) => sum + p.runningValence, 0);
      const sumY_intensity = progression.reduce((sum, p) => sum + p.runningIntensity, 0);
      const sumXY_valence = progression.reduce((sum, p, i) => sum + i * p.runningValence, 0);
      const sumXY_intensity = progression.reduce((sum, p, i) => sum + i * p.runningIntensity, 0);
      const sumX2 = progression.reduce((sum, _, i) => sum + i * i, 0);

      const valenceTrend = (n * sumXY_valence - sumX * sumY_valence) / (n * sumX2 - sumX * sumX);
      const intensityTrend = (n * sumXY_intensity - sumX * sumY_intensity) / (n * sumX2 - sumX * sumX);

      // Calculate volatility (standard deviation of valence changes)
      const valenceChanges = progression.slice(1).map((p, i) => 
        p.valence - progression[i]!.valence
      );
      const volatility = valenceChanges.length > 0
        ? Math.sqrt(valenceChanges.reduce((sum, change) => sum + change * change, 0) / valenceChanges.length)
        : 0;

      return {
        emotions,
        journey: {
          valenceTrend,
          intensityTrend,
          volatility,
          progression,
        },
      };
    }),

  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all user data for export
    const [emotions, milestones] = await Promise.all([
      ctx.db.emotionEntry.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      ctx.db.userMilestone.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { occurredAt: 'desc' },
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      user: {
        id: ctx.session.user.id,
        email: ctx.session.user.email,
        name: ctx.session.user.name,
      },
      emotions: emotions.map(e => ({
        id: e.id,
        h3Index: e.h3Index,
        emotion: e.emotion,
        intensity: e.intensity,
        valence: e.valence,
        tags: e.tags,
        note: e.note,
        visibility: e.visibility,
        createdAt: e.createdAt,
        expiresAt: e.expiresAt,
      })),
      milestones,
      statistics: {
        totalEmotions: emotions.length,
        uniqueLocations: new Set(emotions.map(e => e.h3Index)).size,
        avgValence: emotions.length > 0
          ? emotions.reduce((sum, e) => sum + e.valence, 0) / emotions.length
          : 0,
        avgIntensity: emotions.length > 0
          ? emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length
          : 0,
      },
    };
  }),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.literal('DELETE_MY_ACCOUNT'),
      })
    )
    .mutation(async ({ ctx }) => {
      // This will cascade delete all related data due to foreign key constraints
      await ctx.db.user.delete({
        where: { id: ctx.session.user.id },
      });

      return { success: true };
    }),
});
