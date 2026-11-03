// Writes the FICTIONAL sample data the app falls back to when public/data/ has no real index.
// Nothing here comes from any real study, participant or repository. Every link points at example.com.
// Usage: node scripts/make-sample-data.mjs   (rewrites public/data/sample/*.json)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(fileURLToPath(new URL('..', import.meta.url)), 'public/data/sample');
const BASE = 'https://example.com/sample-research-repo';
const BUILT = '2026-11-02T12:00:00+00:00';
const COMMIT = '5a3b1e0000000000000000000000000000c0ffee';
const blob = (p) => `${BASE}/blob/main/${p}`;
const issue = (n) => `${BASE}/issues/${n}`;

/* ---------- documents, built from blocks so line numbers always match the text ---------- */
function buildDoc({ folder, file, type, title, blocks, front = {}, tags = [], commit = '2026-03-02T10:00:00-05:00' }) {
  const path = `${folder}/${file}`;
  const lines = [], headings = [], questions = [], quotes = [], findings = [];
  let section = '', inFindings = false;
  const push = (t) => { lines.push(t); return lines.length; };
  const link = (ln) => blob(path) + (ln ? `#L${ln}` : '');
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    const listy = (x) => x && (x.li || x.q);
    if (b.h) {
      const [level, text] = b.h;
      const ln = push('#'.repeat(level) + ' ' + text);
      headings.push({ line: ln, level, text });
      section = text;
      if (level <= 2) inFindings = /key findings|^findings$/i.test(text);
      else if (inFindings) findings.push({ line: ln, text, link: link(ln) });
    } else if (b.p) push(b.p);
    else if (b.li) push('- ' + b.li);
    else if (b.q) { const ln = push('- ' + b.q); questions.push({ text: b.q, line: ln, section, link: link(ln) }); }
    else if (b.quote) {
      const tag = b.p_id ? ` - ${b.p_id}` : b.role ? ` - ${b.role}` : '';
      const ctx = `> _“${b.quote}”${tag}_`;
      const ln = push(ctx);
      quotes.push({ text: b.quote, line: ln, section, participant: b.p_id || null, role: b.role || null, attribution: b.p_id || b.role ? 'explicit' : 'none-in-source', sessionTimestamp: null, context: ctx, link: link(ln) });
    }
    if (!(listy(b) && listy(next))) push('');
  });
  return { path, folder, file, type, title, frontmatter: front, tags, lastCommit: commit, lineCount: lines.length, link: link(), headings, findings, questions, quotes, lines };
}
const H = (level, text) => ({ h: [level, text] });
const P = (p) => ({ p });
const LI = (li) => ({ li });
const Q = (q) => ({ q });
const QUOTE = (quote, p_id, role) => ({ quote, p_id, role });

/* ---------- studies ---------- */
const S = {
  a: { n: 9001, folder: 'studies/2025-03-appointment-reminders-usability', title: '2025-03 Sample Portal Appointment Reminders Usability Testing' },
  b: { n: 9002, folder: 'studies/2025-06-notification-preferences-discovery', title: '2025-06 Sample Portal Notification Preferences Discovery' },
  c: { n: 9003, folder: 'studies/2025-09-mobile-sign-in-help-interviews', title: '2025-09 Sample Mobile App Sign-in Help Interviews' },
  d: { n: 9004, folder: 'studies/2026-01-document-upload-usability', title: '2026-01 Sample Portal Document Upload Usability Testing' },
  e: { n: 9005, folder: 'studies/2026-04-caregiver-account-linking-discovery', title: '2026-04 Sample Portal Caregiver Account Linking Discovery' },
  f: { n: 9006, folder: null, title: '2026-07 Sample Mobile App Accessibility Check' },
};

