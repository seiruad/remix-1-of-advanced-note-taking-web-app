import { supabase as typedSupabase } from '../integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// The app schema hasn't been migrated to Lovable Cloud yet, so the generated
// typed client rejects every table name. Re-export as an untyped client so the
// existing UI (and auth) compile and run. Queries against missing tables will
// still error at runtime, but auth works.
export const supabase = typedSupabase as unknown as SupabaseClient;
