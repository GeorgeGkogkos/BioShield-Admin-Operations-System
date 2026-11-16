import {overviewSnapshot,overviewRecentNotices,discoveryFilterMenu,businessDiscoveryMarkup} from './discovery-layout.js';
import {renderPublicPilot} from './real-pilot.js';
import {reconcileEntryDiscovery} from './entry-discovery.js';
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
  const id=title==='Νέα από προηγούμενη επίσκεψη'?' id="bio-new-since-visit"':
    title==='Δημόσιες πηγές στη demo βάση'?' id="bio-sources-overview"':'';
  return '<article class="bio-metric"><span>'+title+'</span><strong'+id+'>'+fmt(value)+'</strong><small>'+note+'</small></article>';
}
function tenderRows(state,esc,policy,newIds=new Set()) {
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
      '<tr data-ted-row data-services="'+esc((x.service_codes||[]).join(','))+'" data-search="'+esc([x.title,x.buyer,x.notice_number].join(' ').toLocaleLowerCase('el-GR'))+'"><td><strong>'+esc(x.notice_number)+'</strong>'+
      (newIds.has(x.id)?'<span class="bio-new-official">ΝΕΟ</span>':'')+
      '</td><td>'+esc(x.published_on)+'</td>'+
      '<td>'+esc((x.service_codes||[]).map(k=>serviceLabels[k]||k).join(', '))+'</td>'+
      '<td>'+esc(x.buyer)+'</td><td>'+esc(x.title)+'</td><td>'+esc((x.place_of_performance_nuts||[]).join(', '))+
      (x.official_total_value_eur?' · '+esc(x.official_total_value_eur.toLocaleString('el-GR'))+' €':' · αξία μη επιβεβαιωμένη')+'</td>'+
      '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο TED</a>'+
      '<small class="bio-evidence-note">Ελέγχονται η διακήρυξη και η δυνατότητα υποβολής</small></td></tr>'
    ).join('')+'</tbody></table></div>';
}

/** Separate faraway government and verified business requests. */
function remoteOpportunityRows(items,esc,newIds=new Set()){
  if(!items?.length)return '<p class="bio-note">Δεν υπάρχουν αυτή τη στιγμή επαληθευμένα μακρινά ευρήματα αυτής της κατηγορίας.</p>';
  return '<div class="bio-scroll"><table class="bio-table bio-real-table">'+
    '<thead><tr><th>Ημερομηνία</th><th>Τίτλος / εργασία</th><th>Αγοραστής</th>'+
    '<th>Περιοχή (NUTS)</th><th>Πρωτογενής πηγή</th></tr></thead><tbody>'+
    items.map(x=>
    '<tr data-remote-row data-services="'+esc((x.service_codes||[]).join(','))+
    '" data-search="'+esc([x.title,x.buyer,x.notice_number].join(' ').toLocaleLowerCase('el-GR'))+'">'+
    '<td>'+esc(x.published_on||'—')+(newIds.has(x.id)?'<span class="bio-new-official">ΝΕΟ</span>':'')+'</td>'+
    '<td>'+esc(x.title||'Χωρίς τίτλο')+'</td>'+
    '<td>'+esc(x.buyer||'—')+'</td>'+
    '<td>'+esc((x.place_of_performance_nuts||[]).join(', '))+'</td>'+
    '<td><a href="'+esc(x.source_url)+'" target="_blank" rel="noopener noreferrer">Επίσημο τεκμήριο</a></td></tr>'
    ).join('')+'</tbody></table></div>';
}
function remoteOpportunities(segmented,esc,newIds=new Set()){
  if(segmented?.status!=='ok')return '<div role="status" class="bio-note">Οι μακρινές επίσημες συμβάσεις δεν μπορούν να επαληθευτούν τώρα.</div>';
  const publicItems=segmented.remote_public||[];
  const counts=segmented.counts||{};
  return '<div class="bio-remote-container">'+
    '<h3>Δημόσιες συμβάσεις εκτός βασικής περιοχής</h3>'+
    '<p class="bio-note">Μακρινές επίσημες προκηρύξεις Δημοσίου ανεξαρτήτως ποσού. '+
    'Η περιοχή εκτέλεσης και η δυνατότητα συμμετοχής απαιτούν έλεγχο της πρωτογενούς διακήρυξης.</p>'+
    '<span class="bio-remote-count"><strong>'+esc(publicItems.length)+
    '</strong> τεκμηριωμένες δημόσιες δημοσιεύσεις</span>'+
    remoteOpportunityRows(publicItems,esc,newIds)+
    '<p class="bio-remote-unknown">Προς επαλήθευση: '+esc(counts.needs_location_review||0)+
    ' χωρίς περιοχή εκτέλεσης, '+esc(counts.needs_audience_review||0)+
    ' με άγνωστη κατηγορία. Οι επιχειρηματικές εργασίες ανήκουν στο φίλτρο «Επιχειρήσεις».</p></div>';
}