const documents = [
  /* A: appointment reminders */
  buildDoc({ folder: S.a.folder, file: 'research-plan.md', type: 'plan', title: 'Appointment Reminders Research Plan', front: { product: 'Sample Portal Appointment Reminders', team: 'Sample Team A' }, tags: ['usability-testing', 'remote'], blocks: [
    H(1, 'Appointment Reminders Research Plan'),
    H(2, 'Background'),
    P('Sample Portal sends appointment reminders, but people can only change them from a page that is hard to find. This study tests a redesigned reminder settings page.'),
    H(2, 'Research Goals'),
    LI('Learn whether participants can find and change their reminder settings.'),
    LI('Learn what a reminder needs to say for participants to trust it.'),
    H(2, 'Research Questions'),
    Q('How do participants decide whether to turn appointment reminders on or off?'),
    Q('What do participants expect a reminder to say, and when do they expect to receive it?'),
    Q('Where do participants look first to change how they are reminded?'),
    H(2, 'Methodology'),
    P('Moderated remote usability sessions, 45 minutes each, with a clickable prototype.'),
    H(2, 'Recruitment'),
    P('Eight participants. Mix of desktop and phone users; at least two who use a screen reader.'),
  ] }),
  buildDoc({ folder: S.a.folder, file: 'conversation-guide.md', type: 'guide', title: 'Appointment Reminders Conversation Guide', tags: ['usability-testing'], blocks: [
    H(1, 'Conversation Guide'),
    H(2, 'Moderator logistics'),
    P('Share the prototype link in chat. Ask for consent to record before starting.'),
    H(2, 'Intro - 5 minutes'),
    P('Explain that we are testing the page, not the participant. There are no wrong answers.'),
    H(2, 'Warm-up Questions - 5 minutes'),
    Q('Tell me about the last time you missed or nearly missed an appointment.'),
    Q('How do you usually keep track of your appointments?'),
    H(2, 'First Task: Find reminder settings - 20 minutes'),
    Q('Where would you go to change how you are reminded about an appointment?'),
    Q('What do you expect to see on this page?'),
    Q('How would you turn off reminders for one appointment only?'),
    H(2, 'Thank-you and Closing - 5 minutes'),
    Q('Is there anything you expected to see that was not there?'),
  ] }),
  buildDoc({ folder: S.a.folder, file: 'screener.md', type: 'screener', title: 'Appointment Reminders Screener', blocks: [
    H(1, 'Screener'),
    H(2, 'Questions'),
    Q('Do you have an appointment scheduled in the next three months?'),
    Q('Which device do you use most often to check your appointments?'),
    Q('Do you use a screen reader or screen magnifier?'),
  ] }),
  buildDoc({ folder: S.a.folder, file: 'research-findings.md', type: 'findings', title: 'Appointment Reminders Research Findings', tags: ['usability-testing', 'remote'], commit: '2025-04-18T14:20:00-04:00', blocks: [
    H(1, 'Appointment Reminders Research Findings'),
    H(2, 'Research Goals'),
    LI('Learn whether participants can find and change their reminder settings.'),
    H(2, 'Research Questions'),
    Q('How do participants decide whether to turn appointment reminders on or off?'),
    Q('Where do participants look first to change how they are reminded?'),
    H(2, 'Methodology'),
    P('Eight moderated remote sessions in March 2025. Two participants used a screen reader.'),
    H(2, 'Key Findings'),
    H(3, 'Most participants wanted reminders by text message first, then email'),
    P('Six of eight participants asked for text messages. Email was seen as something to check later.'),
    QUOTE('I just want a text the day before. If I have to log in to find out, it is too late.', 'P2'),
    QUOTE('Email is fine as a backup, but I do not look at it until the evening.', 'P5'),
    H(3, 'Participants did not trust a reminder that did not name the clinic'),
    P('A reminder that only said “you have an appointment” led four participants to ask whether it was real.'),
    QUOTE('If it does not say where, I would think it is a scam.', 'P4'),
    QUOTE('I would want the clinic name and the time, nothing else.'),
    H(3, 'Few participants found the reminder settings without help'),
    P('Only two participants found the settings page on their own. Most looked under their profile first.'),
    QUOTE('I looked under my name. It never occurred to me to look at the appointment itself.', 'P7'),
  ] }),

  /* B: notification preferences discovery */
  buildDoc({ folder: S.b.folder, file: 'research-plan.md', type: 'plan', title: 'Notification Preferences Discovery Plan', front: { product: 'Sample Portal Notification Preferences', team: 'Sample Team A' }, tags: ['interviews', 'generative'], blocks: [
    H(1, 'Notification Preferences Discovery Plan'),
    H(2, 'Background'),
    P('People receive notifications from several parts of Sample Portal. We do not know which ones they consider essential.'),
    H(2, 'Research Questions'),
    Q('How do people decide whether to turn notifications on or off?'),
    Q('Which notification types do people consider essential?'),
    Q('What makes someone stop trusting a notification?'),
    H(2, 'Methodology'),
    P('Eight 60-minute remote interviews.'),
  ] }),
  buildDoc({ folder: S.b.folder, file: 'research-findings.md', type: 'findings', title: 'Notification Preferences Discovery Findings', tags: ['interviews', 'generative'], commit: '2025-07-30T09:45:00-04:00', blocks: [
    H(1, 'Notification Preferences Discovery Findings'),
    H(2, 'Research Questions'),
    Q('How do people decide whether to turn notifications on or off?'),
    Q('Which notification types do people consider essential?'),
    H(2, 'Key Findings'),
    H(3, 'Participants treated notification settings as set once and forget'),
    P('Most participants could not remember what they had chosen and had not looked at the settings since.'),
    QUOTE('I turned something on once. I could not tell you what.', 'P1'),
    H(3, 'Essential meant anything that changes a date or a payment'),
    P('Participants agreed that changes to a date, a time or an amount owed were essential, and the rest could wait.'),
    QUOTE('Tell me if something moves or if I owe something. The rest is noise.', 'P3'),
    QUOTE('A new message is not urgent. A cancelled appointment is.', 'P6'),
    H(3, 'Too many alerts led participants to switch everything off'),
    QUOTE('After the third one in a day I turned them all off.', 'P8'),
  ] }),

  /* C: mobile sign-in help interviews */
  buildDoc({ folder: S.c.folder, file: 'conversation-guide.md', type: 'guide', title: 'Mobile Sign-in Help Conversation Guide', tags: ['interviews', 'remote'], blocks: [
    H(1, 'Conversation Guide'),
    H(2, 'Moderator logistics'),
    P('Ask participants to have their phone ready and the app installed.'),
    H(2, 'Intro - 5 minutes'),
    P('Explain the purpose and that the session is recorded with consent.'),
    H(2, 'Warm-up Questions - 5 minutes'),
    Q('How do you usually sign in to apps on your phone?'),
    Q('Tell me about a time you could not sign in to something.'),
    H(2, 'First Task: Sign in - 20 minutes'),
    Q('Which sign-in option would you choose, and why?'),
    Q('What would you do if the sign-in failed?'),
    H(2, 'Thank-you and Closing - 5 minutes'),
    Q('What would have made signing in easier?'),
  ] }),
  buildDoc({ folder: S.c.folder, file: 'research-findings.md', type: 'findings', title: 'Mobile Sign-in Help Research Findings', tags: ['interviews', 'remote'], commit: '2025-11-12T16:05:00-05:00', blocks: [
    H(1, 'Mobile Sign-in Help Research Findings'),
    H(2, 'Research Questions'),
    Q('Which sign-in option do participants choose, and why?'),
    Q('What do participants do when sign-in fails?'),
    H(2, 'Key Findings'),
    H(3, 'Participants were unsure which sign-in option to choose'),
    P('Five of seven participants hesitated at the list of options and chose the one they had used on the website.'),
    QUOTE('I picked the one I remembered from the website. I did not read the others.', 'P2'),
    QUOTE('There were too many buttons and none of them said which one was mine.', null, 'Caregiver'),
    H(3, 'Help text was read only after a failed attempt'),
    P('No participant opened the help text before trying to sign in. Three opened it after a first failure.'),
    QUOTE('I only looked at the help when it said it did not work.', 'P5'),
  ] }),

  /* D: document upload */
  buildDoc({ folder: S.d.folder, file: 'research-plan.md', type: 'plan', title: 'Document Upload Research Plan', front: { product: 'Sample Portal Document Upload', team: 'Sample Team B' }, tags: ['usability-testing', 'remote'], blocks: [
    H(1, 'Document Upload Research Plan'),
    H(2, 'Background'),
    P('People upload documents to support a request, then call to ask whether the upload worked. We are testing a new confirmation step.'),
    H(2, 'Research Questions'),
    Q('What do participants expect to happen after they upload a document?'),
    Q('How do participants know an upload worked?'),
    Q('How do participants decide whether to turn confirmation emails on or off?'),
    H(2, 'Methodology'),
    P('Ten moderated remote usability sessions.'),
  ] }),
  buildDoc({ folder: S.d.folder, file: 'conversation-guide.md', type: 'guide', title: 'Document Upload Conversation Guide', tags: ['usability-testing'], blocks: [
    H(1, 'Conversation Guide'),
    H(2, 'Intro - 5 minutes'),
    P('Explain the purpose, consent and recording.'),
    H(2, 'Warm-up Questions - 5 minutes'),
    Q('Tell me about the last time you sent a document to an organization online.'),
    H(2, 'First Task: Upload a document - 25 minutes'),
    Q('What do you expect to happen after you select the file?'),
    Q('How would you know the upload worked?'),
    H(2, 'Thank-you and Closing - 5 minutes'),
    Q('What would you change about this page?'),
  ] }),
  buildDoc({ folder: S.d.folder, file: 'research-findings.md', type: 'findings', title: 'Document Upload Research Findings', tags: ['usability-testing', 'remote'], commit: '2026-02-26T11:30:00-05:00', blocks: [
    H(1, 'Document Upload Research Findings'),
    H(2, 'Research Questions'),
    Q('What do participants expect to happen after they upload a file?'),
    Q('How do participants know an upload worked?'),
    H(2, 'Key Findings'),
    H(3, 'Participants expected an immediate confirmation with the file name'),
    P('Nine of ten participants said a confirmation that repeated the file name would be enough to trust the upload.'),
    QUOTE('Show me the name of what I sent. Then I know it is the right one.', 'P1'),
    H(3, 'A progress bar without a result made participants unsure the upload finished'),
    QUOTE('It filled up and then it just went away. Did it work?', 'P4'),
    QUOTE('I would have taken a screenshot, honestly.', 'P9'),
    H(3, 'Confirmation emails were wanted, but not for every upload'),
    P('Participants wanted an email for the first upload and a quieter option after that.'),
  ] }),

  /* E: caregiver account linking (current, plan only) */
  buildDoc({ folder: S.e.folder, file: 'research-plan.md', type: 'plan', title: 'Caregiver Account Linking Discovery Plan', front: { product: 'Sample Portal Caregiver Accounts', team: 'Sample Team C' }, tags: ['interviews', 'generative'], commit: '2026-04-20T13:10:00-04:00', blocks: [
    H(1, 'Caregiver Account Linking Discovery Plan'),
    H(2, 'Background'),
    P('Caregivers manage appointments and documents for someone else. Today they share a login, which we want to stop.'),
    H(2, 'Research Questions'),
    Q('How do caregivers expect to be connected to the person they support?'),
    Q('What information would caregivers be comfortable sharing to link accounts?'),
    Q('How do caregivers decide whether to turn notifications on or off for the person they support?'),
    H(2, 'Methodology'),
    P('Twelve 60-minute remote interviews with caregivers.'),
  ] }),
];

