import { z } from 'zod';
import { SeasonType, ThemeType } from '@prisma/client';

import { createTRPCRouter, publicProcedure, protectedProcedure } from '~/src/server/api/trpc';

export const seasonalRouter = createTRPCRouter({
  getCurrentSeason: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    
    const currentSeason = await ctx.db.seasonalCycle.findFirst({
      where: {
        AND: [
          { startDate: { lte: now } },
          { endDate: { gte: now } },
        ],
      },
    });

    return currentSeason;
  }),

  getAllSeasons: publicProcedure.query(async ({ ctx }) => {
    const currentYear = new Date().getFullYear();
    
    const seasons = await ctx.db.seasonalCycle.findMany({
      where: {
        startDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return seasons;
  }),

  getMissions: protectedProcedure.query(async ({ ctx }) => {
    const currentSeason = await ctx.db.seasonalCycle.findFirst({
      where: {
        AND: [
          { startDate: { lte: new Date() } },
          { endDate: { gte: new Date() } },
        ],
      },
    });

    if (!currentSeason) {
      return [];
    }

    // Get user's progress for seasonal missions
    const userEmotions = await ctx.db.emotionEntry.findMany({
      where: {
        userId: ctx.session.user.id,
        createdAt: {
          gte: currentSeason.startDate,
          lte: currentSeason.endDate,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      },
    });

    // Define missions based on seasonal theme
    const missions = getMissionsForTheme(currentSeason.theme, userEmotions);

    return {
      season: currentSeason,
      missions,
      userProgress: {
        totalEmotions: userEmotions.length,
        uniqueLocations: new Set(userEmotions.map(e => e.h3Index)).size,
        completedMissions: missions.filter(m => m.completed).length,
      },
    };
  }),

  getSeasonalTrends: publicProcedure
    .input(
      z.object({
        season: z.nativeEnum(SeasonType),
        year: z.number().int().min(2020).max(2030).default(new Date().getFullYear()),
      })
    )
    .query(async ({ ctx, input }) => {
      const seasonStart = getSeasonStartDate(input.season, input.year);
      const seasonEnd = getSeasonEndDate(input.season, input.year);

      // Get aggregated emotions for the season
      const seasonalEmotions = await ctx.db.emotionEntry.groupBy({
        by: ['emotion'],
        where: {
          createdAt: {
            gte: seasonStart,
            lte: seasonEnd,
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
        },
        _avg: {
          valence: true,
          intensity: true,
        },
        _count: {
          emotion: true,
        },
      });

      // Compare with overall averages
      const overallEmotions = await ctx.db.emotionEntry.groupBy({
        by: ['emotion'],
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
        },
        _avg: {
          valence: true,
          intensity: true,
        },
        _count: {
          emotion: true,
        },
      });

      const trends = seasonalEmotions.map(seasonal => {
        const overall = overallEmotions.find(o => o.emotion === seasonal.emotion);
        
        return {
          emotion: seasonal.emotion,
          seasonalAvgValence: seasonal._avg.valence || 0,
          seasonalAvgIntensity: seasonal._avg.intensity || 0,
          seasonalCount: seasonal._count.emotion,
          overallAvgValence: overall?._avg.valence || 0,
          overallAvgIntensity: overall?._avg.intensity || 0,
          overallCount: overall?._count.emotion || 0,
          relativeDifference: {
            valence: (seasonal._avg.valence || 0) - (overall?._avg.valence || 0),
            intensity: (seasonal._avg.intensity || 0) - (overall?._avg.intensity || 0),
          },
        };
      });

      return {
        season: input.season,
        year: input.year,
        dateRange: { start: seasonStart, end: seasonEnd },
        trends,
      };
    }),
});

function getMissionsForTheme(theme: ThemeType, userEmotions: any[]) {
  const missions: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    progress: number;
    completed: boolean;
    reward: string;
  }> = [];

  switch (theme) {
    case ThemeType.MEMORY:
      missions.push(
        {
          id: 'nostalgia-explorer',
          title: 'Memory Lane Explorer',
          description: 'Leave 3 nostalgic emotions in different locations',
          target: 3,
          progress: userEmotions.filter(e => e.emotion === 'NOSTALGIA').length,
          completed: false,
          reward: 'Unlock hidden memories from other users',
        },
        {
          id: 'gratitude-reflector',
          title: 'Gratitude Reflector',
          description: 'Express gratitude in 5 meaningful places',
          target: 5,
          progress: userEmotions.filter(e => e.emotion === 'GRATITUDE').length,
          completed: false,
          reward: 'View community gratitude patterns',
        }
      );
      break;

    case ThemeType.REBIRTH:
      missions.push(
        {
          id: 'hope-spreader',
          title: 'Hope Spreader',
          description: 'Share hope in 4 different neighborhoods',
          target: 4,
          progress: Math.min(4, new Set(
            userEmotions.filter(e => e.emotion === 'HOPE').map(e => e.h3Index)
          ).size),
          completed: false,
          reward: 'Access to renewal meditation spots',
        },
        {
          id: 'joy-cultivator',
          title: 'Joy Cultivator',
          description: 'Experience joy across 6 unique locations',
          target: 6,
          progress: Math.min(6, new Set(
            userEmotions.filter(e => e.emotion === 'JOY').map(e => e.h3Index)
          ).size),
          completed: false,
          reward: 'Discover joy amplification zones',
        }
      );
      break;

    case ThemeType.CELEBRATION:
      missions.push(
        {
          id: 'joy-maximizer',
          title: 'Joy Maximizer',
          description: 'Reach maximum joy intensity (90+) in 3 places',
          target: 3,
          progress: userEmotions.filter(e => e.emotion === 'JOY' && e.intensity >= 90).length,
          completed: false,
          reward: 'Summer celebration hotspots revealed',
        }
      );
      break;

    case ThemeType.INTROSPECTION:
      missions.push(
        {
          id: 'serenity-seeker',
          title: 'Serenity Seeker',
          description: 'Find serenity in 7 quiet corners of the world',
          target: 7,
          progress: userEmotions.filter(e => e.emotion === 'SERENITY').length,
          completed: false,
          reward: 'Winter contemplation network access',
        }
      );
      break;
  }

  // Mark completed missions
  missions.forEach(mission => {
    mission.completed = mission.progress >= mission.target;
  });

  return missions;
}

function getSeasonStartDate(season: SeasonType, year: number): Date {
  switch (season) {
    case SeasonType.SPRING:
      return new Date(year, 2, 20); // March 20
    case SeasonType.SUMMER:
      return new Date(year, 5, 20); // June 20
    case SeasonType.AUTUMN:
      return new Date(year, 8, 22); // September 22
    case SeasonType.WINTER:
      return new Date(year, 11, 21); // December 21
  }
}

function getSeasonEndDate(season: SeasonType, year: number): Date {
  switch (season) {
    case SeasonType.SPRING:
      return new Date(year, 5, 19); // June 19
    case SeasonType.SUMMER:
      return new Date(year, 8, 21); // September 21
    case SeasonType.AUTUMN:
      return new Date(year, 11, 20); // December 20
    case SeasonType.WINTER:
      return new Date(year + 1, 2, 19); // March 19 next year
  }
}
