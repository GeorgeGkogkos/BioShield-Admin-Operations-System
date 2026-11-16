/** BIO-19: typed public research playbook UI, never an actual social crawler. */
export interface KeywordGroup {
  label: string;
  terms: string[];
}
export interface ResearchSource {
  id: string; name: string; url: string; status: string; use: string;
}
export interface ResearchCatalog {
  version: string;
  basis: string;
  keyword_groups: Record<string, KeywordGroup>;
  candidate_sources: ResearchSource[];
  examples: Array<{platform:string;query:string}>;
  excluded_discussion_domains: string[];
  ad_signals: string[];
  publication_recency: {default_days:number;buckets:Array<{age:string;rank:string}>};
  automated_private_social_discovery_enabled: boolean;
  note: string;
}
const searchNormalize=(v:string):string=>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR');

export function researchMarkup(catalog: ResearchCatalog|null,
                               escape:(v:unknown)=>string): string {
  if(!catalog)return '<p role="status" class="bio-note">Δεν είναι διαθέσιμο το λεξιλόγιο αναζήτησης. Δεν θα δημιουργηθούν υποθετικά ευρήματα.</p>';
  const groups=Object.entries(catalog.keyword_groups);
  const count=groups.reduce((sum,[,v])=>sum+v.terms.length,0);
  return [
    '<section class="bio-research-section" aria-labelledby="bio-keywords-title">',
    '<div class="bio-lab-top"><div><p class="eyebrow">SEARCH RESEARCH / SOURCE PLAYBOOK</p>',
    '<h2 id="bio-keywords-title">Λέξεις κλειδιά & προτεινόμενοι πάροχοι</h2>',
    '<p class="bio-muted">Λεξιλόγιο από το PDF Perplexity (σελίδες 13–19), <strong>όχι ανακαλυφθέντα αιτήματα</strong>. ',
    'Οι πάροχοι που ακολουθούν δεν έχουν αυτομάτως άδεια συλλογής ή ζωντανή σύνδεση.</p></div>',
    '<span class="bio-test-badge">',escape(count),' όροι έρευνας</span></div>',
    '<div class="bio-research-rules">',
    '<article><strong>7 ημέρες</strong><span>Προεπιλεγμένη ηλικία δημοσίευσης</span></article>',
    '<article><strong>Αττική</strong><span>Επιβεβαιωμένη περιοχή στην κύρια λίστα</span></article>',
    '<article><strong>2 είδη ένδειξης</strong><span>Ζητά επαγγελματία / περιγράφει πρόβλημα</span></article>',
    '<article><strong>0 επαφές</strong><span>Καμία αυτόματη επικοινωνία ή εισαγωγή ιδιωτών</span></article>',
    '</div>',
    '<div class="bio-search-controls"><label for="bio-keyword-find">Αναζήτηση στο λεξιλόγιο</label>',
    '<input id="bio-keyword-find" type="search" placeholder="π.χ. κοριοί, Περιστέρι, προσφορά" autocomplete="off">',
    '<label for="bio-keyword-group">Κατηγορία</label><select id="bio-keyword-group">',
    '<option value="all">Όλες οι κατηγορίες</option>',
    ...groups.map(([key,g])=>'<option value="'+escape(key)+'">'+escape(g.label)+'</option>'),
    '</select><span id="bio-keyword-count" aria-live="polite"></span></div>',
    '<div class="bio-keyword-groups">',
    ...groups.map(([key,g])=>
      '<article class="bio-keyword-group" data-keyword-group="'+escape(key)+'">'+
      '<h3>'+escape(g.label)+' <small>('+escape(g.terms.length)+')</small></h3>'+
      '<div class="bio-keyword-tags">'+g.terms.map(term=>
        '<span class="bio-keyword-tag" data-keyword-term data-keyword-normalized="'+
        escape(searchNormalize(term))+'">'+escape(term)+'</span>').join('')+
      '</div></article>'),
    '</div>',
    '<h3>Υποδείγματα ερωτημάτων — όχι αυτόματες αναζητήσεις</h3>',
    '<p class="bio-note">Τα παρακάτω είναι έτοιμες φράσεις για χειροκίνητη έρευνα. ',
    'Μια ημερομηνία ευρετηρίου δεν επιβεβαιώνει την ημερομηνία του ίδιου του ποστ.</p>',
    '<div class="bio-query-list">',
    ...catalog.examples.map(x=>
      '<div class="bio-query-row"><span>'+escape(x.platform)+'</span><code>'+
      escape(x.query)+'</code><button type="button" data-bio-copy-query="'+
      escape(x.query)+'">Αντιγραφή</button></div>'),
    '</div>',
    '<h3>Προτεινόμενες κοινότητες και μηχανισμοί έρευνας</h3>',
    '<div class="bio-source-grid">',
    ...catalog.candidate_sources.map(p=>
      '<article class="bio-source-card"><strong>'+escape(p.name)+'</strong>'+
      '<p>'+escape(p.use)+'</p><small>'+escape(p.status)+'</small>'+
      '<a href="'+escape(p.url)+'" target="_blank" rel="noopener noreferrer">Αρχική πηγή</a></article>'),
    '</div>',
    '<h3>Κριτήρια αξιολόγησης</h3>',
    '<p class="bio-note">Οι δημοσιεύσεις με ηλικία έως 7 ημερών απαιτούν <strong>επαληθευμένη αρχική ημερομηνία</strong>, ',
    'γεωγραφική συνάφεια Αττικής και ανθρώπινο έλεγχο. Η ημερομηνία τελευταίας απάντησης ',
    'δεν ανανεώνει την ηλικία παλιάς αρχικής ανάρτησης.</p>',
    '<div class="bio-research-rules">',
    ...catalog.publication_recency.buckets.map(b=>
      '<article><strong>'+escape(b.age)+'</strong><span>'+escape(b.rank)+'</span></article>'),
    '</div>',
    '<p class="bio-note"><strong>Αποκλεισμοί μεσαζόντων για αυτήν την έρευνα:</strong> '+
      catalog.excluded_discussion_domains.map(escape).join(' · ')+'</p>',
    '<p class="bio-note"><strong>Ενδείξεις διαφήμισης — προς υποβάθμιση, όχι τυφλή διαγραφή:</strong> '+
      catalog.ad_signals.map(escape).join(' · ')+'</p>',
    '<p class="bio-note">Η αυτόματη εμπορική συλλογή από Reddit, Meta, TikTok και X ',
    'δεν ενεργοποιείται χωρίς τις αντίστοιχες εγκρίσεις και πρωτογενή τεκμηρίωση.</p>',
    '</section>',
  ].join('');
}

