import { EmotionType } from '@prisma/client';
import { db } from '~/src/server/db';
import { env } from '~/src/env';

// Emotion to valence mapping (consistent with seed)
const EMOTION_VALENCE: Record<EmotionType, number> = {
  JOY: 0.8,
  SERENITY: 0.6,
  SURPRISE: 0.2,
  NOSTALGIA: 0.1,
  FEAR: -0.7,
  SADNESS: -0.6,
  ANGER: -0.8,
  HOPE: 0.7,
  GRATITUDE: 0.9,
  ANXIETY: -0.5,
};


// Emotion to color mapping (LCH color space for perceptual uniformity)
const EMOTION_COLORS: Record<EmotionType, { hue: number; chroma: number }> = {
  JOY: { hue: 60, chroma: 80 }, // Bright yellow
  SERENITY: { hue: 200, chroma: 50 }, // Light blue
  SURPRISE: { hue: 300, chroma: 70 }, // Magenta
  NOSTALGIA: { hue: 280, chroma: 40 }, // Soft purple
  FEAR: { hue: 0, chroma: 60 }, // Dark red
  SADNESS: { hue: 240, chroma: 60 }, // Blue
  ANGER: { hue: 20, chroma: 80 }, // Red-orange
  HOPE: { hue: 120, chroma: 70 }, // Green
  GRATITUDE: { hue: 40, chroma: 60 }, // Orange
  ANXIETY: { hue: 270, chroma: 50 }, // Purple
};

