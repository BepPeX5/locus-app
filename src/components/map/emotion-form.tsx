'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { EmotionType, VisibilityType } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '~/src/trpc/react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const emotionSchema = z.object({
  emotion: z.nativeEnum(EmotionType),
  intensity: z.number().min(0).max(100),
  note: z.string().max(280).optional(),
  tags: z.array(z.string()).max(10).default([]),
  visibility: z.nativeEnum(VisibilityType).default(VisibilityType.PUBLIC),
  ttlHours: z.number().int().min(1).max(168).optional(),
  isVolatile: z.boolean().default(false),
});

type EmotionFormData = z.infer<typeof emotionSchema>;

interface EmotionFormProps {
  h3Index: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const EMOTION_OPTIONS = [
  { value: EmotionType.JOY, label: 'Joy', emoji: '😊' },
  { value: EmotionType.SERENITY, label: 'Serenity', emoji: '😌' },
  { value: EmotionType.SURPRISE, label: 'Surprise', emoji: '😮' },
  { value: EmotionType.NOSTALGIA, label: 'Nostalgia', emoji: '🥺' },
  { value: EmotionType.FEAR, label: 'Fear', emoji: '😰' },
  { value: EmotionType.SADNESS, label: 'Sadness', emoji: '😢' },
  { value: EmotionType.ANGER, label: 'Anger', emoji: '😠' },
  { value: EmotionType.HOPE, label: 'Hope', emoji: '🙏' },
  { value: EmotionType.GRATITUDE, label: 'Gratitude', emoji: '🙏' },
  { value: EmotionType.ANXIETY, label: 'Anxiety', emoji: '😰' },
];

const COMMON_TAGS = [
  'work', 'home', 'family', 'friends', 'travel', 'nature', 'art', 
  'music', 'food', 'sport', 'meditation', 'memory', 'celebration',
  'solitude', 'community', 'love', 'discovery'
];

export function EmotionForm({ h3Index, onClose, onSubmitted }: EmotionFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const addEmotionMutation = api.emotions.add.useMutation({
    onSuccess: () => {
      onSubmitted();
    },
    onError: (error) => {
      console.error('Failed to add emotion:', error);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmotionFormData>({
    resolver: zodResolver(emotionSchema),
    defaultValues: {
      intensity: 50,
      visibility: VisibilityType.PUBLIC,
      isVolatile: false,
    },
  });

  const watchedIntensity = watch('intensity');
  const watchedEmotion = watch('emotion');
  const watchedIsVolatile = watch('isVolatile');

  const onSubmit = (data: EmotionFormData) => {
    // Simulate dwell time and GPS accuracy
    const dwellSeconds = Math.floor(Math.random() * 300) + 30; // 30s - 5min
    const gpsAccuracy = Math.floor(Math.random() * 20) + 5; // 5-25m

    addEmotionMutation.mutate({
      h3Index,
      emotion: data.emotion,
      intensity: data.intensity,
      note: data.note || undefined,
      tags: selectedTags,
      dwellSeconds,
      gpsAccuracy,
      visibility: data.visibility,
      ttlHours: data.isVolatile ? (data.ttlHours || 24) : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag].slice(0, 10) // Max 10 tags
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()].slice(0, 10));
      setCustomTag('');
    }
  };

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Share Your Emotion</CardTitle>
              <CardDescription>
                Leave your emotional mark on this place
              </CardDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Emotion Selection */}
            <div className="space-y-2">
              <Label>What are you feeling?</Label>
              <Select onValueChange={(value) => setValue('emotion', value as EmotionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an emotion" />
                </SelectTrigger>
                <SelectContent>
                  {EMOTION_OPTIONS.map((emotion) => (
                    <SelectItem key={emotion.value} value={emotion.value}>
                      <span className="flex items-center gap-2">
                        <span>{emotion.emoji}</span>
                        <span>{emotion.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.emotion && (
                <p className="text-sm text-destructive">{errors.emotion.message}</p>
              )}
            </div>

            {/* Intensity Slider */}
            <div className="space-y-2">
              <Label>Intensity: {watchedIntensity}/100</Label>
              <Slider
                value={[watchedIntensity]}
                onValueChange={(values) => setValue('intensity', values[0]!)}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Describe what you're feeling or why..."
                maxLength={280}
                {...register('note')}
              />
              {errors.note && (
                <p className="text-sm text-destructive">{errors.note.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                />
              </div>
            </div>

            {/* Volatility Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="volatile"
                  checked={watchedIsVolatile}
                  onCheckedChange={(checked) => setValue('isVolatile', !!checked)}
                />
                <Label htmlFor="volatile">Make this emotion temporary</Label>
              </div>
              
              {watchedIsVolatile && (
                <div className="space-y-2">
                  <Label htmlFor="ttlHours">Expires after (hours)</Label>
                  <Input
                    id="ttlHours"
                    type="number"
                    min={1}
                    max={168}
                    defaultValue={24}
                    {...register('ttlHours', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select 
                defaultValue={VisibilityType.PUBLIC}
                onValueChange={(value) => setValue('visibility', value as VisibilityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VisibilityType.PUBLIC}>
                    Public - Everyone can see
                  </SelectItem>
                  <SelectItem value={VisibilityType.PRIVATE}>
                    Private - Only you can see
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={addEmotionMutation.isPending || !watchedEmotion}
            >
              {addEmotionMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sharing...
                </>
              ) : (
                'Share Emotion'
              )}
            </Button>

            {addEmotionMutation.error && (
              <p className="text-sm text-destructive">
                {addEmotionMutation.error.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
