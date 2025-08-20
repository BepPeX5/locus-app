'use client';

import { useState, useEffect } from 'react';
import { MapPin, Eye, Lock, Unlock, Timer } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HiddenContentProps {
  h3Index: string;
  userLocation?: [number, number];
}

interface HiddenContent {
  id: string;
  title: string;
  description: string;
  requirementType: 'presence' | 'dwell' | 'action';
  requirement: {
    minDwellMinutes?: number;
    requiredAction?: string;
    radius?: number; // meters
  };
  content: {
    type: 'memory' | 'ritual' | 'story';
    text: string;
    emotion?: string;
  };
  isUnlocked: boolean;
}

// Mock hidden content - in production this would come from the backend
const mockHiddenContent: HiddenContent[] = [
  {
    id: '1',
    title: 'Ancient Memory',
    description: 'A memory surfaces when you spend time in quiet contemplation',
    requirementType: 'dwell',
    requirement: { minDwellMinutes: 3 },
    content: {
      type: 'memory',
      text: 'Centuries ago, this was a place where travelers would rest and share stories. The stones remember their laughter and tears.',
      emotion: 'nostalgia'
    },
    isUnlocked: false,
  },
  {
    id: '2', 
    title: 'Breathing Ritual',
    description: 'Take 10 deep breaths while standing still to unlock inner peace',
    requirementType: 'action',
    requirement: { requiredAction: 'breathe' },
    content: {
      type: 'ritual',
      text: 'Feel the rhythm of this place. Breathe with the wind, pulse with the earth. This spot has been a sanctuary for countless souls seeking serenity.',
      emotion: 'serenity'
    },
    isUnlocked: false,
  },
  {
    id: '3',
    title: 'Urban Echo',
    description: 'The city remembers - unlock by simply being present',
    requirementType: 'presence',
    requirement: { radius: 50 },
    content: {
      type: 'story',
      text: 'In 1943, a young woman waited here every day for news from the war. Her hope echoes still in the morning light.',
      emotion: 'hope'
    },
    isUnlocked: false,
  },
];

export function HiddenContent({ h3Index, userLocation }: HiddenContentProps) {
  const [content, setContent] = useState<HiddenContent[]>(mockHiddenContent);
  const [dwellStartTime, setDwellStartTime] = useState<Date | null>(null);
  const [currentDwellMinutes, setCurrentDwellMinutes] = useState(0);
  const [isInArea, setIsInArea] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState(0);

  // Simulate presence detection
  useEffect(() => {
    if (userLocation) {
      setIsInArea(true);
      setDwellStartTime(new Date());
    }
    return () => {
      setDwellStartTime(null);
      setCurrentDwellMinutes(0);
    };
  }, [userLocation]);

  // Track dwell time
  useEffect(() => {
    if (!dwellStartTime || !isInArea) return;

    const interval = setInterval(() => {
      const now = new Date();
      const dwellTimeMs = now.getTime() - dwellStartTime.getTime();
      const dwellMinutes = Math.floor(dwellTimeMs / (1000 * 60));
      setCurrentDwellMinutes(dwellMinutes);

      // Check for unlocks
      setContent(prevContent => 
        prevContent.map(item => {
          if (item.requirementType === 'dwell' && 
              !item.isUnlocked && 
              dwellMinutes >= (item.requirement.minDwellMinutes || 0)) {
            return { ...item, isUnlocked: true };
          }
          if (item.requirementType === 'presence' && !item.isUnlocked) {
            return { ...item, isUnlocked: true };
          }
          return item;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [dwellStartTime, isInArea]);

  const handleAction = (action: string) => {
    setActiveAction(action);
    setActionProgress(0);

    // Simulate action completion
    const progressInterval = setInterval(() => {
      setActionProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setActiveAction(null);
          
          // Unlock action-based content
          setContent(prevContent => 
            prevContent.map(item => {
              if (item.requirementType === 'action' && 
                  item.requirement.requiredAction === action) {
                return { ...item, isUnlocked: true };
              }
              return item;
            })
          );
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const visibleContent = content.filter(item => item.isUnlocked);
  const lockedContent = content.filter(item => !item.isUnlocked);

  if (content.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Presence Status */}
      {isInArea && (
        <Alert className="border-blue-200 bg-blue-50">
          <MapPin className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            You are in a place with hidden emotional content. 
            {dwellStartTime && ` Present for ${currentDwellMinutes} minutes.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Unlocked Content */}
      {visibleContent.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Unlock className="h-5 w-5" />
              Revealed Memories
            </CardTitle>
            <CardDescription>
              Your presence has awakened these hidden emotional layers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleContent.map((item) => (
              <UnlockedContentCard key={item.id} content={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Locked Content */}
      {lockedContent.length > 0 && isInArea && (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Lock className="h-5 w-5" />
              Hidden Content
            </CardTitle>
            <CardDescription>
              Complete these actions to unlock deeper emotional connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lockedContent.map((item) => (
              <LockedContentCard 
                key={item.id} 
                content={item}
                currentDwellMinutes={currentDwellMinutes}
                onAction={handleAction}
                activeAction={activeAction}
                actionProgress={actionProgress}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UnlockedContentCard({ content }: { content: HiddenContent }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-green-800">{content.title}</h4>
          <Badge variant="outline" className="text-xs mt-1">
            {content.content.type}
          </Badge>
        </div>
        <Eye className="h-4 w-4 text-green-600" />
      </div>
      
      <p className="text-sm text-gray-700 italic mb-3">
        "{content.content.text}"
      </p>
      
      {content.content.emotion && (
        <Badge className="text-xs">
          Emotion: {content.content.emotion}
        </Badge>
      )}
    </div>
  );
}

interface LockedContentCardProps {
  content: HiddenContent;
  currentDwellMinutes: number;
  onAction: (action: string) => void;
  activeAction: string | null;
  actionProgress: number;
}

function LockedContentCard({ 
  content, 
  currentDwellMinutes, 
  onAction, 
  activeAction, 
  actionProgress 
}: LockedContentCardProps) {
  const isActionInProgress = activeAction === content.requirement.requiredAction;

  const renderRequirement = () => {
    switch (content.requirementType) {
      case 'dwell':
        const required = content.requirement.minDwellMinutes || 0;
        const progress = Math.min((currentDwellMinutes / required) * 100, 100);
        
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Stay present for {required} minutes</span>
              <span>{currentDwellMinutes}/{required} min</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        );

      case 'action':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {content.requirement.requiredAction === 'breathe' 
                ? 'Take 10 deep, mindful breaths' 
                : `Perform: ${content.requirement.requiredAction}`}
            </p>
            
            {isActionInProgress ? (
              <div className="space-y-2">
                <Progress value={actionProgress} className="h-2" />
                <p className="text-xs text-blue-600">
                  {content.requirement.requiredAction === 'breathe' 
                    ? 'Breathing... stay focused' 
                    : 'Action in progress...'}
                </p>
              </div>
            ) : (
              <Button 
                size="sm" 
                onClick={() => onAction(content.requirement.requiredAction!)}
                className="w-full"
              >
                {content.requirement.requiredAction === 'breathe' 
                  ? 'Begin Breathing Exercise' 
                  : 'Start Action'}
              </Button>
            )}
          </div>
        );

      case 'presence':
        return (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <MapPin className="h-3 w-3" />
            <span>Unlocked by being present here</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white opacity-75">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-700">{content.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {content.description}
          </p>
        </div>
        <Lock className="h-4 w-4 text-gray-400" />
      </div>
      
      {renderRequirement()}
    </div>
  );
}
