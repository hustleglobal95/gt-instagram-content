/**
 * threads_reply_run.js, the entry point the reply workflow calls.
 * Keeps threads_reply.js importable and testable without side effects.
 */
const { run } = require('./threads_reply');

(async () => {
  const raw = process.env.THREADS_ACCOUNTS;
  if (!raw) { console.error('THREADS_ACCOUNTS is not set.'); process.exit(1); }
  let accounts;
  try { accounts = JSON.parse(raw); } catch { console.error('THREADS_ACCOUNTS is not valid JSON.'); process.exit(1); }

  const dry = process.env.GT_DRY_RUN === '1';
  let totalSent = 0, totalEsc = 0;

  for (const account of accounts) {
    const r = await run(account, { dryRun: dry });
    totalSent += r.sent.length;
    totalEsc += (r.escalations || []).length;

    console.log(`\n=== ${account.name || account.userId} ===`);
    console.log(`${dry ? 'DRY RUN, nothing sent. ' : ''}replied ${r.sent.length}, skipped ${r.skipped.length}, cap remaining ${r.remaining}`);

    if (r.outboundAvailable === false) {
      console.log(`outbound keyword search unavailable: ${r.outboundReason}`);
      console.log('This is expected unless the token carries threads_keyword_search. Inbound replies still ran.');
    }
    for (const s of r.sent) {
      console.log(`  -> @${s.to || '?'} [${s.shape}${s.audience ? '/' + s.audience : ''}] ${s.text.slice(0, 90).replace(/\n/g, ' ')}`);
    }
    if ((r.escalations || []).length) {
      console.log(`\n  ${r.escalations.length} message(s) escalated for a human, NOT answered automatically:`);
      for (const e of r.escalations) console.log(`     [${e.rule}] @${e.from || '?'}: ${(e.text || '').slice(0, 120)}`);
    }
    if (r.inboundError) console.log(`  inbound error: ${r.inboundError}`);
  }

  console.log(`\nTotal: ${totalSent} replies${dry ? ' (dry run)' : ''}, ${totalEsc} escalated.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
