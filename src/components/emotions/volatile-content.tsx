'use client';

import { useState, useEffect } from 'react';
import { Clock, Eye, EyeOff, Zap } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '~/src/trpc/react';

interface VolatileContentProps {
  h3Index: string;
  showExpired?: boolean;
}

export function VolatileContent({ h3Index, showExpired = false }: VolatileContentProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const { data: emotionsData, refetch } = api.emotions.getByCell.useQuery({
    h3Index,
    limit: 50,
    includePrivate: false,
  });

  if (!emotionsData?.emotions) {
    return null;
  }

  // Filter volatile emotions
  const volatileEmotions = emotionsData.emotions.filter(emotion => emotion.expiresAt);
  
  // Separate active and expired
  const activeVolatile = volatileEmotions.filter(emotion => 
    emotion.expiresAt && new Date(emotion.expiresAt) > currentTime
  );
  
  const expiredVolatile = volatileEmotions.filter(emotion => 
    emotion.expiresAt && new Date(emotion.expiresAt) <= currentTime
  );

  if (activeVolatile.length === 0 && (!showExpired || expiredVolatile.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Volatile Emotions */}
      {activeVolatile.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Zap className="h-5 w-5" />
              Ephemeral Emotions
            </CardTitle>
            <CardDescription>
              These emotions will fade away soon. Experience them while they last.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeVolatile.map((emotion) => (
              <VolatileEmotionCard
                key={emotion.id}
                emotion={emotion}
                currentTime={currentTime}
                isExpired={false}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expired Volatile Emotions (if requested) */}
      {showExpired && expiredVolatile.length > 0 && (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <EyeOff className="h-5 w-5" />
              Faded Memories
            </CardTitle>
            <CardDescription>
              These emotions have already dissolved into the emotional ether.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiredVolatile.slice(0, 5).map((emotion) => (
              <VolatileEmotionCard
                key={emotion.id}
                emotion={emotion}
                currentTime={currentTime}
                isExpired={true}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface VolatileEmotionCardProps {
  emotion: any;
  currentTime: Date;
  isExpired: boolean;
}

function VolatileEmotionCard({ emotion, currentTime, isExpired }: VolatileEmotionCardProps) {
  const expiresAt = new Date(emotion.expiresAt);
  const timeLeft = expiresAt.getTime() - currentTime.getTime();
  
  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Expired';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  const getUrgencyColor = (ms: number) => {
    if (ms <= 0) return 'text-gray-500';
    if (ms < 60 * 60 * 1000) return 'text-red-500'; // < 1 hour
    if (ms < 6 * 60 * 60 * 1000) return 'text-orange-500'; // < 6 hours
    return 'text-amber-600';
  };

  return (
    <div className={`border rounded-lg p-3 ${isExpired ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={isExpired ? "secondary" : "default"}>
              {emotion.emotion.toLowerCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Intensity: {emotion.intensity}/100
            </Badge>
          </div>
          
          {emotion.note && (
            <p className="text-sm text-muted-foreground">
              "{emotion.note}"
            </p>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>by {emotion.user.name || 'Anonymous'}</span>
            <span>•</span>
            <span>{new Date(emotion.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1 text-xs ${getUrgencyColor(timeLeft)}`}>
            <Clock className="h-3 w-3" />
            <span>{formatTimeLeft(timeLeft)}</span>
          </div>
          
          {!isExpired && timeLeft < 60 * 60 * 1000 && (
            <Badge variant="destructive" className="text-xs">
              Fading
            </Badge>
          )}
        </div>
      </div>

      {/* Urgency indicators */}
      {!isExpired && (
        <div className="mt-2">
          {timeLeft < 15 * 60 * 1000 && ( // < 15 minutes
            <Alert className="border-red-200 bg-red-50">
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-red-800 text-xs">
                This emotion is fading rapidly! Experience it now.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
