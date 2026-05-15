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
  const msg = `feat: add last payment date card to history pages

- ConsultaPage (public link): add Ultimo abono 4th summary card
- ClientsPage (admin modal): add Ultimo abono 4th summary card
- Both use xs=6 md=3 grid for 4 columns (responsive on mobile)
- Sort client history by date with stable secondary sort
- LoginPage: improved error handling (no more false connection errors)

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
