// ============================================================
// SOLID MECHANICS TOOLKIT — Google Apps Script Backend
// Spreadsheet: "Solid Mechanics Analytics"
// Deploy: Execute as Me | Who has access: Anyone
// ============================================================

const SPREADSHEET_ID = 'YOUR_GOOGLE_SPREADSHEET_ID'; // Replace with your Sheet ID

// Sheet names
const SHEETS = {
  USER_LOGS:       'UserLogs',
  QUIZ_LOGS:       'QuizLogs',
  ERROR_LOGS:      'ErrorLogs',
  SIMULATION_LOGS: 'SimulationLogs',
};

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const raw = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const type = data.type || 'unknown';

    let result;

    if (type === 'quiz_complete' || type === 'quiz_start') {
      result = logQuiz(data);
    } else if (type === 'simulation_used') {
      result = logSimulation(data);
    } else {
      result = logUserEvent(data);
    }

    return buildResponse({ success: true, message: 'Logged', result });

  } catch (err) {
    logError(err, e);
    return buildResponse({ success: false, error: err.message }, 500);
  }
}

// Allow GET for health check / testing
function doGet(e) {
  return buildResponse({ status: 'Solid Mechanics Toolkit Analytics API — Running', timestamp: new Date().toISOString() });
}

// ─── LOGGING FUNCTIONS ────────────────────────────────────────────────────────

function logUserEvent(data) {
  const sheet = getOrCreateSheet(SHEETS.USER_LOGS, [
    'Timestamp', 'Type', 'Label', 'Device', 'URL',
    'SessionDuration', 'Extra1', 'Extra2', 'Extra3'
  ]);

  const extras = getExtras(data, ['type','label','timestamp','url','device','sessionDuration'], 3);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.type      || '',
    data.label     || '',
    data.device    || '',
    data.url       || '',
    data.sessionDuration || '',
    extras[0], extras[1], extras[2]
  ]);

  return 'UserLog written';
}

function logQuiz(data) {
  const sheet = getOrCreateSheet(SHEETS.QUIZ_LOGS, [
    'Timestamp', 'EventType', 'Topic', 'Score', 'Total',
    'Percentage', 'Difficulty', 'Device', 'URL'
  ]);

  sheet.appendRow([
    data.timestamp  || new Date().toISOString(),
    data.type       || 'quiz_event',
    data.label      || '',
    data.score      || '',
    data.total      || '',
    data.pct        || '',
    data.difficulty || '',
    data.device     || '',
    data.url        || '',
  ]);

  return 'QuizLog written';
}

function logSimulation(data) {
  const sheet = getOrCreateSheet(SHEETS.SIMULATION_LOGS, [
    'Timestamp', 'SimulationType', 'Parameters', 'Device', 'URL'
  ]);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.label     || '',
    JSON.stringify(data.params || {}),
    data.device    || '',
    data.url       || '',
  ]);

  return 'SimulationLog written';
}

function logError(err, rawEvent) {
  try {
    const sheet = getOrCreateSheet(SHEETS.ERROR_LOGS, [
      'Timestamp', 'ErrorMessage', 'Stack', 'RawPayload'
    ]);
    sheet.appendRow([
      new Date().toISOString(),
      err.message || String(err),
      err.stack   || '',
      rawEvent    ? JSON.stringify(rawEvent.postData || {}) : '',
    ]);
  } catch (e2) {
    // Prevent infinite loop
    Logger.log('Error logging failed: ' + e2.message);
  }
}

// ─── SHEET UTILITIES ──────────────────────────────────────────────────────────

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a237e')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(10);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getExtras(data, excludeKeys, count) {
  const extras = [];
  for (const [k, v] of Object.entries(data)) {
    if (!excludeKeys.includes(k)) extras.push(`${k}=${JSON.stringify(v)}`);
    if (extras.length >= count) break;
  }
  while (extras.length < count) extras.push('');
  return extras;
}

// ─── RESPONSE BUILDER ─────────────────────────────────────────────────────────

function buildResponse(obj, code) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─── SETUP FUNCTION (run once manually) ───────────────────────────────────────

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Create all required sheets with headers
  const configs = [
    { name: SHEETS.USER_LOGS, headers: ['Timestamp','Type','Label','Device','URL','SessionDuration','Extra1','Extra2','Extra3'] },
    { name: SHEETS.QUIZ_LOGS, headers: ['Timestamp','EventType','Topic','Score','Total','Percentage','Difficulty','Device','URL'] },
    { name: SHEETS.ERROR_LOGS, headers: ['Timestamp','ErrorMessage','Stack','RawPayload'] },
    { name: SHEETS.SIMULATION_LOGS, headers: ['Timestamp','SimulationType','Parameters','Device','URL'] },
  ];

  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = ss.insertSheet(cfg.name);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.getRange(1, 1, 1, cfg.headers.length)
      .setBackground('#0d1526')
      .setFontColor('#00d4ff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200); // Timestamp column wider
  });

  Logger.log('Spreadsheet setup complete!');
  SpreadsheetApp.getUi().alert('✅ Solid Mechanics Analytics spreadsheet configured successfully!');
}

// ─── ANALYTICS DASHBOARD (optional) ──────────────────────────────────────────

function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName(SHEETS.USER_LOGS);
  const quizSheet = ss.getSheetByName(SHEETS.QUIZ_LOGS);

  if (!userSheet || !quizSheet) return { error: 'Sheets not set up' };

  const userRows  = userSheet.getLastRow()  - 1;
  const quizRows  = quizSheet.getLastRow()  - 1;

  // Count quiz completions and average score
  let totalPct = 0, quizCount = 0;
  if (quizRows > 0) {
    const quizData = quizSheet.getRange(2, 1, quizRows, 9).getValues();
    quizData.forEach(row => {
      if (row[1] === 'quiz_complete' && row[5]) {
        totalPct += parseFloat(row[5]) || 0;
        quizCount++;
      }
    });
  }

  return {
    totalEvents:    userRows,
    totalQuizzes:   quizCount,
    avgScore:       quizCount > 0 ? (totalPct / quizCount).toFixed(1) + '%' : 'N/A',
    generatedAt:    new Date().toISOString(),
  };
}
