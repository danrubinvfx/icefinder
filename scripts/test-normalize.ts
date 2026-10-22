/**
 * Zero-dependency sanity test for title normalization.  Run: npx tsx scripts/test-normalize.ts
 */
import { normalizeCategory } from "../src/lib/normalize";

const cases: [string, string | null][] = [
  ["Adult Stick & Puck 19+", "stick_and_puck"],
  ["Stick and Puck", "stick_and_puck"],
  ["Reserve In Advance: Shoot & Score 18yrs+", "stick_and_puck"],
  ["Reserve In Advance: Shoot & Score 18yrs+ (GOALIE)", "stick_and_puck"],
  ["Leisure Skate", "public_skate"],
  ["Family Skate", "public_skate"],
  ["Toonie Skate", "public_skate"],
  ["Buy-on Ice", "figure_buyon"],
  ["Reserve in Advance: Figure Skating 8-17yrs (Level Star 2 +)", "figure_buyon"],
  ["Reserve In Advance: Recreational Hockey 50yrs+", "hockey_dropin"],
  ["Shinny", "hockey_dropin"],
  ["Adult Drop-in Hockey 19+", "hockey_dropin"],
  ["Reserve In Advance: Recreational Ringette 18yrs+", null],
  ["Intro to Hockey", null],
  ["Floor Hockey", null],
  ["Blades 2", null],
  ["Open Session Champs", "figure_buyon"],
];

let failed = 0;
for (const [title, expected] of cases) {
  const got = normalizeCategory(title);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${title.padEnd(62)} → ${got}${ok ? "" : `  (expected ${expected})`}`);
}
console.log(failed ? `\n${failed} failing` : `\nAll ${cases.length} cases pass`);
process.exit(failed ? 1 : 0);
