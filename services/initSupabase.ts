import { supabase, isSupabaseConfigured } from './supabaseClient';

// Utility to ensure storage buckets exist (idempotent)
async function ensureBucket(name: string, isPublic: boolean) {
  try {
    const { data: list, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const exists = list?.some((b) => b.id === name);
    if (exists) return { created: false };

    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic,
    });
    if (error) throw error;
    return { created: true };
  } catch (error: any) {
    return { created: false, error: error.message };
  }
}

export async function initializeSupabaseInfrastructure() {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase not configured. Check .env variables.' };
  }

  // Buckets to ensure (match database/storage.sql)
  const buckets = [
    { id: 'profile-images', public: true },
    { id: 'property-images', public: true },
    { id: 'service-images', public: true },
    { id: 'story-media', public: true },
    { id: 'datemi-photos', public: false },
    { id: 'creator-content', public: false },
    { id: 'documents', public: false },
  ];

  const results: Record<string, any> = {};

  // Ensure buckets exist (client-side can only create basic buckets, RLS must be applied via SQL)
  for (const b of buckets) {
    results[b.id] = await ensureBucket(b.id, b.public);
  }

  // Test basic database access by selecting counts from core tables
  const tablesToTest = [
    'users',
    'property_listings',
    'job_postings',
    'service_listings',
    'date_mi_profiles',
    'escrow_transactions',
  ];

  const dbChecks: Record<string, { ok: boolean; error?: string }> = {};
  for (const table of tablesToTest) {
    const { error } = await (supabase.from(table as any).select('count', { count: 'exact', head: true }) as any);
    dbChecks[table] = { ok: !error, error: error?.message };
  }

  return {
    success: true,
    results,
    dbChecks,
    note:
      'Buckets ensured if missing. Apply SQL policies by running database/storage.sql in Supabase SQL editor for full RLS.',
  };
}

