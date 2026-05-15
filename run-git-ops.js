const { execSync } = require('child_process');
const opts = { cwd: 'd:\\PROYECTO MASTER\\businesscloudPayments', encoding: 'utf8', shell: true };

try {
  const tsc = execSync('npx tsc --noEmit 2>&1', opts);
  console.log('TSC OUTPUT:', tsc || '(no errors)');
} catch(e) {
  console.error('TSC ERRORS:', e.stdout || e.message);
  process.exit(1);
}

try {
  execSync('git add -A', opts);
  console.log('git add OK');
} catch(e) { console.error('git add failed:', e.message); }

const commitMsg = [
  'feat: add last payment date card to client history',
  '',
  '- Calculate lastPaymentDate from all abonos (paymentTypeId=2)',
  '- Show 4th summary card "Ultimo abono" with formatted date (es-MX locale)',
  '- Shows "Sin abonos" when no payments exist',
  '- Also fix sort: payments inherit parent sale date when payment.date is null',
  '- Secondary sort: sale before payment on same date',
  '',
  'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
].join('\n');

try {
  const commit = execSync(`git commit -m "${commitMsg}"`, opts);
  console.log('COMMIT:', commit);
} catch(e) { console.log('COMMIT result:', e.stdout || e.message); }

try {
  const push = execSync('git push origin main 2>&1', opts);
  console.log('PUSH:', push);
} catch(e) { console.error('PUSH failed:', e.message); }