/* ---------- board ---------- */
const board = {
  projectUrl: `${BASE}/projects/1`,
  projectTitle: 'SAMPLE Research Repository (fictional)',
  lastRefresh: '2026-11-02T03:00:00.000Z',
  snapshotCommit: '5a3b1e0',
  counts: { Proposed: 1, Current: 1, Completed: 4, Unknown: 0 },
  studies: [
    { number: S.a.n, title: S.a.title, url: issue(S.a.n), status: 'Completed', team: 'Sample Team A', product: 'sample-portal', subProduct: null, researchType: 'Usability Testing', startDate: '2025-03-04', completedDate: '2025-03-28', titleDate: '2025-03-01',
      summary: 'A moderated usability study of a redesigned reminder settings page. Most participants wanted text messages first, did not trust reminders that omitted the clinic name, and rarely found the settings page without help.',
      keyFindings: ['Most participants wanted reminders by text message first, then email.', 'Participants did not trust a reminder that did not name the clinic.', 'Only two of eight participants found the reminder settings without help.'], researchFolderUrl: blob(S.a.folder) },
    { number: S.b.n, title: S.b.title, url: issue(S.b.n), status: 'Completed', team: 'Sample Team A', product: 'sample-portal', subProduct: null, researchType: 'Generative (Discovery), Interviews', startDate: '2025-06-02', completedDate: '2025-07-18', titleDate: '2025-06-01',
      summary: 'Discovery interviews about how people choose notification settings. Participants set preferences once and forget them, treat changes to a date or a payment as essential, and switch everything off when alerts pile up.',
      keyFindings: ['Participants treated notification settings as set once and forget.', 'Essential meant anything that changes a date or a payment.', 'Too many alerts led participants to switch everything off.'], researchFolderUrl: blob(S.b.folder) },
    { number: S.c.n, title: S.c.title, url: issue(S.c.n), status: 'Completed', team: 'Sample Team C', product: 'sample-mobile', subProduct: null, researchType: 'Interviews, Remote', startDate: '2025-09-08', completedDate: '2025-10-24', titleDate: '2025-09-01',
      summary: 'Remote interviews about choosing a sign-in option on the mobile app. Participants hesitated at the list of options and read help text only after a failed attempt.',
      keyFindings: ['Participants were unsure which sign-in option to choose.', 'Help text was read only after a failed attempt.'], researchFolderUrl: blob(S.c.folder) },
    { number: S.d.n, title: S.d.title, url: issue(S.d.n), status: 'Completed', team: 'Sample Team B', product: 'sample-portal', subProduct: null, researchType: 'Remote, Usability Testing', startDate: '2026-01-12', completedDate: '2026-02-20', titleDate: '2026-01-01',
      summary: 'A usability study of a new upload confirmation step. Participants wanted an immediate confirmation that repeated the file name, and a progress bar with no result left them unsure the upload finished.',
      keyFindings: ['Participants expected an immediate confirmation with the file name.', 'A progress bar without a result made participants unsure the upload finished.', 'Confirmation emails were wanted, but not for every upload.'], researchFolderUrl: blob(S.d.folder) },
    { number: S.e.n, title: S.e.title, url: issue(S.e.n), status: 'Current', team: 'Sample Team C', product: 'sample-portal', subProduct: null, researchType: 'Generative (Discovery), Interviews', startDate: '2026-05-04', completedDate: null, titleDate: '2026-04-01',
      summary: 'Discovery interviews with caregivers about how they expect to be linked to the person they support. Sessions are in progress.', keyFindings: null, researchFolderUrl: blob(S.e.folder) },
    { number: S.f.n, title: S.f.title, url: issue(S.f.n), status: 'Proposed', team: 'Sample Team C', product: 'sample-mobile', subProduct: null, researchType: 'Usability Testing', startDate: null, completedDate: null, titleDate: '2026-07-01',
      summary: 'A proposed accessibility check of the mobile app with screen reader and magnifier users. No sessions have run.', keyFindings: null, researchFolderUrl: null },
  ],
};

