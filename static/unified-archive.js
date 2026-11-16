/* BIO-34: Search-only access to public, historical demo evidence. No contacts. */
function safeSource(url, esc) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return '';
  return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Πρωτογενής/δημόσια πηγή ↗</a>';
}
function itemCard({title,meta,description,status,url,search},esc) {
  return '<article class="bio-search-archive-row" data-bio-archive-row data-search="'+
    esc(search.toLocaleLowerCase('el-GR'))+'"><div><strong>'+esc(title)+'</strong>'+
    '<small>'+esc(meta)+'</small></div><p>'+esc(description)+'</p>'+
    '<small class="bio-evidence-note">'+esc(status)+'</small>'+safeSource(url,esc)+'</article>';
}
export function renderSearchArchive(data,esc,category) {
  if(category==='ted')return '';
  if(data?.demo_supabase_connected!==true)
    return '<div class="bio-search-archive-note" role="status">Το αποθηκευμένο δημόσιο αρχείο δεν είναι προσωρινά διαθέσιμο. Δεν παρουσιάζονται δεδομένα cache ως ζωντανά.</div>';
  let items=[];
  let description='';
  if(category==='individual'){
    description='Δημόσιες συζητήσεις, όχι επιβεβαιωμένες νέες εργασίες ή στοιχεία επικοινωνίας.';
    items=(data.community_cases||[]).filter(x=>x.audience_segment==='individual').map(x=>({
      title:x.service||'Αναφορά υπηρεσίας',
      meta:[x.publisher,x.posted_on].filter(Boolean).join(' · '),
      description:x.summary||'',
      status:x.within_30d?'Δημοσίευση εντός 30 ημερών — απαιτείται έλεγχος ενεργής ανάγκης':'Ιστορική ανάρτηση — δεν τεκμηριώνει ενεργό αίτημα',
      url:x.source_url,search:[x.id,x.publisher,x.service,x.summary,x.posted_on].filter(Boolean).join(' ')
    }));
  }else if(category==='business'){
    description='Εταιρικά αιτήματα μόνο με δημόσιο τεκμήριο. Όχι λίστες επιχειρήσεων που διαφημίζουν υπηρεσίες.';
    items=(data.business_requests||[]).map(x=>({
      title:x.service||'Επιχειρηματική ανάγκη',
      meta:[x.authority,x.region].filter(Boolean).join(' · '),
      description:x.summary||'',
      status:'Αρχειακή έρευνα — έλεγχος ισχύος/συναίνεσης πριν από κάθε ενέργεια',
      url:x.source_url,search:[x.id,x.authority,x.region,x.service,x.summary].filter(Boolean).join(' ')
    }));
  }else if(category==='public_sector'){
    description='Δημόσιες προκηρύξεις που έχουν καταγραφεί στο ανεξάρτητο αρχείο. Μπορεί να συμπίπτουν με ζωντανές δημοσιεύσεις TED.';
    items=(data.tenders||[]).map(x=>({
      title:x.service||'Δημόσια προκήρυξη',
      meta:[x.authority,x.region,x.id].filter(Boolean).join(' · '),
      description:x.evidence_note||'',
      status:'Ιστορικό τεκμήριο — προθεσμία: '+(x.deadline_day_reported||x.deadline||'άγνωστη')+
        '. Δεν έχει επιβεβαιωθεί ότι παραμένει ανοιχτή.',
      url:x.source_url,search:[x.id,x.notice_id,x.authority,x.region,x.service].filter(Boolean).join(' ')
    }));
  }
  return '<div class="bio-search-archive">'+
    '<p class="bio-note">'+esc(description)+'</p>'+
    '<details id="bio-search-archive-details" '+(category==='individual'?'open':'')+'>'+
    '<summary>Δημόσια τεκμήρια αρχείου ('+esc(items.length)+') · όχι νέοι πελάτες</summary>'+
    '<div class="bio-search-archive-items">'+(items.length?
      items.map(x=>itemCard(x,esc)).join(''):
      '<p class="bio-note">Δεν υπάρχουν τεκμηριωμένα ευρήματα αρχείου για την επιλεγμένη κατηγορία.</p>')+
    '</div><p id="bio-search-archive-empty" class="bio-note" hidden>Δεν βρέθηκαν τεκμήρια αρχείου με αυτόν τον όρο.</p>'+
    '</details></div>';
}
