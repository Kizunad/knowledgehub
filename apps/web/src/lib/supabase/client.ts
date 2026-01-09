import { createBrowserClient } from "@supabase/ssr";

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║                    ⚠️  Supabase 配置缺失                          ║
╠══════════════════════════════════════════════════════════════════╣
║  缺少以下环境变量:                                                ║
║  ${missingVars.join(", ").padEnd(60)}║
║                                                                  ║
║  请按照以下步骤配置:                                              ║
║                                                                  ║
║  1. 复制环境变量示例文件:                                         ║
║     cp .env.example apps/web/.env.local                          ║
║                                                                  ║
║  2. 编辑 apps/web/.env.local 并填入你的 Supabase 配置             ║
║                                                                  ║
║  3. 重启开发服务器                                                ║
║                                                                  ║
║  获取 Supabase 配置:                                              ║
║  https://supabase.com/dashboard/project/_/settings/api           ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

export function createClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock client that won't crash but won't work either
        // This allows the app to render without Supabase configured
        return null as unknown as ReturnType<typeof createBrowserClient>;
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client-side usage
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return null if not configured - components should handle this gracefully
        return null;
    }

    if (!browserClient) {
        browserClient = createClient();
    }
    return browserClient;
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}