const folderToBoard = {};
Object.values(S).forEach((s) => { if (s.folder) folderToBoard[s.folder] = [s.n]; });

const structuredFindings = [
  { id: 'F001', summary: 'People who set reminder preferences once rarely return to change them, so defaults matter more than the settings page', sourceStudy: S.a.title, method: ['usability_testing'], participants: 8, createdAt: '2025-04-01', labels: { user_groups: ['all_users'], research_themes: ['notification_preferences'], finding_types: ['usability_issue'], severity_levels: ['medium'], device_platforms: ['desktop', 'mobile_ios'], journey_stages: ['ongoing_management'] }, file: 'data/findings.yml', line: 1, link: blob('data/findings.yml') + '#L1' },
  { id: 'F002', summary: 'A reminder that does not name the clinic is read as possible fraud', sourceStudy: S.a.title, method: ['usability_testing'], participants: 8, createdAt: '2025-04-01', labels: { user_groups: ['all_users'], research_themes: ['trust'], finding_types: ['trust_issue'], severity_levels: ['high'] }, file: 'data/findings.yml', line: 22, link: blob('data/findings.yml') + '#L22' },
  { id: 'F003', summary: 'An upload that ends without a visible result leaves people unsure whether to try again', sourceStudy: S.d.title, method: ['usability_testing'], participants: 10, createdAt: '2026-03-01', labels: { user_groups: ['all_users'], research_themes: ['task_completion'], finding_types: ['usability_issue'], severity_levels: ['high'] }, file: 'data/findings.yml', line: 43, link: blob('data/findings.yml') + '#L43' },
  { id: 'F004', summary: 'People read help text only after a failure, so the first attempt has to work without it', sourceStudy: S.c.title, method: ['interviews'], participants: 7, createdAt: '2025-11-15', labels: { user_groups: ['mobile_users'], research_themes: ['sign_in_authentication'], finding_types: ['usability_issue'], severity_levels: ['medium'] }, file: 'data/findings.yml', line: 64, link: blob('data/findings.yml') + '#L64' },
];

