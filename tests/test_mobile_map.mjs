import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coverageMarkup} from '../static/geographic-map.js';
import {publicArchivePoints,geographicRows} from '../static/geographic-archive.js';

const esc=value=>String(value);
const sample={
  status:'ok',mapped_notice_count:3,unlocated_notice_count:2,
  zero_observed_regions:11,regions:[{region:'Αττική',observed_count:3}],points:[]
};

test('map filters are labeled, grouped and remain distinct when compacted',()=>{
  const markup=coverageMarkup(sample,esc);
  assert.match(markup,/class="bio-lab-filter bio-service-filter bio-map-filters"/);
  assert.match(markup,/role="group" aria-label="Φίλτρα χάρτη"/);
  assert.equal((markup.match(/class="bio-map-filter-field"/g)||[]).length,4);
  for(const id of ['bio-map-service','bio-map-region','bio-map-source','bio-map-days']){
    assert.ok(markup.includes('for="'+id+'"'));
    assert.ok(markup.includes('id="'+id+'"'));
  }
  assert.match(markup,/id="bio-map-count" role="status" aria-live="polite"/);
  assert.match(markup,/id="bio-coverage-map"/);
  assert.match(markup,/ενδεικτικά κέντρα διοικητικών περιοχών/);
});

test('mobile source sheet is bound to markers and cleaned up on tab exit',()=>{
  const code=readFileSync(new URL('../static/geographic-map.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../static/bioshield-admin.css',import.meta.url),'utf8');
  assert.match(code,/matchMedia\('\(max-width: 640px\)'\)/);
  assert.match(code,/mobileDetail\.className='bio-map-mobile-detail'/);
  assert.match(code,/detailBody\.replaceChildren\(popupContent\(p\)\)/);
  assert.match(code,/bubblingMouseEvents:false/);
  assert.match(code,/marker\.bindPopup\(popupContent\(p\)/);
  assert.match(code,/closeDetailButton\.setAttribute\('aria-label','Κλείσιμο πληροφοριών σημείου'\)/);
  assert.match(code,/map\.off\('click',hideDetail\)/);
  assert.match(code,/resizeObserver\?\.disconnect\(\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/\.bio-map-mobile-detail:not\(\[hidden\]\)/);
  assert.match(css,/overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css,/\.bio-page section\[data-bio-panel="map"\]/);
});


test('short landscape orientation uses a compact scrollable source card, not offscreen Leaflet popup',()=>{
  const code=readFileSync(new URL('../static/geographic-map.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../static/bioshield-admin.css',import.meta.url),'utf8');
  assert.match(code,/const shortViewport=window\.matchMedia\('\(max-height: 500px\)'\)/);
  assert.match(code,/if\(mobileViewport\.matches\|\|shortViewport\.matches\)/);
  assert.match(code,/shortViewport\.addEventListener\('change',onViewportChange\)/);
  assert.match(code,/shortViewport\.removeEventListener\('change',onViewportChange\)/);
  assert.match(css,/@media\(min-width:641px\) and \(max-height:500px\)/);
  assert.match(css,/width:min\(410px,calc\(100% - 24px\)\)/);
  assert.match(css,/max-height:min\(48%,220px\)/);
  assert.match(css,/overflow-y:auto;overscroll-behavior:contain/);
});

test('public demo archival tenders map to issuer areas, never worksite pins or private prospects',()=>{
  const input={
    demo_supabase_connected:true,
    tenders:[{
      id:'ORG-008',audience_segment:'public_sector',contact_eligible:false,
      region:'Αττική — Περιστέρι',published_on:'2026-11-12',
      source_url:'https://diavgis.gr/act/26PROC020176714',
      notice_id:'26PROC020176714',service:'Απεντόμωση και μυοκτονία',
      authority:'Δήμος Περιστερίου'
    },{
      id:'ORG-009',audience_segment:'public_sector',contact_eligible:false,
      region:'Άγνωστη τοποθεσία',published_on:'2026-11-12',
      source_url:'https://diavgis.gr/act/26PROC020156749'
    },{
      id:'BIZ-007',audience_segment:'business',contact_eligible:false,
      region:'Αττική',published_on:'2026-11-12',
      source_url:'https://example.org/secure',
    }]
  };
  const pts=publicArchivePoints(input);
  assert.equal(pts.length,1);
  assert.equal(pts[0].id,'ORG-008');
  assert.equal(pts[0].region,'Αττική');
  assert.deepEqual(pts[0].service_codes,['pest_control','rodent_control']);
  assert.equal(pts[0].is_actual_work_site,false);
  assert.equal(pts[0].contact_eligible,false);
  assert.equal(pts[0].source_type,'demo_public_archive');
  const html=coverageMarkup(sample,esc,input);
  assert.match(html,/Αρχείο δοκιμαστικής βάσης/);
  assert.match(html,/Οι ιδιωτικές επιχειρήσεις και τα προσωπικά στοιχεία δεν προβάλλονται/);
  assert.match(html,/Όλο το διαθέσιμο αρχείο/);
});

test('TED/public archive duplicate is counted only once in combined source view',()=>{
  const ted={
    status:'ok',mapped_notice_count:1,unlocated_notice_count:0,
    regions:[{region:'Αττική',observed_count:1}],zero_observed_regions:12,
    points:[{
      id:'TED-758868-2026',notice_number:'758868-2026',source_type:'ted',
      region:'Αττική',latitude:37.943,longitude:23.647,published_on:'2026-11-02',
      service_codes:['pest_control'],source_url:'https://ted.europa.eu/en/notice/-/detail/758868-2026'
    }]
  };
  const pilot={demo_supabase_connected:true,tenders:[{
    id:'ORG-001',audience_segment:'public_sector',contact_eligible:false,
    region:'Αττική — Πειραιάς',published_on:'2026-11-02',
    source_url:'https://example.org/notice',
    notice_id:'26PROC020101899 / TED 758868-2026',
    service:'Απεντόμωση',authority:'Δήμος Πειραιά'
  }]};
  const rows=geographicRows(ted,pilot);
  assert.equal(rows.live.length,1);
  assert.equal(rows.archived.length,1);
  assert.equal(rows.combined.length,1);
  assert.equal(rows.combined[0].source_type,'ted');
});

test('demo remains visible and transparently labeled if TED is offline',()=>{
 const pilot={demo_supabase_connected:true,tenders:[{
    id:'ORG-021',audience_segment:'public_sector',contact_eligible:false,
    region:'Πελοπόννησος — Περιφέρεια (Π.Ε. Αργολίδας, Αρκαδίας και λοιπές)',
    published_on:'2026-11-13',source_url:'https://example.org/notice',
    service:'Καταπολέμηση κουνουπιών',authority:'Περιφέρεια Πελοποννήσου'
 }]};
 const html=coverageMarkup({status:'source_unavailable'},esc,pilot);
 assert.match(html,/Το επίσημο TED δεν είναι διαθέσιμο/);
 assert.match(html,/Στίγματα πηγών/);
 assert.doesNotMatch(html,/Δεν είναι διαθέσιμα επαληθευμένα γεωγραφικά δεδομένα/);
});
