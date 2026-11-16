import {renderPublicPilot} from './real-pilot.js';
import {coverageMarkup,setupCoverageMap} from './geographic-map.js';
import {installNavigation} from './typed/navigation.js';
import {researchMarkup,setupResearchPlaybook} from './typed/research-view.js';
import {LOCATION_CHOICES,installLocationFocus} from './typed/location-focus.js';
import {pageSkeleton,showLoadingOverlay} from './typed/skeleton.js';

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
  candidate_sources_found_policy_review_required:'Εντοπίστηκαν forums · αναμονή ελέγχου όρων',
  operator_feed_configuration_required:'Αναμονή RSS feed από τον διαχειριστή'
};
function sourceList(policy,esc){
  if(!policy?.platforms)return '<p>Οι καταστάσεις πηγών δεν είναι διαθέσιμες.</p>';
  return policy.platforms.map(p=>'<article class="bio-source-row"><div><strong>'+esc(p.name)+'</strong>'+
    '<p>'+esc(p.note)+'</p><a href="'+esc(p.url)+'" rel="noopener noreferrer" target="_blank">Πηγή / όροι</a></div>'+
    '<span>'+esc(sourceStateName[p.status]||p.status)+'</span></article>').join('');
}
function googleAlertsCard(report,esc){
  const status=report?.status||'unavailable';
  const states={
    awaiting_feed_configuration:'Αναμονή σύνδεσης Google Alerts',
    configuration_error:'Σφάλμα ρύθμισης feed',
    unavailable:'Ο πάροχος δεν απαντά',
    partial:'Μερική πρόσβαση στα feeds',
    ok:'Επιτυχής ανάγνωση RSS/Atom'
  };
  const val=(n)=>Number.isInteger(n)?fmt(n):'—';
  return '<article class="bio-card" data-source-provider="google_alerts">'+
    '<h3>Google Alerts · αναζήτηση νέων ενδείξεων</h3>'+
    '<p><strong>'+esc(states[status]||'Μη διαθέσιμη κατάσταση')+'</strong> · Feeds: '+
    val(report?.configured_feeds)+' · Αναγνωσμένα: '+val(report?.fetched_feeds)+'</p>'+
    '<p>Διαφορετικές αναφορές: <strong>'+val(report?.entries_unique_unverified)+
    '</strong> · Ενδείξεις πιθανού αιτήματος (μη επαληθευμένες): <strong>'+
    val(report?.potential_request_hints_unverified)+'</strong></p>'+
    '<p>Ενδείξεις ανά κατηγορία (χωρίς επιβεβαίωση): Ιδιώτες <strong>'+
    val(report?.buyer_hint_counts_unverified?.individual)+'</strong> · Δημόσιο <strong>'+
    val(report?.buyer_hint_counts_unverified?.public_sector)+'</strong> · Επιχειρήσεις <strong>'+
    val(report?.buyer_hint_counts_unverified?.business)+'</strong> · Αδιευκρίνιστα <strong>'+
    val(report?.buyer_hint_counts_unverified?.unknown)+'</strong></p>'+
    '<p class="bio-note">Καμία αναφορά Google Alerts δεν χαρακτηρίζεται επιβεβαιωμένος πελάτης χωρίς έλεγχο της πρωτογενούς δημοσίευσης. '+
    'Δεν συλλέγονται στοιχεία επικοινωνίας ούτε ενεργοποιείται τηλεφωνικό κέντρο.</p>'+
    '<p class="bio-note">Η σύνδεση απαιτεί RSS Feed στο google.com/alerts και ιδιωτική ρύθμιση στο Render. '+
    'Πλήρης 14ήμερη σύγκριση πηγών μόνο μετά από πραγματική σύνδεση και καταγραφή αποτελεσμάτων.</p>'+
    '</article>';
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
function tenderRows(state,esc,policy) {
  if (state?.status !== 'ok') return '<p class="bio-note">Δεν υπάρχει διαθέσιμη επιβεβαιωμένη απάντηση από το επίσημο TED API. Δεν εμφανίζονται κατασκευασμένα ή παλιά αποτελέσματα ως νέα.</p>';
  const source=state.notices||[];
  const allowed=new Set(policy?.combined_nuts||['EL301','EL302','EL303','EL304','EL305','EL306','EL307','EL642','EL652']);
  const found=source.filter(x=>(x.place_of_performance_nuts||[]).some(n=>allowed.has(n)));
  if(!found.length)return '<p class="bio-note">Δεν βρέθηκαν ακόμη επαληθευμένα κοντινές προκηρύξεις στο εθνικό δείγμα TED. '+
    'Από '+esc(source.length)+' δημοσιεύσεις, οι μακρινές προκηρύξεις Δημοσίου/επιχειρήσεων εμφανίζονται σε ξεχωριστή ενότητα. '+
    'Η άγνωστη τοποθεσία παραμένει προς επαλήθευση.</p>';
  return '<div class="bio-scroll"><table class="bio-table bio-real-table"><thead><tr>'+
    '<th>Αριθμός TED</th><th>Ημ/νία δημοσίευσης</th><th>Υπηρεσία</th><th>Δημόσιος αγοραστής</th><th>Αντικείμενο</th><th>NUTS / αξία</th><th>Πρωτογενής πηγή</th>'+
    '</tr></thead><tbody>'+found.map(x=>
      '<tr data-ted-row data-services="'+esc((x.service_codes||[]).join(','))+'" data-search="'+esc([x.title,x.buyer,x.notice_number].join(' ').toLocaleLowerCase('el-GR'))+'"><td><strong>'+esc(x.notice_number)+'</strong></td><td>'+esc(x.published_on)+'</td>'+
      '<td>'+esc((x.service_codes||[]).map(k=>serviceLabels[k]||k).join(', '))+'</td>'+
      '<td>'+esc(x.buyer)+'</td><td>'+esc(x.title)+'</td><td>'+esc((x.place_of_performance_nuts||[]).join(', '))+
      (x.official_total_value_eur?' · '+esc(x.official_total_value_eur.toLocaleString('el-GR'))+' €':' · αξία μη επιβεβαιωμένη')+'</td>'+
      '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο TED</a>'+
      '<small class="bio-evidence-note">Ελέγχονται η διακήρυξη και η δυνατότητα υποβολής</small></td></tr>'
    ).join('')+'</tbody></table></div>';
}

/** Separate faraway government and verified business requests. */
function remoteOpportunityRows(items,esc){
  if(!items?.length)return '<p class="bio-note">Δεν υπάρχουν αυτή τη στιγμή επαληθευμένα μακρινά ευρήματα αυτής της κατηγορίας.</p>';
  return '<div class="bio-scroll"><table class="bio-table bio-real-table">'+
    '<thead><tr><th>Ημερομηνία</th><th>Τίτλος / εργασία</th><th>Αγοραστής</th>'+
    '<th>Περιοχή (NUTS)</th><th>Πρωτογενής πηγή</th></tr></thead><tbody>'+
    items.map(x=>
    '<tr data-remote-row data-services="'+esc((x.service_codes||[]).join(','))+
    '" data-search="'+esc([x.title,x.buyer,x.notice_number].join(' ').toLocaleLowerCase('el-GR'))+'">'+
    '<td>'+esc(x.published_on||'—')+'</td>'+
    '<td>'+esc(x.title||'Χωρίς τίτλο')+'</td>'+
    '<td>'+esc(x.buyer||'—')+'</td>'+
    '<td>'+esc((x.place_of_performance_nuts||[]).join(', '))+'</td>'+
    '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο τεκμήριο</a></td></tr>'
    ).join('')+'</tbody></table></div>';
}
function remoteOpportunities(segmented,esc){
  if(segmented?.status!=='ok'){
    return '<div role="status" class="bio-note">Οι μακρινές προκηρύξεις δεν μπορούν να επαληθευτούν τώρα. '+
      'Δεν προβάλλονται παλιές ή ανεπιβεβαίωτες ευκαιρίες ως ενεργές.</div>';
  }
  const publicItems=segmented.remote_public||[];
  const businessItems=segmented.remote_business||[];
  const counts=segmented.counts||{};
  return '<div class="bio-remote-container">'+
    '<h3>Ξεχωριστή λίστα μακρινών έργων — Δημόσιο και επιχειρήσεις</h3>'+
    '<p class="bio-note">Εμφανίζονται μακρινές επίσημες προκηρύξεις Δημοσίου ανεξαρτήτως ποσού και '+
    'επαληθευμένα αιτήματα επιχειρήσεων, εφόσον υπάρχουν εγκεκριμένες πηγές. '+
    '<strong>Δεν προστίθενται μακρινά αιτήματα ιδιωτών.</strong> '+
    'Οι ημερομηνίες, η περιοχή εκτέλεσης και η δυνατότητα συμμετοχής απαιτούν έλεγχο.</p>'+
    '<div class="bio-remote-split">'+
    '<section class="bio-remote-panel" aria-labelledby="bio-remote-public-title"><h4 id="bio-remote-public-title">Δημόσιες προκηρύξεις εκτός περιοχής</h4>'+
    '<span class="bio-remote-count"><strong>'+esc(publicItems.length)+'</strong> τεκμηριωμένες δημοσιεύσεις</span>'+
    remoteOpportunityRows(publicItems,esc)+'</section>'+
    '<section class="bio-remote-panel" aria-labelledby="bio-remote-business-title"><h4 id="bio-remote-business-title">Επιχειρηματικά έργα εκτός περιοχής</h4>'+
    '<span class="bio-remote-count"><strong>'+esc(businessItems.length)+'</strong> πρωτογενώς επαληθευμένες αναφορές</span>'+
    remoteOpportunityRows(businessItems,esc)+
    '<p class="bio-remote-unknown">Δεν υποθέτουμε αιτήματα ξενοδοχείων ή εταιρειών από γενικές διαφημίσεις. '+
    'Ο τρέχων ζωντανός αυτοματοποιημένος πάροχος είναι το TED, το οποίο δημοσιεύει δημόσιες συμβάσεις.</p>'+
    '</section></div>'+
    '<p class="bio-remote-unknown">Προς έλεγχο: '+esc(counts.needs_location_review||0)+
    ' χωρίς επαληθευμένη περιοχή εκτέλεσης, '+esc(counts.needs_audience_review||0)+
    ' με μη επαληθευμένη κατηγορία. Αποκλείστηκαν '+esc(counts.excluded_remote_individual||0)+
    ' μακρινά αιτήματα ιδιωτών.</p></div>';
}

function brandedLoader(){
  return '<div class="bio-start-loader" role="status" aria-live="polite">'+
    '<div class="bio-logo-pulse"><img src="/static/bioshield-company-logo.png" width="108" height="108" alt=""></div>'+
    '<strong>BioShield</strong><span>Φόρτωση επισκόπησης και επίσημων πηγών…</span></div>';
}
const LOCATION_KEYS=new Set(LOCATION_CHOICES.map(x=>x.id));
function safeHome(){
  let key='ilion';try{key=localStorage.getItem('bioshield-home-region')||'ilion'}catch{}
  return LOCATION_KEYS.has(key)?key:'ilion';
}
function automationStatus(heartbeat,ted,esc){
  const run=heartbeat?.latest_run;
  const official=ted?.status==='ok';
  const timestamp=official?ted.searched_at_utc:ted?.checked_at_utc;
  const sourceStatus=official?(ted?.cached?'Προβολή από cache επίσημου API':'Επιτυχής επικοινωνία με TED'):
    'Ο τελευταίος έλεγχος TED απέτυχε';
  return '<div class="bio-automation-stats">'+
    '<div><span>Τελευταίος πραγματικός έλεγχος TED</span><strong>'+dateTime(timestamp)+'</strong>'+
    '<small>'+esc(sourceStatus)+' · ώρα Αθήνας</small></div>'+
    '<div><span>Προγραμματισμένη εκτέλεση GitHub</span><strong>'+
    (run?dateTime(run.run_started_at||run.created_at):'Δεν επαληθεύτηκε')+'</strong>'+
    '<small>'+(run?'Κατάσταση: '+esc(run.status||'άγνωστη')+
      ' · Αποτέλεσμα: '+esc(run.conclusion||'εκκρεμεί'):
      'Δεν εμφανίζεται εικονικό «επιτυχές» cron')+
    ' · <a href="https://github.com/GeorgeGkogkos/BioShield-Admin-Operations-System/actions/workflows/discovery.yml" target="_blank" rel="noopener noreferrer">Ιστορικό εκτελέσεων</a></small></div></div>';
}
function locationControls(esc){
  const choices=(empty=false)=> (empty?'<option value="">Καμία πρόσθετη περιοχή</option>':'')+
    LOCATION_CHOICES.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.label)+'</option>').join('');
  return '<div class="bio-focus-panel" aria-label="Προτεραιότητες γεωγραφικής αναζήτησης">'+
    '<h3>Προτεραιότητες περιοχής</h3>'+
    '<p class="bio-note">Μόνιμη βάση και επιπλέον προσωρινή τοποθεσία αναζητούνται <strong>παράλληλα</strong>. '+
    'Από Ίλιον η πρώτη προτεραιότητα είναι Αττική, Εύβοια και Κορινθία. '+
    'Μακρινά έργα Δημοσίου και επιχειρήσεων έχουν ξεχωριστή ενότητα χωρίς ελάχιστη αξία. Μακρινοί ιδιώτες αποκλείονται.</p>'+
    '<div class="bio-focus-controls"><label for="bio-focus-home">Μόνιμη βάση</label>'+
    '<select id="bio-focus-home">'+choices()+'</select>'+
    '<label for="bio-focus-travel">Προσωρινή περιοχή</label>'+
    '<select id="bio-focus-travel">'+choices(true)+'</select></div>'+
    '<div class="bio-focus-gps-actions">'+
    '<button type="button" id="bio-focus-gps-start">Χρήση θέσης συσκευής (με άδεια)</button>'+
    '<button type="button" id="bio-focus-gps-stop" disabled>Διακοπή τοποθεσίας</button></div>'+
    '<p id="bio-focus-gps-status" class="bio-note" aria-live="polite">Η θέση συσκευής είναι ανενεργή. '+
    'Αναγνωρίζονται μόνο ευρύτερες ζώνες· δεν στέλνονται συντεταγμένες. '+
    'Ο γεωεντοπισμός σταματά όταν κρύβεται η καρτέλα.</p>'+
    '</div>';
}
function focusResults(state,esc){
  if(!state||state.status!=='ok'){
    const limited=state?.status==='rate_limited';
    return '<p class="bio-note" role="status">'+(limited?
      'Η χειροκίνητη έρευνα έχει προσωρινό όριο. Επανάληψη σε '+esc(state.retry_after_seconds)+' δευτερόλεπτα.':
      'Δεν επιβεβαιώθηκε επιτυχής αναζήτηση για αυτές τις περιοχές. Τα παλιά δεδομένα δεν εμφανίζονται ως νέα.')+'</p>';
  }
  const notices=(state.notices||[]);
  const rows=notices.map(x=>'<tr data-focus-row data-services="'+esc((x.service_codes||[]).join(','))+
    '" data-search="'+esc([x.title,x.buyer,(x.cpv_codes||[]).join(' '),x.notice_number].join(' ').toLocaleLowerCase('el-GR'))+'">'+
    '<td>'+esc(x.published_on)+'</td><td>'+esc(x.title)+'</td>'+
    '<td>'+esc(x.buyer)+'</td><td><small>'+esc((x.place_of_performance_nuts||[]).join(', ')||
      'Χωρίς δηλωμένο NUTS στην απάντηση')+'</small></td>'+
    '<td><span class="bio-evidence-note">'+(x.geographic_tier==='regional_query_requires_place_verification'?
      'Ταίριαξε στο επίσημο γεωγραφικό ερώτημα — απαιτείται έλεγχος διακήρυξης':
      'Περιοχή εκτέλεσης από επίσημο NUTS — όχι ακριβές σημείο')+'</span></td>'+
    '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">TED</a></td></tr>').join('');
  const lanes=(state.lanes||[]).map(x=>'<span>'+esc(x.lane==='permanent'?'Μόνιμη βάση':'Προσωρινή περιοχή')+
    ': <strong>'+esc(x.status==='ok'?x.count+' αποτελέσματα':'Μη διαθέσιμη')+'</strong>'+
    (x.searched_at_utc?' · '+dateTime(x.searched_at_utc):'')+'</span>').join('');
  return '<div class="bio-geo-result-head"><strong>Επιπλέον στοχευμένη έρευνα TED: '+esc(notices.length)+' τεκμήρια</strong>'+
    '<small>Έλεγχος: '+dateTime(state.checked_at_utc)+' · ώρα Αθήνας'+(state.cached?' · cache':'')+'</small></div>'+
    '<div class="bio-lane-summary">'+lanes+'</div>'+
    (rows?'<div class="bio-scroll"><table class="bio-table"><thead><tr>'+
       '<th>Δημοσιεύτηκε</th><th>Εργασία</th><th>Φορέας</th><th>NUTS</th><th>Γεωγραφική τεκμηρίωση</th><th>Πηγή</th>'+
       '</tr></thead><tbody>'+rows+'</tbody></table></div>':
       '<p class="bio-note">Η επίσημη γεωγραφική αναζήτηση ολοκληρώθηκε χωρίς αντίστοιχες προκηρύξεις. '+
       'Δεν σημαίνει ότι δεν υπάρχουν τοπικές ιδιωτικές εργασίες.</p>');
}
function officialSourceCards(official,esc){
  return '<div class="bio-official-sources"><h3>Επιπλέον ελληνικές επίσημες πηγές δημοσίων έργων</h3>'+
    '<p class="bio-note">Πραγματικές επίσημες σελίδες που ερευνήθηκαν. '+
    'Δεν αποτελούν ενεργούς αυτοματοποιημένους εισαγωγείς στο BioShield μέχρι να επιβεβαιωθεί τεχνική πρόσβαση.</p>'+
    (official?.providers||[]).map(s=>'<article class="bio-source-row"><div><strong>'+esc(s.name)+'</strong>'+
     '<p>'+esc(s.notes)+'</p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">Επίσημη πηγή</a></div>'+
     '<span>'+esc(s.status==='partial_search_only_by_ADA_2026_11_16'?'Περιορισμένη αναζήτηση':
       'Επίσημη αναζήτηση · αναμονή σύνδεσης')+'</span></article>').join('')+'</div>';
}

