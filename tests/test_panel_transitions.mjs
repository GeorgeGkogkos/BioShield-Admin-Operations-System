import test from 'node:test';
import assert from 'node:assert/strict';
import {installNavigation,ROUTES} from '../static/typed/navigation.js';

test('search and secondary system screens transition only mounted content panels',async()=>{
  const events=new Map();
  const screens=[],scrolls=[],animations=[];
  class FakeElement{
    constructor(screen){this.dataset={bioTab:screen};}
    closest(selector){return selector==='[data-bio-tab]'?this:null;}
  }
  function navHost(){
    return {
      handlers:new Map(),
      addEventListener(type,fn){this.handlers.set(type,fn);},
      removeEventListener(type,fn){this.handlers.delete(type);},
      contains(el){return el instanceof FakeElement;}
    };
  }
  const side=navHost(),bottom=navHost(),page=navHost();
  const panels=Object.fromEntries(Object.keys(ROUTES).map(screen=>[
    screen,{
      hidden:screen!=='discovery',
      animate(frames,options){
        let resolve,reject;
        const finished=new Promise((done,fail)=>{resolve=done;reject=fail;});
        const animation={frames,options,finished,cancelled:false,
          complete:()=>resolve(),
          cancel(){this.cancelled=true;reject(new Error('cancelled'));}
        };
        animations.push({screen,animation});
        return animation;
      }
    }
  ]));
  page.querySelector=selector=>{
    const match=selector.match(/^\[data-bio-panel="([^"]+)"\]$/);
    return match?panels[match[1]]:{setAttribute(){}};
  };
  const location={pathname:ROUTES.discovery,search:''};
  const history={
    scrollRestoration:'auto',
    pushState(_state,_title,url){location.pathname=url;}
  };
  globalThis.Element=FakeElement;
  globalThis.document={
    documentElement:{dataset:{}},
    title:'',
    getElementById(id){return id==='bio-shell-nav'?side:id==='bio-bottom-nav'?bottom:null;}
  };
  globalThis.window={
    location,history,matchMedia:()=>({matches:false}),
    scrollTo(...args){scrolls.push(args);},
    addEventListener(type,fn){events.set(type,fn);},
    removeEventListener(type){events.delete(type);}
  };
  const cleanup=installNavigation(page,screen=>{
    screens.push(screen);
    Object.entries(panels).forEach(([name,panel])=>panel.hidden=name!==screen);
  });
  const click=(host,screen)=>{
    const event={
      target:new FakeElement(screen),defaultPrevented:false,button:0,
      metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,
      preventDefault(){this.defaultPrevented=true;}
    };
    host.handlers.get('click')(event);
    assert.equal(event.defaultPrevented,true);
  };

  click(side,'sources');
  assert.equal(location.pathname,ROUTES.sources);
  assert.deepEqual(screens,['discovery'],'search remains during fade-out');
  assert.equal(animations.length,1);
  assert.equal(animations[0].screen,'discovery');
  assert.equal(animations[0].animation.options.duration,145);
  assert.deepEqual(animations[0].animation.frames[1],{opacity:0,transform:'translateY(-6px)'});
  animations[0].animation.complete();
  await Promise.resolve();
  assert.equal(screens.at(-1),'sources');
  assert.equal(panels.discovery.hidden,true);
  assert.equal(panels.sources.hidden,false);
  assert.deepEqual(scrolls,[[0,0]]);

  click(side,'status');
  assert.equal(animations.length,2);
  click(bottom,'discovery');
  assert.equal(animations.length,3);
  assert.equal(animations[1].animation.cancelled,true);
  animations[1].animation.complete();
  await Promise.resolve();
  assert.equal(screens.at(-1),'sources','cancelled transition must not render stale status');
  animations[2].animation.complete();
  await Promise.resolve();
  assert.equal(screens.at(-1),'discovery');
  assert.equal(location.pathname,ROUTES.discovery);

  window.matchMedia=()=>({matches:true});
  click(side,'sources');
  assert.equal(screens.at(-1),'sources','reduced-motion uses immediate update');
  assert.equal(animations.length,3);
  click(side,'overview');
  assert.equal(screens.at(-1),'discovery','legacy overview falls through to search');
  assert.equal(animations.length,3);
  cleanup();
  assert.equal(events.has('popstate'),false);
});
