'use client';

import { useState } from 'react';
import { Calendar, Leaf, Snowflake, Sun, Target, Trophy, MapPin, Clock } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '~/src/trpc/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const SEASON_ICONS = {
  SPRING: Leaf,
  SUMMER: Sun,
  AUTUMN: Calendar,
  WINTER: Snowflake,
};

const SEASON_COLORS = {
  SPRING: 'text-green-500',
  SUMMER: 'text-yellow-500', 
  AUTUMN: 'text-orange-500',
  WINTER: 'text-blue-500',
};

export function SeasonalMissions() {
  const [selectedTab, setSelectedTab] = useState('current');

  const { data: currentSeason } = api.seasonal.getCurrentSeason.useQuery();
  const { data: missionsData, isLoading } = api.seasonal.getMissions.useQuery();
  const { data: allSeasons } = api.seasonal.getAllSeasons.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentSeason || !missionsData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">No Active Season</h2>
        <p className="text-muted-foreground">
          There are no seasonal missions available at the moment.
        </p>
      </div>
    );
  }

  const SeasonIcon = SEASON_ICONS[currentSeason.season];
  const seasonColor = SEASON_COLORS[currentSeason.season];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <SeasonIcon className={`h-8 w-8 ${seasonColor}`} />
          <h1 className="text-3xl font-bold">
            {currentSeason.season} Missions
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {currentSeason.theme === 'MEMORY' && 'Explore places of remembrance and nostalgia'}
          {currentSeason.theme === 'REBIRTH' && 'Discover locations of renewal and hope'}
          {currentSeason.theme === 'CELEBRATION' && 'Find joy and celebration in the world'}
          {currentSeason.theme === 'INTROSPECTION' && 'Seek serenity and quiet contemplation'}
          {currentSeason.theme === 'CONTEMPLATION' && 'Reflect on the deeper meanings of places'}
          {currentSeason.theme === 'CONNECTION' && 'Build emotional bonds with locations'}
        </p>
        <Badge variant="outline" className="px-4 py-2">
          <Clock className="h-4 w-4 mr-2" />
          {new Date(currentSeason.endDate).toLocaleDateString()} - Season ends
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {missionsData.userProgress.totalEmotions}
              </div>
              <div className="text-sm text-muted-foreground">
                Emotions Shared
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {missionsData.userProgress.uniqueLocations}
              </div>
              <div className="text-sm text-muted-foreground">
                Places Visited
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {missionsData.userProgress.completedMissions}/{missionsData.missions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Missions Complete
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missions */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Active Missions</TabsTrigger>
          <TabsTrigger value="all">All Seasons</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid gap-4">
            {missionsData.missions.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {allSeasons?.map((season) => {
              const Icon = SEASON_ICONS[season.season];
              const color = SEASON_COLORS[season.season];
              
              return (
                <Card key={season.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${color}`} />
                      {season.season} - {season.theme}
                    </CardTitle>
                    <CardDescription>
                      {new Date(season.startDate).toLocaleDateString()} - {' '}
                      {new Date(season.endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={season.isActive ? "default" : "secondary"}>
                      {season.isActive ? "Active" : "Completed"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: string;
}

function MissionCard({ mission }: { mission: Mission }) {
  const progressPercentage = Math.min((mission.progress / mission.target) * 100, 100);

  return (
    <Card className={mission.completed ? 'border-green-500 bg-green-50/50' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {mission.title}
              {mission.completed && (
                <Badge className="ml-2">
                  <Trophy className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{mission.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{mission.progress}/{mission.target}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">Reward:</span>
          <span className="text-sm text-muted-foreground">{mission.reward}</span>
        </div>

        {mission.completed && (
          <Button className="w-full" disabled>
            <Trophy className="h-4 w-4 mr-2" />
            Mission Completed!
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
