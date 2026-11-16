/* BioShield admin view. No live data or contact details are bundled. */
function metric(label, value, esc) {
  const shown = value == null ? '—' : esc(value);
  return '<article class="bio-metric"><span>' + esc(label) + '</span><strong>' + shown +
    '</strong><small>' + (value == null ? 'Χωρίς επαληθευμένα δεδομένα' : 'Επαληθευμένη τιμή') + '</small></article>';
}
function emptyView(title, detail) {
  return '<div class="bio-empty"><strong>' + title + '</strong><p>' + detail + '</p></div>';
}
export async function renderBioShieldAdmin(page, {api, esc}) {
  page.innerHTML = '<p role="status">Φόρτωση BioShield Admin…</p>';
  try {
    const data = await api('/bioshield/overview');
    if (!page.isConnected) return;
    const providers = data.providers.map(p => '<tr><td><strong>' + esc(p.name) +
      '</strong></td><td>' + (p.status === 'not_configured' ? 'Δεν έχει συνδεθεί' : esc(p.status)) +
      '</td><td>Καμία ενεργή εκτέλεση</td></tr>').join('');
    page.innerHTML = [
      '<div class="bio-page">',
      '<header class="bio-heading"><div><p class="eyebrow">DST / ADMIN OPERATIONS</p>',
      '<h1>BioShield Admin Operations System</h1>',
      '<p>Ανακάλυψη αιτημάτων απολύμανσης, φιλτράρισμα και ελεγχόμενη διαβίβαση.</p>',
      '</div><span class="bio-stage">Προετοιμασία</span></header>',
      '<div class="bio-alert" role="status"><strong>Η παραγωγική βάση δεν έχει συνδεθεί</strong><p>',
      esc(data.message), '</p></div>',
      '<nav class="bio-tabs" aria-label="Ενότητες BioShield">',
      '<button type="button" data-bio-tab="overview" class="active" aria-pressed="true">Επισκόπηση</button>',
      '<button type="button" data-bio-tab="candidates" aria-pressed="false">Υποψήφιοι</button>',
      '<button type="button" data-bio-tab="sources" aria-pressed="false">Πηγές</button>',
      '<button type="button" data-bio-tab="runs" aria-pressed="false">Εκτελέσεις</button>',
      '<button type="button" data-bio-tab="privacy" aria-pressed="false">Επικοινωνία</button>',
      '</nav>',
      '<section data-bio-panel="overview"><div class="bio-metrics">',
      metric('Εντοπισμένες αναρτήσεις', data.metrics.discovered, esc),
      metric('Αναμονή αξιολόγησης', data.metrics.review_required, esc),
      metric('Επιλέξιμοι για επικοινωνία', data.metrics.outreach_eligible, esc),
      metric('Ολοκληρωμένες εκτελέσεις', data.metrics.completed_runs, esc),
      '</div><div class="bio-grid">',
      '<article class="bio-card"><h2>Συνδέσεις παρόχων</h2>',
      '<p>Firecrawl και TinyFish θα συνδεθούν με κανόνες πρόσβασης, όρια κόστους και τεκμηρίωση ανά πηγή.</p>',
      '<table class="bio-table"><thead><tr><th>Πάροχος</th><th>Κατάσταση</th><th>Λειτουργία</th></tr></thead><tbody>',
      providers, '</tbody></table></article>',
      '<article class="bio-card"><h2>Επόμενες εργασίες</h2><ol>',
      '<li>Επιβεβαίωση δικαιωμάτων admin</li><li>Έλεγχος Supabase &amp; APK/EXE</li>',
      '<li>Μητρώο επιτρεπόμενων πηγών</li><li>Πιλοτική αξιολόγηση αιτημάτων</li>',
      '</ol><p>Η εξέλιξη καταγράφεται στην ομάδα DST στο Linear.</p></article></div></section>',
      '<section data-bio-panel="candidates" hidden><h2>Υποψήφια αιτήματα</h2>',
      emptyView('Δεν έχει συνδεθεί ροή υποψηφίων', 'Δεν εμφανίζονται επινοημένα στοιχεία ή δείγματα ως πραγματικοί πελάτες.'), '</section>',
      '<section data-bio-panel="sources" hidden><h2>Μητρώο πηγών</h2>',
      emptyView('Αναμονή έγκρισης πηγών', 'Οι πηγές θα ελέγχονται πριν από κάθε ανάγνωση ή επεξεργασία.'), '</section>',
      '<section data-bio-panel="runs" hidden><h2>Ιστορικό εκτελέσεων</h2>',
      emptyView('Δεν εκτελείται αυτόματη αναζήτηση', 'Θα εμφανίζονται χρόνοι, αποτελέσματα, προβλήματα και credits.'), '</section>',
      '<section data-bio-panel="privacy" hidden><h2>Έλεγχος επικοινωνίας</h2>',
      '<p>Δημόσια δημοσίευση δεν ισοδυναμεί με συναίνεση τηλεφωνικής προώθησης. Απαιτούνται νομικός έλεγχος, ανθρώπινη έγκριση και μητρώο αντιρρήσεων.</p>',
      '<div class="bio-policy">Αυτόματη διαβίβαση στην τηλεφωνική ομάδα <strong>Απενεργοποιημένη</strong></div>',
      '<div class="bio-policy">Συλλογή τηλεφώνων από προφίλ <strong>Απενεργοποιημένη</strong></div>',
      '<div class="bio-policy">Αποθήκευση ολόκληρων posts <strong>Απενεργοποιημένη</strong></div></section>',
      '<footer class="bio-footer">Πιλοτική λειτουργία χωρίς πραγματικά προσωπικά δεδομένα. ',
      '<a href="https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a" rel="noopener noreferrer" target="_blank">Linear project</a></footer>',
      '</div>'
    ].join('');
    page.querySelectorAll('[data-bio-tab]').forEach(button => button.addEventListener('click', () => {
      const selected = button.dataset.bioTab;
      page.querySelectorAll('[data-bio-tab]').forEach(item => {
        const active = item.dataset.bioTab === selected;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      page.querySelectorAll('[data-bio-panel]').forEach(panel => {
        panel.hidden = panel.dataset.bioPanel !== selected;
      });
    }));
  } catch (error) {
    if (!page.isConnected) return;
    page.textContent = error?.status === 403 ? 'Απαιτείται πρόσβαση διαχειριστή BioShield.' : 'Η υπηρεσία BioShield δεν είναι διαθέσιμη.';
  }
}
