/* BIO-30: presentation-only discovery filters; no private/source crawling. */
const linkText=(value,esc)=>esc(value||'—');

export function overviewRecentNotices(ted,esc){
  if(ted?.status!=='ok')return '<p class="bio-note">Το επίσημο TED δεν είναι διαθέσιμο. Δεν παρουσιάζονται παλιά αποτελέσματα ως νέα.</p>';
  const notices=Array.isArray(ted.notices)?ted.notices.slice(0,4):[];
  if(!notices.length)return '<p class="bio-note">Δεν επιστράφηκαν επίσημες δημοσιεύσεις στην τελευταία επιτυχή ανάγνωση.</p>';
  return '<ul class="bio-overview-notices">'+notices.map(item=>{
    const title=esc(item.title||item.notice_number||'Δημοσίευση TED');
    const url=typeof item.source_url==='string'&&item.source_url.startsWith('https://')?item.source_url:null;
    const heading=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+title+'</a>':title;
    return '<li><time>'+esc(item.published_on||'—')+'</time><div>'+heading+
      '<small>'+linkText(item.buyer,esc)+' · Η τρέχουσα ισχύς απαιτεί έλεγχο</small></div></li>';
  }).join('')+'</ul>';
}

export function overviewSnapshot({ted,entry,newIds,pilot,esc,fmt,summary}){
  const count=ted?.status==='ok'?fmt(ted.count):'—';
  const newCount=entry?.status==='compared'?fmt(newIds.size):'—';
  const saved=pilot?.demo_supabase_connected===true?fmt(pilot.public_sources_reviewed):'—';
  return [
    '<header class="bio-overview-header"><div><p class="eyebrow">BIOSHIELD / OVERVIEW</p>',
    '<h1>Επισκόπηση</h1><p>Σύντομη εικόνα από πραγματικά δημόσια τεκμήρια και διαθέσιμες πηγές.</p></div>',
    '<a class="bio-overview-action" href="/admin/operations/discovery" data-bio-tab="discovery">Νέες ανακαλύψεις ›</a></header>',
    '<div class="bio-overview-stats">',
    '<article><span>Δημοσιεύσεις TED</span><strong id="bio-overview-ted-count">'+count+'</strong>',
    '<small>Επίσημα τεκμήρια · όχι αναθέσεις</small></article>',
    '<article><span>Νέα από προηγούμενη επίσκεψη</span><strong id="bio-overview-new-count">'+newCount+'</strong>',
    '<small>Μόνο μετά από έγκυρη σύγκριση στον ίδιο browser</small></article>',
    '<article><span>Δημόσια τεκμήρια demo</span><strong id="bio-overview-demo-count">'+saved+'</strong>',
    '<small>Ιστορικές δημόσιες πηγές · όχι νέοι πελάτες</small></article></div>',
    '<div class="bio-overview-recent"><div class="bio-overview-section-head">',
    '<h2>Τελευταίες δημοσιεύσεις TED</h2>',
    '<a href="/admin/operations/discovery" data-bio-tab="discovery">Προβολή ανακαλύψεων ›</a></div>',
    '<div id="bio-overview-recent-list">'+overviewRecentNotices(ted,esc)+'</div></div>',
    '<div class="bio-overview-foot"><span id="bio-overview-check-summary">'+esc(summary)+'</span>',
    '<a href="/admin/operations/status" data-bio-tab="status">Κατάσταση πηγών ›</a></div>'
  ].join('');
}

export function discoveryFilterMenu({ted,entry,newIds,esc,indicator,summary}){
  const searchIcon='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg>';
  const userIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.5" r="3.2"/><path d="M5 21v-2.4a7 7 0 0 1 14 0V21"/></svg>';
  const publicIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5h18M5 9.5v9M9 9.5v9M15 9.5v9M19 9.5v9M3 19h18M12 3l9 5H3l9-5Z"/></svg>';
  const businessIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V4h12v17M15 10h6v11M7 8h4M7 12h4M7 16h4M2 21h20"/></svg>';
  return [
    '<div class="bio-home-card bio-discovery-menu">',
    '<div class="bio-home-topline"><span class="bio-home-kicker">BIOSHIELD / DISCOVERY</span>',
    '<span id="bio-home-source-indicator">'+indicator+'</span></div>',
    '<div class="bio-home-intro"><h1>Αναζήτηση συμβάσεων &amp; ευρημάτων</h1>',
    '<p>Φιλτράρισε πραγματικές ανακοινώσεις ανά κατηγορία και όρο.</p></div>',
    '<form role="search" id="bio-discovery-search-form">',
    '<label class="bio-visually-hidden" for="bio-ted-term">Αναζήτηση στις φορτωμένες συμβάσεις TED</label>',
    '<div class="bio-home-search-box">'+searchIcon,
    '<input id="bio-ted-term" type="search" placeholder="Σύμβαση, υπηρεσία, φορέας, αριθμός TED…" autocomplete="off">',
    '<button type="submit" aria-label="Φιλτράρισμα δημοσίων συμβάσεων">',
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
    '</button></div></form>',
    '<nav class="bio-home-categories" aria-label="Κατηγορία αιτούντος">',
    '<button type="button" class="bio-home-category" data-bio-discovery-category="individual" aria-pressed="false">'+userIcon+'<span>Ιδιώτες</span></button>',
    '<button type="button" class="bio-home-category" data-bio-discovery-category="public_sector" aria-pressed="true">'+publicIcon+'<span>Δημόσια έργα</span></button>',
    '<button type="button" class="bio-home-category" data-bio-discovery-category="business" aria-pressed="false">'+businessIcon+'<span>Επιχειρήσεις</span></button>',
    '</nav><p class="bio-discovery-search-scope">Η αναζήτηση κειμένου φιλτράρει τις δημοσιεύσεις TED που έχουν ήδη φορτωθεί· δεν εκτελεί νέο ελεύθερο ερώτημα σε άλλους παρόχους.</p>',
    '<div class="bio-home-bottom"><div class="bio-home-provider">',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg>',
    '<span id="bio-home-ted-summary" role="status">'+esc(summary)+'</span></div>',
    '<a href="/admin/operations/status" data-bio-tab="status">Κατάσταση πηγών ›</a></div></div>'
  ].join('');
}

export function businessDiscoveryMarkup({segmented,esc,newIds,renderRows}){
  if(segmented?.status!=='ok')return '<p class="bio-note">Δεν είναι δυνατή αυτήν τη στιγμή η επαλήθευση των επιχειρηματικών ευρημάτων.</p>';
  const rows=segmented.remote_business||[];
  if(!rows.length)return '<p class="bio-note">Δεν υπάρχουν επιβεβαιωμένα νέα επιχειρηματικά αιτήματα στην τρέχουσα ελεγχόμενη ροή. Οι δημόσιες προκηρύξεις TED βρίσκονται στην κατηγορία «Δημόσια έργα».</p>';
  return '<p class="bio-note">Επιχειρηματικά ευρήματα με πρωτογενή τεκμηρίωση · απαιτείται έλεγχος πραγματικής ενεργής ανάγκης.</p>'+renderRows(rows,esc,newIds);
}
