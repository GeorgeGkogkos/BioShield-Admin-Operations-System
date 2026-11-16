/* Interactive administrative coverage map of real published TED metadata only.
 * Marker location is NEVER a precise worksite, customer or incident address.
 * Leaflet / © OpenStreetMap contributors attribution must remain visible.
 */
const SERVICE_NAME={
  pest_control:'Απεντόμωση', rodent_control:'Μυοκτονία',
  disinfection:'Απολύμανση',plumbing:'Υδραυλικός',
  drain_unblocking:'Αποφράξεις'
};
const COLORS={
  pest_control:'#168269',rodent_control:'#d97706',
  disinfection:'#2563eb',plumbing:'#7950ba',
  drain_unblocking:'#dc3545'
};
const safeTxt=v=>String(v==null?'':v);
export function coverageMarkup(report,esc){
  if(report?.status!=='ok')return '<div class="bio-demo-offline"><strong>Δεν είναι διαθέσιμα επαληθευμένα γεωγραφικά δεδομένα.</strong>'+
    '<p>Ο επίσημος πάροχος TED δεν επέστρεψε επιτυχημένη απάντηση. Δεν προβάλλονται παλιά δεδομένα ως νέες τοποθεσίες.</p>'+
    '<button type="button" class="bio-open-lab" id="bio-map-refresh">Επανάληψη</button></div>';
  const count=report.mapped_notice_count||0;
  const regions=report.regions||[];
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">GEOGRAPHIC COVERAGE / VERIFIED SOURCES</p>',
    '<h2>Χάρτης πηγών και ερευνητική κάλυψη</h2>',
    '<p class="bio-muted">Στίγματα δημόσιων προκηρύξεων με ρητή γεωγραφική αναφορά.',
    ' Οι συντεταγμένες είναι <strong>ενδεικτικά κέντρα διοικητικών περιοχών ή έδρες φορέων</strong> — όχι ακριβή σημεία εργασιών, συμβάντων ή πελατών.</p></div>',
    '<span class="bio-test-badge">TED · 30 ΗΜΕΡΕΣ</span></div>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric"><span>Στίγματα πηγών</span><strong>',esc(count),'</strong><small>Διοικητική θέση, όχι εργοτάξιο</small></article>',
    '<article class="bio-metric"><span>Χωρίς επαρκή γεωγραφική αναφορά</span><strong>',esc(report.unlocated_notice_count),'</strong><small>Δεν τοποθετήθηκαν αυθαίρετα</small></article>',
    '<article class="bio-metric"><span>Περιφέρειες χωρίς καταγραφή TED</span><strong>',esc(report.zero_observed_regions),'</strong><small>Όχι απόδειξη ανυπαρξίας ζήτησης</small></article>',
    '</div>',
    '<div class="bio-lab-filter bio-service-filter">',
    '<label for="bio-map-service">Υπηρεσία</label><select id="bio-map-service"><option value="all">Όλες</option>',
    ...Object.keys(SERVICE_NAME).map(x=>'<option value="'+x+'">'+esc(SERVICE_NAME[x])+'</option>'),
    '</select><label for="bio-map-region">Περιοχή</label>',
    '<select id="bio-map-region"><option value="all">Όλη η Ελλάδα</option>',
    ...regions.map(r=>'<option value="'+esc(r.region)+'">'+esc(r.region)+'</option>'),
    '</select><label for="bio-map-days">Χρόνος</label>',
    '<select id="bio-map-days"><option value="30">Τελευταίες 30 ημέρες</option><option value="7">Τελευταίες 7 ημέρες</option></select>',
    '<span id="bio-map-count" role="status"></span></div>',
    '<div class="bio-coverage-layout">',
    '<div class="bio-map-host"><div id="bio-coverage-map" class="bio-map-canvas" role="region" aria-label="Χάρτης γεωγραφικής κάλυψης πραγματικών πηγών TED">',
    '<p>Φόρτωση χάρτη…</p></div>',
    '<p class="bio-note">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. ',
    'Διακριτό στίγμα για έδρα φορέα όταν δεν έχει αναφερθεί ο τόπος εκτέλεσης.</p></div>',
    '<aside class="bio-coverage-list"><h3>Περιοχές για περαιτέρω έρευνα</h3>',
    '<p class="bio-note">Καταμετρούνται μόνο δημοσιεύσεις του TED με αποδεκτή γεωγραφική ένδειξη μέσα στις τελευταίες 30 ημέρες. ',
    '<strong>Το μηδέν δεν σημαίνει μηδενική πραγματική ζήτηση.</strong></p>',
    '<div class="bio-coverage-rows">',
    ...regions.map(r=>'<div class="bio-coverage-row"><span>'+esc(r.region)+'</span><strong>'+esc(r.observed_count)+'</strong></div>'),
    '</div></aside></div>',
    '<div id="bio-map-locations" class="bio-real-map-locations" aria-live="polite"></div>',
    '<p class="bio-note"><strong>Όριο ερμηνείας:</strong> Οι γεωγραφικές αναφορές προκύπτουν μόνο από τον τίτλο προκήρυξης ή από σαφώς δηλωμένο φορέα. ',
    'Τοποθεσίες που προκύπτουν μόνο από τον φορέα σημαίνονται ως «Έδρα φορέα, όχι βεβαιωμένος τόπος έργου». ',
    'Χωρίς τεκμηριωμένη αναφορά δεν δημιουργείται pin. Δεν εμφανίζονται ακριβείς ιδιωτικές διευθύνσεις.</p>',
  ].join('');
}

