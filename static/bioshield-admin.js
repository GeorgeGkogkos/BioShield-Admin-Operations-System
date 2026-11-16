import {renderPublicPilot} from './real-pilot.js';
import {coverageMarkup,setupCoverageMap} from './geographic-map.js';
import {installNavigation} from './typed/navigation.js';
import {researchMarkup,setupResearchPlaybook} from './typed/research-view.js';

/* BIO-14: REAL public-source evidence only; the synthetic request lab is removed. */
const fmt = x => Number(x || 0).toLocaleString('el-GR');
const serviceLabels={
  pest_control:'Απεντόμωση', rodent_control:'Μυοκτονία',disinfection:'Απολύμανση',
  plumbing:'Υδραυλικός', drain_unblocking:'Αποφράξεις'
};
const sourceStateName={
  enabled_official_api:'Ενεργή επίσημη αναζήτηση',
  blocked_pending_written_commercial_approval:'Αναμονή γραπτής εμπορικής άδειας',
  blocked_pending_platform_permission:'Αναμονή άδειας πλατφόρμας',
  blocked_pending_eligible_api_access:'Αναμονή κατάλληλου API',
  candidate_sources_found_policy_review_required:'Εντοπίστηκαν forums · αναμονή ελέγχου όρων'
};
function sourceList(policy,esc){
  if(!policy?.platforms)return '<p>Οι καταστάσεις πηγών δεν είναι διαθέσιμες.</p>';
  return policy.platforms.map(p=>'<article class="bio-source-row"><div><strong>'+esc(p.name)+'</strong>'+
    '<p>'+esc(p.note)+'</p><a href="'+esc(p.url)+'" rel="noopener noreferrer" target="_blank">Πηγή / όροι</a></div>'+
    '<span>'+esc(sourceStateName[p.status]||p.status)+'</span></article>').join('');
}
const dateTime = raw => {
  if (!raw) return '—';
  const parsed=new Date(raw);
  return Number.isNaN(parsed.getTime())?'—':
    new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',
      day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(parsed);
};
function countCard(title,value,note){
  return '<article class="bio-metric"><span>'+title+'</span><strong>'+fmt(value)+'</strong><small>'+note+'</small></article>';
}
function tenderRows(state,esc) {
  if (state?.status !== 'ok') return '<p class="bio-note">Δεν υπάρχει διαθέσιμη επιβεβαιωμένη απάντηση από το επίσημο TED API. Δεν εμφανίζονται κατασκευασμένα ή παλιά αποτελέσματα ως νέα.</p>';
  const found=state.notices||[];
  if(!found.length)return '<p class="bio-note">Η τελευταία πραγματική αναζήτηση TED ολοκληρώθηκε, αλλά δεν επέστρεψε πρόσφατες εγγραφές που να καλύπτουν όλα τα κριτήρια.</p>';
  return '<div class="bio-scroll"><table class="bio-table bio-real-table"><thead><tr>'+
    '<th>Αριθμός TED</th><th>Ημ/νία δημοσίευσης</th><th>Υπηρεσία</th><th>Δημόσιος αγοραστής</th><th>Αντικείμενο</th><th>CPV</th><th>Πρωτογενής πηγή</th>'+
    '</tr></thead><tbody>'+found.map(x=>
      '<tr data-ted-row data-services="'+esc((x.service_codes||[]).join(','))+'"><td><strong>'+esc(x.notice_number)+'</strong></td><td>'+esc(x.published_on)+'</td>'+
      '<td>'+esc((x.service_codes||[]).map(k=>serviceLabels[k]||k).join(', '))+'</td>'+
      '<td>'+esc(x.buyer)+'</td><td>'+esc(x.title)+'</td><td>'+esc((x.cpv_codes||[]).join(', '))+'</td>'+
      '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο TED</a>'+
      '<small class="bio-evidence-note">Ελέγχονται η διακήρυξη και η δυνατότητα υποβολής</small></td></tr>'
    ).join('')+'</tbody></table></div>';
}
function discoveries(state,esc) {
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">OFFICIAL EU OPEN DATA / LIVE SEARCH</p>',
    '<h2>Αυτόματη ανακάλυψη — δημόσια έργα</h2>',
    '<p class="bio-muted">Πραγματική αναζήτηση δημοσίων συμβάσεων για απεντομώσεις, μυοκτονίες, απολυμάνσεις, <strong>υδραυλικά</strong> και <strong>αποφράξεις</strong> βάσει επίσημων CPV. Δεν τεκμηριώνει από μόνη της ότι ένας διαγωνισμός είναι ανοιχτός.</p></div>',
    '<span class="bio-test-badge">',state?.status==='ok'?'API TED · ΑΝΑΓΝΩΣΗ':'TED · ΜΗ ΔΙΑΘΕΣΙΜΟ','</span></div>',
    '<div class="bio-demo-connection"><div><strong>',state?.status==='ok'?'Τελευταία επιτυχής αναζήτηση':'Αδυναμία επαλήθευσης TED',
    '</strong><p>Ώρα Αθήνας: ',dateTime(state?.searched_at_utc||state?.checked_at_utc),
    ' · ',state?.status==='ok'?'Επιστράφηκαν '+fmt(state.count)+' πραγματικές προκηρύξεις από '+fmt(state.raw_count)+' εγγραφές απάντησης.':'Δεν χρησιμοποιούμε εικονικά αποτελέσματα.', '</p></div>',
    '<button id="bio-ted-refresh" type="button" class="bio-open-lab">Ανανέωση αναζήτησης</button></div>',
    '<div class="bio-metrics bio-lab-metrics">',
    countCard('Ευρήματα TED',state?.status==='ok'?state.count:0,'Έλεγχος αρχικής διακήρυξης απαιτείται'),
    countCard('Επιβεβαιωμένοι ιδιώτες',0,'Δεν συλλέγονται προσωπικά στοιχεία'),
    countCard('Επιβεβαιωμένες επιχειρήσεις',0,'Δεν δημιουργούνται εικονικά αιτήματα'),
    countCard('Επιτρεπόμενες επαφές',0,'Επικοινωνία απενεργοποιημένη'),
    '</div>',
    '<div class="bio-lab-filter bio-service-filter"><label for="bio-ted-service">Φίλτρο υπηρεσίας</label>'+
    '<select id="bio-ted-service" aria-label="Φίλτρο υπηρεσίας">'+
    '<option value="all">Όλες οι υπηρεσίες</option>'+
    '<option value="pest_control">Απεντόμωση</option><option value="rodent_control">Μυοκτονία</option>'+
    '<option value="disinfection">Απολύμανση</option><option value="plumbing">Υδραυλικός</option>'+
    '<option value="drain_unblocking">Αποφράξεις</option></select>'+
    '<span id="bio-ted-count"></span></div>',
    tenderRows(state,esc),
    '<p class="bio-note">Η ανακάλυψη ενεργοποιείται αυτόματα με το άνοιγμα της σελίδας (έως 15 λεπτά cache ανά instance) και η προγραμματισμένη αναζήτηση GitHub Actions εκτελείται κάθε ώρα, στο :17 (με πιθανές καθυστερήσεις scheduler). Εάν ο πάροχος δεν απαντά, η κατάσταση φαίνεται ως μη διαθέσιμη.</p>',
    '<p class="bio-note"><strong>Facebook, Instagram, TikTok, Reddit:</strong> η εμπορική αυτοματοποιημένη συλλογή απαιτεί δικαιώματα πλατφόρμας. Οι ανεξάρτητες κοινότητες χρειάζονται έλεγχο robots και όρων πριν από οποιοδήποτε crawl. Οι συζητήσεις δεν αποτελούν επιβεβαιωμένους πελάτες.</p>',
  ].join('');
}

