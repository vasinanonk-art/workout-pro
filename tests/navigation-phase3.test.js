const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html","utf8");
const app = fs.readFileSync("js/app.module.js","utf8");
const css = fs.readFileSync("css/styles.css","utf8");
const nav = html.match(/<nav class="tabs"[\s\S]*?<\/nav>/)?.[0] || "";
const settings = html.match(/<section id="setup"[\s\S]*?<\/section>/)?.[0] || "";
const log = html.match(/<section id="log"[\s\S]*?<\/section>/)?.[0] || "";

test("primary navigation has exactly five destinations with preserved routes", () => {
  const tabs=[...nav.matchAll(/<button class="tab(?: active)?" data-page="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(match=>({route:match[1],label:match[2]}));
  assert.deepEqual(tabs,[
    {route:"log",label:"Today"},
    {route:"dash",label:"Progress"},
    {route:"calendar",label:"Calendar"},
    {route:"program",label:"Program"},
    {route:"setup",label:"Settings"}
  ]);
  assert.doesNotMatch(nav,/coach|guide|backup|donate/i);
  for(const route of ["log","dash","calendar","program","setup"]){ assert.match(html,new RegExp(`<section id="${route}"`),route); }
  for(const route of ["coach","guide","backup","donate"]){ assert.match(html,new RegExp(`<section id="${route}"`),route); }
});

test("active navigation follows the internal route without copying page state", () => {
  const showBody=app.match(/function show\(page\)\{([^\n]+)\}/)?.[1] || "";
  assert.match(showBody,/classList\.toggle\("active", b\.dataset\.page===destination\)/);
  assert.match(showBody,/state\.page=destination/);
  assert.doesNotMatch(showBody,/selectedDate|selectedExercise|logs|weight|reps|timer/);
  assert.equal((nav.match(/class="tab active"/g)||[]).length,1);
  assert.match(nav,/class="tab active" data-page="setup"/);
});

test("legacy routes resolve to valid primary destinations without changing shared state", () => {
  assert.match(app,/const LEGACY_PAGE_ROUTES=Object\.freeze\(\{coach:"dash",guide:"program",backup:"setup",donate:"setup"\}\)/);
  const showBody=app.match(/function show\(page\)\{([^\n]+)\}/)?.[1] || "";
  assert.match(showBody,/const destination=LEGACY_PAGE_ROUTES\[page\]\|\|page/);
  assert.match(showBody,/\$\(destination\)\?\.classList\.add\("active"\)/);
  assert.doesNotMatch(showBody,/selectedDate|selectedExercise|selectedAlt|timerEndAt|timerId/);
});

test("five-tab mobile layout has fixed columns and shared timer clearance", () => {
  assert.match(css,/\.tabs\{display:grid!important;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important;overflow:hidden!important/);
  assert.match(css,/\.tabs \.tab\{[^}]*min-width:0!important;[^}]*min-height:44px!important/);
  assert.match(css,/\.tabs\{min-height:var\(--mobile-nav-clearance\)\}/);
  assert.match(css,/\.floating-rest-timer\{[^}]*bottom:calc\(var\(--mobile-nav-clearance\) \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/\.statusbar\.show\{bottom:calc\(var\(--mobile-nav-clearance\) \+ env\(safe-area-inset-bottom\) \+ 4px\)\}/);
});

test("Settings contains account notifications backup about and advanced access", () => {
  for(const label of ["Account","Team ID","Notifications","Data &amp; Backup","About","Advanced"]){ assert.match(settings,new RegExp(label),label); }
  for(const id of ["loginBtn","logoutBtn","teamId","saveTeamBtn","notificationCard","exportJsonBtn","exportCsvBtn","backupStatus","persistentSubStatus","dayDateLockDebug","v430ExerciseDb"]){
    assert.match(settings,new RegExp(`id="${id}"`),id);
  }
  assert.match(settings,/<summary>Donate<\/summary>/);
  assert.doesNotMatch(settings,/id="notificationCard"[^>]*(?:class="[^"]*hidden|\shidden(?:\s|>))/);
  assert.match(app,/card\.innerHTML = `<h3>Rest Notification<\/h3>[\s\S]*id="enableNotifyBtn"[\s\S]*id="testNotifyBtn"[\s\S]*id="toggleNotifyBtn"/);
  assert.match(app,/\$\("enableNotifyBtn"\)\?\.addEventListener\("click", enableNotifications\)/);
  assert.match(app,/\$\("exportJsonBtn"\)\?\.addEventListener\("click",exportJson\)/);
  assert.match(app,/\$\("exportCsvBtn"\)\?\.addEventListener\("click",exportCsv\)/);
  assert.match(app,/function renderSetup\(\)[\s\S]*renderBackup\(\);[\s\S]*renderAdvancedSettings\(\);/);
});

test("Today exposes only a guarded manual override path when locked", () => {
  assert.match(log,/id="todayOverrideAccess"[^>]*hidden/);
  assert.doesNotMatch(log,/settings-advanced-panel|id="v430ExerciseDb"|id="persistentSubStatus"/);
  assert.match(app,/const visible=state\.page==="log" && lock\.status!=="OPEN" && lock\.code!=="FUTURE_DATE" && !state\.editingId/);
  assert.match(app,/todayOverrideDayBtn[\s\S]*applyDayOverride/);
  assert.match(app,/function applyDayOverride\(day\)[\s\S]*grantOverride\(d\)/);
  assert.match(app,/function applyDayOverride\(day\)\{\s*if\(dayDiff\(state\.selectedDate,todayTH\(\)\)>0\)\{[^}]*return;/);
  assert.match(app,/manual override replaces Rest Day presentation with normal workout progress|grantOverride/);
});

test("historical sets retain visible inspect edit and delete controls", () => {
  assert.match(log,/id="logRecentCard"[^>]*><h3>Recent Sets<\/h3><div id="recent"><\/div>/);
  assert.match(app,/class="secondary edit-log"[\s\S]*class="orange del-log"/);
  assert.match(app,/\.edit-log"\)\.forEach\(btn=>btn\.addEventListener\("click",\(\)=>loadEdit\(btn\.dataset\.id\)\)\)/);
  assert.match(app,/\.del-log"\)\.forEach\(btn=>btn\.addEventListener\("click",\(\)=>deleteLog\(btn\.dataset\.id\)\)\)/);
  assert.match(app,/function loadEdit\(id\)[\s\S]*show\("log"\)/);
  assert.match(app,/async function deleteLog\(id\)[\s\S]*deleteDoc/);
});

test("shared selected date and workout form survive primary navigation", () => {
  assert.match(app,/function selectCalendarDate\(date\)\{\s*state\.selectedDate=date;/);
  assert.match(app,/calendarGoLogBtn[\s\S]*show\("log"\)/);
  const showBody=app.match(/function show\(page\)\{([^\n]+)\}/)?.[1] || "";
  assert.doesNotMatch(showBody,/setVal|resetForm|selectedDate|selectedExercise|selectedAlt/);
});

test("timer and exercise media keep their Today behavior across navigation", () => {
  assert.match(app,/const visible=state\.page==="log" && Boolean\(state\.timerEndAt && state\.timerLeft>0\)/);
  assert.match(app,/function show\(page\)[^\n]*scheduleRender\(\)/);
  assert.doesNotMatch(app.match(/function show\(page\)\{([^\n]+)\}/)?.[1] || "",/stopTimer|timerEndAt|timerId/);
  for(const id of ["quickImageBtn","quickVideoBtn"]){ assert.match(log,new RegExp(`id="${id}"`),id); }
  for(const id of ["floatingRestTimer","floatingAdd30","floatingStopRest"]){ assert.match(html,new RegExp(`id="${id}"`),id); }
  assert.match(app,/\$\("quickImageBtn"\)\?\.addEventListener\("click",\(\)=>openExerciseMedia\("image"\)\)/);
  assert.match(app,/\$\("quickVideoBtn"\)\?\.addEventListener\("click",\(\)=>openExerciseMedia\("video"\)\)/);
});
