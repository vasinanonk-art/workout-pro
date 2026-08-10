const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("js/app.module.js", "utf8");
const progress = html.match(/<section id="dash"[\s\S]*?<\/section>/)?.[0] || "";
const coach = html.match(/<section id="coach"[\s\S]*?<\/section>/)?.[0] || "";
const navigation = html.match(/<nav class="tabs">[\s\S]*?<\/nav>/)?.[0] || "";

function occurrences(source, text){ return source.split(text).length - 1; }

test("Progress page presents cleaned summaries before supporting evidence", () => {
  assert.match(progress, /<h2>PROGRESS<\/h2>/);
  const cycleAt=progress.indexOf("Current Program Cycle");
  const recentAt=progress.indexOf("Current Cycle");
  const bestAt=progress.indexOf("Best Volume Sets");
  const historyAt=progress.indexOf("Training History");
  const volumeAt=progress.indexOf("<h3>Logged Volume<\/h3>");
  assert.ok(cycleAt>=0 && recentAt>=0 && bestAt>recentAt && historyAt>bestAt && volumeAt>historyAt);
  for(const label of ["All-time Logged Volume","All-time Logged Sets","Sets by Program Cycle","Sets by Date","All-time Logged Volume by Exercise","Logged Volume by Primary Muscle","Best Volume Sets"]){
    assert.match(progress,new RegExp(label),label);
  }
});

test("account state stays in Setup and outside Progress analytics", () => {
  assert.doesNotMatch(progress,/Signed In/);
  assert.match(html.match(/<section id="setup"[\s\S]*?<\/section>/)?.[0] || "",/Signed In/);
  assert.doesNotMatch(app,/setText\("kUsers"/);
});

test("Progress reuses cycle and set-count aggregators without new classifications", () => {
  assert.match(app,/function autoWeek\(\)\{[\s\S]*dayCompleteOnDate\("Day 5",d\)[\s\S]*day5Dates\.length \+ 1;/);
  assert.match(app,/function groupByWeek\(\)\{[^\n]*x\.week\|\|1[^\n]*"Cycle "\+w/);
  assert.match(app,/function groupByDateSets\(\)\{[^\n]*g\[x\.date\]=\(g\[x\.date\]\|\|0\)\+1/);
  assert.match(app,/volumeForLogs\(state\.logs\)/);
  assert.match(app,/score=\(x\.weightKg\|\|0\)\*\(x\.reps\|\|0\)/);
  assert.doesNotMatch(progress,/Improving|Stable|Declining|Plateau|Recovery Score|Fatigue Risk|SFR|Deload/);
});

test("Progress renders each retained metric once and keeps only two charts", () => {
  for(const exact of [">All-time Logged Volume<",">All-time Logged Sets<",">Sets by Program Cycle<",">Sets by Date<",">All-time Logged Volume by Exercise<",">Logged Volume by Primary Muscle<",">Best Volume Sets<"]){
    assert.equal(occurrences(progress,exact),1,exact);
  }
  assert.equal(occurrences(progress,"<canvas "),2);
  assert.match(progress,/id="weekChart"/);
  assert.match(progress,/id="v5RecoveryChart"/);
  assert.doesNotMatch(progress,/id="(?:exChart|v5MuscleChart)"/);
  assert.match(progress,/Not a muscle-balance score\./);
});

test("Coach navigation and all legacy heuristic presentations remain hidden", () => {
  assert.match(navigation,/class="tab hidden" data-page="coach">Coach<\/button>/);
  for(const id of ["coachHeuristicCard","coachExperimentalCard","coachAdviceCard","coachMuscleCard","coachPlateauCard"]){
    const tag=coach.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] || "";
    assert.match(tag,/(?:class="[^"]*hidden|\shidden(?:\s|>))/,id);
  }
  assert.match(navigation,/data-page="dash">Progress<\/button>/);
});

test("selected-date summary and Today controls keep their existing contracts", () => {
  assert.match(app,/function todayLogs\(\)\{ return logsOnDate\(state\.selectedDate\); \}/);
  assert.match(app,/function renderDailyWorkoutSummary\(\)[\s\S]*const today=todayLogs\(\)/);
  assert.match(progress,/id="coachDailySummaryCard"[^>]*hidden/);
  assert.match(progress,/Selected Date[\s\S]*id="progressSelectedDate"/);
  assert.match(app,/state\.selectedDate===todayTH\(\)\?"Today • ":""/);
  assert.match(app,/dateLabelTH\(state\.selectedDate\)[^\n]*state\.selectedDate/);
  assert.doesNotMatch(app,/progressSelectedDate\s*:/);
  assert.doesNotMatch(app,/state\.(?:progressSelectedDate|selectedProgressDate|progressDate)\b/);
  for(const id of ["saveBtn","applyProgressionBtn","usePreviousWorkoutBtn","useLastSetBtn","quickImageBtn","quickVideoBtn","floatingRestTimer","floatingAdd30","floatingStopRest"]){
    assert.match(html,new RegExp(`id="${id}"`),id);
  }
});

test("historical selected dates never receive the Today prefix", () => {
  assert.match(app,/const prefix=state\.selectedDate===todayTH\(\)\?"Today • ":""/);
  assert.match(app,/`\$\{prefix\}\$\{dateLabelTH\(state\.selectedDate\)\} \(\$\{state\.selectedDate\}\)`/);
  assert.doesNotMatch(app,/prefix=.*selectedDate.*<=|prefix=.*selectedDate.*>=/);
});

test("existing user actions remain available in their retained destinations", () => {
  for(const id of ["loginBtn","logoutBtn","saveTeamBtn","calendarGoLogBtn","exportJsonBtn","exportCsvBtn","v5ExportJsonBtn","v5ExportCsvBtn","v430CopySummaryBtn"]){
    assert.match(html,new RegExp(`id="${id}"`),id);
  }
});
