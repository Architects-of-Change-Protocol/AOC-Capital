import { createPrivilegedSupabaseClient, type PrivilegedAccessContext } from "@/lib/security/privileged-access";

export const createSupabaseServiceRoleClient = (context: PrivilegedAccessContext) => createPrivilegedSupabaseClient(context);
