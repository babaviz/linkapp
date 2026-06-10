-- Enable Supabase Realtime (postgres_changes) for Date Mi likes + calls
-- NOTE: This is required for Supabase `postgres_changes` subscriptions to receive events.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'datemi_likes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.datemi_likes;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'calls'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
    END IF;
  END IF;
END $$;

