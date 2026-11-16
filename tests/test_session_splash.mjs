import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const code=readFileSync(new URL('../static/splash-init.js',import.meta.url),'utf8');

function boot({seen=false,type='navigate',theme=null,storageBlocked=false,oldTiming=false}={}){
  const values=new Map(seen?[['bioshield-splash-seen','1']]:[]);
  const dataset={};
  const window={};
  const storage={
    getItem:key=>{
      if(storageBlocked)throw new Error('Storage disabled');
      return values.get(key)??null;
    },
    setItem:(key,value)=>{
      if(storageBlocked)throw new Error('Storage disabled');
      values.set(key,value);
    }
  };
  const context={
    window,
    document:{documentElement:{dataset}},
    sessionStorage:storage,
    localStorage:{getItem:()=>theme},
    performance:{
      now:()=>127,
      getEntriesByType:()=>oldTiming?[]:[{type}],
      navigation:{type:type==='reload'?1:0}
    }
  };
  vm.runInNewContext(code,context);
  return {dataset,window,values};
}

test('first navigation in a fresh browser session displays the logo splash',()=>{
  const result=boot();
  assert.equal(result.dataset.bioSplash,'show');
  assert.equal(result.values.get('bioshield-splash-seen'),'1');
  assert.equal(result.window.__bioSplashStartedAt,127);
});

test('normal subsequent page opening in the same session skips the splash',()=>{
  const result=boot({seen:true,type:'navigate'});
  assert.equal(result.dataset.bioSplash,undefined);
  assert.equal(result.window.__bioSplashStartedAt,undefined);
});

test('explicit browser refresh displays the logo even in an existing session',()=>{
  const result=boot({seen:true,type:'reload'});
  assert.equal(result.dataset.bioSplash,'show');
});

test('legacy navigation timing still recognizes refresh',()=>{
  const result=boot({seen:true,type:'reload',oldTiming:true});
  assert.equal(result.dataset.bioSplash,'show');
});

test('storage access restrictions fail open instead of losing the company logo',()=>{
  const result=boot({storageBlocked:true});
  assert.equal(result.dataset.bioSplash,'show');
});

test('saved dark theme is applied before the splash can paint',()=>{
  const result=boot({theme:'dark'});
  assert.equal(result.dataset.theme,'dark');
});

test('SPA route changes cannot re-run the boot script without a document navigation',()=>{
  const result=boot({seen:true,type:'navigate'});
  assert.equal(result.dataset.bioSplash,undefined);
});
