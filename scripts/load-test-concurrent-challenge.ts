/**
 * Stress test: N parallel operations matching real app flows.
 *
 * Usage:
 *   npx tsx scripts/load-test-concurrent-challenge.ts group <6-digit-pin> [count=300]
 *   npx tsx scripts/load-test-concurrent-challenge.ts single <6-digit-pin> [count=300]
 *
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (from .env)
 * If RLS blocks inserts, set SUPABASE_SERVICE_ROLE_KEY to use the service client instead.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const PREFIX = "loadtest_";

function getClient(): SupabaseClient {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const key = serviceKey || anonKey;
    if (!url || !key) {
        console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
        process.exit(1);
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function fetchSessionByPin(supabase: SupabaseClient, pin: string) {
    const { data, error } = await supabase
        .from("challenge_sessions")
        .select("id, pin, mode, status, max_players")
        .eq("pin", pin)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function runGroupJoin(supabase: SupabaseClient, sessionId: string, count: number) {
    const started = performance.now();
    const tasks = Array.from({ length: count }, (_, i) =>
        supabase
            .from("player_sessions")
            .insert({
                session_id: sessionId,
                user_id: null,
                name: `${PREFIX}player_${i}_${Date.now()}`,
                is_host: false,
                is_online: true,
            })
            .select("id")
            .single()
    );
    const results = await Promise.allSettled(tasks);
    const ms = Math.round(performance.now() - started);
    let ok = 0;
    const errors: string[] = [];
    for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error && r.value.data) ok++;
        else if (r.status === "fulfilled" && r.value.error)
            errors.push(r.value.error.message || String(r.value.error));
        else if (r.status === "rejected") errors.push(String(r.reason));
    }
    return { ok, failed: count - ok, ms, sampleErrors: [...new Set(errors)].slice(0, 5) };
}

async function runSingleResults(supabase: SupabaseClient, sessionId: string, count: number) {
    const dummyQuestionResults = [{ questionId: "00000000-0000-0000-0000-000000000001", correct: true, timeTaken: 1, pointsEarned: 10 }];
    const started = performance.now();
    const tasks = Array.from({ length: count }, (_, i) =>
        supabase
            .from("challenge_results")
            .insert({
                session_id: sessionId,
                user_id: null,
                participant_display_name: `${PREFIX}guest_${i}`,
                total_questions: 1,
                correct_answers: 1,
                wrong_answers: 0,
                score: 10,
                max_score: 10,
                percentage: 100,
                time_taken: 5,
                avg_time_per_question: 5,
                longest_streak: 1,
                accuracy: 1,
                level: "اختبار",
                question_results: dummyQuestionResults,
            })
            .select("id")
            .single()
    );
    const results = await Promise.allSettled(tasks);
    const ms = Math.round(performance.now() - started);
    let ok = 0;
    const errors: string[] = [];
    for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error && r.value.data) ok++;
        else if (r.status === "fulfilled" && r.value.error)
            errors.push(r.value.error.message || String(r.value.error));
        else if (r.status === "rejected") errors.push(String(r.reason));
    }
    return { ok, failed: count - ok, ms, sampleErrors: [...new Set(errors)].slice(0, 5) };
}

async function main() {
    const mode = (process.argv[2] || "").toLowerCase();
    const pin = (process.argv[3] || "").trim();
    const count = Math.min(2000, Math.max(1, parseInt(process.argv[4] || "300", 10)));

    if (!mode || !/^\d{6}$/.test(pin)) {
        console.log(`Usage:
  npx tsx scripts/load-test-concurrent-challenge.ts group <pin> [count]
  npx tsx scripts/load-test-concurrent-challenge.ts single <pin> [count]

Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env.
Optional SUPABASE_SERVICE_ROLE_KEY if RLS rejects anon inserts.`);
        process.exit(mode ? 1 : 0);
    }

    const supabase = getClient();
    const session = await fetchSessionByPin(supabase, pin);
    if (!session) {
        console.error(`No challenge_sessions row for pin ${pin}`);
        process.exit(1);
    }

    const modeNorm = String(session.mode || "").toUpperCase();
    if (mode === "group" && modeNorm !== "GROUP") {
        console.warn(`Session mode is ${session.mode}, not GROUP — continuing anyway.`);
    }
    if (mode === "single" && modeNorm !== "SINGLE") {
        console.warn(`Session mode is ${session.mode}, not SINGLE — results still use this session_id if inserts succeed.`);
    }

    console.log(`Session ${session.id} max_players=${(session as { max_players?: number }).max_players ?? "?"}`);
    console.log(`Running ${count} concurrent ${mode === "group" ? "player_sessions inserts" : "challenge_results inserts"}...`);

    const summary =
        mode === "group"
            ? await runGroupJoin(supabase, session.id, count)
            : await runSingleResults(supabase, session.id, count);

    console.log(`Done in ${summary.ms}ms: ${summary.ok} ok, ${summary.failed} failed`);
    if (summary.sampleErrors.length) {
        console.log("Sample errors:", summary.sampleErrors);
    }
    if (summary.ok > 0) {
        console.log(
            `\nCleanup (optional): delete test rows, then re-run counts as needed.\n` +
                (mode === "group"
                    ? `DELETE FROM player_sessions WHERE session_id = '${session.id}' AND name LIKE '${PREFIX}%';`
                    : `DELETE FROM challenge_results WHERE session_id = '${session.id}' AND participant_display_name LIKE '${PREFIX}%';`)
        );
    }

    process.exit(summary.failed > 0 ? 2 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
