import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coverageMarkup} from '../static/geographic-map.js';

const esc=value=>String(value);
const sample={
  status:'ok',mapped_notice_count:3,unlocated_notice_count:2,
  zero_observed_regions:11,regions:[{region:'Αττική',observed_count:3}],points:[]
};

test('map filters are labeled, grouped and remain distinct when compacted',()=>{
  const markup=coverageMarkup(sample,esc);
  assert.match(markup,/class="bio-lab-filter bio-service-filter bio-map-filters"/);
  assert.match(markup,/role="group" aria-label="Φίλτρα χάρτη"/);
  assert.equal((markup.match(/class="bio-map-filter-field"/g)||[]).length,3);
  for(const id of ['bio-map-service','bio-map-region','bio-map-days']){
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
