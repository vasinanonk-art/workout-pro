const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("js/app.module.js", "utf8");
function tagForId(id){ return html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] || ""; }

test("Dashboard labels describe the existing calculations precisely", () => {
  for (const misleading of ["Active Users", "Auto Week", "Weekly Progress", "Weekly Sets", "Top Exercise Volume", "PR Board", "Recovery / Fatigue Trend", "Muscle Balance"]){
    assert.doesNotMatch(html, new RegExp(misleading));
  }
  for (const accurate of ["All-time Logged Volume", "All-time Logged Sets", "Signed In", "Program Cycle", "Sets by Program Cycle", "All-time Logged Volume by Exercise", "Best Volume Set", "Sets by Date", "Logged Volume by Primary Muscle", "Not a muscle-balance score."]){
    assert.match(html, new RegExp(accurate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /setText\("kVol", volumeForLogs\(state\.logs\)\.toFixed\(0\)\)/);
  assert.match(app, /setText\("kUsers", state\.user\?"Yes":"No"\)/);
  assert.match(app, /setText\("kWeek", `Cycle \$\{autoWeek\(\)\}`\)/);
  assert.match(app, /function autoWeek\(\)\{[\s\S]*dayCompleteOnDate\("Day 5",d\)[\s\S]*day5Dates\.length \+ 1;/);
  assert.match(app, /drawSimpleChart\("weekChart", groupByWeek\(\)\)/);
  assert.match(app, /g\["Cycle "\+w\]/);
  assert.match(app, /drawSimpleChart\("v5RecoveryChart", groupByDateSets\(\)\)/);
});

test("unsupported Coach claims are absent from normal UI", () => {
  for (const misleading of ["Effective Reps 7d", "SFR Score", "Deload Signal", "Recovery Score", "Fatigue Risk", ">Progression<", "Plateau Detection", "Muscle Volume Balance"]){
    assert.doesNotMatch(html, new RegExp(misleading));
  }
  for (const id of ["coachHeuristicCard", "coachExperimentalCard", "coachAdviceCard", "coachMuscleCard", "coachPlateauCard"]){
    assert.match(tagForId(id), /(?:class="[^"]*hidden|\shidden(?:\s|>))/, id);
  }
  assert.match(html, /Hard Sets Today \(RIR ≤ 2\)/);
  assert.match(html, /Recent Set-Volume (?:Trend|Heuristic)/);
  assert.match(app, /muscleCard\.hidden=true/);
  assert.match(app, /plateauCard\.hidden=true/);
  assert.doesNotMatch(app, /<br>Plateau:/);
});

test("hidden legacy heuristics have no normal Coach render path", () => {
  assert.match(fs.readFileSync("css/styles.css", "utf8"), /\.hidden\{display:none!important\}/);
  for (const id of ["coachHeuristicCard", "coachExperimentalCard", "coachAdviceCard"]){
    assert.match(tagForId(id), /class="[^"]*hidden/, id);
    assert.doesNotMatch(app, new RegExp(`${id}[^\\n]*hidden\\s*=\\s*false`), id);
  }
  assert.match(app, /muscleCard\.hidden=true/);
  assert.match(app, /plateauCard\.hidden=true/);
  assert.match(app, /dailySummaryCard\.hidden=!today\.length/);
  assert.doesNotMatch(app, /(?:coachHeuristicCard|coachExperimentalCard|coachAdviceCard)[^\n]*\.hidden\s*=/);
});

test("Progression Engine workout UI remains separate from hidden Coach diagnostics", () => {
  assert.match(html, /id="performanceSuggested"/);
  assert.match(html, /id="applyProgressionBtn"/);
  assert.match(app, /function progressionSuggestion\(/);
  assert.match(app, /function applyProgressionSuggestion\(/);
  assert.match(tagForId("coachHeuristicCard"), /class="[^"]*hidden/);
});

test("Calendar legend advertises only generated date classes", () => {
  const legend = html.match(/<div class="calendar-legend">([\s\S]*?)<\/div>/)?.[1] || "";
  assert.match(legend, /leg completed/);
  assert.match(legend, /leg partial/);
  assert.doesNotMatch(legend, /leg (?:rest|skip|miss)/);
  assert.match(app, /return "completed";/);
  assert.match(app, /return "partial";/);
});

test("Phase 2A does not remove active workout controls", () => {
  for (const id of ["saveBtn", "applyProgressionBtn", "usePreviousWorkoutBtn", "useLastSetBtn", "quickImageBtn", "quickVideoBtn", "floatingRestTimer", "floatingAdd30", "floatingStopRest"]){
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});