export function setupCoverageMap(panel, report,esc){
  const api=typeof window!=='undefined'?window.L:null;
  const container=panel.querySelector('#bio-coverage-map');
  if(!container||report?.status!=='ok')return ()=>{};
  if(!api || !api.map){
    container.innerHTML='<p role="status">Δεν φορτώθηκε η βιβλιοθήκη του διαδραστικού χάρτη. Τα τεκμηριωμένα σημεία παρατίθενται παρακάτω.</p>';
    const target=panel.querySelector('#bio-map-locations');
    if(target)target.textContent=(report.points||[]).map(p=>p.location_text+' — '+p.notice_number).join(' · ');
    return ()=>{};
  }
  container.textContent='';
  const map=api.map(container,{scrollWheelZoom:false,zoomControl:true}).setView([38.3,24.2],6);
  api.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap contributors', maxZoom:18,
  }).addTo(map);
  const active=[];
  const rows=report.points||[];
  function draw(){
    for(const marker of active)map.removeLayer(marker);
    active.length=0;
    const service=panel.querySelector('#bio-map-service')?.value||'all';
    const region=panel.querySelector('#bio-map-region')?.value||'all';
    const days=Number(panel.querySelector('#bio-map-days')?.value||30);
    const cutoff=new Date(Date.now()-days*86400000);
    const selected=rows.filter(p=>{
      const when=new Date(p.published_on+'T00:00:00Z');
      return !Number.isNaN(when.getTime())&&when>=cutoff&&
        (service==='all'||(p.service_codes||[]).includes(service))&&
        (region==='all'||p.region===region);
    });
    const bounds=[];
    for(const p of selected){
      if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))continue;
      const shade=COLORS[(p.service_codes||[])[0]]||'#0f766e';
      const isIssuer=p.location_basis==='buyer_only_not_work_site';
      const marker=api.circleMarker([p.latitude,p.longitude],{
        radius:isIssuer?7:9,weight:isIssuer?3:2,
        color:shade,fillColor:shade,fillOpacity:isIssuer ? 0.35 : 0.8,
        dashArray:isIssuer?'3 3':null
      });
      const wrapper=document.createElement('div');
      const strong=document.createElement('strong');strong.textContent=p.location_text;
      const line=document.createElement('p');line.textContent=(isIssuer?'Έδρα φορέα — όχι βεβαιωμένος τόπος έργου':
        'Ενδεικτικό κέντρο περιοχής — όχι ακριβής θέση έργου')+' · '+p.published_on;
      const detail=document.createElement('p');detail.textContent=p.title;
      const link=document.createElement('a');link.href=p.source_url;link.target='_blank';
      link.rel='noopener noreferrer';link.textContent='Επίσημη προκήρυξη '+p.notice_number;
      wrapper.append(strong,line,detail,link);
      marker.bindPopup(wrapper,{maxWidth:320}).addTo(map);
      active.push(marker);bounds.push([p.latitude,p.longitude]);
    }
    if(bounds.length>0)map.fitBounds(bounds,{padding:[36,36],maxZoom:9});
    else map.setView([38.3,24.2],6);
    const count=panel.querySelector('#bio-map-count');
    if(count)count.textContent=selected.length+' από '+rows.length+' στίγματα';
    const list=panel.querySelector('#bio-map-locations');
    if(list)list.innerHTML=selected.map(p=>
      '<div class="bio-coverage-source"><strong>'+esc(p.location_text)+'</strong> · '+
      esc(p.published_on)+' · '+esc((p.service_codes||[]).map(s=>SERVICE_NAME[s]||s).join(', '))+
      ' <a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">TED '+esc(p.notice_number)+'</a>'+
      '<small>'+esc(p.location_basis==='buyer_only_not_work_site'?'Έδρα φορέα, όχι θέση έργου':'Διοικητικό σημείο αναφοράς, όχι θέση έργου')+'</small></div>'
    ).join('')||'<p class="bio-note">Δεν υπάρχουν τεκμηριωμένες γεωγραφικές καταχωρίσεις για αυτά τα φίλτρα.</p>';
  }
  panel.addEventListener('change',e=>{
    if(['bio-map-service','bio-map-region','bio-map-days'].includes(e.target.id))draw();
  });
  draw();
  requestAnimationFrame(()=>map.invalidateSize());
  return ()=>map.remove();
}
