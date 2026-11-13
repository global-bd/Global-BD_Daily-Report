/** @OnlyCurrentDoc */
/**
 * 해외사업팀 일일보고 - Google Sheets 백엔드 (Apps Script 웹 앱)
 *
 * 배포: 배포 → 새 배포 → 유형: 웹 앱
 *   - 다음 사용자 인증 정보로 실행: 나
 *   - 액세스 권한이 있는 사용자: 모든 사용자
 * 코드를 고친 뒤에는 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포 해야 반영됩니다.
 *
 * 팀장 승인 (이호용 상무 전용)
 *   프로젝트 설정(톱니바퀴) → 스크립트 속성 → 속성 추가
 *     속성: LEADER_PIN   값: 팀장 비밀번호 (6자 이상 권장, 팀장님만 알도록)
 *   - 승인/승인 취소는 setApproval 요청으로만 바뀌며, 비밀번호가 맞을 때만 처리됩니다.
 *   - 일반 저장(saveReport)으로 들어온 승인 정보는 무시하고 시트에 있던 값을 유지합니다.
 *   - 비밀번호를 5번 틀리면 10분 동안 잠깁니다.
 *
 * 시트 구성 (자동 생성)
 *   reports  : 보고 1건 1행 (마지막 json 열이 원본. 직접 고치지 마세요)
 *   tasks    : 업무 1건 1행 (오늘 한 일 + 다음 근무일 계획) → 피벗·필터 분석용
 *   issues   : 이슈 1건 1행
 *   pipeline : 파이프라인 변동 1건 1행
 *   decisions: ELT 의사결정 안건 1건 1행
 *   team     : 팀 구성 (B1 셀이 원본 JSON, 3행부터 보기용 목록)
 */

var HEAD = {
  reports: ["id", "date", "memberId", "memberName", "region", "workType", "location", "load",
    "tasks", "done", "inProgress", "waiting", "delayed", "openIssues", "notes", "submittedAt", "updatedAt", "json"],
  tasks: ["reportId", "date", "memberName", "region", "kind", "cat", "client", "content", "status"],
  issues: ["reportId", "date", "memberName", "no", "level", "content", "target", "resolved", "resolvedAt"],
  pipeline: ["reportId", "date", "memberName", "client", "country", "stage", "amount", "currency", "expected", "note"],
  decisions: ["reportId", "date", "memberName", "no", "title", "deadline", "amount", "currency", "detail", "recommend", "status", "result", "decidedAt"]
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "all";
  try {
    if (action === "all") return out_({ ok: true, team: readTeam_(), reports: readReports_() });
    if (action === "ping") return out_({ ok: true, time: new Date().toISOString() });
    return out_({ ok: false, error: "알 수 없는 요청입니다: " + action });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.action === "saveTeam") { saveTeam_(body.team); return out_({ ok: true }); }
    if (body.action === "saveReport") { saveReport_(body.report); return out_({ ok: true }); }
    if (body.action === "deleteReport") { deleteReport_(String(body.id || "")); return out_({ ok: true }); }
    if (body.action === "verifyLeader") { checkLeaderPin_(body.pin); return out_({ ok: true }); }
    if (body.action === "setApproval") { checkLeaderPin_(body.pin); setApproval_(String(body.id || ""), !!body.approve); return out_({ ok: true }); }
    return out_({ ok: false, error: "알 수 없는 요청입니다: " + body.action });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------------- team ---------------- */
function readTeam_() {
  var sh = sheet_("team");
  var raw = sh.getRange("B1").getValue();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (x) { return null; }
}

function saveTeam_(team) {
  if (!team || !Array.isArray(team.members)) throw new Error("팀 정보 형식이 올바르지 않습니다.");
  var sh = sheet_("team");
  sh.clearContents();
  sh.getRange("A1:B1").setValues([["json (직접 수정 금지)", JSON.stringify(team)]]);
  var leader = team.leader && team.leader.name ? team.leader.name + (team.leader.title ? " " + team.leader.title : "") : "";
  var rows = [["id", "name", "title", "region", "role"]];
  team.members.forEach(function (m) { rows.push([m.id || "", m.name || "", m.title || "", m.region || "", m.role || ""]); });
  sh.getRange(3, 1, rows.length, 5).setNumberFormat("@").setValues(rows);
  sh.getRange("D1:E1").setValues([["팀장", leader]]);
}

/* ---------------- reports ---------------- */
function readReports_() {
  var sh = sheet_("reports");
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var col = HEAD.reports.length;
  return sh.getRange(2, col, n, 1).getValues()
    .map(function (r) { try { return JSON.parse(r[0]); } catch (x) { return null; } })
    .filter(function (r) { return r && r.id; });
}

function saveReport_(r, trusted) {
  if (!r || !r.id || !r.date) throw new Error("보고 형식이 올바르지 않습니다.");
  if (!trusted) {
    // 승인 정보는 팀장 인증(setApproval)으로만 바뀜: 시트에 저장된 값을 그대로 유지
    var prev = readReportById_(r.id);
    if (prev && prev.approval) r.approval = prev.approval; else delete r.approval;
  }
  var c = { 완료: 0, 진행중: 0, 대기: 0, 지연: 0 };
  (r.tasks || []).forEach(function (t) { if (c[t.status] != null) c[t.status]++; });
  var open = (r.issues || []).filter(function (x) { return x.content && !x.resolved; }).length;
  var row = [r.id, r.date, r.memberId || "", r.memberName || "", r.region || "", r.workType || "", r.location || "", r.load || "",
    (r.tasks || []).length, c.완료, c.진행중, c.대기, c.지연, open, r.notes || "", r.submittedAt || "", r.updatedAt || "", JSON.stringify(r)];

  var sh = sheet_("reports");
  var idx = findRow_(sh, r.id);
  var rng = idx ? sh.getRange(idx, 1, 1, row.length) : sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
  rng.setNumberFormat("@").setValues([row.map(String)]);

  var tasks = [];
  (r.tasks || []).forEach(function (t) { tasks.push([r.id, r.date, r.memberName || "", r.region || "", "오늘", t.cat || "", t.client || "", t.content || "", t.status || ""]); });
  (r.plans || []).forEach(function (t) { tasks.push([r.id, r.date, r.memberName || "", r.region || "", "계획", t.cat || "", t.client || "", t.content || "", ""]); });
  var issues = (r.issues || []).map(function (x, i) { return [r.id, r.date, r.memberName || "", i + 1, x.level || "", x.content || "", x.target || "", x.resolved ? "해결" : "미해결", x.resolvedAt || ""]; });
  var pipe = (r.pipeline || []).map(function (p) { return [r.id, r.date, r.memberName || "", p.client || "", p.country || "", p.stage || "", p.amount === "" || p.amount == null ? "" : Number(p.amount), p.currency || "", p.expected || "", p.note || ""]; });

  replaceChildRows_("tasks", r.id, tasks);
  replaceChildRows_("issues", r.id, issues);
  replaceChildRows_("pipeline", r.id, pipe);
  var decs = (r.decisions || []).filter(function (x) { return x && x.title; }).map(function (x, i) { return [r.id, r.date, r.memberName || "", i + 1, x.title || "", x.deadline || "", x.amount === "" || x.amount == null ? "" : Number(x.amount), x.currency || "", x.detail || "", x.recommend || "", x.status || "대기", x.result || "", x.decidedAt || ""]; });
  replaceChildRows_("decisions", r.id, decs);
}

/* ---------------- 팀장 승인 ---------------- */
function checkLeaderPin_(pin) {
  var want = PropertiesService.getScriptProperties().getProperty("LEADER_PIN");
  if (!want) throw new Error("팀장 비밀번호가 아직 설정되지 않았습니다. Apps Script 프로젝트 설정의 스크립트 속성에 LEADER_PIN을 추가하세요.");
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get("leaderPinFails") || 0);
  if (fails >= 5) throw new Error("비밀번호를 여러 번 틀려 10분 동안 잠겼습니다. 잠시 후 다시 시도하세요.");
  if (String(pin || "") !== String(want)) {
    cache.put("leaderPinFails", String(fails + 1), 600);
    throw new Error("팀장 비밀번호가 맞지 않습니다.");
  }
  cache.remove("leaderPinFails");
}

