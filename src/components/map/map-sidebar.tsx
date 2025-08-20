'use client';

import { useState } from 'react';
import { X, Plus, Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '~/src/trpc/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmotionForm } from './emotion-form';
import { VolatileContent } from '../emotions/volatile-content';
import { HiddenContent } from '../emotions/hidden-content';

interface MapSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCell: string | null;
}

export function MapSidebar({ isOpen, onClose, selectedCell }: MapSidebarProps) {
  const [showEmotionForm, setShowEmotionForm] = useState(false);

  // Query cell details
  const { data: cellData, isLoading } = api.map.getCellDetails.useQuery(
    { h3Index: selectedCell!, includeNearby: true },
    { enabled: !!selectedCell }
  );

  // Query emotions for this cell
  const { data: emotionsData } = api.emotions.getByCell.useQuery(
    { h3Index: selectedCell!, limit: 10 },
    { enabled: !!selectedCell }
  );

  if (!isOpen || !selectedCell) {
    return null;
  }

  const handleEmotionSubmitted = () => {
    setShowEmotionForm(false);
    // Refetch data will happen automatically via tRPC
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[1001] w-full max-w-md transform bg-background shadow-xl transition-transform duration-300 ease-in-out md:w-96">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Place Details</h2>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : cellData ? (
            <>
              {/* Aggregate Info */}
              {cellData.aggregate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Emotional Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Dominant Emotion</span>
                      <Badge variant="secondary">
                        {cellData.aggregate.dominantEmotion.toLowerCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Emotional Valence</span>
                      <div className="flex items-center gap-1">
                        {cellData.aggregate.meanValence > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {cellData.aggregate.meanValence.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Intensity</span>
                      <span className="text-sm font-medium">
                        {cellData.aggregate.meanIntensity.toFixed(0)}/100
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Contributions</span>
                      <span className="text-sm font-medium">
                        {cellData.aggregate.entryCount} emotions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add Emotion Button */}
              <Button 
                className="w-full" 
                onClick={() => setShowEmotionForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Leave Your Emotion Here
              </Button>

              {/* Recent Emotions */}
              {emotionsData?.emotions && emotionsData.emotions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Emotions</CardTitle>
                    <CardDescription>
                      What others have felt here
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {emotionsData.emotions.slice(0, 5).map((emotion) => (
                      <div key={emotion.id} className="border-l-2 border-muted pl-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {emotion.emotion.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(emotion.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {emotion.note && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            "{emotion.note}"
                          </p>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Intensity: {emotion.intensity}/100
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Volatile Content */}
              <VolatileContent h3Index={selectedCell} />

              {/* Hidden Content */}
              <HiddenContent h3Index={selectedCell} />

              {/* Narrative Links */}
              {cellData.narrativeLinks && cellData.narrativeLinks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Emotional Journey</CardTitle>
                    <CardDescription>
                      How emotions have evolved here
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cellData.narrativeLinks.slice(0, 2).map((link) => (
                      <div key={link.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {link.emotionFrom.toLowerCase()}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs">
                            {link.emotionTo.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {link.rationale}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No data available for this location</p>
            </div>
          )}
        </div>
      </div>

      {/* Emotion Form Modal */}
      {showEmotionForm && selectedCell && (
        <EmotionForm
          h3Index={selectedCell}
          onClose={() => setShowEmotionForm(false)}
          onSubmitted={handleEmotionSubmitted}
        />
      )}
    </div>
  );
}