function discoveries(state,esc,focused,heartbeat,segmented) {
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">OFFICIAL EU OPEN DATA / LIVE SEARCH</p>',
    '<h2>Αυτόματη ανακάλυψη — δημόσια έργα</h2>',
    '<p class="bio-muted">Πραγματική αναζήτηση δημοσίων συμβάσεων για απεντομώσεις, μυοκτονίες, απολυμάνσεις, <strong>υδραυλικά</strong> και <strong>αποφράξεις</strong> βάσει επίσημων CPV. Δεν τεκμηριώνει από μόνη της ότι ένας διαγωνισμός είναι ανοιχτός.</p></div>',
    '<span id="bio-ted-state" class="bio-test-badge">',state?.status==='ok'?'API TED · ΑΝΑΓΝΩΣΗ':'TED · ΜΗ ΔΙΑΘΕΣΙΜΟ','</span></div>',
    '<div id="bio-live-status-discovery">',automationStatus(heartbeat,state,esc),'</div>',
    '<div class="bio-demo-connection"><div><strong>',state?.status==='ok'?'Τελευταία επιτυχής αναζήτηση':'Αδυναμία επαλήθευσης TED',
    '</strong><p id="bio-ted-substatus">Ώρα Αθήνας: ',dateTime(state?.searched_at_utc||state?.checked_at_utc),
    ' · ',state?.status==='ok'?'Επιστράφηκαν '+fmt(state.count)+' πραγματικές προκηρύξεις από '+fmt(state.raw_count)+' εγγραφές απάντησης.':'Δεν χρησιμοποιούμε εικονικά αποτελέσματα.', '</p></div>',
    '<button id="bio-ted-refresh" type="button" class="bio-open-lab">Εκτέλεση χειροκίνητης αναζήτησης τώρα</button></div>',
    '<p id="bio-manual-message" role="status" aria-live="polite" class="bio-note">Η χειροκίνητη αναζήτηση εκτελεί νέα ελεγχόμενη κλήση TED. Όριο: μία επανάληψη ανά 3 λεπτά στο ίδιο instance.</p>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric"><span>Ευρήματα TED</span><strong id="bio-ted-total">'+fmt(state?.status==='ok'?state.count:0)+'</strong>'+
    '<small>Έλεγχος αρχικής διακήρυξης απαιτείται</small></article>',
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
    '<label for="bio-ted-term">Όρος</label><input id="bio-ted-term" type="search" placeholder="Προκήρυξη, υπηρεσία, φορέας…">',
    '<span id="bio-ted-count"></span></div>',
    locationControls(esc),
    '<div class="bio-focus-title"><h3>Επιπλέον αναζήτηση κοντά στη βάση και στην προσωρινή τοποθεσία</h3>',
    '<p class="bio-note">Ειδικές επίσημες ερωτήσεις γεωγραφίας NUTS στο TED, όχι απλώς ταξινόμηση ήδη γνωστών δημοσιεύσεων.</p></div>',
    '<div id="bio-focus-results">',focusResults(focused,esc),'</div>',
    '<h3>Κοντινές δημόσιες προκηρύξεις — Αττική, Εύβοια, Κορινθία ή προσωρινή βάση</h3>',
    '<div id="bio-ted-results">',tenderRows(state,esc,focused?.policy),'</div>',
    '<div id="bio-remote-results">',remoteOpportunities(segmented,esc),'</div>',
    '<p class="bio-note">Η ανακάλυψη ενεργοποιείται αυτόματα με το άνοιγμα της σελίδας (έως 15 λεπτά cache ανά instance) και η προγραμματισμένη αναζήτηση GitHub Actions εκτελείται κάθε ώρα, στο :17 (με πιθανές καθυστερήσεις scheduler). Εάν ο πάροχος δεν απαντά, η κατάσταση φαίνεται ως μη διαθέσιμη.</p>',
    '<p class="bio-note"><strong>Facebook, Instagram, TikTok, Reddit:</strong> η εμπορική αυτοματοποιημένη συλλογή απαιτεί δικαιώματα πλατφόρμας. Οι ανεξάρτητες κοινότητες χρειάζονται έλεγχο robots και όρων πριν από οποιοδήποτε crawl. Οι συζητήσεις δεν αποτελούν επιβεβαιωμένους πελάτες.</p>',
  ].join('');
}

