import test from 'node:test';
import assert from 'node:assert/strict';
import {renderVerifiedRequests} from '../static/verified-requests.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const row={requester_type:'individual',service_category:'drain_unblocking',
  broad_area:'Περιστέρι',original_posted_on:'2026-11-17',
  fulfillment_status:'unknown',contact_eligible:false};
test('empty verified results are clearly empty, not fake leads',()=>{
  const html=renderVerifiedRequests({status:'ok',requests:[]},esc,'individual');
  assert.match(html,/Δεν έχουν καταχωριστεί επαληθευμένα πρόσφατα/);
  assert.doesNotMatch(html,/data-bio-verified-row/);
});
test('user filters and sanitizes redacted live requests',()=>{
  const html=renderVerifiedRequests({status:'ok',requests:[
    {...row,canonical_url:'https://private.example/author',short_need_summary:'<private>'},
    {...row,requester_type:'business',service_category:'pest_control'}
  ]},esc,'individual');
  assert.match(html,/data-services="drain_unblocking"/);
  assert.match(html,/Περιστέρι/);
  assert.doesNotMatch(html,/https:\/\/private/);
  assert.doesNotMatch(html,/<private>/);
  assert.doesNotMatch(html,/data-services="pest_control"/);
  assert.match(html,/μη ταυτοποιητικά/);
});
test('no silent fake results when preview backend is offline',()=>{
  const html=renderVerifiedRequests({status:'unavailable',requests:[]},esc,'individual');
  assert.match(html,/δεν είναι διαθέσιμη/);
});
