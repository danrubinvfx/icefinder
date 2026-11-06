/**
 * Zero-dependency sanity test for goalie & division detection logic.
 * Run: npx tsx scripts/test-sessions.ts
 */
import { hasGoalieNeeded, isGoalieFree, parseDivisionChips } from "../src/lib/sessions";

let failed = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    failed++;
    console.error(`✗ FAIL: ${msg}`);
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

console.log("--- Testing hasGoalieNeeded ---");
assert(
  hasGoalieNeeded({ category: "hockey_dropin", open_goalie_spots: 1 }) === true,
  "open_goalie_spots > 0 returns true",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", openGoalieSpots: 2 }) === true,
  "openGoalieSpots > 0 returns true",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", goalieSpots: 2, goaliesRegistered: 1 }) === true,
  "goalieSpots 2 with 1 registered returns true (open spot)",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", goalieSpots: 2, goaliesRegistered: 2 }) === false,
  "goalieSpots 2 with 2 registered returns false",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", rawTitle: "Adult Drop-in Hockey (Goalies Needed)" }) === true,
  "title with 'Goalies Needed' returns true",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", rawTitle: "Adult Drop-in Hockey", notes: "0/2 Goalies registered" }) === true,
  "notes with '0/2 Goalies' returns true",
);
assert(
  hasGoalieNeeded({ category: "hockey_dropin", rawTitle: "Adult Drop-in Hockey", notes: "1/2 Goalies" }) === true,
  "notes with '1/2 Goalies' returns true",
);
assert(
  hasGoalieNeeded({ category: "public_skate", open_goalie_spots: 2, rawTitle: "Public Skate" }) === false,
  "non-hockey category returns false even if spots present",
);

console.log("\n--- Testing isGoalieFree ---");
assert(
  isGoalieFree({ category: "hockey_dropin", is_goalie_free: true }) === true,
  "is_goalie_free: true returns true",
);
assert(
  isGoalieFree({ category: "hockey_dropin", isGoalieFree: true }) === true,
  "isGoalieFree: true returns true",
);
assert(
  isGoalieFree({ category: "hockey_dropin", goalieCost: 0 }) === true,
  "goalieCost: 0 returns true",
);
assert(
  isGoalieFree({ category: "hockey_dropin", notes: "Full equipment required · Goalies play free" }) === true,
  "notes with 'Goalies play free' returns true",
);
assert(
  isGoalieFree({ category: "hockey_dropin", municipality: "Burnaby" }) === true,
  "Burnaby municipal hockey drop-in policy evaluates true",
);
assert(
  isGoalieFree({ category: "hockey_dropin", municipality: "Vancouver" }) === true,
  "Vancouver municipal hockey drop-in policy evaluates true",
);
assert(
  isGoalieFree({ category: "figure_buyon", municipality: "Burnaby" }) === false,
  "non-hockey category returns false",
);

console.log("\n--- Testing parseDivisionChips ---");
const test1 = parseDivisionChips("Adult Drop-in Hockey 19+");
assert(test1.includes("19+ Adult"), "Extracts '19+ Adult'");

const test2 = parseDivisionChips("30+ Shinny Hockey");
assert(test2.includes("30+"), "Extracts '30+'");

const test3 = parseDivisionChips("Masters Drop-in 40+");
assert(test3.includes("40+"), "Extracts '40+'");

const test4 = parseDivisionChips("Senior Recreational Hockey 50yrs+");
assert(test4.includes("50+ Senior"), "Extracts '50+ Senior'");

const test5 = parseDivisionChips("Britannia Arena - Women+ Hockey 19+");
assert(test5.includes("Women / Female") && test5.includes("19+ Adult"), "Extracts 'Women / Female' & '19+ Adult'");

const test6 = parseDivisionChips("Youth Stick & Puck (11-18)");
assert(test6.includes("Youth"), "Extracts 'Youth'");

const test7 = parseDivisionChips("Everyone Welcome Skate (All Ages)");
assert(test7.includes("All Ages"), "Extracts 'All Ages'");

console.log(`\nResult: ${failed ? `${failed} failures` : "All tests passed!"}`);
process.exit(failed ? 1 : 0);
