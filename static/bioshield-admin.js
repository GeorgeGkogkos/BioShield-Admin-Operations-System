/* BioShield setup + synthetic-only benchmark. No real public posts or credentials. */
function metric(title,value,esc,explain='') {
  const display=value==null?'—':esc(value);
  return '<article class="bio-metric"><span>'+esc(title)+'</span><strong>'+display+'</strong><small>'+esc(explain|| (value==null?'Δεν υπάρχουν πραγματικά δεδομένα':'Επαληθευμένη τιμή'))+'</small></article>';
}
function emptyView(title,body) {
  return '<div class="bio-empty"><strong>'+title+'</strong><p>'+body+'</p></div>';
}
function percentage(x) { return (x*100).toLocaleString('el-GR',{maximumFractionDigits:1})+'%'; }
function number(x) { return Number(x).toLocaleString('el-GR',{maximumFractionDigits:1}); }
const categoryNames={
  disinfection:'Απολύμανση', pest_control:'Απεντόμωση', rodent_control:'Μυοκτονία'
};

export async function renderBioShieldAdmin(page,{api,esc}) {
  page.innerHTML='<p role="status">Φόρτωση BioShield Admin Operations…</p>';
  try {
    const [data,lab,examples]=await Promise.all([
      api('/bioshield/overview'),api('/bioshield/lab/report'),api('/bioshield/lab/cases')
    ]);
    if(!page.isConnected)return;
    const q=lab.quality, speed=lab.throughput, normal=lab.mock_normal, outage=lab.mock_fallback;
    const providerRows=data.providers.map(p=>
      '<tr><td><strong>'+esc(p.name)+'</strong></td><td>Δεν έχει συνδεθεί</td><td>Καμία πραγματική εκτέλεση</td></tr>'
    ).join('');
    const caseRows=examples.cases.map(c=>
      '<tr data-lab-case data-status="'+(c.predicted_request?'request':'skip')+'" data-search="'+esc((c.id+' '+c.text+' '+(categoryNames[c.category]||'')).toLocaleLowerCase('el-GR'))+'">'+
      '<td class="bio-nowrap"><strong>'+esc(c.id)+'</strong></td>'+
      '<td>'+esc(c.text)+'</td>'+
      '<td><span class="bio-pill '+(c.expected_request?'positive':'neutral')+'">'+(c.expected_request?'Αίτημα':'Μη αίτημα')+'</span></td>'+
      '<td><span class="bio-pill '+(c.predicted_request?'positive':'neutral')+'">'+(c.predicted_request?'Προς αξιολόγηση':'Απόρριψη')+'</span></td>'+
      '<td>'+esc(categoryNames[c.category]||'Άλλο')+'</td></tr>'
    ).join('');
    page.innerHTML=[
      '<div class="bio-page">',
      '<header class="bio-heading"><div><p class="eyebrow">DST / BIOSHIELD OPERATIONS</p>',
      '<h1>BioShield Admin Operations System</h1>',
      '<p>Αναζήτηση αιτημάτων, αξιολόγηση καταλληλότητας και διαχείριση πηγών για το τηλεφωνικό κέντρο.</p>',
      '</div><span class="bio-stage">Pre-Supabase Lab</span></header>',
      '<div class="bio-alert" role="status"><strong>Σύστημα δοκιμών — χωρίς πραγματικά δεδομένα</strong><p>',
      esc(data.message),' Ο εργαστηριακός έλεγχος χρησιμοποιεί αποκλειστικά επινοημένα παραδείγματα.</p></div>',
      '<nav class="bio-tabs" aria-label="Ενότητες BioShield">',
      '<button type="button" data-bio-tab="overview" class="active" aria-pressed="true">Επισκόπηση</button>',
      '<button type="button" data-bio-tab="lab" aria-pressed="false">Εργαστήριο απόδοσης</button>',
      '<button type="button" data-bio-tab="candidates" aria-pressed="false">Υποψήφιοι</button>',
      '<button type="button" data-bio-tab="sources" aria-pressed="false">Πηγές</button>',
      '<button type="button" data-bio-tab="runs" aria-pressed="false">Εκτελέσεις</button>',
      '<button type="button" data-bio-tab="privacy" aria-pressed="false">Επικοινωνία</button>',
      '</nav>',
      '<section data-bio-panel="overview"><div class="bio-metrics">',
      metric('Πραγματικές αναρτήσεις',data.metrics.discovered,esc),
      metric('Πραγματικά προς αξιολόγηση',data.metrics.review_required,esc),
      metric('Επιλέξιμα για επικοινωνία',data.metrics.outreach_eligible,esc),
      metric('Πραγματικές εκτελέσεις',data.metrics.completed_runs,esc),
      '</div><div class="bio-grid">',
      '<article class="bio-card"><h2>Διασυνδέσεις</h2><p>Η πραγματική συλλογή είναι κλειστή. Τα δεδομένα προσομοίωσης δεν μεταφέρονται στη βάση.</p>',
      '<div class="bio-scroll"><table class="bio-table"><thead><tr><th>Πάροχος</th><th>Κατάσταση</th><th>Λειτουργία</th></tr></thead><tbody>',providerRows,'</tbody></table></div></article>',
      '<article class="bio-card"><h2>Offline qualification lab</h2>',
      '<p>Το πρώτο δοκιμαστικό σύνολο περιλαμβάνει <strong>',number(q.fixture_count),
      ' συνθετικές αναρτήσεις</strong>. Μετράμε ακρίβεια αναγνώρισης, διπλότυπα και χρόνο επεξεργασίας.</p>',
      '<div class="bio-inline-facts"><span>Recall <strong>',percentage(q.recall),'</strong></span>',
      '<span>Precision <strong>',percentage(q.precision),'</strong></span>',
      '</div><button class="bio-open-lab" type="button" data-bio-tab="lab">Προβολή δοκιμών και παραδειγμάτων</button>',
      '</article></div></section>',
      '<section data-bio-panel="lab" hidden>',
      '<div class="bio-lab-top"><div><p class="eyebrow">BIO-08 / BIO-09</p><h2>Performance &amp; Relevance Laboratory</h2>',
      '<p class="bio-muted">Οι παρακάτω τιμές αφορούν μόνο ',number(q.fixture_count),
      ' κατασκευασμένα παραδείγματα και επεξεργασία μέσα στον Python server. Δεν αποτελούν μέτρηση πραγματικών Firecrawl/TinyFish, Supabase ή εμπορικής απόδοσης.</p></div>',
      '<span class="bio-test-badge">100% SYNTHETIC</span></div>',
      '<div class="bio-metrics bio-lab-metrics">',
      metric('Precision · συνθετικό',percentage(q.precision),esc, 'False positives: '+number(q.fp)),
      metric('Recall · συνθετικό',percentage(q.recall),esc,'False negatives: '+number(q.fn)),
      metric('Επεξεργασία / δευτερόλεπτο',number(speed.documents_per_second),esc,'CPU-only, όχι API ή crawl'),
      metric('P95 ανά εγγραφή',number(speed.p95_item_ms)+' ms',esc,'CPU-only, όχι καθυστέρηση δικτύου'),
      '</div>',
      '<div class="bio-grid"><article class="bio-card"><h3>Προσομοίωση δύο παρόχων</h3>',
      '<p>Τα δύο mock adapters έχουν επικαλυπτόμενες πηγές και αφαιρούν τα ίδια URLs μετά την κανονικοποίηση.</p>',
      '<table class="bio-table"><thead><tr><th>Σενάριο</th><th>Ευρήματα</th><th>Μοναδικά</th><th>Διπλότυπα</th></tr></thead><tbody>',
      '<tr><td>Firecrawl + TinyFish (mock)</td><td>',number(normal.raw_hits),'</td><td>',number(normal.unique_sources),'</td><td>',number(normal.duplicates_excluded),'</td></tr>',
      '<tr><td>Firecrawl unavailable (mock)</td><td>',number(outage.raw_hits),'</td><td>',number(outage.unique_sources),'</td><td>',number(outage.duplicates_excluded),'</td></tr>',
      '</tbody></table><p class="bio-note">Η προσομοιωμένη απώλεια του Firecrawl μειώνει την κάλυψη. Δεν χαρακτηρίζεται ως πλήρης έρευνα.</p></article>',
      '<article class="bio-card"><h3>Τι μετρήθηκε</h3>',
      '<ul class="bio-explainer"><li>Ταξινόμηση ρητών αιτημάτων έναντι διαφημίσεων και συζητήσεων</li>',
      '<li>Κανονικοποίηση και αναγνώριση διπλότυπων URLs</li>',
      '<li>CPU latency και throughput σε ',number(speed.iterations),' επαναλήψεις</li>',
      '<li>Ασφαλής διακοπή διαβίβασης προς τηλεφωνικό κέντρο</li></ul>',
      '<p class="bio-note"><strong>Δεν μετρήθηκαν:</strong> πραγματικές ιστοσελίδες, χρόνοι crawler, κόστος credits, ανθρώπινη απόκριση ή βάση Supabase.</p></article></div>',
      '<article class="bio-card bio-lab-table-card"><div class="bio-lab-table-heading"><div><h3>Επισημασμένα ελληνικά παραδείγματα</h3><p class="bio-muted">Πλασματικά κείμενα χωρίς στοιχεία προσώπων. Το αποτέλεσμα «προς αξιολόγηση» δεν επιτρέπει επικοινωνία.</p></div>',
      '<div class="bio-lab-filter"><input type="search" id="bio-sample-search" aria-label="Αναζήτηση συνθετικών παραδειγμάτων" placeholder="Αναζήτηση περίπτωσης…">',
      '<select id="bio-sample-status" aria-label="Φίλτρο αποτελέσματος"><option value="all">Όλα</option><option value="request">Προς αξιολόγηση</option><option value="skip">Απόρριψη</option></select></div></div>',
      '<div class="bio-scroll bio-lab-scroll"><table class="bio-table"><thead><tr><th>ID</th><th>Επινοημένη ανάρτηση</th><th>Σωστή ετικέτα</th><th>Αποτέλεσμα</th><th>Υπηρεσία</th></tr></thead><tbody>',
      caseRows,'</tbody></table></div><p class="bio-note" id="bio-sample-count">',number(examples.count),' / ',number(examples.count),' παραδείγματα</p></article></section>',
      '<section data-bio-panel="candidates" hidden><h2>Πραγματικοί υποψήφιοι</h2>',
      emptyView('Δεν υπάρχει πραγματική ουρά','Δεν συλλέγονται προσωπικά στοιχεία. Για δοκιμαστικές κατατάξεις χρησιμοποίησε το Εργαστήριο απόδοσης.'),'</section>',
      '<section data-bio-panel="sources" hidden><h2>Μητρώο πραγματικών πηγών</h2>',
      emptyView('Αναμονή έγκρισης πηγών','Δεν γίνεται συλλογή από forums, social ή άλλες ιστοσελίδες. Μόνο επινοημένες πηγές χρησιμοποιούνται στο εργαστήριο.'),'</section>',
      '<section data-bio-panel="runs" hidden><h2>Πραγματικές εκτελέσεις</h2>',
      emptyView('Δεν υπάρχει ενεργός crawler','Οι mock εκτελέσεις εμφανίζονται ξεχωριστά στο εργαστήριο. Δεν έχουν καταναλώσει credits.'),'</section>',
      '<section data-bio-panel="privacy" hidden><h2>Προϋποθέσεις επικοινωνίας</h2>',
      '<p>Η δημόσια ανάρτηση δεν είναι αυτόματα νόμιμη βάση για τηλεφωνική εμπορική επικοινωνία. Απαιτούνται έλεγχος νόμιμης βάσης, αντιρρήσεων και ανθρώπινη αξιολόγηση.</p>',
      '<div class="bio-policy">Αυτόματη διαβίβαση σε τηλεφωνικό κέντρο <strong>Απενεργοποιημένη</strong></div>',
      '<div class="bio-policy">Συλλογή τηλεφώνων από δημόσια προφίλ <strong>Απενεργοποιημένη</strong></div>',
      '<div class="bio-policy">Πρόσβαση σε πραγματική Supabase <strong>Απενεργοποιημένη</strong></div>',
      '<div class="bio-policy">Πραγματικά API Firecrawl και TinyFish <strong>Απενεργοποιημένα</strong></div></section>',
      '<footer class="bio-footer"><span>Offline prototype. Not validated on real-world posts.</span>',
      '<a href="https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a" rel="noopener noreferrer" target="_blank">Linear project</a></footer>',
      '</div>'
    ].join('');
    function selectTab(tab){
      page.querySelectorAll('[data-bio-tab]').forEach(button=>{
        const selected=button.dataset.bioTab===tab;
        button.classList.toggle('active',selected);
        button.setAttribute('aria-pressed',String(selected));
      });
      page.querySelectorAll('[data-bio-panel]').forEach(section=>{
        section.hidden=section.dataset.bioPanel!==tab;
      });
    }
    page.querySelectorAll('[data-bio-tab]').forEach(button=>button.addEventListener('click',()=>selectTab(button.dataset.bioTab)));
    const search=page.querySelector('#bio-sample-search'),status=page.querySelector('#bio-sample-status');
    function filterCases(){
      const term=search.value.trim().toLocaleLowerCase('el-GR'),choice=status.value;
      let visible=0;
      page.querySelectorAll('[data-lab-case]').forEach(row=>{
        const keep=(!term||row.dataset.search.includes(term))&&(choice==='all'||row.dataset.status===choice);
        row.hidden=!keep;
        if(keep)visible++;
      });
      page.querySelector('#bio-sample-count').textContent=number(visible)+' / '+number(examples.count)+' παραδείγματα';
    }
    search.addEventListener('input',filterCases);
    status.addEventListener('change',filterCases);
  }catch(error){
    if(!page.isConnected)return;
    page.textContent='Το περιβάλλον εργαστηρίου δεν είναι διαθέσιμο. Ελέγξτε την κατάσταση της υπηρεσίας.';
  }
}
