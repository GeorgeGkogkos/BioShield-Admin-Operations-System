import {renderPublicPilot} from './real-pilot.js';

/* BIO-14: REAL public-source evidence only; the synthetic request lab is removed. */
const fmt = x => Number(x || 0).toLocaleString('el-GR');
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
    '<th>Αριθμός TED</th><th>Ημ/νία δημοσίευσης</th><th>Δημόσιος αγοραστής</th><th>Αντικείμενο</th><th>CPV</th><th>Πρωτογενής πηγή</th>'+
    '</tr></thead><tbody>'+found.map(x=>
      '<tr><td><strong>'+esc(x.notice_number)+'</strong></td><td>'+esc(x.published_on)+'</td>'+
      '<td>'+esc(x.buyer)+'</td><td>'+esc(x.title)+'</td><td>'+esc((x.cpv_codes||[]).join(', '))+'</td>'+
      '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο TED</a>'+
      '<small class="bio-evidence-note">Ελέγχονται η διακήρυξη και η δυνατότητα υποβολής</small></td></tr>'
    ).join('')+'</tbody></table></div>';
}
function discoveries(state,esc) {
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">OFFICIAL EU OPEN DATA / LIVE SEARCH</p>',
    '<h2>Αυτόματη ανακάλυψη — δημόσια έργα</h2>',
    '<p class="bio-muted">Πραγματική αναζήτηση στο επίσημο TED API για ελληνικές δημόσιες συμβάσεις απεντόμωσης, μυοκτονίας και απολύμανσης (CPV 90921000, 90922000, 90923000, 90924000). Αφορά δημοσιευμένες προκηρύξεις, όχι όλες τις εθνικές μικρές προμήθειες.</p></div>',
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
    tenderRows(state,esc),
    '<p class="bio-note">Η ανακάλυψη ενεργοποιείται αυτόματα με το άνοιγμα της σελίδας (έως 15 λεπτά cache ανά instance) και προγραμματίστηκε ξεχωριστός έλεγχος GitHub Actions ανά 6 ώρες. Εάν ο πάροχος δεν απαντά, η κατάσταση φαίνεται ως μη διαθέσιμη.</p>',
    '<p class="bio-note"><strong>Reddit:</strong> η εμπορική αυτοματοποιημένη συλλογή παραμένει απενεργοποιημένη μέχρι να εγκριθεί από το Reddit. Τα ιστορικά δημόσια ευρήματα βρίσκονται στη διπλανή καρτέλα.</p>',
  ].join('');
}

