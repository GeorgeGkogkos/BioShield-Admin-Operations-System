/* Source-linked, public-only evidence from an isolated Supabase DEMO. No live crawling or contacts. */
function sourceLink(url, esc) {
  if (typeof url !== "string" || !url.startsWith("https://")) return "—";
  return '<a href="' + esc(url) + '" rel="noopener noreferrer" target="_blank">Πηγή</a>';
}
const money = amount => Number(amount).toLocaleString("el-GR",{style:"currency",currency:"EUR"});
function displayDeadline(item,esc) {
  if (!item.deadline) return esc(item.deadline_day_reported || "Άγνωστη ώρα");
  const d = new Date(item.deadline);
  const str = new Intl.DateTimeFormat("el-GR",{timeZone:"Europe/Athens",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
  return esc(str) + '<small class="bio-evidence-note">' +
    (d.getTime() <= Date.now() ? "Η δηλωμένη προθεσμία παρήλθε" : "Η δηλωμένη προθεσμία δεν παρήλθε") +
    " · Δεν επιβεβαιώθηκε η τρέχουσα κατάσταση</small>";
}
export function renderPublicPilot(data,esc) {
  const online=data && data.demo_supabase_connected===true;
  if(!online){
    return [
      '<div class="bio-demo-connection bio-demo-offline" role="status"><strong>Η δοκιμαστική Supabase δεν είναι διαθέσιμη</strong>',
      '<p>Δεν εμφανίζονται παλιές στατικές μετρήσεις ως ζωντανά αποτελέσματα. Η εταιρική βάση παραμένει ασύνδετη.</p>',
      '<button type="button" id="bio-demo-refresh" class="bio-open-lab">Επανάληψη σύνδεσης</button></div>'
    ].join('');
  }
  const lastFetch = data.fetched_at_utc ?
    new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(data.fetched_at_utc)) :
    '—';
  const freshness=data.reddit_freshness||{recent_posts_14d:0,recent_posts_7d:0,historical_or_unopened:(data.community_cases||[]).length};
  const businessRows=(data.business_requests||[]).map(item =>
    '<tr data-pilot-row data-kind="business" data-segment="business" data-search="'+
      esc([item.id,item.authority,item.region,item.service,item.summary].join(' ').toLocaleLowerCase('el-GR'))+'">'+
      '<td>'+esc(item.id)+'</td><td>'+esc(item.authority)+'</td><td>'+esc(item.service)+'</td>'+
      '<td>'+esc(item.summary)+'</td><td>'+sourceLink(item.source_url,esc)+'</td></tr>'
  ).join('');
  const rows = data.tenders.map(item =>
    '<tr data-pilot-row data-kind="tender" data-segment="'+esc(item.audience_segment||"needs_review")+'" data-search="' +
      esc([item.id,item.authority,item.region,item.service].join(" ").toLocaleLowerCase("el-GR"))+'">' +
    "<td><strong>"+esc(item.id)+"</strong><small class=\"bio-evidence-note\">"+esc(item.notice_id)+"</small></td>"+
    "<td>"+esc(item.authority)+"<small class=\"bio-evidence-note\">"+esc(item.region)+"</small></td>"+
    "<td>"+esc(item.service)+"</td><td>"+esc(money(item.budget_eur_ex_vat))+"</td>"+
    "<td>"+displayDeadline(item,esc)+"</td>"+
    "<td>"+esc({official_issuer_listing:"Επίσημη σελίδα φορέα",republished_full_notice:"Πλήρης αναδημοσίευση",indexed_notice_only:"Μόνο μεταδεδομένα"}[item.evidence_level]||"Εκκρεμεί έλεγχος")+
    '<small class="bio-evidence-note">'+esc(item.evidence_note)+"</small></td>"+
    "<td>"+sourceLink(item.source_url,esc)+(item.additional_url?" · "+sourceLink(item.additional_url,esc):"")+"</td></tr>"
  ).join("");
  const discussions=data.community_cases.filter(item=>item.within_14d===true).map(item =>
    '<tr data-pilot-row data-kind="forum" data-reddit-fortnight="'+(item.within_14d?'true':'false')+'" data-reddit-week="'+(item.within_7d?'true':'false')+'" data-segment="'+esc(item.audience_segment||"needs_review")+'" data-search="'+
    esc([item.id,item.publisher,item.service,item.summary].join(" ").toLocaleLowerCase("el-GR"))+'">'+
    "<td>"+esc(item.id)+"</td><td>"+esc(item.posted_on)+'<small class="bio-evidence-note">Πρόσφατη · '+esc(item.post_age_days)+' ημέρες</small>'+"</td>"+
    "<td>"+esc(item.service)+"</td><td>"+esc(item.summary)+"</td>"+
    "<td>"+esc({historical_not_confirmed_active:"Ιστορική ζήτηση — όχι επιβεβαιωμένη ενεργή",
      not_hiring:"Συζήτηση — όχι ρητή ανάθεση",stale_archived:"Παλαιό και αρχειοθετημένο",
      service_already_arranged:"Έχει ήδη κανονιστεί συνεργείο"}[item.gate]||"Απαιτείται έλεγχος")+"</td>"+
    "<td>"+sourceLink(item.source_url,esc)+"</td></tr>"
  ).join("");
  return [
    '<div class="bio-demo-connection" id="bio-demo-sync" role="status"><div><strong>Συνδεδεμένη δοκιμαστική Supabase · READ ONLY</strong>',
    '<p>Ζωντανή ανάγνωση αποθηκευμένων ευρημάτων. Τελευταία ανανέωση: <span data-live-stat="fetched-at">',esc(lastFetch),'</span>',
    ' · αυτόματος έλεγχος ανά 30 δευτερόλεπτα όσο βλέπεις αυτήν την καρτέλα.</p></div>',
    '<button type="button" id="bio-demo-refresh" class="bio-open-lab">Ανανέωση τώρα</button></div>',
    '<div class="bio-lab-top"><div><p class="eyebrow">BIO-13 / RECENT-FIRST REDDIT RESEARCH</p>',
    '<h2 data-live-stat="as-of">Πραγματικά ευρήματα — ',esc(data.as_of_date),'</h2>',
    '<p class="bio-muted">Πραγματικά δημόσια ευρήματα αποθηκευμένα στη χωριστή δοκιμαστική βάση. Οι μετρήσεις διαβάζονται από τη Supabase όταν ανοίγεις ή ανανεώνεις τη σελίδα. Δεν πρόκειται για αυτόματο crawler ή λίστα επαφών.</p>',
    '</div><span class="bio-test-badge">SUPABASE DEMO · LIVE READ</span></div>',
    '<div class="bio-alert"><strong>Διαγωνισμοί ≠ ιδιωτικοί πελάτες</strong><p>',
    'Οι προκηρύξεις αφορούν φορείς. Οι πρόσφατες δημόσιες συζητήσεις δεν ισοδυναμούν με αίτημα συνεργείου, ενεργό πελάτη ή δικαίωμα επικοινωνίας.',
    ' Οι παλαιότερες αναρτήσεις αποκλείονται από την προβολή ιδιωτών. Για κάθε διαγωνισμό απαιτείται έλεγχος της διακήρυξης.</p></div>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric bio-segment-private"><span>Ιδιώτες (14 ημέρες)</span><strong data-live-stat="segment-individual">',esc(freshness.recent_posts_14d),'</strong><small data-live-stat="private-recent">Δημόσιες αναρτήσεις · όχι ενεργοί πελάτες</small></article>',
    '<article class="bio-metric bio-segment-public"><span>Έργα Δημοσίου</span><strong data-live-stat="segment-public">',esc(data.segment_counts.public_sector),'</strong><small>Προκηρύξεις φορέων · έλεγχος επίσημων όρων</small></article>',
    '<article class="bio-metric bio-segment-business"><span>Επιχειρήσεις</span><strong data-live-stat="segment-business">',esc(data.segment_counts.business),'</strong><small>Επιβεβαιωμένες περιπτώσεις B2B στο δείγμα</small></article>',
    '<article class="bio-metric bio-segment-unknown"><span>Αδιευκρίνιστα</span><strong data-live-stat="segment-review">',esc(data.segment_counts.needs_review),'</strong><small>Χωρίς επαρκή τεκμηρίωση τύπου πελάτη</small></article></div>',
    '<p class="bio-note" data-live-stat="reddit-summary"><strong>Ιδιώτες — πρόσφατα:</strong> ',esc(freshness.recent_posts_14d),' επαληθευμένες αρχικές δημοσιεύσεις έως 14 ημερών (',esc(freshness.recent_posts_7d),' στις 7 ημέρες). Παλαιότερες και μη επαληθευμένες δεν εμφανίζονται. Η ημερομηνία σχολίου ή ανάγνωσης δεν ανανεώνει την αρχική ανάρτηση.</p>',
    '<p class="bio-note" data-live-stat="sources-summary">',esc(data.public_sources_reviewed),' συνολικές πραγματικές πηγές · 0 εγκεκριμένες επαφές. Η κατηγορία αφορά τον <strong>αιτούντα</strong>, όχι την ανάγκη ή άδεια εμπορικής επικοινωνίας.</p>',
    '<div class="bio-lab-filter bio-pilot-filter"><input id="bio-pilot-search" type="search" placeholder="Περιοχή, φορέας, είδος…" aria-label="Αναζήτηση πραγματικών πηγών">',
    '<select id="bio-pilot-type" aria-label="Κατηγορία αιτούντος"><option value="all">Όλες οι κατηγορίες</option><option value="individual">Ιδιώτες</option>',
    '<option value="public_sector">Έργα Δημοσίου</option><option value="business">Επιχειρήσεις</option>',
    '<option value="needs_review">Αδιευκρίνιστα</option></select>',
    '<select id="bio-pilot-recency" aria-label="Παλαιότητα αναρτήσεων Reddit"><option value="14d">Reddit · έως 14 ημέρες</option>',
    '<option value="7d">Reddit · έως 7 ημέρες</option></select></div>',
    '<div data-pilot-section="public_sector" class="bio-segment-section">',
    '<h3 data-live-stat="public-heading">Έργα Δημοσίου · δημόσιες προκηρύξεις (',esc(data.tenders.length),')</h3><div class="bio-scroll">',
    '<table class="bio-table bio-real-table"><thead><tr><th>Κωδικός</th><th>Φορέας</th><th>Αντικείμενο</th>',
    '<th>Ποσό χωρίς ΦΠΑ</th><th>Δηλωμένη προθεσμία</th><th>Βαθμός τεκμηρίωσης</th><th>Πηγές</th></tr></thead><tbody>',
    rows,'</tbody></table></div></div>',
    '<div data-pilot-section="individual" class="bio-segment-section">',
    '<h3 class="bio-real-subheading" data-live-stat="reddit-heading">Reddit · ',esc(freshness.recent_posts_14d),' πρόσφατες δημοσιεύσεις (14 ημέρες)</h3>',
    '<p class="bio-note">Εμφανίζονται μόνο επαληθευμένες αρχικές δημοσιεύσεις έως 14 ημερών, πρώτα οι νεότερες. Μπορείς να περιορίσεις περαιτέρω στις 7 ημέρες. Οι συζητήσεις δεν αποτελούν ενεργούς ή εγκεκριμένους πελάτες.</p>',
    '<div class="bio-scroll">',
    '<table class="bio-table bio-real-table"><thead><tr><th>ID</th><th>Ημερομηνία</th><th>Υπηρεσία</th><th>Επιγραμματική σύνοψη</th><th>Αξιολόγηση</th><th>Πηγή</th></tr></thead><tbody>',
    discussions,'</tbody></table></div>',
    (data.community_cases||[]).filter(x=>x.within_14d===true).length?'':
      '<p role="status" class="bio-note">Δεν υπάρχουν επαληθευμένες αρχικές δημοσιεύσεις εντός 14 ημερών.</p>',
    '</div>',
    '<div data-pilot-section="business" class="bio-segment-section bio-business-empty">',
    '<h3 class="bio-real-subheading">Επιχειρήσεις · αιτήματα ιδιωτικού τομέα (',esc(data.business_requests_count),')</h3>',
    data.business_requests_count===0 ?
      '<p>Δεν υπάρχουν ακόμη επαληθευμένα αιτήματα επιχειρήσεων στη δοκιμαστική βάση. Δεν δημιουργούνται ψεύτικοι πελάτες.</p>' :
      '<div class="bio-scroll"><table class="bio-table bio-real-table"><thead><tr><th>ID</th><th>Φορέας</th><th>Υπηρεσία</th><th>Σύνοψη</th><th>Πηγή</th></tr></thead><tbody>'+businessRows+'</tbody></table></div>',
    '<p class="bio-note">Μια εταιρεία που <em>διαφημίζει υπηρεσίες</em> δεν είναι υποψήφιος πελάτης. Καταχωρίζονται μόνο τεκμηριωμένα αιτήματα υπηρεσιών.</p>',
    '</div>',
    '<p class="bio-note" id="bio-pilot-count">',esc(data.public_sources_reviewed),' / ',esc(data.public_sources_reviewed),' εγγραφές</p>',
    '<p class="bio-note"><strong>Όρια:</strong> Η ανεξάρτητη demo Supabase περιέχει μόνο δημόσια, μη προσωπικά δεδομένα από προηγούμενο ερευνητικό στιγμιότυπο. ',
    'Δεν έγιναν κλήσεις σε πελάτες, συλλογή τηλεφώνων, διασύνδεση με την εταιρική Supabase ή ζωντανές αναζητήσεις Firecrawl/TinyFish.</p>'
  ].join("");
}
