/* BIO-40: Only OFFICIAL, reviewed public-sector KΗΜΔΗΣ search metadata.
 * This is a second provider inside existing unified Search, not another page.
 */
const SERVICE_LABELS={
  pest_control:'Απεντόμωση',rodent_control:'Μυοκτονία',
  disinfection:'Απολύμανση',plumbing:'Υδραυλικά',drain_unblocking:'Αποφράξεις'
};
const URL_PREFIX='https://cerpp.eprocurement.gov.gr/upgkimdis/unprotected/home.xhtml?referenceNumber=';
const val=(x,esc)=>esc(x==null?'—':String(x));

export function renderKimdis(report,esc){
  const ok=report?.status==='ok'||report?.status==='partial';
  const intro='<h3>ΚΗΜΔΗΣ — Ελληνικές δημόσιες προσκλήσεις</h3>'+
    '<p class="bio-note">Ανεξάρτητη επίσημη πηγή του ελληνικού Δημοσίου, επιπλέον του TED. '+
    'Η προθεσμία προέρχεται από τα μεταδεδομένα της αρχικής καταχώρισης· '+
    '<strong>δεν αποδεικνύει δικαίωμα συμμετοχής ή ότι η πρόσκληση παραμένει ανοικτή.</strong></p>';
  if(!ok){
    return intro+'<p class="bio-note" role="status">Η επίσημη υπηρεσία ΚΗΜΔΗΣ δεν είναι τώρα διαθέσιμη. '+
      'Δεν εμφανίζονται αποθηκευμένες ή κατασκευασμένες εγγραφές ως νέα αποτελέσματα. '+
      '<a href="https://cerpp.eprocurement.gov.gr/khmdhs-opendata/help" rel="noopener noreferrer" target="_blank">Επίσημο API</a></p>';
  }
  const rows=Array.isArray(report.notices)?report.notices:[];
  const partial=report.status==='partial';
  const summary='<p class="bio-note" role="status"><strong>'+val(report.count,esc)+
    '</strong> διαφορετικοί ΑΔΑΜ μετά από επαλήθευση/αποδιπλοποίηση (μέγιστο 80 στην προβολή). '+
    'Εξετάστηκαν '+val(report.raw_result_slots_examined,esc)+' θέσεις αποτελεσμάτων, '+val(report.requests_completed,esc)+
    ' επίσημες αιτήσεις API. '+(partial?
      '<strong>Μερική κάλυψη: κάποια ερωτήματα, σελίδες ή αποτελέσματα δεν ανακτήθηκαν πλήρως.</strong>':'')+
    '</p>';
  const content=rows.length?'<div class="bio-scroll"><table class="bio-table bio-real-table">'+
    '<thead><tr><th>ΑΔΑΜ / Καταχώριση</th><th>Φορέας / Αντικείμενο</th><th>Υπηρεσία</th><th>Προϋπολογισμός</th><th>Προθεσμία στο ΚΗΜΔΗΣ</th><th>Πρωτογενής πηγή</th></tr></thead><tbody>'+
    rows.map(item=>{
      const ident=String(item.reference_number||'');
      const href=URL_PREFIX+encodeURIComponent(ident);
      const valid=/^\d{2}PROC\d{9}$/.test(ident);
      const money=Number.isFinite(item.budget_eur_ex_vat)?
        new Intl.NumberFormat('el-GR',{style:'currency',currency:'EUR'}).format(item.budget_eur_ex_vat):'Μη δημοσιευμένο';
      const deadline=item.deadline_at_as_posted?
        item.deadline_at_as_posted.replace('T',' '):'Άγνωστη';
      const state=item.deadline_state==='future_deadline_unverified'?
        'Μελλοντική ημερομηνία · απαιτείται έλεγχος ισχύος/επιλεξιμότητας':
        'Χωρίς επαληθευμένη προθεσμία · απαιτείται έλεγχος';
      const services=(item.service_codes||[]).map(s=>SERVICE_LABELS[s]||s).join(', ');
      const search=[ident,item.title,item.buyer,services,item.published_on].filter(Boolean).join(' ').toLocaleLowerCase('el-GR');
      return '<tr data-kimdis-row data-services="'+esc((item.service_codes||[]).join(','))+
        '" data-search="'+esc(search)+'"><td><strong>'+val(ident,esc)+'</strong>'+
        '<small class="bio-evidence-note">'+val(item.published_on,esc)+'</small></td>'+
        '<td>'+val(item.buyer,esc)+'<small class="bio-evidence-note">'+val(item.title,esc)+'</small></td>'+
        '<td>'+esc(services)+'</td><td>'+esc(money)+'</td>'+
        '<td>'+esc(deadline)+'<small class="bio-evidence-note">'+esc(state)+'</small></td>'+
        '<td>'+(valid?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Επίσημη καταχώριση</a>':'—')+
        '<small class="bio-evidence-note">'+val(item.notice_type,esc)+'</small></td></tr>';
    }).join('')+'</tbody></table></div>':
    '<p class="bio-note">Δεν εντοπίστηκε προκήρυξη με μη παρελθούσα προθεσμία στα επαληθευμένα αποτελέσματα.</p>';
  return intro+summary+
    '<p class="bio-note" id="bio-kimdis-filter-empty" hidden>Δεν υπάρχουν αποτελέσματα ΚΗΜΔΗΣ με αυτά τα φίλτρα.</p>'+
    content+
    '<p class="bio-note">Πηγή: <a href="https://cerpp.eprocurement.gov.gr/khmdhs-opendata/help" rel="noopener noreferrer" target="_blank">ΚΗΜΔΗΣ Open Data API</a> '+
    '(CC BY 4.0, ημερήσια ενημέρωση). Δεν συλλέγονται στοιχεία επαφής και δεν ενεργοποιείται CRM. '+
    'Το ΚΗΜΔΗΣ και το TED μπορεί να αναφέρονται στην ίδια σύμβαση· τα διακριτά ΑΔΑΜ δεν είναι πρόσθετες ανεξάρτητες αναθέσεις.</p>';
}