const researchIndex = {
  repo: { remote: BASE, branch: 'main', commit: COMMIT, commitDate: '2026-11-02T08:15:00-05:00', commitSubject: 'Sample data refresh (fictional)', builtAt: BUILT },
  board,
  documents,
  folderToBoard,
  structuredFindings,
  notIndexed: { png: 12, xlsx: 1 },
  limits: [
    'SAMPLE DATA: every study, participant and quote in this file is fictional. It exists so the app runs without access to a real research repository.',
    'Questions and quotes are extracted from single lines only; quotes split across lines are not captured.',
    'Session timestamps are captured only when written beside a quote in the source; most sources do not record them.',
    'Board studies without a local folder have summary and key findings only, not the questions asked.',
  ],
};

/* ---------- Research Explorer layer ---------- */
const LABELS = {
  ty: ['accessibility_barrier', 'content_issue', 'emotional_response', 'mental_model_mismatch', 'navigation_issue', 'positive_finding', 'process_issue', 'trust_issue', 'unmet_need', 'usability_issue'],
  pa: ['appointments', 'benefits_claims', 'caregiver', 'debt_financial', 'education', 'facilities', 'forms', 'health_care', 'housing', 'identity_auth', 'memorial_burial', 'mobile_app', 'notifications', 'records_documents', 'representative', 'search'],
  ug: ['assistive_tech_users', 'caregivers', 'cognitive_disability', 'dependents', 'homeless_veterans', 'lgbtq_plus', 'low_digital_literacy', 'minority_veterans', 'mobile_users', 'older_veterans', 'rural_veterans', 'service_members', 'veterans'],
  th: ['content_comprehension', 'cross_channel', 'data_privacy', 'error_handling', 'form_completion', 'information_seeking', 'mobile_experience', 'navigation_wayfinding', 'notification_communication', 'personalization', 'sign_in_authentication', 'status_tracking', 'task_completion'],
  js: ['applying_for_benefits', 'discovering_benefits', 'managing_benefits', 'resolving_issues', 'transitioning'],
  sv: ['critical', 'high', 'low', 'medium'],
  es: ['anxious', 'confused', 'distrustful', 'empowered', 'frustrated', 'overwhelmed', 'satisfied'],
};
const rp = (p) => `sample-products/${p}/research-findings.md`;
const ef = (i, x, l) => ({ i, x, l });
const reports = [
  { p: rp('appointments/2025-03-reminders'), u: blob(rp('appointments/2025-03-reminders')), t: '[Sample Portal Appointment Reminders] Research Findings', d: '2025-04-01', m: ['Usability testing'], n: 8, prod: 'Sample Portal Appointment Reminders', team: 'Sample Team A', at: '2026-09-25', bn: [S.a.n],
    f: [
      ef(1, 'Most participants wanted reminders by text message first, then email', { ty: ['unmet_need', 0.61], pa: ['notifications', 0.88], ug: ['veterans', 0.7], th: ['notification_communication', 0.9], js: ['managing_benefits', 0.4] }),
      ef(2, 'Participants did not trust a reminder that did not name the clinic', { ty: ['trust_issue', 0.83], pa: ['appointments', 0.9], ug: ['veterans', 0.7], th: ['data_privacy', 0.35], sv: ['high', 0.55] }),
      ef(3, 'Few participants found the reminder settings without help', { ty: ['navigation_issue', 0.78], pa: ['notifications', 0.6], ug: ['assistive_tech_users', 0.31], th: ['navigation_wayfinding', 0.92] }),
    ],
    q: [{ x: '“I just want a text the day before. If I have to log in to find out, it is too late.”', l: 26, p: 'P2' }, { x: '“If it does not say where, I would think it is a scam.”', l: 31, p: 'P4' }] },
  { p: rp('notifications/2025-06-preferences'), u: blob(rp('notifications/2025-06-preferences')), t: '[Sample Portal Notification Preferences] Discovery Findings', d: '2025-07-30', m: ['Semi-structured interview'], n: 8, prod: 'Sample Portal Notification Preferences', team: 'Sample Team A', at: '2026-09-25', bn: [S.b.n],
    f: [
      ef(1, 'Participants treated notification settings as set once and forget', { ty: ['mental_model_mismatch', 0.52], pa: ['notifications', 0.95], ug: ['veterans', 0.7], th: ['personalization', 0.66] }),
      ef(2, 'Essential meant anything that changes a date or a payment', { ty: ['process_issue', 0.3], pa: ['notifications', 0.9], ug: ['veterans', 0.7], th: ['notification_communication', 0.8], js: ['managing_benefits', 0.45] }),
      ef(3, 'Too many alerts led participants to switch everything off', { ty: ['emotional_response', 0.58], pa: ['notifications', 0.9], ug: ['older_veterans', 0.28], th: ['notification_communication', 0.85], sv: ['medium', 0.5] }),
    ],
    q: [{ x: '“Tell me if something moves or if I owe something. The rest is noise.”', l: 24, p: 'P3' }] },
  { p: rp('mobile/2025-09-sign-in-help'), u: blob(rp('mobile/2025-09-sign-in-help')), t: '[Sample Mobile App] Sign-in Help Research Findings', d: '2025-11-12', m: ['Semi-structured interview'], n: 7, prod: 'Sample Mobile App', team: 'Sample Team C', at: '2026-09-25', bn: [S.c.n],
    f: [
      ef(1, 'Participants were unsure which sign-in option to choose', { ty: ['mental_model_mismatch', 0.7], pa: ['identity_auth', 0.85], ug: ['mobile_users', 0.6], th: ['sign_in_authentication', 0.97] }),
      ef(2, 'Help text was read only after a failed attempt', { ty: ['content_issue', 0.64], pa: ['identity_auth', 0.8], ug: ['mobile_users', 0.6], th: ['error_handling', 0.7], js: ['resolving_issues', 0.33] }),
    ],
    q: [{ x: '“I only looked at the help when it said it did not work.”', l: 22, p: 'P5' }] },
  { p: rp('documents/2026-01-upload'), u: blob(rp('documents/2026-01-upload')), t: '[Sample Portal Document Upload] Research Findings', d: '2026-02-26', m: ['Usability testing'], n: 10, prod: 'Sample Portal Document Upload', team: 'Sample Team B', at: '2026-09-25', bn: [S.d.n],
    f: [
      ef(1, 'Participants expected an immediate confirmation with the file name', { ty: ['unmet_need', 0.74], pa: ['records_documents', 0.92], ug: ['veterans', 0.7], th: ['task_completion', 0.8], js: ['resolving_issues', 0.41] }),
      ef(2, 'A progress bar without a result made participants unsure the upload finished', { ty: ['usability_issue', 0.88], pa: ['records_documents', 0.9], ug: ['low_digital_literacy', 0.25], th: ['status_tracking', 0.76], sv: ['high', 0.6] }),
      ef(3, 'Confirmation emails were wanted, but not for every upload', { ty: ['process_issue', 0.4], pa: ['notifications', 0.55], ug: ['veterans', 0.7], th: ['notification_communication', 0.7] }),
    ],
    q: [{ x: '“Show me the name of what I sent. Then I know it is the right one.”', l: 24, p: 'P1' }, { x: '“It filled up and then it just went away. Did it work?”', l: 29, p: 'P4' }] },
  /* Reports with no board issue appear as their own entries. */
  { p: rp('search/2024-05-search-redesign'), u: blob(rp('search/2024-05-search-redesign')), t: '[Sample Portal Search] Redesign Findings', d: '2024-06-14', m: ['Usability testing'], n: 9, prod: 'Sample Portal Search', team: 'Sample Team B', at: '2026-09-25', bn: [],
    f: [
      ef(1, 'Participants typed whole questions into search and expected an answer, not a list of pages', { ty: ['mental_model_mismatch', 0.72], pa: ['search', 0.97], ug: ['older_veterans', 0.33], th: ['information_seeking', 0.9] }),
      ef(2, 'Results that repeated the same page title in different sections looked like duplicates', { ty: ['content_issue', 0.6], pa: ['search', 0.93], ug: ['veterans', 0.7], th: ['content_comprehension', 0.62] }),
    ],
    q: [{ x: '“I typed what I would ask a person. It gave me a list.”', l: 18, p: 'P6' }] },
  { p: rp('mobile/2024-11-onboarding'), u: blob(rp('mobile/2024-11-onboarding')), t: '[Sample Mobile App] Onboarding Research Findings', d: '2024-12-09', m: ['Semi-structured interview'], n: 6, prod: 'Sample Mobile App', team: 'Sample Team C', at: '2026-09-25', bn: [],
    f: [
      ef(1, 'Participants skipped the onboarding screens and returned to them only when stuck', { ty: ['process_issue', 0.5], pa: ['mobile_app', 0.9], ug: ['mobile_users', 0.6], th: ['mobile_experience', 0.8], js: ['discovering_benefits', 0.36] }),
    ],
    q: [] },
];
const explorerIndex = {
  source: { file: 'sample/taxonomy-data.json (fictional)', generatedAt: '2026-09-25T14:00:00.000Z', reports: reports.length, findings: reports.reduce((a, r) => a + r.f.length, 0), repo: 'sample-team-repo (example.com)' },
  labels: LABELS,
  reports,
};

