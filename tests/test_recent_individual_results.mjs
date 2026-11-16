import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSearchArchive} from '../static/unified-archive.js';
import {renderPublicPilot} from '../static/real-pilot.js';

// Public, synthetic objects used solely in isolated regression tests.
// They never seed the demo database or represent contactable people.
const esc = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;');
const caseRow = (id, overrides={}) => ({
  id, audience_segment:'individual', publisher:'Public discussion',
  posted_on:'2026-11-10', service:'Απεντόμωση',
  summary:'Ζητά σύσταση τεχνικού, χωρίς στοιχεία επικοινωνίας',
  source_url:'https://example.com/'+id, source_opened:true,
  within_14d:true, within_7d:false, post_age_days:6,
  gate:'historical_not_confirmed_active', ...overrides,
});
const rows=[
  caseRow('FORUM-901',{posted_on:'2026-10-01', within_14d:false}),
  caseRow('FORUM-902',{gate:'not_hiring'}),
  caseRow('FORUM-903',{source_opened:false}),
  caseRow('FORUM-904'),
];

test('individual search shows only verified fresh explicit service requests',()=>{
  const html=renderSearchArchive({demo_supabase_connected:true, community_cases:rows},esc,'individual');
  assert.match(html,/FORUM-904/);
  for(const oldOrUnqualified of ['FORUM-901','FORUM-902','FORUM-903'])
    assert.doesNotMatch(html,new RegExp(oldOrUnqualified));
  assert.match(html,/14 ημερών/);
});

test('strict empty state does not fill an individual request list with old discussion',()=>{
  const html=renderSearchArchive({
    demo_supabase_connected:true,community_cases:rows.slice(0,3),
  },esc,'individual');
  assert.match(html,/Δεν βρέθηκαν επαληθευμένα πρόσφατα αιτήματα/);
  for(const oldOrUnqualified of ['FORUM-901','FORUM-902','FORUM-903'])
    assert.doesNotMatch(html,new RegExp(oldOrUnqualified));
});

test('pilot list does not render old original posts even when they remain in DB',()=>{
  const html=renderPublicPilot({
    demo_supabase_connected:true, fetched_at_utc:'2026-11-16T10:00:00Z',
    as_of_date:'2026-11-16', community_cases:rows,
    tenders:[], business_requests:[], business_requests_count:0,
    public_sources_reviewed:4, segment_counts:{
      individual:4,public_sector:0,business:0,needs_review:0,
    },
    reddit_freshness:{recent_posts_14d:3,recent_posts_7d:0,historical_or_unopened:1},
  },esc);
  assert.doesNotMatch(html,/FORUM-901/);
  assert.match(html,/FORUM-904/);
  assert.match(html,/value="14d"/);
  assert.doesNotMatch(html,/value="30d"/);
  assert.doesNotMatch(html,/μαζί με ιστορικά/);
});
