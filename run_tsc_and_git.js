import { execSync } from 'child_process';

const opts = { cwd: 'd:\\PROYECTO MASTER\\businesscloudPayments', encoding: 'utf8', shell: true };

let tscFailed = false;
try {
  const out = execSync('npx tsc --noEmit 2>&1', opts);
  console.log('TSC:', out || '(no errors)');
} catch(e) {
  console.log('TSC ERRORS:\n', e.stdout || e.message);
  tscFailed = true;
}

if (!tscFailed) {
  try { execSync('git add -A', opts); } catch(e) { console.error('git add:', e.message); }
  const msg = `fix: improve login error handling and add last payment date card

- LoginPage: distinguish HTTP errors from JS errors (login() throws)
- Show specific message when token is invalid/expired instead of connection error
- Fix retry button: pass proper FormEvent instead of casting
- ClientsPage: add Ultimo abono 4th summary card in client history modal
- History sort: payments fallback to parent sale date when payment.date is null
- Secondary stable sort: sale before payment on same date

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`;
  try {
    const r = execSync(`git commit -m "${msg.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, opts);
    console.log('COMMIT:', r);
  } catch(e) { console.log('COMMIT:', e.stdout || e.message); }
  try {
    const p = execSync('git push origin main 2>&1', opts);
    console.log('PUSH:', p);
  } catch(e) { console.error('PUSH:', e.stdout || e.message); }
}
