# Y9 Pressure quiz — teacher tracking setup

This sets up live answer-logging from `pressure-questions.html` into a Google Sheet you own. Once you've done it, every answer a student submits appends a row to the sheet within a second or two.

## What you'll end up with

A Google Sheet called something like **"Y9 Pressure responses"** with one tab, `Responses`, growing one row per answered question. Columns:

| Column | What it holds |
|---|---|
| `received_at` | Time the answer reached Google's servers |
| `client_ts` | Time on the student's clock when they answered |
| `student_name` | What they typed at sign-in |
| `class_code` | Class code they typed at sign-in (e.g. `Y9B-2026`) |
| `session_id` | Random ID per browser tab — lets you separate two sittings on the same day |
| `qid` | Question number (1–75) |
| `topic` | `solids` or `gases` |
| `sub_topic` | e.g. `Reducing area (sharp things)` |
| `type` | `mcq` / `compare` / `calc` |
| `correct` | `TRUE` / `FALSE` |
| `picked` | What they actually picked (text of the MCQ option, or `Force=same | Area=down | …` for compares, or their typed number for calcs) |
| `correct_answer` | The expected answer |
| `question_stem` | First 200 chars of the question — saves you flipping back to the HTML |

You can pivot, filter, or chart any of those. Useful starting views:

- **Filter** `class_code = Y9B-2026` and `correct = FALSE` → today's mistakes for that class.
- **Pivot** rows = `sub_topic`, columns = `correct`, values = count → which sub-topic is the class weakest on.
- **Pivot** rows = `student_name`, values = count of `correct = TRUE` → leaderboard / pace check.

## Setup — one-time, ~5 minutes

### Step 1. Make the sheet

1. Go to [sheets.new](https://sheets.new) (or File → New in Drive).
2. Rename it. Anything you'll recognise — e.g. *"Y9 Pressure responses"*.

### Step 2. Paste in the Apps Script

1. In that sheet, **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete the placeholder `function myFunction() {}`.
3. Open `teacher-tracking.gs` from this folder, copy the **entire contents**, paste it into the Apps Script editor.
4. Save (floppy-disk icon, or Ctrl/Cmd+S).

### Step 3. Deploy as a Web App

1. Top-right, **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** *"Y9 Pressure tracking v1"* (anything you like)
   - **Execute as:** *Me* (your Google account)
   - **Who has access:** **Anyone** ← this matters; without it students can't POST
4. Click **Deploy**.
5. Google asks you to authorise. Click through; you'll see a "Google hasn't verified this app" screen because it's your own script. Click **Advanced → Go to (project name)**, then **Allow**. This is normal for personal Apps Script web apps.
6. Copy the **Web app URL** that appears. It looks like `https://script.google.com/macros/s/AKfycb…/exec`.

### Step 4. Paste the URL into the HTML

1. Open `pressure-questions.html` in any text editor.
2. Search for: `PASTE_YOUR_URL_HERE`
3. Replace it with the URL you copied. Keep the quotes around it. The line should now look like:
   ```js
   const REPORT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Save the file.

### Step 5. Test it

1. Open `pressure-questions.html` in a browser.
2. Sign in as e.g. `Test Teacher` / `TEST`.
3. Answer one question.
4. Look at your Google Sheet. A row should appear in the `Responses` tab within a couple of seconds.
5. (Optional) In the top-right of the quiz next to the identity strip you should see a little `sent ✓` flash after each answer. If you see `send failed` or `offline`, something in the URL or deployment is wrong — check that "Who has access" was set to **Anyone**.

That's it. Share `pressure-questions.html` with your class (email, OneDrive, host on GitHub Pages, whatever), and the sheet will fill up as they work.

## Things worth knowing

- **The data is honour-system, not authenticated.** A student can type a different name and impersonate someone else. For classroom-level progress monitoring this is fine; for anything that matters (assessment, reporting home), it isn't. If you ever want real auth, that's the Supabase path discussed in chat.
- **Refreshing the page loses the student's in-quiz statistics** (the ticks/crosses on the Statistics tab) because they're held in memory. The data you care about — what they answered — is already in your sheet by then, so this is fine, but tell them not to refresh mid-session unnecessarily.
- **The student's name and class are saved on their device** (localStorage), so they don't re-type each lesson. They can click **Sign out** to clear it (useful on shared computers).
- **Updating the Apps Script later.** If you tweak `teacher-tracking.gs`, paste the new version into the script editor, then go **Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same and you don't need to repaste it into the HTML. (If you make a *new* deployment instead, you get a *new* URL, which you'd then have to repaste.)
- **Privacy.** Names are stored on (1) the student's device, (2) Google's servers, (3) your Google Sheet. Nothing leaves Google's infrastructure. No third party sees this data. School data-protection policies will still apply — check what your school says about classroom monitoring tools that store student names in Google Sheets if that's a sensitive topic.

## Troubleshooting

- **"send failed" after every answer.** Check the Web App URL is pasted correctly between the quotes in `pressure-questions.html`, and that "Who has access" on the deployment is set to **Anyone** (not "Anyone with Google account", which would block students who aren't logged in to Google in their browser).
- **"offline" after every answer.** The student's browser can't reach Google at all. Usually a Wi-Fi or filtering issue, not a setup problem.
- **No rows appear in the sheet but `sent ✓` shows.** Wrong sheet — the script appends to whichever sheet was active when you opened Apps Script. Make sure you opened Apps Script *from the sheet you want rows in*, not from `script.google.com` standalone.
- **`Authorization required` error when posting.** The deployment isn't set to "Anyone". Redeploy with the correct setting.
