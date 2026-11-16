/* One-time public evidence from independently reviewed sources; NEVER a live lead feed. */
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
  const discussions=data.community_cases.map(item =>
    '<tr data-pilot-row data-kind="forum" data-segment="'+esc(item.audience_segment||"needs_review")+'" data-search="'+
    esc([item.id,item.publisher,item.service,item.summary].join(" ").toLocaleLowerCase("el-GR"))+'">'+
    "<td>"+esc(item.id)+"</td><td>"+esc(item.posted_on)+"</td>"+
    "<td>"+esc(item.service)+"</td><td>"+esc(item.summary)+"</td>"+
    "<td>"+esc({historical_not_confirmed_active:"Ιστορική ζήτηση — όχι επιβεβαιωμένη ενεργή",
      not_hiring:"Συζήτηση — όχι ρητή ανάθεση",stale_archived:"Παλαιό και αρχειοθετημένο",
      service_already_arranged:"Έχει ήδη κανονιστεί συνεργείο"}[item.gate]||"Απαιτείται έλεγχος")+"</td>"+
    "<td>"+sourceLink(item.source_url,esc)+"</td></tr>"
  ).join("");
  return [
    '<div class="bio-lab-top"><div><p class="eyebrow">BIO-10 / REAL PUBLIC SOURCES</p>',
    '<h2>Πραγματικά ευρήματα — ',esc(data.as_of_date),'</h2>',
    '<p class="bio-muted">Ένα ελεγχόμενο, μη εξαντλητικό δείγμα. Δεν πρόκειται για ζωντανή αναζήτηση ούτε για λίστα επαφών.</p>',
    '</div><span class="bio-test-badge">REAL · STATIC SNAPSHOT</span></div>',
    '<div class="bio-alert"><strong>Διαγωνισμοί ≠ ιδιωτικοί πελάτες</strong><p>',
    'Οι προκηρύξεις αφορούν φορείς. Οι δημόσιες συζητήσεις είναι ιστορικές και δεν τεκμηριώνουν τρέχουσα ανάγκη ή δικαίωμα επικοινωνίας.',
    ' Για κάθε συμμετοχή σε διαγωνισμό απαιτείται έλεγχος της επίσημης διακήρυξης.</p></div>',
    '<div class="bio-metrics bio-lab-metrics">',
    '<article class="bio-metric bio-segment-private"><span>Ιδιώτες</span><strong>',esc(data.segment_counts.individual),'</strong><small>Δημόσιες αναρτήσεις ιδιωτικού πλαισίου · ΟΧΙ ενεργοί πελάτες</small></article>',
    '<article class="bio-metric bio-segment-public"><span>Έργα Δημοσίου</span><strong>',esc(data.segment_counts.public_sector),'</strong><small>Προκηρύξεις φορέων · έλεγχος επίσημων όρων</small></article>',
    '<article class="bio-metric bio-segment-business"><span>Επιχειρήσεις</span><strong>',esc(data.segment_counts.business),'</strong><small>Επιβεβαιωμένες περιπτώσεις B2B στο δείγμα</small></article>',
    '<article class="bio-metric bio-segment-unknown"><span>Αδιευκρίνιστα</span><strong>',esc(data.segment_counts.needs_review),'</strong><small>Χωρίς επαρκή τεκμηρίωση τύπου πελάτη</small></article></div>',
    '<p class="bio-note">',esc(data.public_sources_reviewed),' συνολικές πραγματικές πηγές · 0 εγκεκριμένες επαφές. Η κατηγορία αφορά τον <strong>αιτούντα</strong>, όχι την ανάγκη ή άδεια εμπορικής επικοινωνίας.</p>',
    '<div class="bio-lab-filter bio-pilot-filter"><input id="bio-pilot-search" type="search" placeholder="Περιοχή, φορέας, είδος…" aria-label="Αναζήτηση πραγματικών πηγών">',
    '<select id="bio-pilot-type" aria-label="Κατηγορία αιτούντος"><option value="all">Όλες οι κατηγορίες</option><option value="individual">Ιδιώτες</option>',
    ''<option value="public_sector">Έργα Δημοσίου</option><option value="business">Επιχειρήσεις</option>',
    '<option value="needs_review">Αδιευκρίνιστα</option></select></div>'',
    '<div data-pilot-section="public_sector" class="bio-segment-section">',
    '<h3>Έργα Δημοσίου · δημόσιες προκηρύξεις (',esc(data.tenders.length),')</h3><div class="bio-scroll">',
    '<table class="bio-table bio-real-table"><thead><tr><th>Κωδικός</th><th>Φορέας</th><th>Αντικείμενο</th>',
    '<th>Ποσό χωρίς ΦΠΑ</th><th>Δηλωμένη προθεσμία</th><th>Βαθμός τεκμηρίωσης</th><th>Πηγές</th></tr></thead><tbody>',
    rows,'</tbody></table></div></div>',
    '<div data-pilot-section="individual" class="bio-segment-section">',
    '<h3 class="bio-real-subheading">Ιδιώτες · δημόσιες αναρτήσεις (',esc(data.community_cases.length),')</h3>',
    '<p class="bio-note">Οι αναρτήσεις δεν αποτελούν ενεργούς ή εγκεκριμένους πελάτες. Τουλάχιστον μία περίπτωση παραμένει αδιευκρίνιστη λόγω ανεπαρκούς επιβεβαίωσης της αρχικής πηγής.</p>',
    '<div class="bio-scroll">',
    '<table class="bio-table bio-real-table"><thead><tr><th>ID</th><th>Ημερομηνία</th><th>Υπηρεσία</th><th>Επιγραμματική σύνοψη</th><th>Αξιολόγηση</th><th>Πηγή</th></tr></thead><tbody>',
    discussions,'</tbody></table></div></div>',
    '<div data-pilot-section="business" class="bio-segment-section bio-business-empty">',
    '<h3 class="bio-real-subheading">Επιχειρήσεις · αιτήματα ιδιωτικού τομέα (',esc(data.business_requests_count),')</h3>',
    '<p>Δεν έχει εντοπιστεί και επαληθευτεί ανεξάρτητο αίτημα από επιχείρηση στο συγκεκριμένο δείγμα.</p>',
    '<p class="bio-note">Μια εταιρεία που <em>διαφημίζει υπηρεσίες</em> δεν είναι υποψήφιος πελάτης. Εστιατόρια, ξενοδοχεία, γραφεία και αποθήκες κατατάσσονται εδώ μόνο όταν τα στοιχεία δείχνουν ότι ζητούν οι ίδιοι υπηρεσία.</p>',
    '</div>',
    '<p class="bio-note" id="bio-pilot-count">',esc(data.public_sources_reviewed),' / ',esc(data.public_sources_reviewed),' εγγραφές</p>',
    '<p class="bio-note"><strong>Όρια:</strong> 3 λογαριασμοί Firecrawl χωρίς credits. ',
    'Ορισμένες πρωτογενείς σελίδες δεν επέτρεψαν αυτοματοποιημένη ανάγνωση. ',
    'Δεν έγιναν εγγραφές σε Supabase, μεταφορά δεδομένων ή συλλογή τηλεφώνων.</p>'
  ].join("");
}
