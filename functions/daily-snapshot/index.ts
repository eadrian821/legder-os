// Supabase Edge Function: daily-snapshot
// Deploy: supabase functions deploy daily-snapshot
// Schedule via Supabase Dashboard → Database → pg_cron:
//   select cron.schedule('daily-snapshot', '0 23 * * *', $$
//     select net.http_post(
//       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/daily-snapshot',
//       headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
//     ) $$);
//
// Or call manually: POST /functions/v1/daily-snapshot

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // Auth check: accept service key or internal scheduler
  const auth = req.headers.get('Authorization') || '';
  if (!auth.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const errors: string[] = [];
  let processed = 0;

  // Get all active accounts with their owners
  const { data: accounts, error: accErr } = await sb
    .from('accounts')
    .select('id, user_id, currency, opening_balance')
    .eq('is_archived', false);

  if (accErr) return new Response(JSON.stringify({ error: accErr.message }), { status: 500 });

  for (const acc of accounts || []) {
    try {
      // Compute running balance: opening + all in/out transactions to today
      const { data: agg } = await sb
        .from('transactions')
        .select('direction, amount_primary, amount')
        .eq('account_id', acc.id)
        .lte('occurred_at', today + 'T23:59:59Z')
        .in('direction', ['in', 'out']);

      let balance = Number(acc.opening_balance || 0);
      for (const tx of agg || []) {
        const amt = Number(tx.amount_primary || tx.amount || 0);
        balance += tx.direction === 'in' ? amt : -amt;
      }

      // Fetch FX rate if not KES (TODO: wire to fx_rates table)
      const balancePrimary = balance; // Phase 2: USD accounts need FX conversion

      // Upsert snapshot
      const { error: snapErr } = await sb.rpc('write_snapshot', {
        p_account_id: acc.id,
        p_as_of: today,
        p_balance: balance,
        p_balance_primary: balancePrimary,
      });

      if (snapErr) errors.push(`${acc.id}: ${snapErr.message}`);
      else processed++;
    } catch (e) {
      errors.push(`${acc.id}: ${e}`);
    }
  }

  // Post due recurring transactions
  const { data: dueRecurring } = await sb
    .from('recurring')
    .select('*')
    .eq('is_active', true)
    .eq('auto_post', true)
    .lte('next_run', today);

  let recurringPosted = 0;
  for (const rec of dueRecurring || []) {
    const { error: postErr } = await sb.rpc('post_recurring', { p_recurring_id: rec.id });
    if (!postErr) recurringPosted++;
    else errors.push(`recurring ${rec.id}: ${postErr.message}`);
  }

  return new Response(JSON.stringify({
    date: today,
    snapshots_written: processed,
    recurring_posted: recurringPosted,
    errors,
  }), { headers: { 'Content-Type': 'application/json' } });
});

