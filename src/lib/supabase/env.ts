const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && anonKey);

export const getSupabaseEnv = () => {
  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, anonKey };
};

export const hasSupabaseServiceRoleEnv = Boolean(url && serviceRoleKey);

export const getSupabaseServiceRoleEnv = () => {
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return { url, serviceRoleKey };
};