function setApproval_(id, approve) {
  var r = readReportById_(id);
  if (!r) throw new Error("보고를 찾지 못했습니다. 새로고침 후 다시 시도하세요.");
  if (approve) {
    var team = readTeam_() || {};
    var L = team.leader || {};
    r.approval = { status: "승인", by: "leader", byName: (L.name || "팀장") + (L.title ? " " + L.title : ""), at: new Date().toISOString() };
  } else {
    r.approval = null;
  }
  saveReport_(r, true);
}

function readReportById_(id) {
  var sh = sheet_("reports");
  var idx = findRow_(sh, id);
  if (!idx) return null;
  try { return JSON.parse(sh.getRange(idx, HEAD.reports.length).getValue()); } catch (x) { return null; }
}

function deleteReport_(id) {
  if (!id) throw new Error("삭제할 보고가 없습니다.");
  var sh = sheet_("reports");
  var idx = findRow_(sh, id);
  if (idx) sh.deleteRow(idx);
  replaceChildRows_("tasks", id, []);
  replaceChildRows_("issues", id, []);
  replaceChildRows_("pipeline", id, []);
  replaceChildRows_("decisions", id, []);
}

/* ---------------- helpers ---------------- */
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (HEAD[name]) {
      sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    var first = ss.getSheetByName("Sheet1") || ss.getSheetByName("시트1");
    if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  }
  return sh;
}

function findRow_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return 0;
}

function replaceChildRows_(name, reportId, rows) {
  var sh = sheet_(name);
  var w = HEAD[name].length;
  var n = sh.getLastRow() - 1;
  var keep = [];
  if (n > 0) {
    keep = sh.getRange(2, 1, n, w).getValues().filter(function (r) { return String(r[0]) !== reportId; });
    sh.getRange(2, 1, n, w).clearContent();
  }
  var all = keep.concat(rows);
  if (all.length) sh.getRange(2, 1, all.length, w).setValues(all);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 편집기에서 한 번 실행하면 시트가 미리 만들어지고 권한 승인 창이 뜹니다. */
function setup() {
  ["reports", "tasks", "issues", "pipeline", "decisions", "team"].forEach(sheet_);
}