function entryCheckMarkup(state,ids,esc){
  if(state.status==='source_unavailable')return '<strong>Αυτόματος έλεγχος κατά το άνοιγμα:</strong> Η επίσημη πηγή TED δεν απάντησε. Δεν εμφανίζονται ανεπιβεβαίωτες εγγραφές ως νέες.';
  if(state.status==='storage_unavailable')return '<strong>Η πηγή TED ελέγχθηκε</strong> · '+esc(dateTime(state.checkedAt))+' · Ο browser δεν επέτρεψε αποθήκευση ιστορικού· δεν μπορεί να προσδιοριστεί τι είναι νέο από την προηγούμενη επίσκεψη.';
  if(state.status==='baseline')return '<strong>Ο αυτόματος έλεγχος ολοκληρώθηκε</strong> · '+esc(dateTime(state.checkedAt))+' · Πρώτη επιτυχής επίσκεψη: δημιουργήθηκε τοπική βάση σύγκρισης. Οι υπάρχουσες ανακοινώσεις δεν βαφτίζονται νέες.';
  return '<strong>Αυτόματος έλεγχος επίσημων πηγών</strong> · '+esc(dateTime(state.checkedAt))+
    ' · <strong>'+esc(ids.size)+' νέες ανακοινώσεις TED</strong> από την προηγούμενη επίσκεψη σε αυτόν τον browser'+
    (state.previousCheck?' · προηγούμενος έλεγχος: '+esc(dateTime(state.previousCheck)):'')+
    '. Δεν σημαίνει ότι η προκήρυξη είναι ακόμη ενεργή ή ότι υπάρχει εγκεκριμένος πελάτης.';
}

