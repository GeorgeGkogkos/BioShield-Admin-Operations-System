import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderKimdis} from '../static/kimdis-results.js';

const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');

const report={
  status:'ok', count:1, raw_result_slots_examined:6,requests_completed:4,
  notices:[{
    reference_number:'26PROC020176714',
    published_on:'2026-11-12',
    buyer:'Δήμος Περιστερίου',
    title:'Απόφραξη σχαρών <script>alert("x")</script>',
    service_codes:['drain_unblocking','disinfection'],
    budget_eur_ex_vat:20000,
    deadline_at_as_posted:'2026-11-17T15:00:00',
    deadline_state:'future_deadline_unverified',
    notice_type:'Πρόσκληση'
  }]
};

test('official KΗΜΔΗΣ rows are source-linked, escaped, and clearly not eligible leads',()=>{
  const html=renderKimdis(report,esc);
  assert.match(html,/data-kimdis-row/);
  assert.match(html,/data-services="drain_unblocking,disinfection"/);
  assert.match(html,/26PROC020176714/);
  assert.match(html,/cerpp\.eprocurement\.gov\.gr\/upgkimdis\/unprotected\/home\.xhtml\?referenceNumber=26PROC020176714/);
  assert.match(html,/δεν αποδεικνύει δικαίωμα συμμετοχής/);
  assert.match(html,/απαιτείται έλεγχος ισχύος\/επιλεξιμότητας/);
  assert.match(html,/CC BY 4\.0/);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  assert.doesNotMatch(html,/τηλέφωνο|authorEmail|private@example/);
});

test('partial official response is visibly marked incomplete, no invented totals',()=>{
  const html=renderKimdis({...report,status:'partial',failed_queries:1},esc);
  assert.match(html,/Μερική κάλυψη/);
  assert.match(html,/1<\/strong> διαφορετικοί ΑΔΑΜ/);
});

test('origin outage fails visibly closed without existing rows',()=>{
  const html=renderKimdis({status:'unavailable',notices:report.notices},esc);
  assert.match(html,/δεν είναι τώρα διαθέσιμη/);
  assert.doesNotMatch(html,/data-kimdis-row/);
});

test('unified category and service filters apply to KΗΜΔΗΣ; TED tab remains TED-only',()=>{
  const code=readFileSync(new URL('../static/bioshield-admin.js',import.meta.url),'utf8');
  assert.match(code,/renderKimdis\(kimdis,esc\)/);
  assert.match(code,/'\/bioshield\/discovery\/kimdis'/);
  assert.match(code,/\[data-ted-row\],\[data-focus-row\],\[data-remote-row\],\[data-kimdis-row\]/);
  assert.match(code,/kimdisVisible=discoveryCategory==='public_sector'/);
  assert.match(code,/kimdisSection\.hidden=category!=='public_sector'/);
});
