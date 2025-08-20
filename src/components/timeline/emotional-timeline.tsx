'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Heart, MapPin, Star } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '~/src/trpc/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const EMOTION_COLORS = {
  JOY: '#FFD700',
  SERENITY: '#87CEEB',
  SURPRISE: '#FF69B4',
  NOSTALGIA: '#DDA0DD',
  FEAR: '#8B0000',
  SADNESS: '#4169E1',
  ANGER: '#DC143C',
  HOPE: '#32CD32',
  GRATITUDE: '#FFB347',
  ANXIETY: '#800080',
};

export function EmotionalTimeline() {
  const [timeRange, setTimeRange] = useState<'4' | '12' | '26' | '52'>('12');
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');

  const { data: timelineData, isLoading } = api.user.getTimeline.useQuery({
    weeks: parseInt(timeRange),
    groupBy,
  });

  const { data: milestonesData } = api.user.getMilestones.useQuery({
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!timelineData) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Emotional Data Yet</h2>
        <p className="text-muted-foreground">
          Start sharing your emotions on the map to see your journey unfold.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = timelineData.timeline.map(period => ({
    date: new Date(period.date).toLocaleDateString('en-US', { 
      month: 'short', 
      ...(groupBy === 'week' ? { day: 'numeric' } : {})
    }),
    valence: Number(period.avgValence.toFixed(2)),
    intensity: Number(period.avgIntensity.toFixed(1)),
    emotions: period.totalEmotions,
    dominantEmotion: period.dominantEmotion,
  }));

  // Prepare emotion distribution data
  const allEmotions = timelineData.timeline.flatMap(p => 
    Object.entries(p.emotionDistribution || {})
  );
  const emotionCounts = allEmotions.reduce((acc, [emotion, count]) => {
    acc[emotion] = (acc[emotion] || 0) + count;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(emotionCounts).map(([emotion, count]) => ({
    name: emotion.toLowerCase(),
    value: count,
    color: EMOTION_COLORS[emotion as keyof typeof EMOTION_COLORS] || '#888',
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Emotional Journey</h1>
          <p className="text-muted-foreground">
            Track your emotional patterns and discover insights about yourself
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
              <SelectItem value="26">6 months</SelectItem>
              <SelectItem value="52">1 year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Emotions</p>
                <p className="text-2xl font-bold">{timelineData.overallStats.totalEmotions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Places Visited</p>
                <p className="text-2xl font-bold">{timelineData.overallStats.uniqueLocations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {timelineData.overallStats.avgValence >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Avg Valence</p>
                <p className="text-2xl font-bold">
                  {timelineData.overallStats.avgValence.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{timelineData.overallStats.milestonesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emotional Valence Over Time</CardTitle>
              <CardDescription>
                Track how your overall emotional state changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[-1, 1]} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'valence' ? Number(value).toFixed(2) : value,
                        name === 'valence' ? 'Valence' : 'Intensity'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valence" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emotional Intensity</CardTitle>
              <CardDescription>
                How intensely you experience emotions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="intensity" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ fill: '#82ca9d' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Emotion Distribution</CardTitle>
              <CardDescription>
                Breakdown of emotions you've experienced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Emotional Milestones</CardTitle>
              <CardDescription>
                Significant changes in your emotional journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestonesData?.milestones.map((milestone) => (
                <div key={milestone.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={milestone.deltaValence > 0 ? "default" : "secondary"}>
                      {milestone.deltaValence > 0 ? "Positive Shift" : "Challenging Period"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(milestone.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mt-2">{milestone.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valence change: {milestone.deltaValence > 0 ? '+' : ''}{milestone.deltaValence.toFixed(2)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