export async function renderBioShieldAdmin(page,{api,esc}) {
  page.innerHTML='<p role="status">Φόρτωση πραγματικών ευρημάτων BioShield…</p>';
  const [pilotReply,tedReply]=await Promise.allSettled([
    api('/bioshield/demo/evidence'), api('/bioshield/discovery/tenders')
  ]);
  let pilot=pilotReply.status==='fulfilled'?pilotReply.value:{demo_unavailable:true};
  let ted=tedReply.status==='fulfilled'?tedReply.value:{status:'unavailable'};
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
    '<button type="button" data-bio-tab="overview" class="active" aria-pressed="true">Επισκόπηση</button>',
    '<button type="button" data-bio-tab="discovery" aria-pressed="false">Νέες ανακαλύψεις</button>',
    '<button type="button" data-bio-tab="pilot" aria-pressed="false">Αποθηκευμένα ευρήματα</button>',
    '<button type="button" data-bio-tab="sources" aria-pressed="false">Πηγές &amp; έλεγχοι</button>',
    '</nav>',
    '<section data-bio-panel="overview">',
    '<div class="bio-metrics">',
    countCard('Δημόσιες πηγές στη demo βάση',pilot.demo_supabase_connected?pilot.public_sources_reviewed:0,'Αποθηκευμένα πραγματικά δημόσια τεκμήρια'),
    countCard('Νέες προκηρύξεις TED',ted.status==='ok'?ted.count:0,'Ζωντανή αναζήτηση επίσημου API'),
    countCard('Πρόσφατες συζητήσεις 30ημέρου',pilot.reddit_freshness?.recent_posts_30d||0,'Όχι επιβεβαιωμένα αιτήματα εργασίας'),
    countCard('Εγκεκριμένες επαφές',0,'Καμία συλλογή προσωπικών στοιχείων'),
    '</div><div class="bio-grid">',
    '<article class="bio-card"><h2>Ανακάλυψη νέων δεδομένων</h2><p>Το TED τροφοδοτεί αυτόματα τον έλεγχο ελληνικών δημοσίων συμβάσεων μέσω ανοιχτών επίσημων δεδομένων. Επανέλεγχος κατά την επίσκεψη στην εφαρμογή και προγραμματισμένη αναζήτηση κάθε 6 ώρες.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="discovery">Προβολή πραγματικών αποτελεσμάτων</button></article>',
    '<article class="bio-card"><h2>Διαχωρισμός αιτούντων</h2>',
    '<p>Ιδιώτες: <strong>',fmt(seg.individual),'</strong> · Έργα Δημοσίου: <strong>',fmt(seg.public_sector),'</strong> · Επιχειρήσεις: <strong>',fmt(seg.business),'</strong> · Αδιευκρίνιστα: <strong>',fmt(seg.needs_review),'</strong>.</p>',
    '<p>Οι μετρήσεις αφορούν το αποθηκευμένο δημόσιο δείγμα, όχι επαληθευμένη ενεργή ζήτηση.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="pilot">Προβολή πηγών</button></article>',
    '</div></section>',
    '<section data-bio-panel="discovery" hidden>',discoveries(ted,esc),'</section>',
    '<section data-bio-panel="pilot" hidden>',renderPublicPilot(pilot,esc),'</section>',
    '<section data-bio-panel="sources" hidden>',
    '<h2>Συνδεδεμένες &amp; εκκρεμείς πηγές</h2>',
    '<div class="bio-policy"><span>TED — Ευρωπαϊκή Υπηρεσία Δημοσίων Συμβάσεων</span><strong>Ενεργή επίσημη αναζήτηση</strong></div>',
    '<div class="bio-policy"><span>Supabase Demo (δεύτερος λογαριασμός)</span><strong>Μόνο ανάγνωση</strong></div>',
    '<div class="bio-policy"><span>Reddit — εμπορική αυτοματοποιημένη χρήση</span><strong>Απαιτεί έγκριση παρόχου</strong></div>',
    '<div class="bio-policy"><span>Firecrawl / TinyFish — server-side ingestion</span><strong>Δεν έχει ενεργοποιηθεί</strong></div>',
    '<div class="bio-policy"><span>Εταιρικό CRM / Supabase</span><strong>Ασύνδετο</strong></div>',
    '<div class="bio-policy"><span>Στοιχεία επαφών &amp; τηλεφωνικό κέντρο</span><strong>Απενεργοποιημένα</strong></div>',
    '<p class="bio-note">Για να ενεργοποιηθεί διαχείριση πραγματικών ιδιωτικών υποψηφίων χρειάζονται admin authentication, επιτρεπόμενοι πάροχοι, έλεγχος νόμιμης βάσης, δικαιώματα και εξωτερική ολοκλήρωση CRM.</p></section>',
    '<footer class="bio-footer"><span>BioShield · Δημόσια τεκμήρια · Όχι συνθετικά δεδομένα</span>',
    '<a target="_blank" rel="noopener noreferrer" href="https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a">Εργασίες Linear</a></footer>',
    '</div>',
  ].join('');
  const panels=()=>[...page.querySelectorAll('[data-bio-panel]')];
  function selectTab(name){
    page.querySelectorAll('[data-bio-tab]').forEach(b=>{
      const active=b.dataset.bioTab===name;
      b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
    });
    panels().forEach(p=>p.hidden=p.dataset.bioPanel!==name);
  }
  page.addEventListener('click',event=>{
    const tab=event.target.closest('[data-bio-tab]');
    if(tab)selectTab(tab.dataset.bioTab);
  });
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
    const oldAge=pilotPanel.querySelector('#bio-pilot-recency')?.value||'30d';
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
  async function refreshTED(){
    try{ted=await api('/bioshield/discovery/tenders');}catch{ted={status:'unavailable'};}
    if(!page.isConnected)return;
    page.querySelector('[data-bio-panel="discovery"]').innerHTML=discoveries(ted,esc);
  }
  page.addEventListener('click',event=>{
    if(event.target.closest('#bio-demo-refresh'))void refreshPilot();
    if(event.target.closest('#bio-ted-refresh'))void refreshTED();
  });
  filterPilot();
  const refreshTimer=setInterval(()=>{
    if(!page.isConnected){clearInterval(refreshTimer);return;}
    if(!document.hidden){
      const active=page.querySelector('[data-bio-panel="pilot"]');
      if(active&&!active.hidden)void refreshPilot();
    }
  },30000);
  const tedTimer=setInterval(()=>{
    if(!page.isConnected){clearInterval(tedTimer);return;}
    if(!document.hidden)void refreshTED();
  },900000);
}