export async function renderBioShieldAdmin(page,{api,esc}) {
  page.innerHTML='<p role="status">Φόρτωση πραγματικών ευρημάτων BioShield…</p>';
  const [pilotReply,tedReply,sourceReply,mapReply,researchReply]=await Promise.allSettled([
    api('/bioshield/demo/evidence'), api('/bioshield/discovery/tenders'),
    api('/bioshield/discovery/sources'), api('/bioshield/discovery/map'),
    api('/bioshield/research/config')
  ]);
  let pilot=pilotReply.status==='fulfilled'?pilotReply.value:{demo_unavailable:true};
  let ted=tedReply.status==='fulfilled'?tedReply.value:{status:'unavailable'};
  const policy=sourceReply.status==='fulfilled'?sourceReply.value:null;
  const research=researchReply.status==='fulfilled'?researchReply.value:null;
  let coverage=mapReply.status==='fulfilled'?mapReply.value:{status:'source_unavailable'};
  let mapCleanup=null;
  let mapInitialized=false;
  if(!page.isConnected)return;
  const seg=pilot.demo_supabase_connected?pilot.segment_counts:{individual:0,public_sector:0,business:0,needs_review:0};
  page.innerHTML=[
    '<div class="bio-page">',
    '<header class="bio-heading"><div><p class="eyebrow">BIOSHIELD / REAL EVIDENCE</p>',
    '<h1>Κέντρο ανακάλυψης &amp; αξιολόγησης</h1>',
    '<p>Πραγματικά δημόσια τεκμήρια, ταξινομημένα σε ιδιώτες, έργα Δημοσίου και επιχειρήσεις. Χωρίς συνθετικά αιτήματα, προσωπικές επαφές ή αυτόματη επικοινωνία.</p></div>',
    '<span class="bio-stage">Official discovery · Public evidence</span></header>',
    '<div class="bio-alert"><strong>Μόνο τεκμηριωμένες πηγές</strong>',
    '<p>Οι παλιές συζητήσεις δεν εμφανίζονται ως νέοι πελάτες. Οι προκηρύξεις είναι δημόσια δεδομένα, όχι εξακριβωμένες αναθέσεις. Η εταιρική Supabase και η διαβίβαση στο τηλεφωνικό κέντρο παραμένουν απομονωμένες.</p></div>',
    '<nav class="bio-tabs" aria-label="Πλοήγηση BioShield">',
    '<a href="/admin/operations/overview" data-bio-tab="overview" class="active" aria-current="page">Επισκόπηση</a>',
    '<a href="/admin/operations/discovery" data-bio-tab="discovery">Νέες ανακαλύψεις</a>',
    '<a href="/admin/operations/evidence" data-bio-tab="pilot">Αποθηκευμένα ευρήματα</a>',
    '<a href="/admin/operations/map" data-bio-tab="map">Χάρτης / Κάλυψη</a>',
    '<a href="/admin/operations/sources" data-bio-tab="sources">Πηγές &amp; έλεγχοι</a>',
    '</nav>',
    '<section data-bio-panel="overview">',
    '<div class="bio-metrics">',
    countCard('Δημόσιες πηγές στη demo βάση',pilot.demo_supabase_connected?pilot.public_sources_reviewed:0,'Αποθηκευμένα πραγματικά δημόσια τεκμήρια'),
    countCard('Νέες προκηρύξεις TED',ted.status==='ok'?ted.count:0,'Ζωντανή αναζήτηση επίσημου API'),
    countCard('Πρόσφατες συζητήσεις 30ημέρου',pilot.reddit_freshness?.recent_posts_30d||0,'Όχι επιβεβαιωμένα αιτήματα εργασίας'),
    countCard('Εγκεκριμένες επαφές',0,'Καμία συλλογή προσωπικών στοιχείων'),
    '</div><div class="bio-grid">',
    '<article class="bio-card"><h2>Ανακάλυψη νέων δεδομένων</h2><p>Το TED ερευνά αυτόματα ελληνικά δημόσια έργα στις υπηρεσίες απεντόμωσης, μυοκτονίας, απολύμανσης, <strong>υδραυλικού</strong> και <strong>αποφράξεων</strong>. Επανέλεγχος κάθε ώρα στο :17 μέσω GitHub Actions.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="discovery">Προβολή πραγματικών αποτελεσμάτων</button></article>',
    '<article class="bio-card"><h2>Διαχωρισμός αιτούντων</h2>',
    '<p>Ιδιώτες: <strong>',fmt(seg.individual),'</strong> · Έργα Δημοσίου: <strong>',fmt(seg.public_sector),'</strong> · Επιχειρήσεις: <strong>',fmt(seg.business),'</strong> · Αδιευκρίνιστα: <strong>',fmt(seg.needs_review),'</strong>.</p>',
    '<p>Οι μετρήσεις αφορούν το αποθηκευμένο δημόσιο δείγμα, όχι επαληθευμένη ενεργή ζήτηση.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="pilot">Προβολή πηγών</button></article>',
    '</div></section>',
    '<section data-bio-panel="discovery" hidden>',discoveries(ted,esc),'</section>',
    '<section data-bio-panel="pilot" hidden>',renderPublicPilot(pilot,esc),'</section>',
    '<section data-bio-panel="map" hidden>',coverageMarkup(coverage,esc),'</section>',
    '<section data-bio-panel="sources" hidden>',
    '<h2>Συνδεδεμένες &amp; εκκρεμείς πηγές</h2>',
    '<p class="bio-muted">Έγινε έρευνα σε Facebook, Instagram, TikTok και ανεξάρτητα ελληνικά forums. Εμφανίζονται μόνο πραγματικές καταστάσεις πρόσβασης· καμία κοινωνική πλατφόρμα δεν θεωρείται ενεργός crawler.</p>',
    sourceList(policy,esc),
    researchMarkup(research,esc),
    '<div class="bio-policy"><span>Firecrawl · τέσσερις λογαριασμοί (έλεγχος 16/11/2026)</span><strong>0 + 0 + 0 + 1.400 credits</strong></div>',
    '<p class="bio-note">Ο τέταρτος λογαριασμός είναι συνδεδεμένος στο ChatGPT. Για server-side rotation απαιτείται ξεχωριστή σύνδεση API key στο Render, που δεν έχει γίνει.</p>',
    '<div class="bio-policy"><span>TinyFish — εξουσιοδοτημένες πηγές</span><strong>Αναμονή ελέγχου δικαιωμάτων</strong></div>',
    '<div class="bio-policy"><span>Supabase Demo (δεύτερος λογαριασμός)</span><strong>Μόνο ανάγνωση</strong></div>',
    '<div class="bio-policy"><span>Εταιρικό CRM / Supabase</span><strong>Ασύνδετο</strong></div>',
    '<div class="bio-policy"><span>Στοιχεία επαφών &amp; τηλεφωνικό κέντρο</span><strong>Απενεργοποιημένα</strong></div>',
    '<p class="bio-note">Για να ενεργοποιηθεί διαχείριση πραγματικών ιδιωτικών υποψηφίων χρειάζονται admin authentication, επιτρεπόμενοι πάροχοι, έλεγχος νόμιμης βάσης, δικαιώματα και εξωτερική ολοκλήρωση CRM.</p></section>',
    '<footer class="bio-footer"><span>BioShield · Δημόσια τεκμήρια · Όχι συνθετικά δεδομένα</span>',
    '<a target="_blank" rel="noopener noreferrer" href="https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a">Εργασίες Linear</a></footer>',
    '</div>',
  ].join('');
  const panels=()=>[...page.querySelectorAll('[data-bio-panel]')];
  function selectTab(name){
    // Release old Leaflet instance when leaving map page, avoiding orphan maps.
    if(name!=='map'&&mapInitialized){
      if(typeof mapCleanup==='function')mapCleanup();
      mapCleanup=null;
      mapInitialized=false;
    }
    page.querySelectorAll('[data-bio-tab]').forEach(b=>{
      const active=b.dataset.bioTab===name;
      b.classList.toggle('active',active);
      if(b.tagName==='A'){
        if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
      }else b.setAttribute('aria-pressed',String(active));
    });
    panels().forEach(p=>p.hidden=p.dataset.bioPanel!==name);
    if(name==='map'&&!mapInitialized){
      mapInitialized=true;
      mapCleanup=setupCoverageMap(page.querySelector('[data-bio-panel="map"]'),coverage,esc);
    }
  }
  // Typed TypeScript router supplies distinct URLs, transitions and back/forward.
  installNavigation(page,selectTab);
  setupResearchPlaybook(page.querySelector('[data-bio-panel="sources"]'));
  const pilotPanel=page.querySelector('[data-bio-panel="pilot"]');
  function filterPilot(){
    const query=pilotPanel.querySelector('#bio-pilot-search');
    const type=pilotPanel.querySelector('#bio-pilot-type');
    const age=pilotPanel.querySelector('#bio-pilot-recency');
    if(!query||!type||!age||!pilot.demo_supabase_connected)return;
    const term=query.value.trim().toLocaleLowerCase('el-GR');
    let visible=0;
    pilotPanel.querySelectorAll('[data-pilot-row]').forEach(row=>{
      const allowedAge=row.dataset.kind!=='forum'||age.value==='all'||
        (age.value==='30d'&&row.dataset.redditRecent==='true')||
        (age.value==='7d'&&row.dataset.redditWeek==='true');
      const show=allowedAge&&(type.value==='all'||type.value===row.dataset.segment)&&
        (!term||row.dataset.search.includes(term));
      row.hidden=!show;if(show)visible++;
    });
    pilotPanel.querySelectorAll('[data-pilot-section]').forEach(section=>{
      section.hidden=type.value!=='all'&&type.value!==section.dataset.pilotSection&&
        !(type.value==='needs_review'&&section.dataset.pilotSection==='individual');
    });
    const count=pilotPanel.querySelector('#bio-pilot-count');
    if(count)count.textContent=fmt(visible)+' / '+fmt(pilot.public_sources_reviewed)+' εγγραφές';
  }
  pilotPanel.addEventListener('input',filterPilot);
  pilotPanel.addEventListener('change',filterPilot);
  async function refreshPilot(){
    const oldQuery=pilotPanel.querySelector('#bio-pilot-search')?.value||'';
    const oldType=pilotPanel.querySelector('#bio-pilot-type')?.value||'all';
    const oldAge=pilotPanel.querySelector('#bio-pilot-recency')?.value||'7d';
    try{pilot=await api('/bioshield/demo/evidence');}catch{pilot={demo_unavailable:true};}
    if(!page.isConnected)return;
    pilotPanel.innerHTML=renderPublicPilot(pilot,esc);
    const query=pilotPanel.querySelector('#bio-pilot-search'),type=pilotPanel.querySelector('#bio-pilot-type'),
      age=pilotPanel.querySelector('#bio-pilot-recency');
    if(query)query.value=oldQuery;
    if(type)type.value=oldType;
    if(age)age.value=oldAge;
    filterPilot();
  }
  function filterTED(){
    const host=page.querySelector('[data-bio-panel="discovery"]');
    const selection=host?.querySelector('#bio-ted-service')?.value||'all';
    let count=0;
    host?.querySelectorAll('[data-ted-row]').forEach(row=>{
      const show=selection==='all'||(row.dataset.services||'').split(',').includes(selection);
      row.hidden=!show;if(show)count++;
    });
    const label=host?.querySelector('#bio-ted-count');
    if(label)label.textContent=fmt(count)+' εμφανιζόμενες προκηρύξεις';
  }
  page.addEventListener('change',event=>{
    if(event.target.id==='bio-ted-service')filterTED();
  });
  async function refreshCoverage(){
    try{coverage=await api('/bioshield/discovery/map');}catch{coverage={status:'source_unavailable'};}
    if(!page.isConnected)return;
    if(typeof mapCleanup==='function')mapCleanup();
    const panel=page.querySelector('[data-bio-panel="map"]');
    panel.innerHTML=coverageMarkup(coverage,esc);
    mapInitialized=false;
    if(!panel.hidden){mapInitialized=true;mapCleanup=setupCoverageMap(panel,coverage,esc);}
  }
  async function refreshTED(){
    try{ted=await api('/bioshield/discovery/tenders');}catch{ted={status:'unavailable'};}
    if(!page.isConnected)return;
    const host=page.querySelector('[data-bio-panel="discovery"]');
    const oldService=host.querySelector('#bio-ted-service')?.value||'all';
    host.innerHTML=discoveries(ted,esc);
    const filter=host.querySelector('#bio-ted-service');
    if(filter)filter.value=oldService;
    filterTED();
  }
  page.addEventListener('click',event=>{
    if(event.target.closest('#bio-demo-refresh'))void refreshPilot();
    if(event.target.closest('#bio-ted-refresh'))void refreshTED();
    if(event.target.closest('#bio-map-refresh'))void refreshCoverage();
  });
  filterPilot();
  filterTED();
  const refreshTimer=setInterval(()=>{
    if(!page.isConnected){clearInterval(refreshTimer);return;}
    if(!document.hidden){
      const active=page.querySelector('[data-bio-panel="pilot"]');
      if(active&&!active.hidden)void refreshPilot();
    }
  },30000);
  const tedTimer=setInterval(()=>{
    if(!page.isConnected){clearInterval(tedTimer);return;}
    if(!document.hidden){void refreshTED();void refreshCoverage();}
  },900000);
}