// The landing page exposes only verified provider state; all diagnostics live on Status.
function homeSourceIndicator(ted){
  const verified=ted?.status==='ok';
  return '<span class="bio-home-source-indicator '+(verified?'is-verified':'is-unavailable')+'">'+
    '<span aria-hidden="true">'+(verified?'✓':'!')+'</span> '+
    (verified?'Επίσημο TED':'TED μη διαθέσιμο')+'</span>';
}
function homeTedSummary(ted,entryCheck,newIds){
  if(ted?.status!=='ok')return 'TED: μη διαθέσιμο · χωρίς επιβεβαιωμένο έλεγχο';
  const raw=ted.searched_at_utc||ted.checked_at_utc;
  const parsed=raw?new Date(raw):null;
  const clock=parsed&&!Number.isNaN(parsed.getTime())?
    new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit'}).format(parsed):'ώρα άγνωστη';
  const count=entryCheck.status==='compared'?
    newIds.size+' νέες ανακοινώσεις':
    entryCheck.status==='baseline'?'πρώτη επιτυχής καταγραφή':'σύγκριση μη διαθέσιμη';
  return 'TED: '+clock+' · '+count;
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
    '<div class="bio-demo-connection"><div><strong>',state?.status==='ok'?'Τελευταία επιτυχής αναζήτηση':'Αδυναμία επαλήθευσης TED',
    '</strong><p id="bio-ted-substatus">Ώρα Αθήνας: ',dateTime(state?.searched_at_utc||state?.checked_at_utc),
    ' · ',state?.status==='ok'?'Επιστράφηκαν '+fmt(state.count)+' πραγματικές προκηρύξεις από '+fmt(state.raw_count)+' εγγραφές απάντησης.':'Δεν χρησιμοποιούμε εικονικά αποτελέσματα.', '</p></div>',
    '<button id="bio-ted-refresh" type="button" class="bio-open-lab">Εκτέλεση χειροκίνητης αναζήτησης τώρα</button></div>',
    '<p id="bio-manual-message" role="status" aria-live="polite" class="bio-note">Η χειροκίνητη αναζήτηση εκτελεί νέα ελεγχόμενη κλήση TED. Όριο: μία επανάληψη ανά 3 λεπτά στο ίδιο instance.</p>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric"><span>Ευρήματα TED</span><strong id="bio-ted-total">'+fmt(state?.status==='ok'?state.count:0)+'</strong>'+
    '<small>Έλεγχος αρχικής διακήρυξης απαιτείται</small></article>',
    '</div>',
    '<div class="bio-lab-filter bio-service-filter"><label for="bio-ted-service">Φίλτρο υπηρεσίας</label>'+
    '<select id="bio-ted-service" aria-label="Φίλτρο υπηρεσίας">'+
    '<option value="all">Όλες οι υπηρεσίες</option>'+
    '<option value="pest_control">Απεντόμωση</option><option value="rodent_control">Μυοκτονία</option>'+
    '<option value="disinfection">Απολύμανση</option><option value="plumbing">Υδραυλικός</option>'+
    '<option value="drain_unblocking">Αποφράξεις</option></select>'+
    '<span id="bio-ted-count"></span></div>',
    locationControls(esc),
    '<div class="bio-focus-title"><h3>Επιπλέον αναζήτηση κοντά στη βάση και στην προσωρινή τοποθεσία</h3>',
    '<p class="bio-note">Ειδικές επίσημες ερωτήσεις γεωγραφίας NUTS στο TED, όχι απλώς ταξινόμηση ήδη γνωστών δημοσιεύσεων.</p></div>',
    '<div id="bio-focus-results">',focusResults(focused,esc),'</div>',
    '<h3>Κοντινές δημόσιες προκηρύξεις — Αττική, Εύβοια, Κορινθία ή προσωρινή βάση</h3>',
    '<div id="bio-ted-results">',tenderRows(state,esc,focused?.policy),'</div>',
    '<div id="bio-remote-results">',remoteOpportunities(segmented,esc),'</div>',
    '<p class="bio-note">Η ανακάλυψη ενεργοποιείται αυτόματα με το άνοιγμα της σελίδας (έως 15 λεπτά cache ανά instance) και η προγραμματισμένη αναζήτηση GitHub Actions εκτελείται κάθε ώρα, στο :17 (με πιθανές καθυστερήσεις scheduler). Εάν ο πάροχος δεν απαντά, η κατάσταση φαίνεται ως μη διαθέσιμη.</p>',
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
  const newSinceOpen=new Set();
  let entryCheck={status:'source_unavailable',newIds:[],checkedAt:null,previousCheck:null};
  function recordOfficialEntryCheck(){
    let store=null;
    try{store=window.localStorage;}catch{/* Browser storage may be forbidden. */}
    entryCheck=reconcileEntryDiscovery(ted,store);
    for(const id of entryCheck.newIds)newSinceOpen.add(id);
  }
  recordOfficialEntryCheck();
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
    '<section data-bio-panel="overview">',
    overviewSnapshot({ted,entry:entryCheck,newIds:newSinceOpen,pilot,esc,fmt,
      summary:homeTedSummary(ted,entryCheck,newSinceOpen)}),'</section>',
    '<section data-bio-panel="status" hidden>',
    '<header class="bio-heading"><div><p class="eyebrow">BIOSHIELD / REAL EVIDENCE</p>',
    '<h1>Κατάσταση &amp; διαφάνεια</h1>',
    '<p>Αναλυτική τεκμηρίωση πηγών, πραγματικοί χρόνοι ελέγχων και κατάσταση αυτόματων εκτελέσεων. Οι δημοσιεύσεις δεν αποτελούν επιβεβαιωμένες αναθέσεις ή άδεια επικοινωνίας.</p></div></header>',
    '<div class="bio-alert"><strong>Μόνο τεκμηριωμένες πηγές</strong>',
    '<p>Οι παλιές συζητήσεις δεν εμφανίζονται ως νέοι πελάτες. Οι προκηρύξεις είναι δημόσια δεδομένα, όχι εξακριβωμένες αναθέσεις. Η εταιρική Supabase και η διαβίβαση στο τηλεφωνικό κέντρο παραμένουν απομονωμένες.</p></div>',
    '<div id="bio-live-status-status">',automationStatus(heartbeat,ted,esc),'</div>',
    '<div class="bio-entry-check" id="bio-entry-status" role="status">',entryCheckMarkup(entryCheck,newSinceOpen,esc),'</div>',
    '<div class="bio-metrics">',
    countCard('Δημόσιες πηγές στη demo βάση',pilot.demo_supabase_connected?pilot.public_sources_reviewed:0,'Αποθηκευμένα πραγματικά δημόσια τεκμήρια'),
    countCard('Νέες προκηρύξεις TED',ted.status==='ok'?ted.count:0,'Αποτελέσματα επίσημου API · όχι όλα νέα από επίσκεψη'),
    countCard('Νέα από προηγούμενη επίσκεψη',newSinceOpen.size,'Επίσημα TED μόνο · σύγκριση στον ίδιο browser'),
    countCard('Εγκεκριμένες επαφές',0,'Καμία συλλογή προσωπικών στοιχείων'),
    '</div><div class="bio-grid">',
    '<article class="bio-card"><h2>Ανακάλυψη νέων δεδομένων</h2><p>Το TED ερευνά αυτόματα ελληνικά δημόσια έργα στις υπηρεσίες απεντόμωσης, μυοκτονίας, απολύμανσης, <strong>υδραυλικού</strong> και <strong>αποφράξεων</strong>. Επανέλεγχος κάθε ώρα στο :17 μέσω GitHub Actions.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="discovery">Προβολή πραγματικών αποτελεσμάτων</button></article>',
    '<article class="bio-card"><h2>Διαχωρισμός αιτούντων</h2>',
    '<p id="bio-overview-segments">Ιδιώτες: <strong>',fmt(seg.individual),'</strong> · Έργα Δημοσίου: <strong>',fmt(seg.public_sector),'</strong> · Επιχειρήσεις: <strong>',fmt(seg.business),'</strong> · Αδιευκρίνιστα: <strong>',fmt(seg.needs_review),'</strong>.</p>',
    '<p>Οι μετρήσεις αφορούν το αποθηκευμένο δημόσιο δείγμα, όχι επαληθευμένη ενεργή ζήτηση.</p>',
    '<button class="bio-open-lab" type="button" data-bio-tab="pilot">Προβολή πηγών</button></article>',
    '</div><p class="bio-status-source-link"><a href="/admin/operations/sources" data-bio-tab="sources">Αναλυτικές πηγές, δικαιώματα πρόσβασης &amp; Google Alerts ›</a></p></section>',
    '<section data-bio-panel="discovery" hidden>',
    discoveryFilterMenu({ted,entry:entryCheck,newIds:newSinceOpen,esc,
      indicator:homeSourceIndicator(ted),summary:homeTedSummary(ted,entryCheck,newSinceOpen)}),
    '<div id="bio-discovery-public-results">',
    discoveries(ted,esc,focused,heartbeat,segmented),
    '<p id="bio-discovery-no-matches" role="status" class="bio-note" hidden>Δεν υπάρχουν αποτελέσματα με αυτά τα φίλτρα στις φορτωμένες συμβάσεις TED.</p></div>',
    '<div id="bio-discovery-private-results" class="bio-discovery-private-results" hidden>',
    '<h2 id="bio-discovery-private-heading">Ανακαλύψεις</h2>',
    '<p id="bio-discovery-private-description" class="bio-note"></p>',
    '<div id="bio-discovery-business-results"></div>',
    '<p class="bio-note" id="bio-discovery-private-no-matches" role="status" hidden>Δεν βρέθηκαν επιχειρηματικά ευρήματα που να ταιριάζουν στην αναζήτηση.</p>',
    '<a href="/admin/operations/evidence" data-bio-tab="pilot" id="bio-discovery-archive" data-bio-discovery-archive="individual">Αποθηκευμένα δημόσια τεκμήρια ›</a></div>',
    '</section>',
    '<section data-bio-panel="pilot" hidden>',renderPublicPilot(pilot,esc),'</section>',
    '<section data-bio-panel="map" hidden>',coverageMarkup(coverage,esc,pilot),'</section>',
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
  const initialRows=page.querySelector('#bio-ted-results');
  if(initialRows)initialRows.innerHTML=tenderRows(ted,esc,focused?.policy,newSinceOpen);
  const initialRemote=page.querySelector('#bio-remote-results');
  if(initialRemote)initialRemote.innerHTML=remoteOpportunities(segmented,esc,newSinceOpen);
  const panels=()=>[...page.querySelectorAll('[data-bio-panel]')];
  function selectTab(name){
    // Release old Leaflet instance when leaving map page, avoiding orphan maps.
    if(name!=='map'&&mapInitialized){
      if(typeof mapCleanup==='function')mapCleanup();
      mapCleanup=null;
      mapInitialized=false;
    }
    // Keep persistent sidebar and bottom navigation synchronized without replacing either.
    const shellLinks=[...document.querySelectorAll('#bio-shell-nav [data-bio-tab]'),
      ...document.querySelectorAll('#bio-bottom-nav [data-bio-tab]')];
    shellLinks.forEach(link=>{
      const active=link.dataset.bioTab===name;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    panels().forEach(p=>p.hidden=p.dataset.bioPanel!==name);
    if(name==='map'&&!mapInitialized){
      mapInitialized=true;
      mapCleanup=setupCoverageMap(page.querySelector('[data-bio-panel="map"]'),coverage,esc,pilot);
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
  // Poll the read-only demo without replacing the mounted panel or its user controls.
  // Initial page loads may use skeletons; subsequent successful reads never do.
  function updateLiveText(node, value, html=false){
    if(!node)return;
    const property=html?'innerHTML':'textContent';
    if(node[property]===value)return;
    node[property]=value;
    if(node.tagName==='STRONG' && typeof node.animate==='function' &&
       !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)){
      node.animate([{opacity:.65,transform:'translateY(2px)'},{opacity:1,transform:'none'}],
        {duration:220,easing:'ease-out'});
    }
  }
  function patchPilot(next){
    const preview=document.createElement('div');
    preview.innerHTML=renderPublicPilot(next,esc);
    // Only update values whose actual source data has changed.
    for(const incoming of preview.querySelectorAll('[data-live-stat]')){
      const name=incoming.dataset.liveStat;
      const current=pilotPanel.querySelector('[data-live-stat="'+name+'"]');
      updateLiveText(current,incoming.innerHTML,true);
    }
    // Keep table wrappers and scrolling intact; update rows only on a real data change.
    for(const segment of ['public_sector','individual']){
      const selector='[data-pilot-section="'+segment+'"] tbody';
      const current=pilotPanel.querySelector(selector);
      const incoming=preview.querySelector(selector);
      if(current&&incoming&&current.innerHTML!==incoming.innerHTML){
        current.innerHTML=incoming.innerHTML;
      }
    }
    // The B2B section can switch between an honest empty state and a real table.
    const business=pilotPanel.querySelector('[data-pilot-section="business"]');
    const updatedBusiness=preview.querySelector('[data-pilot-section="business"]');
    if(business&&updatedBusiness&&business.innerHTML!==updatedBusiness.innerHTML){
      business.innerHTML=updatedBusiness.innerHTML;
    }
    updateLiveText(page.querySelector('#bio-overview-demo-count'),fmt(next.public_sources_reviewed));
    updateLiveText(page.querySelector('#bio-sources-overview'),fmt(next.public_sources_reviewed));
    const counts=next.segment_counts;
    const summary=page.querySelectorAll('#bio-overview-segments strong');
    [counts.individual,counts.public_sector,counts.business,counts.needs_review]
      .forEach((count,index)=>updateLiveText(summary[index],fmt(count)));
  }
  let pilotBusy=false;
  async function refreshPilot(){
    if(pilotBusy||!page.isConnected)return;
    pilotBusy=true;
    const button=pilotPanel.querySelector('#bio-demo-refresh');
    if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
    try{
      const next=await api('/bioshield/demo/evidence');
      if(!page.isConnected)return;
      if(next?.demo_supabase_connected!==true)throw new Error('Demo Supabase unavailable');
      if(pilot.demo_supabase_connected===true){
        patchPilot(next);
      }else{
        // Recover from a first-load offline state; no existing results to preserve.
        pilotPanel.innerHTML=renderPublicPilot(next,esc);
      }
      pilot=next;
      // Refresh the public archive layer when the demo evidence changes.
      // Never fetch or expose private business prospect records on the map.
      const activeMap=page.querySelector('[data-bio-panel="map"]');
      if(activeMap && !activeMap.hidden){
        if(typeof mapCleanup==='function')mapCleanup();
        activeMap.innerHTML=coverageMarkup(coverage,esc,pilot);
        mapCleanup=setupCoverageMap(activeMap,coverage,esc,pilot);
        mapInitialized=true;
      }
      pilotPanel.querySelector('[data-pilot-refresh-error]')?.remove();
      filterPilot(); // Reapply selected filters without changing the controls.
    }catch{
      if(page.isConnected && pilot.demo_supabase_connected===true){
        const connection=pilotPanel.querySelector('#bio-demo-sync > div');
        if(connection&&!connection.querySelector('[data-pilot-refresh-error]')){
          const warning=document.createElement('p');
          warning.dataset.pilotRefreshError='true';
          warning.setAttribute('role','alert');
          warning.textContent='Αδυναμία ανανέωσης · εμφανίζονται τα τελευταία επιτυχώς φορτωμένα δεδομένα.';
          connection.append(warning);
        }
      }
      // Never replace a successful snapshot with zeroes or a skeleton on failure.
    }finally{
      pilotBusy=false;
      const currentButton=pilotPanel.querySelector('#bio-demo-refresh');
      if(currentButton){currentButton.disabled=false;currentButton.removeAttribute('aria-busy');}
    }
  }
  let discoveryCategory='public_sector';
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
    const noMatches=host?.querySelector('#bio-discovery-no-matches');
    if(noMatches)noMatches.hidden=!(discoveryCategory==='public_sector' && count===0 && ted?.status==='ok');
    // The shared search field also filters independently sourced B2B entries.
    // Individuals have no approved live source, so they keep an explicit empty state.
    let matchingBusinesses=0;
    const businessRows=host?.querySelectorAll('#bio-discovery-business-results [data-remote-row]')||[];
    businessRows.forEach(row=>{
      const matches=!term||(row.dataset.search||'').includes(term);
      row.hidden=!matches;
      if(matches)matchingBusinesses++;
    });
    const emptyBusiness=host?.querySelector('#bio-discovery-private-no-matches');
    if(emptyBusiness)emptyBusiness.hidden=!(discoveryCategory==='business'&&term&&businessRows.length>0&&matchingBusinesses===0);
  }
  page.addEventListener('change',event=>{
    if(event.target.id==='bio-ted-service')filterTED();
  });
  page.addEventListener('input',event=>{
    if(event.target.id==='bio-ted-term')filterTED();
  });
  let mapBusy=false;
  async function refreshCoverage(){
    if(mapBusy)return;
    mapBusy=true;
    const mapPanel=page.querySelector('[data-bio-panel="map"]');
    const release=showLoadingOverlay(mapPanel,'Ενημέρωση TED και αρχείου δημόσιων τεκμηρίων…','map');
    try{coverage=await api('/bioshield/discovery/map');}catch{coverage={status:'source_unavailable'};}
    release();mapBusy=false;
    if(!page.isConnected)return;
    if(typeof mapCleanup==='function')mapCleanup();
    const panel=page.querySelector('[data-bio-panel="map"]');
    panel.innerHTML=coverageMarkup(coverage,esc,pilot);
    mapInitialized=false;
    if(!panel.hidden){mapInitialized=true;mapCleanup=setupCoverageMap(panel,coverage,esc,pilot);}
  }
  function updateDiscoveryUI(){
    if(!page.isConnected)return;
    const national=page.querySelector('#bio-ted-results');
    if(national)national.innerHTML=tenderRows(ted,esc,focused?.policy,newSinceOpen);
    for(const id of ['bio-entry-status']){
      const el=page.querySelector('#'+id);
      if(el)el.innerHTML=entryCheckMarkup(entryCheck,newSinceOpen,esc);
    }
    const overviewTed=page.querySelector('#bio-overview-ted-count');
    if(overviewTed)overviewTed.textContent=ted?.status==='ok'?fmt(ted.count):'—';
    const overviewNew=page.querySelector('#bio-overview-new-count');
    if(overviewNew)overviewNew.textContent=entryCheck?.status==='compared'?fmt(newSinceOpen.size):'—';
    const overviewRecent=page.querySelector('#bio-overview-recent-list');
    if(overviewRecent)overviewRecent.innerHTML=overviewRecentNotices(ted,esc);
    const overviewSummary=page.querySelector('#bio-overview-check-summary');
    if(overviewSummary)overviewSummary.textContent=homeTedSummary(ted,entryCheck,newSinceOpen);
    const businessContainer=page.querySelector('#bio-discovery-business-results');
    if(businessContainer)businessContainer.innerHTML=businessDiscoveryMarkup({segmented,esc,newIds:newSinceOpen,renderRows:remoteOpportunityRows});
    const homeSource=page.querySelector('#bio-home-source-indicator');
    if(homeSource)homeSource.innerHTML=homeSourceIndicator(ted);
    const homeSummary=page.querySelector('#bio-home-ted-summary');
    if(homeSummary)homeSummary.textContent=homeTedSummary(ted,entryCheck,newSinceOpen);
    const count=page.querySelector('#bio-new-since-visit');
    if(count)count.textContent=fmt(newSinceOpen.size);
    const regional=page.querySelector('#bio-focus-results');
    if(regional)regional.innerHTML=focusResults(focused,esc);
    const remote=page.querySelector('#bio-remote-results');
    if(remote)remote.innerHTML=remoteOpportunities(segmented,esc,newSinceOpen);
    for(const id of ['bio-live-status-status']){
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
  let searchBusy=false;
  let geoRequestRevision=0;
  async function refreshFocused(choice){
    if(!page.isConnected)return;
    const revision=++geoRequestRevision;
    const target=page.querySelector('#bio-focus-results');
    const remote=page.querySelector('#bio-remote-results');
    const endNearby=showLoadingOverlay(target,'Αυτόματη αναζήτηση κοντινών δημόσιων έργων…','table');
    const endRemote=showLoadingOverlay(remote,'Έλεγχος μακρινών προκηρύξεων Δημοσίου και επιχειρήσεων…','table');
    const qp=new URLSearchParams({home:choice.home,temporary:choice.temporary});
    const result=await Promise.allSettled([
      api('/bioshield/discovery/focused?'+qp.toString()),
      api('/bioshield/discovery/segmented?'+qp.toString())
    ]);
    if(page.isConnected&&revision===geoRequestRevision){
      focused=result[0].status==='fulfilled'?result[0].value:{status:'unavailable'};
      segmented=result[1].status==='fulfilled'?result[1].value:{status:'unavailable'};
      updateDiscoveryUI();
    }
    endNearby();endRemote();
  }
  async function refreshTED(manual=false){
    if(searchBusy||!page.isConnected)return;
    searchBusy=true;
    const revision=++geoRequestRevision;
    const choice=focusController.selection();
    const qp=new URLSearchParams({home:choice.home,temporary:choice.temporary});
    const button=page.querySelector('#bio-ted-refresh');
    const status=page.querySelector('#bio-manual-message');
    const action=manual?'Χειροκίνητη':'Αυτόματη';
    if(button){button.disabled=true;button.textContent=action+' αναζήτηση σε εξέλιξη…';}
    if(status)status.textContent=action+' αναζήτηση επίσημων TED — γίνεται πραγματικός έλεγχος πηγών. '+
      'Τα προηγούμενα τεκμήρια διατηρούνται μέχρι να ολοκληρωθεί.';
    const releases=[
      showLoadingOverlay(page.querySelector('#bio-ted-results'),action+' αναζήτηση κοντινών προκηρύξεων…','table'),
      showLoadingOverlay(page.querySelector('#bio-focus-results'),action+' γεωγραφική αναζήτηση…','table'),
      showLoadingOverlay(page.querySelector('#bio-remote-results'),action+' έλεγχος μακρινών δημοσίων και B2B…','table')
    ];
    let done=false;
    try{
      if(manual){
        const result=await api('/bioshield/discovery/manual?'+qp.toString());
        if(revision===geoRequestRevision&&page.isConnected){
          ted=result.national;
          focused=result.focused;
          segmented=result.segmented||{status:'unavailable'};
          done=ted?.status==='ok'||focused?.status==='ok';
        }
      }else{
        const replies=await Promise.allSettled([
          api('/bioshield/discovery/tenders'),
          api('/bioshield/discovery/focused?'+qp.toString()),
          api('/bioshield/discovery/segmented?'+qp.toString())
        ]);
        if(revision===geoRequestRevision&&page.isConnected){
          ted=replies[0].status==='fulfilled'?replies[0].value:{status:'unavailable'};
          focused=replies[1].status==='fulfilled'?replies[1].value:{status:'unavailable'};
          segmented=replies[2].status==='fulfilled'?replies[2].value:{status:'unavailable'};
          done=ted?.status==='ok'||focused?.status==='ok';
        }
      }
      if(status&&revision===geoRequestRevision){
        status.textContent=done?
          action+' έλεγχος ολοκληρώθηκε. Ώρα TED: '+dateTime(ted?.searched_at_utc||ted?.checked_at_utc)+
          '. Τα ευρήματα δεν είναι αυτομάτως επιβεβαιωμένες αναθέσεις.':
          'Οι επίσημες αναζητήσεις δεν επέστρεψαν επαληθευμένη επιτυχία. Ελέγξτε την κατάσταση πηγής.';
      }
    }catch(error){
      if(status&&revision===geoRequestRevision){
        status.textContent=manual?
          'Η χειροκίνητη αναζήτηση δεν ολοκληρώθηκε (ενδέχεται να ισχύει όριο επανάληψης 3 λεπτών ή διακοπή TED).':
          'Η αυτόματη αναζήτηση δεν ολοκληρώθηκε. Δεν προβάλλονται εικονικές επιτυχίες.';
      }
      if(!manual&&revision===geoRequestRevision){
        ted={status:'unavailable'};
        focused={status:'unavailable'};
        segmented={status:'unavailable'};
      }
    }finally{
      if(revision===geoRequestRevision&&page.isConnected){
        if(ted?.status==='ok'&&done)recordOfficialEntryCheck();
        updateDiscoveryUI();
      }
      releases.forEach(release=>release());
      searchBusy=false;
      if(button){button.disabled=false;button.textContent='Εκτέλεση χειροκίνητης αναζήτησης τώρα';}
    }
    if(manual&&done)void refreshCoverage();
  }
  async function refreshHeartbeat(){
    const endOver=showLoadingOverlay(page.querySelector('#bio-live-status-status'),
      'Έλεγχος πραγματικής τελευταίας ωριαίας εκτέλεσης…','compact');
    try{heartbeat=await api('/bioshield/discovery/heartbeat');}
    catch{heartbeat={status:'unavailable'};}
    if(page.isConnected)updateDiscoveryUI();
    endOver();
  }
  // The menu belongs to New discoveries, not the landing overview.
  page.querySelector('#bio-discovery-search-form').addEventListener('submit',event=>{
    event.preventDefault();filterTED();
  });
  function setDiscoveryCategory(category){
    if(!['individual','public_sector','business'].includes(category))return;
    discoveryCategory=category;
    discoveryPanel.querySelectorAll('[data-bio-discovery-category]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.bioDiscoveryCategory===category));
    });
    const publicPanel=page.querySelector('#bio-discovery-public-results');
    const privatePanel=page.querySelector('#bio-discovery-private-results');
    const publicOnly=category==='public_sector';
    publicPanel.hidden=!publicOnly;
    privatePanel.hidden=publicOnly;
    const input=page.querySelector('#bio-ted-term');
    const submit=page.querySelector('#bio-discovery-search-form button[type="submit"]');
    if(input){
      input.disabled=false;
      input.placeholder=publicOnly?'Σύμβαση, υπηρεσία, φορέας, αριθμός TED…':
        category==='business'?'Αναζήτηση στα τεκμηριωμένα επιχειρηματικά ευρήματα…':
        'Αναζήτηση ιδιωτικών ευρημάτων (χωρίς ενεργή πηγή)…';
    }
    if(submit)submit.disabled=false;
    if(!publicOnly){
      const heading=page.querySelector('#bio-discovery-private-heading');
      const description=page.querySelector('#bio-discovery-private-description');
      const body=page.querySelector('#bio-discovery-business-results');
      const archive=page.querySelector('#bio-discovery-archive');
      if(heading)heading.textContent=(category==='individual'?'Ιδιώτες':'Επιχειρήσεις')+' — νέες ανακαλύψεις';
      if(description)description.textContent=category==='individual'?
        'Δεν έχει συνδεθεί εγκεκριμένη ενεργή πηγή νέων ιδιωτικών αιτημάτων. Ιστορικές δημόσιες συζητήσεις δεν αποτελούν νέους πελάτες.':
        'Οι δημόσιες συμβάσεις TED βρίσκονται μόνο στα «Δημόσια έργα». Εδώ εμφανίζονται αποκλειστικά τεκμηριωμένα επιχειρηματικά αιτήματα, εάν προκύψουν.';
      if(body){
        body.hidden=category!=='business';
        if(category==='business')body.innerHTML=businessDiscoveryMarkup({segmented,esc,newIds:newSinceOpen,renderRows:remoteOpportunityRows});
      }
      if(archive)archive.dataset.bioDiscoveryArchive=category;
    }
    filterTED();
  }
  page.addEventListener('click',event=>{
    const selected=event.target.closest('[data-bio-discovery-category]');
    if(selected)setDiscoveryCategory(selected.dataset.bioDiscoveryCategory);
    const archive=event.target.closest('[data-bio-discovery-archive]');
    if(archive){
      const filter=pilotPanel.querySelector('#bio-pilot-type');
      if(filter){filter.value=archive.dataset.bioDiscoveryArchive;filterPilot();}
    }
    if(event.target.closest('#bio-demo-refresh'))void refreshPilot();
    if(event.target.closest('#bio-ted-refresh'))void refreshTED(true);
    if(event.target.closest('#bio-map-refresh'))void refreshCoverage();
  });
  setDiscoveryCategory('public_sector');
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