export function setupResearchPlaybook(root: HTMLElement): () => void {
  const query=root.querySelector<HTMLInputElement>('#bio-keyword-find');
  const group=root.querySelector<HTMLSelectElement>('#bio-keyword-group');
  const count=root.querySelector<HTMLElement>('#bio-keyword-count');
  if(!query||!group||!count)return ()=>{};
  const apply=():void=>{
    const term=searchNormalize(query.value.trim());
    const selected=group.value;
    let visible=0;
    root.querySelectorAll<HTMLElement>('[data-keyword-group]').forEach(section=>{
      const groupMatch=selected==='all'||selected===section.dataset.keywordGroup;
      let hits=0;
      section.querySelectorAll<HTMLElement>('[data-keyword-term]').forEach(tag=>{
        const show=groupMatch&&(!term||tag.dataset.keywordNormalized?.includes(term)===true);
        tag.hidden=!show;
        if(show)hits++;
      });
      section.hidden=hits===0;
      visible+=hits;
    });
    count.textContent=visible+' όροι';
  };
  const copy=async(event:MouseEvent):Promise<void>=>{
    const el=event.target;
    if(!(el instanceof Element))return;
    const btn=el.closest<HTMLButtonElement>('[data-bio-copy-query]');
    if(!btn || !root.contains(btn))return;
    const value=btn.dataset.bioCopyQuery;
    if(!value)return;
    try{
      await navigator.clipboard.writeText(value);
      btn.textContent='Αντιγράφηκε';
    }catch{
      btn.textContent='Αντιγραφή μη διαθέσιμη';
    }
  };
  query.addEventListener('input',apply);
  group.addEventListener('change',apply);
  root.addEventListener('click',copy);
  apply();
  return ()=>{
    query.removeEventListener('input',apply);
    group.removeEventListener('change',apply);
    root.removeEventListener('click',copy);
  };
}
