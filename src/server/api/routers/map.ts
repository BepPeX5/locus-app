import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { createTRPCRouter, publicProcedure } from '~/src/server/api/trpc';
import { h3Service } from '~/src/server/services/h3-service';
import { emotionService } from '~/src/server/services/emotion-service';

export const mapRouter = createTRPCRouter({
  getTiles: publicProcedure
    .input(
      z.object({
        bounds: z.object({
          north: z.number().min(-90).max(90),
          south: z.number().min(-90).max(90),
          east: z.number().min(-180).max(180),
          west: z.number().min(-180).max(180),
        }),
        resolution: z.number().int().min(1).max(15).default(10),
        includeEmpty: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Validate bounds
      if (input.bounds.south >= input.bounds.north) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid bounds: south must be less than north',
        });
      }

      // Get H3 cells for the viewport
      const cells = h3Service.getCellsInBounds(
        input.bounds,
        input.resolution
      );

      if (cells.length > 1000) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Viewport too large, please zoom in',
        });
      }

      // Get aggregates for these cells
      const aggregates = await ctx.db.emotionAggregate.findMany({
        where: {
          h3Index: { in: cells },
        },
      });

      // Convert to map for easy lookup
      const aggregateMap = new Map(
        aggregates.map(agg => [agg.h3Index, agg])
      );

      // Prepare tiles data
      const tiles = cells.map(cellId => {
        const aggregate = aggregateMap.get(cellId);
        const cellBounds = h3Service.getCellBounds(cellId);
        
        if (!aggregate && !input.includeEmpty) {
          return null;
        }

        return {
          h3Index: cellId,
          bounds: cellBounds,
          center: h3Service.getCellCenter(cellId),
          aggregate: aggregate || null,
          color: aggregate ? emotionService.getEmotionColor(
            aggregate.dominantEmotion,
            aggregate.meanIntensity,
            aggregate.coherence
          ) : null,
        };
      }).filter(Boolean);

      return {
        tiles,
        resolution: input.resolution,
        count: tiles.length,
      };
    }),

  getCellDetails: publicProcedure
    .input(
      z.object({
        h3Index: z.string().min(1),
        includeNearby: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!h3Service.isValidH3Index(input.h3Index)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid H3 index',
        });
      }

      // Get cell aggregate
      const aggregate = await ctx.db.emotionAggregate.findUnique({
        where: { h3Index: input.h3Index },
      });

      // Get recent emotions for this cell
      const recentEmotions = await ctx.db.emotionEntry.findMany({
        where: {
          h3Index: input.h3Index,
          visibility: 'PUBLIC',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
        },
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
        take: 10,
      });

      // Get narrative links for this cell
      const narrativeLinks = await ctx.db.narrativeLink.findMany({
        where: { h3Index: input.h3Index },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      let nearby = null;
      if (input.includeNearby) {
        // Get nearby cells with emotions
        const nearbyCells = h3Service.getNeighbors(input.h3Index);
        const nearbyAggregates = await ctx.db.emotionAggregate.findMany({
          where: {
            h3Index: { in: nearbyCells },
          },
          take: 6,
        });

        nearby = nearbyAggregates.map(agg => ({
          h3Index: agg.h3Index,
          center: h3Service.getCellCenter(agg.h3Index),
          dominantEmotion: agg.dominantEmotion,
          meanValence: agg.meanValence,
          color: emotionService.getEmotionColor(
            agg.dominantEmotion,
            agg.meanIntensity,
            agg.coherence
          ),
        }));
      }

      return {
        h3Index: input.h3Index,
        center: h3Service.getCellCenter(input.h3Index),
        bounds: h3Service.getCellBounds(input.h3Index),
        aggregate,
        recentEmotions,
        narrativeLinks,
        nearby,
      };
    }),

  searchNearby: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radius: z.number().min(0.1).max(50).default(5), // km
        emotion: z.nativeEnum(EmotionType).optional(),
        minIntensity: z.number().min(0).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get cells within radius
      const cells = h3Service.getCellsInRadius(
        input.lat,
        input.lng,
        input.radius,
        10 // resolution
      );

      // Build where clause
      const where: any = {
        h3Index: { in: cells },
      };

      if (input.emotion) {
        where.dominantEmotion = input.emotion;
      }

      if (input.minIntensity) {
        where.meanIntensity = { gte: input.minIntensity };
      }

      const results = await ctx.db.emotionAggregate.findMany({
        where,
        orderBy: { meanIntensity: 'desc' },
        take: 20,
      });

      return results.map(agg => ({
        h3Index: agg.h3Index,
        center: h3Service.getCellCenter(agg.h3Index),
        distance: h3Service.getDistance(
          input.lat,
          input.lng,
          ...h3Service.getCellCenter(agg.h3Index)
        ),
        dominantEmotion: agg.dominantEmotion,
        meanValence: agg.meanValence,
        meanIntensity: agg.meanIntensity,
        entryCount: agg.entryCount,
        coherence: agg.coherence,
        color: emotionService.getEmotionColor(
          agg.dominantEmotion,
          agg.meanIntensity,
          agg.coherence
        ),
      })).sort((a, b) => a.distance - b.distance);
    }),
});
