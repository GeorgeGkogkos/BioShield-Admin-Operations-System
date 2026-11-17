/* BIO-39: privacy-redacted public projection from Supabase, NOT a CRM. */
const serviceLabels={
  disinfection:'Απολύμανση',
  pest_control:'Απεντόμωση / μυοκτονία',
  drain_unblocking:'Απόφραξη αποχέτευσης'
};
const audienceLabels={
  individual:'Ιδιώτης',
  business:'Επιχείρηση',
  public_sector:'Δημόσιος φορέας'
};
const statusLabels={
  unknown:'Άγνωστο αν η ανάγκη παραμένει ενεργή',
  publicly_open:'Δημόσια αναφερόμενη ως ανοιχτή — απαιτείται επανέλεγχος',
  publicly_fulfilled:'Δημόσια αναφερόμενη ως εξυπηρετημένη',
  publicly_withdrawn:'Δημόσια αναφερόμενη ως αποσυρμένη'
};
export function renderVerifiedRequests(payload,esc,category){
  if(category==='ted')return '';
  if(payload?.status!=='ok'||!Array.isArray(payload.requests)){
    return '<section class="bio-search-archive" id="bio-verified-section" role="status">'+
      '<h3>Επαληθευμένα αιτήματα στη βάση</h3>'+
      '<p class="bio-note">Η ανάγνωση του ανεξάρτητου αποθετηρίου δεν είναι διαθέσιμη. Δεν εμφανίζονται τεχνητά ή cached αποτελέσματα.</p></section>';
  }
  const all=payload.requests.filter(row=>
    Object.prototype.hasOwnProperty.call(serviceLabels,row.service_category)&&
    Object.prototype.hasOwnProperty.call(audienceLabels,row.requester_type));
  const items=all.filter(row=>row.requester_type===category);
  return '<section class="bio-search-archive" id="bio-verified-section">'+
    '<h3>Επαληθευμένα αιτήματα στη βάση ('+esc(items.length)+')</h3>'+
    '<p class="bio-note">Πρωτογενείς δημοσιεύσεις έως 14 ημερών · απολυμάνσεις, απεντομώσεις και αποφράξεις. '+
    'Η εφαρμογή εμφανίζει μόνο μη ταυτοποιητικά στοιχεία. Οι αρχικοί σύνδεσμοι παραμένουν στην ιδιωτική Supabase. '+
    'Δεν πρόκειται για επιβεβαιωμένες διαθέσιμες εργασίες ή άδεια επικοινωνίας.</p>'+
    (items.length?'<div class="bio-search-archive-items">'+items.map(row=>{
      const service=serviceLabels[row.service_category];
      const title=audienceLabels[row.requester_type]+' · '+service;
      const meta=(row.broad_area||'Μη δημοσιοποιημένη περιοχή')+' · αρχική δημοσίευση '+row.original_posted_on;
      const state=statusLabels[row.fulfillment_status]||statusLabels.unknown;
      const searchable=[service,meta,title].join(' ').toLocaleLowerCase('el-GR');
      return '<article class="bio-search-archive-row" data-bio-verified-row data-services="'+
        esc(row.service_category)+'" data-search="'+esc(searchable)+'">'+
        '<div><strong>'+esc(title)+'</strong><small>'+esc(meta)+'</small></div>'+
        '<p>Πρωτογενώς επαληθευμένο δημόσιο αίτημα · '+esc(state)+'.</p>'+
        '<small class="bio-evidence-note">Εξακριβωμένη δημοσίευση, όχι επιβεβαιωμένη ανάθεση</small></article>';
    }).join('')+'</div>':
      '<p class="bio-note">Δεν έχουν καταχωριστεί επαληθευμένα πρόσφατα αιτήματα σε αυτή την κατηγορία.</p>')+
    '<p id="bio-verified-search-empty" class="bio-note" hidden>Δεν υπάρχουν καταχωρισμένα αιτήματα με αυτά τα φίλτρα.</p>'+
    '</section>';
}
