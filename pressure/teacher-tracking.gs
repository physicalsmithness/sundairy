/**
 * Y9 Pressure quiz - teacher tracking endpoint
 *
 * One-time setup:
 *   1. Open the Google Sheet you want answers logged to.
 *   2. Extensions -> Apps Script. Delete any placeholder code.
 *   3. Paste this whole file in. Save (disk icon).
 *   4. Deploy -> New deployment -> Type: "Web app".
 *        Description:    Y9 Pressure tracking
 *        Execute as:     Me (your account)
 *        Who has access: Anyone
 *      Deploy. Authorise. Copy the "Web app URL".
 *   5. Open pressure-questions.html in a text editor.
 *      Find:   const REPORT_URL = 'PASTE_YOUR_URL_HERE';
 *      Paste the URL between the quotes. Save.
 *
 * When you update this script later you must "Manage deployments"
 * -> edit the existing deployment -> bump the version to "New version"
 * and re-deploy. (If you create a NEW deployment you'll get a new URL
 * and have to repaste it into the HTML.)
 */

// ----- doPost: each quiz event arrives here as a JSON body -----
// payload.kind === 'feedback' → routed to the "Feedback" tab.
// Anything else (default)     → routed to the "Responses" tab as a normal answer.
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload && payload.kind === 'feedback') {
      var fsheet = ensureFeedbackSheet_();
      fsheet.appendRow([
        new Date(),
        payload.ts || '',
        payload.studentName || '',
        payload.classCode || '',
        payload.sessionId || '',
        payload.qid != null ? payload.qid : '',
        payload.topic || '',
        payload.sub || '',
        payload.type || '',
        payload.questionStem || '',
        payload.feedbackText || ''
      ]);
      return jsonOut_({ok: true, kind: 'feedback'});
    }
    var sheet = ensureSheet_();
    sheet.appendRow([
      new Date(),                            // server-side received time
      payload.ts || '',                      // client-side timestamp
      payload.studentName || '',
      payload.classCode || '',
      payload.sessionId || '',
      payload.qid != null ? payload.qid : '',
      payload.topic || '',
      payload.sub || '',
      payload.type || '',
      payload.isCorrect ? 'TRUE' : 'FALSE',
      payload.marks != null ? payload.marks : '',
      payload.maxMarks != null ? payload.maxMarks : '',
      payload.picked || '',
      payload.correctAnswer || '',
      payload.questionStem || ''
    ]);
    return jsonOut_({ok: true});
  } catch (err) {
    return jsonOut_({ok: false, error: String(err)});
  }
}

// ----- doGet: visit the deployed URL in a browser to sanity-check -----
function doGet() {
  return ContentService.createTextOutput('Y9 Pressure tracking endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ----- helpers -----
function ensureSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('Responses');
  if (!sheet) {
    sheet = ss.insertSheet('Responses');
    sheet.appendRow([
      'received_at', 'client_ts', 'student_name', 'class_code', 'session_id',
      'qid', 'topic', 'sub_topic', 'type', 'correct', 'marks', 'max_marks',
      'picked', 'correct_answer', 'question_stem'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:O1').setFontWeight('bold');
  }
  return sheet;
}

function ensureFeedbackSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('Feedback');
  if (!sheet) {
    sheet = ss.insertSheet('Feedback');
    sheet.appendRow([
      'received_at', 'client_ts', 'student_name', 'class_code', 'session_id',
      'qid', 'topic', 'sub_topic', 'type', 'question_stem', 'feedback_text'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:K1').setFontWeight('bold');
    sheet.setColumnWidth(11, 360);  // wide column for the free-text feedback
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
