-- Create short videos table
CREATE TABLE IF NOT EXISTS date_mi_short_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES date_mi_profiles(id) ON DELETE CASCADE,
  caption TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create video likes table
CREATE TABLE IF NOT EXISTS date_mi_video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES date_mi_short_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Create video favorites table
CREATE TABLE IF NOT EXISTS date_mi_video_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES date_mi_short_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Create increment functions
CREATE OR REPLACE FUNCTION increment_video_likes(video_id UUID, delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE date_mi_short_videos 
  SET likes_count = likes_count + delta 
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_video_favorites(video_id UUID, delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE date_mi_short_videos 
  SET favorites_count = favorites_count + delta 
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_video_views(video_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE date_mi_short_videos 
  SET views_count = views_count + 1 
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('datemi-short-videos', 'datemi-short-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'datemi-short-videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'datemi-short-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'datemi-short-videos' AND auth.uid()::text = SPLIT_PART(name, '/', 1));