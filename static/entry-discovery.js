/** BIO-23: compare official TED notices with a prior successful visit on this browser.
 * This is a PUBLIC preview without sign-in. It tracks only official notice IDs,
 * never personal/contact data, and cannot imply a notice is an eligible lead.
 * Replace this local cursor with an RLS-protected per-user cursor AFTER real auth.
 */
export const ENTRY_DISCOVERY_STORAGE_KEY='bioshield:official-ted-observed:v1';
const MAX_IDS=250;
const TED_ID=/^TED-[0-9]{5,7}-20[0-9]{2}$/;

export function reconcileEntryDiscovery(report, storage){
  if(report?.status!=='ok'||!Array.isArray(report.notices)){
    return {status:'source_unavailable',newIds:[],checkedAt:null,previousCheck:null};
  }
  const current=[...new Set(report.notices
    .map(row=>row?.id)
    .filter(id=>typeof id==='string'&&TED_ID.test(id)))].slice(0,MAX_IDS);
  const checkedAt=typeof report.searched_at_utc==='string'?report.searched_at_utc:null;
  if(!storage){
    return {status:'storage_unavailable',newIds:[],checkedAt,previousCheck:null};
  }
  try{
    const raw=storage.getItem(ENTRY_DISCOVERY_STORAGE_KEY);
    // A missing/corrupt/old cursor is a baseline, NEVER an invented "new" count.
    let previous=null;
    try{previous=raw&&raw.length<20000?JSON.parse(raw):null;}
    catch{/* Corrupt local cursor: start a safe baseline, never infer new leads. */}
    const hasBaseline=previous?.version===1&&Array.isArray(previous.ids)&&
      previous.ids.every(id=>typeof id==='string'&&TED_ID.test(id))&&
      previous.ids.length<=MAX_IDS;
    const priorIds=hasBaseline?previous.ids:[];
    const prior=new Set(priorIds);
    const newIds=hasBaseline?current.filter(id=>!prior.has(id)):[];
    const merged=[...new Set([...current,...priorIds])].slice(0,MAX_IDS);
    storage.setItem(ENTRY_DISCOVERY_STORAGE_KEY,JSON.stringify({
      version:1,ids:merged,checkedAt
    }));
    return {status:hasBaseline?'compared':'baseline',newIds,checkedAt,
      previousCheck:hasBaseline&&typeof previous.checkedAt==='string'?previous.checkedAt:null};
  }catch{
    // Private mode / denied localStorage: neither persist nor assert new findings.
    return {status:'storage_unavailable',newIds:[],checkedAt,previousCheck:null};
  }
}