export async function renderBioShieldAdmin(page,{api,esc}) {
  page.innerHTML=pageSkeleton(window.location.pathname);
  const selectedHome=safeHome();
  const [pilotReply,tedReply,sourceReply,mapReply,researchReply,focusedReply,heartbeatReply,officialReply,alertsReply,segmentedReply]=await Promise.allSettled([
    api('/bioshield/demo/evidence'), api('/bioshield/discovery/tenders'),
    api('/bioshield/discovery/sources'), api('/bioshield/discovery/map'),
    api('/bioshield/research/config'),
    api('/bioshield/discovery/focused?home='+encodeURIComponent(selectedHome)),
    api('/bioshield/discovery/heartbeat'),
    api('/bioshield/discovery/official-sources'),
    api('/bioshield/discovery/google-alerts'),
    api('/bioshield/discovery/segmented?home='+encodeURIComponent(selectedHome))
  ]);
  let pilot=pilotReply.status==='fulfilled'?pilotReply.value:{demo_unavailable:true};
  let ted=tedReply.status==='fulfilled'?tedReply.value:{status:'unavailable'};
  const policy=sourceReply.status==='fulfilled'?sourceReply.value:null;
  let focused=focusedReply.status==='fulfilled'?focusedReply.value:{status:'unavailable'};
  let segmented=segmentedReply.status==='fulfilled'?segmentedReply.value:{status:'unavailable'};
  let heartbeat=heartbeatReply.status==='fulfilled'?heartbeatReply.value:{status:'unavailable'};
  const official=officialReply.status==='fulfilled'?officialReply.value:null;
  const googleAlerts=alertsReply.status==='fulfilled'?alertsReply.value:null;
  const research=researchReply.status==='fulfilled'?researchReply.value:null;
  let coverage=mapReply.status==='fulfilled'?mapReply.value:{status:'source_unavailable'};
  let mapCleanup=null;
  let mapInitialized=false;
  if(!page.isConnected)return;
  const seg=pilot.demo_supabase_connected?pilot.segment_counts:{individual:0,public_sector:0,business:0,needs_review:0};
  page.innerHTML=[
    '<div class="bio-page">',
    '<nav class="bio-tabs" aria-label="Πλοήγηση BioShield">',
    '<a href="/admin/operations/overview" data-bio-tab="overview" class="active" aria-current="page">Επισκόπηση</a>',
    '<a href="/admin/operations/discovery" data-bio-tab="discovery">Νέες ανακαλύψεις</a>',
    '<a href="/admin/operations/evidence" data-bio-tab="pilot">Αποθηκευμένα ευρήματα</a>',
    '<a href="/admin/operations/map" data-bio-tab="map">Χάρτης / Κάλυψη</a>',
    '<a href="/admin/operations/sources" data-bio-tab="sources">Πηγές &amp; έλεγχοι</a>',
    '</nav>',
    '<section data-bio-panel="overview">',
    '<header class="bio-heading"><div><p class="eyebrow">BIOSHIELD / REAL EVIDENCE</p>',
    '<h1>Κέντρο ανακάλυψης &amp; αξιολόγησης</h1>',
    '<p>Πραγματικά δημόσια τεκμήρια, ταξινομημένα σε ιδιώτες, έργα Δημοσίου και επιχειρήσεις. Χωρίς συνθετικά αιτήματα, προσωπικές επαφές ή αυτόματη επικοινωνία.</p></div>',
    '<span class="bio-stage">Official discovery · Public evidence</span></header>',
    '<div class="bio-alert"><strong>Μόνο τεκμηριωμένες πηγές</strong>',
    '<p>Οι παλιές συζητήσεις δεν εμφανίζονται ως νέοι πελάτες. Οι προκηρύξεις είναι δημόσια δεδομένα, όχι εξακριβωμένες αναθέσεις. Η εταιρική Supabase και η διαβίβαση στο τηλεφωνικό κέντρο παραμένουν απομονωμένες.</p></div>',
    '<div id="bio-live-status-overview">',automationStatus(heartbeat,ted,esc),'</div>',
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
    '<section data-bio-panel="discovery" hidden>',discoveries(ted,esc,focused,heartbeat,segmented),'</section>',
    '<section data-bio-panel="pilot" hidden>',renderPublicPilot(pilot,esc),'</section>',
    '<section data-bio-panel="map" hidden>',coverageMarkup(coverage,esc),'</section>',
    '<section data-bio-panel="sources" hidden>',
    '<h2>Συνδεδεμένες &amp; εκκρεμείς πηγές</h2>',
    '<p class="bio-muted">Έγινε έρευνα σε Facebook, Instagram, TikTok και ανεξάρτητα ελληνικά forums. Εμφανίζονται μόνο πραγματικές καταστάσεις πρόσβασης· καμία κοινωνική πλατφόρμα δεν θεωρείται ενεργός crawler.</p>',
    sourceList(policy,esc),
    googleAlertsCard(googleAlerts,esc),
    officialSourceCards(official,esc),
    researchMarkup(research,esc),
    '<div class="bio-policy"><span>Firecrawl · τέσσερις λογαριασμοί (έλεγχος 16/11/2026)</span><strong>0 + 0 + 0 + 1.400 credits</strong></div>',
    '<p class="bio-note">Ο τέταρτος λογαριασμός είναι συνδεδεμένος στο ChatGPT. Για server-side rotation απαιτείται ξεχωριστή σύνδεση API key στο Render, που δεν έχει γίνει.</p>',
    '<div class="bio-policy"><span>TinyFish — εξουσιοδοτημένες πηγές</span><strong>Αναμονή ελέγχου δικαιωμάτων</strong></div>',
    '<div class="bio-policy"><span>Supabase Demo (δεύτερος λογαριασμός)</span><strong>Μόνο ανάγνωση</strong></div>',
    '<div class="bio-policy"><span>Εταιρικό CRM / Supabase</span><strong>Ασύνδετο</strong></div>',
    '<div class="bio-policy"><span>Στοιχεία επαφών &amp; τηλεφωνικό κέντρο</span><strong>Απενεργοποιημένα</strong></div>',
    '<p class="bio-note">Για να ενεργοποιηθεί διαχείριση πραγματικών ιδιωτικών υποψηφίων χρειάζονται admin authentication, επιτρεπόμενοι πάροχοι, έλεγχος νόμιμης βάσης, δικαιώματα και εξωτερική ολοκλήρωση CRM.</p></section>',
    '<footer class="bio-footer"><span>BioShield · Δημόσια τεκμήρια · Όχι συνθετικά δεδομένα</span>',
    '<a target="_blank" rel="noopener noreferrer" href="https://app.notion.com/p/41a3740d593381c6899edce2dbbecd15">Ανεξάρτητη τεκμηρίωση BioShield</a></footer>',
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
  const discoveryPanel=page.querySelector('[data-bio-panel="discovery"]');
  const focusController=installLocationFocus(discoveryPanel,choice=>{void refreshFocused(choice);});
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
    const term=(host?.querySelector('#bio-ted-term')?.value||'').trim().toLocaleLowerCase('el-GR');
    let count=0;
    host?.querySelectorAll('[data-ted-row],[data-focus-row],[data-remote-row]').forEach(row=>{
      const serviceMatch=selection==='all'||(row.dataset.services||'').split(',').includes(selection);
      const searchMatch=!term||(row.dataset.search||'').includes(term);
      const show=serviceMatch&&searchMatch;
      row.hidden=!show;if(show)count++;
    });
    const label=host?.querySelector('#bio-ted-count');
    if(label)label.textContent=fmt(count)+' εμφανιζόμενες τεκμηριωμένες προκηρύξεις';
  }
  page.addEventListener('change',event=>{
    if(event.target.id==='bio-ted-service')filterTED();
  });
  page.addEventListener('input',event=>{
    if(event.target.id==='bio-ted-term')filterTED();
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
  function updateDiscoveryUI(){
    if(!page.isConnected)return;
    const national=page.querySelector('#bio-ted-results');
    if(national)national.innerHTML=tenderRows(ted,esc,focused?.policy);
    const regional=page.querySelector('#bio-focus-results');
    if(regional)regional.innerHTML=focusResults(focused,esc);
    const remote=page.querySelector('#bio-remote-results');
    if(remote)remote.innerHTML=remoteOpportunities(segmented,esc);
    for(const id of ['bio-live-status-overview','bio-live-status-discovery']){
      const target=page.querySelector('#'+id);
      if(target)target.innerHTML=automationStatus(heartbeat,ted,esc);
    }
    const total=page.querySelector('#bio-ted-total');
    if(total)total.textContent=fmt(ted?.status==='ok'?ted.count:0);
    const stamp=page.querySelector('#bio-ted-substatus');
    if(stamp)stamp.textContent='Ώρα Αθήνας: '+dateTime(ted?.searched_at_utc||ted?.checked_at_utc)+
      ' · '+(ted?.status==='ok'?'Τεκμηριωμένη απάντηση TED ('+fmt(ted.count)+' εγγραφές)':'Ανεπιτυχής έλεγχος πηγής')+
      (ted?.cached?' · cache':'');
    const badge=page.querySelector('#bio-ted-state');
    if(badge)badge.textContent=ted?.status==='ok'?'API TED · ΕΠΙΤΥΧΙΑ':'TED · ΜΗ ΔΙΑΘΕΣΙΜΟ';
    filterTED();
  }
  async function refreshFocused(choice){
    if(!page.isConnected)return;
    const target=page.querySelector('#bio-focus-results');
    if(target)target.innerHTML='<p role="status">Αναζήτηση επίσημων τοπικών δημοσιεύσεων…</p>';
    const qp=new URLSearchParams({home:choice.home,temporary:choice.temporary});
    try{focused=await api('/bioshield/discovery/focused?'+qp.toString());}
    catch{focused={status:'unavailable'};}
    updateDiscoveryUI();
  }
  async function refreshTED(manual=false){
    const choice=focusController.selection();
    const qp=new URLSearchParams({home:choice.home,temporary:choice.temporary});
    const button=page.querySelector('#bio-ted-refresh');
    if(button&&manual){button.disabled=true;button.textContent='Εκτελείται πραγματική αναζήτηση TED…';}
    try{
      if(manual){
        const result=await api('/bioshield/discovery/manual?'+qp.toString());
        ted=result.national;
        focused=result.focused;
      }else{
        const replies=await Promise.allSettled([
          api('/bioshield/discovery/tenders'),
          api('/bioshield/discovery/focused?'+qp.toString())
        ]);
        ted=replies[0].status==='fulfilled'?replies[0].value:{status:'unavailable'};
        focused=replies[1].status==='fulfilled'?replies[1].value:{status:'unavailable'};
      }
    }catch(error){
      const status=page.querySelector('#bio-manual-message');
      if(status)status.textContent=manual?
        'Ο χειροκίνητος έλεγχος δεν ολοκληρώθηκε. Υπάρχει όριο επανάληψης 3 λεπτών ή ο πάροχος δεν απάντησε.':
        'Αδυναμία ελέγχου της επίσημης πηγής.';
      if(!manual){ted={status:'unavailable'};focused={status:'unavailable'};}
    }finally{
      if(button){button.disabled=false;button.textContent='Εκτέλεση χειροκίνητης αναζήτησης τώρα';}
    }
    updateDiscoveryUI();
    if(manual)void refreshCoverage();
  }
  async function refreshHeartbeat(){
    try{heartbeat=await api('/bioshield/discovery/heartbeat');}
    catch{heartbeat={status:'unavailable'};}
    updateDiscoveryUI();
  }
  page.addEventListener('click',event=>{
    if(event.target.closest('#bio-demo-refresh'))void refreshPilot();
    if(event.target.closest('#bio-ted-refresh'))void refreshTED(true);
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
    if(!page.isConnected){clearInterval(tedTimer);focusController.stop();return;}
    if(!document.hidden){void refreshTED();void refreshCoverage();}
  },900000);
  const statusTimer=setInterval(()=>{
    if(!page.isConnected){clearInterval(statusTimer);return;}
    if(!document.hidden)void refreshHeartbeat();
  },300000);
}