/* ---------- repo labels (the Register tab) ---------- */
const lab = (n, g, ...p) => ({ n, g, d: 'match: ' + p.join(', '), p });
const repoLabels = {
  source: 'sample labels (fictional)',
  labels: [
    lab('PRDT: Sample Portal Appointment Reminders', 'PRDT', 'Appointment Reminders'),
    lab('PRDT: Sample Portal Document Upload', 'PRDT', 'Document Upload'),
    lab('PRDT: Sample Portal Notification Preferences', 'PRDT', 'Notification Preferences'),
    lab('PRDT: Sample Mobile App', 'PRDT', 'Sample Mobile App'),
    lab('BNFT: Sample Benefit', 'BNFT', 'Sample Benefit'),
    lab('RESRCH: Usability Testing', 'RESRCH', 'Usability Testing'),
    lab('RESRCH: Interviews', 'RESRCH', 'Interviews'),
    lab('RESRCH: Discovery', 'RESRCH', 'Discovery', 'Generative'),
    lab('RESRCH: Accessibility', 'RESRCH', 'Accessibility'),
    lab('AUD: Caregivers', 'AUD', 'Caregivers'),
    lab('AUD: Mobile users', 'AUD', 'Mobile users'),
    lab('DSC: Alert Boxes', 'DSC', 'Alert Boxes'),
    lab('DSC: Checkbox', 'DSC', 'Checkbox'),
    lab('key-findings-added', 'Other', 'key-findings-added', 'findings added'),
    lab('no-recommendations-exploratory', 'Other', 'no-recommendations-exploratory', 'Discovery/exploratory research no recommendations'),
    lab('no-recommendations-validated', 'Other', 'no-recommendations-validated', 'Validated, no recommendations'),
    lab('no-recommendations-uat', 'Other', 'no-recommendations-uat', 'UAT, no recommendations'),
    lab('further-research-needed', 'Other', 'further-research-needed', 'Further research needed'),
    lab('recommendations-tracked-externally', 'Other', 'recommendations-tracked-externally', 'Recommendations tracked externally'),
  ],
  teams: ['Sample Team A', 'Sample Team B', 'Sample Team C'],
};

mkdirSync(out, { recursive: true });
const w = (f, o) => writeFileSync(resolve(out, f), JSON.stringify(o, null, 1) + '\n');
w('research-index.json', researchIndex);
w('explorer-index.json', explorerIndex);
w('repo-labels.json', repoLabels);
console.log(`Wrote sample data to ${out}: ${documents.length} documents, ${board.studies.length} board studies, ${reports.length} Explorer reports, ${repoLabels.labels.length} labels`);
