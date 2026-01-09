import { createApiClient } from "../lib/api-client.js";

/**
 * Health check command - Test Supabase database connectivity
 *
 * Usage:
 *   hub health           - Quick health check
 *   hub health --full    - Run comprehensive database tests
 *   hub health --json    - Output as JSON
 */

interface HealthOptions {
    full?: boolean;
    json?: boolean;
}

export async function healthCommand(options: HealthOptions = {}): Promise<void> {
    const { full = false, json = false } = options;

    // Create API client
    const client = await createApiClient();

    if (!client) {
        if (json) {
            console.log(
                JSON.stringify({
                    success: false,
                    error: "Not configured. Run 'hub init' first.",
                }),
            );
        } else {
            console.error("❌ Hub not configured. Run 'hub init' first.");
        }
        process.exit(1);
    }

    if (!json) {
        console.log("🔍 Checking Hub connectivity...\n");
    }

    try {
        // Run connectivity check
        const connectivity = await client.checkConnectivity();

        if (json) {
            // JSON output mode
            if (full) {
                // Also run database tests
                const testResult = await client.runDatabaseTests();
                console.log(
                    JSON.stringify(
                        {
                            connectivity,
                            tests: testResult.success ? testResult.data : null,
                            error: testResult.error,
                        },
                        null,
                        2,
                    ),
                );
            } else {
                console.log(JSON.stringify(connectivity, null, 2));
            }
            return;
        }

        // Human-readable output
        console.log("📡 API Connection");
        if (connectivity.api.ok) {
            console.log(`   ✅ ${connectivity.api.message}`);
        } else {
            console.log(`   ❌ ${connectivity.api.message}`);
        }

        console.log("\n💾 Database");
        if (connectivity.database.ok) {
            const latency = connectivity.database.latency_ms
                ? ` (${connectivity.database.latency_ms}ms)`
                : "";
            console.log(`   ✅ ${connectivity.database.message}${latency}`);
        } else {
            console.log(`   ❌ ${connectivity.database.message}`);
        }

        console.log("\n🔄 Realtime");
        if (connectivity.realtime.ok) {
            console.log(`   ✅ ${connectivity.realtime.message}`);
        } else {
            console.log(`   ⚠️  ${connectivity.realtime.message}`);
        }

        // Run full database tests if requested
        if (full && connectivity.database.ok) {
            console.log("\n📊 Running comprehensive database tests...\n");

            const testResult = await client.runDatabaseTests();

            if (testResult.success && testResult.data) {
                const { tests, total_latency_ms } = testResult.data;

                console.log("   Test Results:");
                for (const [testName, result] of Object.entries(tests)) {
                    const icon = result.success ? "✅" : "❌";
                    const latency = `(${result.latency_ms}ms)`;
                    const error = result.error ? ` - ${result.error}` : "";
                    console.log(
                        `   ${icon} ${testName.padEnd(20)} ${latency}${error}`,
                    );
                }

                console.log(`\n   Total latency: ${total_latency_ms}ms`);

                const allPassed = Object.values(tests).every((t) => t.success);
                if (allPassed) {
                    console.log("   ✅ All tests passed!");
                } else {
                    console.log("   ⚠️  Some tests failed");
                }
            } else {
                console.log(`   ❌ Test failed: ${testResult.error}`);
            }
        }

        // Summary
        console.log("\n" + "─".repeat(40));
        const allOk =
            connectivity.api.ok &&
            connectivity.database.ok &&
            connectivity.realtime.ok;

        if (allOk) {
            console.log("✅ All systems operational");
        } else if (connectivity.api.ok && connectivity.database.ok) {
            console.log("⚠️  Mostly operational (Realtime unavailable)");
        } else if (connectivity.api.ok) {
            console.log("❌ Database connection failed");
            process.exit(1);
        } else {
            console.log("❌ API connection failed");
            process.exit(1);
        }
    } catch (error) {
        if (json) {
            console.log(
                JSON.stringify({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                }),
            );
        } else {
            console.error(
                `\n❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
        process.exit(1);
    }
}

export default healthCommand;