export const emotionService = {
  /**
   * Get the valence value for an emotion type
   */
  getEmotionValence(emotion: EmotionType): number {
    return EMOTION_VALENCE[emotion];
  },

  /**
   * Calculate color for an emotion with intensity and coherence
   */
  getEmotionColor(
    dominantEmotion: EmotionType,
    intensity: number,
    coherence: number
  ): string {
    const { hue, chroma } = EMOTION_COLORS[dominantEmotion];
    
    // Adjust lightness based on intensity (30-90)
    const lightness = 30 + (intensity / 100) * 60;
    
    // Adjust chroma based on coherence
    const adjustedChroma = chroma * coherence;
    
    return `lch(${lightness}% ${adjustedChroma} ${hue})`;
  },

  /**
   * Convert emotion distribution to blended color
   */
  getBlendedEmotionColor(
    distribution: Record<string, number>,
    meanIntensity: number,
    coherence: number
  ): string {
    if (Object.keys(distribution).length === 0) {
      return 'lch(50% 0 0)'; // Neutral gray
    }

    // Find dominant emotion for base color
    const dominantEmotion = Object.entries(distribution)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0] as EmotionType;

    return this.getEmotionColor(dominantEmotion, meanIntensity, coherence);
  },

  /**
   * Schedule aggregate update for a cell (debounced)
   */
  async scheduleAggregateUpdate(h3Index: string): Promise<void> {
    // In a production environment, this would use a job queue like Bull or Agenda
    // For now, we'll do it immediately with a small delay to allow for batching
    setTimeout(() => {
      this.updateAggregateForCell(h3Index).catch(console.error);
    }, 1000);
  },

  /**
   * Update emotion aggregate for a specific H3 cell
   */
  async updateAggregateForCell(h3Index: string): Promise<void> {
    console.log(`Updating aggregate for cell: ${h3Index}`);

    // Get all valid emotions for this cell
    const emotions = await db.emotionEntry.findMany({
      where: {
        h3Index,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            reputation: true,
          },
        },
      },
    });

    if (emotions.length === 0) {
      // Remove aggregate if no emotions
      await db.emotionAggregate.delete({
        where: { h3Index },
      }).catch(() => {
        // Ignore if doesn't exist
      });
      return;
    }

    // Calculate weighted averages
    let totalWeight = 0;
    let weightedValence = 0;
    let weightedIntensity = 0;
    const emotionCounts: Record<string, number> = {};

    // Calculate weights and aggregates
    const now = new Date();
    const halfLifeDays = env.HALF_LIFE_DAYS;
    const lambda = Math.log(2) / halfLifeDays;

    for (const emotion of emotions) {
      const ageDays = (now.getTime() - emotion.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      // Calculate component weights
      const recencyWeight = Math.exp(-lambda * ageDays);
      const trustWeight = emotion.user.reputation;
      const presenceWeight = Math.min(emotion.dwellSeconds / 300, 2); // Cap at 5 minutes = 2x weight
      
      const totalEntryWeight = recencyWeight * trustWeight * presenceWeight;
      
      totalWeight += totalEntryWeight;
      weightedValence += emotion.valence * totalEntryWeight;
      weightedIntensity += emotion.intensity * totalEntryWeight;
      
      emotionCounts[emotion.emotion] = (emotionCounts[emotion.emotion] || 0) + totalEntryWeight;
    }

    const meanValence = weightedValence / totalWeight;
    const meanIntensity = weightedIntensity / totalWeight;

    // Find dominant emotion
    const dominantEmotion = Object.entries(emotionCounts).reduce((a, b) => 
      emotionCounts[a[0]]! > emotionCounts[b[0]]! ? a : b
    )[0] as EmotionType;

    // Calculate distribution
    const totalEmotionWeight = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const distribution: Record<string, number> = {};
    for (const [emotion, weight] of Object.entries(emotionCounts)) {
      distribution[emotion] = (weight / totalEmotionWeight) * 100;
    }

    // Calculate coherence (1 - entropy)
    const entropy = Object.values(distribution).reduce((acc, pct) => {
      const p = pct / 100;
      return acc - (p > 0 ? p * Math.log2(p) : 0);
    }, 0);
    const maxEntropy = Math.log2(Object.keys(distribution).length);
    const coherence = 1 - (entropy / maxEntropy);

    // Calculate trend
    const recentEmotions = emotions.filter(e => {
      const ageDays = (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageDays <= 7;
    });
    const olderEmotions = emotions.filter(e => {
      const ageDays = (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageDays > 7 && ageDays <= 30;
    });

    let trend = 0;
    if (recentEmotions.length > 0 && olderEmotions.length > 0) {
      const recentValence = recentEmotions.reduce((acc, e) => acc + e.valence, 0) / recentEmotions.length;
      const olderValence = olderEmotions.reduce((acc, e) => acc + e.valence, 0) / olderEmotions.length;
      trend = Math.max(-1, Math.min(1, (recentValence - olderValence) * 2));
    }

    const lastEntry = emotions.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );

    // Upsert aggregate
    await db.emotionAggregate.upsert({
      where: { h3Index },
      update: {
        dominantEmotion,
        meanValence,
        meanIntensity,
        distribution,
        coherence,
        trend,
        entryCount: emotions.length,
        lastEntryAt: lastEntry.createdAt,
        updatedAt: new Date(),
      },
      create: {
        h3Index,
        dominantEmotion,
        meanValence,
        meanIntensity,
        distribution,
        coherence,
        trend,
        entryCount: emotions.length,
        lastEntryAt: lastEntry.createdAt,
      },
    });

    console.log(`Updated aggregate for ${h3Index}: ${dominantEmotion} (${emotions.length} emotions)`);
  },

  /**
   * Bulk update aggregates for multiple cells
   */
  async bulkUpdateAggregates(h3Indices: string[]): Promise<void> {
    console.log(`Bulk updating ${h3Indices.length} aggregates`);
    
    for (const h3Index of h3Indices) {
      await this.updateAggregateForCell(h3Index);
    }
  },

  /**
   * Clean up expired emotions
   */
  async cleanupExpiredEmotions(): Promise<number> {
    const result = await db.emotionEntry.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Cleaned up ${result.count} expired emotions`);
    return result.count;
  },
};
