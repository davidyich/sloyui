import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './overlay-context.css';

const kinds = ['Menu','Popover','Select','ComboBox','MultiSelect','ColorPicker','DatePicker','Tooltip','Tooltip inverse','Dialog','Drawer','BottomSheet','CommandPalette','HoverPanel','NavigationMenu','InlineComments','Nested Select'] as const;
type Kind = typeof kinds[number];
type Mode = { theme:'light'|'dark'; radius:'compact'|'default'|'rounded'; borders:'off'|'on' };
type NodeSample = { path:string; classes:string; radius:string; borders:{width:string;color:string;alpha:number}[]; attrs:Record<string,string|null>; rect:{width:number;height:number}; background:string; foreground:string; outline:string };
type Profile = { mode:Mode; panels:{selector:string;nodes:NodeSample[]}[] };
const noop = () => {}, frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const settle = async () => { await Promise.resolve(); await frame(); await frame(); };
const options = [{value:'one',label:'First option'},{value:'two',label:'Second option',description:'Additional context'}];
const selectors:Record<Kind,string[]> = {
  Menu:['.cap-menu-v2'],Popover:['.cap-popover-v2'],Select:['.cap-select-popup'],ComboBox:['.cap-combobox-popup'],MultiSelect:['.cap-multiselect-popup'],ColorPicker:['.cap-color-popup'],DatePicker:['.cap-popover-v2'],Tooltip:['.cap-tooltip-v2'],'Tooltip inverse':['.cap-tooltip-v2'],Dialog:['.cap-dialog'],Drawer:['.cap-drawer'],BottomSheet:['.cap-bottom-sheet'],CommandPalette:['.cap-command'],HoverPanel:['.cap-hover-panel-content'],NavigationMenu:['.cap-navigation-panel'],InlineComments:['.cap-inline-thread'],'Nested Select':['.cap-popover-v2','.cap-select-popup'],
};
function ComponentFixture({kind}:{kind:Kind}) {
  const [open,setOpen] = useState(false);
  const inner = <><UI.Input label="Popup field" placeholder="Keep focus here"/><UI.Button onClick={noop}>Popup action</UI.Button></>;
  switch(kind) {
    case 'Menu': return <UI.Menu label="Open Menu" items={[{id:'copy',label:'Copy',icon:'copy',onSelect:noop},{id:'archive',label:'Archive',onSelect:noop}]}/>;
    case 'Popover': return <UI.Popover label="Open Popover" triggerIcon="filter">{inner}</UI.Popover>;
    case 'Select': return <UI.Select label="Open Select" options={options} defaultValue="one"/>;
    case 'ComboBox': return <UI.ComboBox label="Open ComboBox" options={options}/>;
    case 'MultiSelect': return <UI.MultiSelect label="Open MultiSelect" options={options}/>;
    case 'ColorPicker': return <UI.ColorPicker label="Open ColorPicker" defaultValue="rgba(40,120,190,.8)" showRecent/>;
    case 'DatePicker': return <UI.DatePicker label="Open DatePicker" today="2026-10-07" value="2026-10-07" onValueChange={noop}/>;
    case 'Tooltip': case 'Tooltip inverse': return <UI.Tooltip content="Live tooltip" caption="Local context" description="The open surface must update." variant={kind==='Tooltip'?'default':'inverse'} arrow><UI.IconButton label={`Open ${kind}`} icon="info"/></UI.Tooltip>;
    case 'Dialog': case 'Drawer': case 'BottomSheet': case 'CommandPalette': return <><UI.Button onClick={()=>setOpen(true)}>Open {kind}</UI.Button>{kind==='Dialog'?<UI.Dialog open={open} onOpenChange={setOpen} title="Audit Dialog">{inner}</UI.Dialog>:kind==='Drawer'?<UI.Drawer open={open} onOpenChange={setOpen} title="Audit Drawer">{inner}</UI.Drawer>:kind==='BottomSheet'?<UI.BottomSheet open={open} onOpenChange={setOpen} title="Audit BottomSheet">{inner}</UI.BottomSheet>:<UI.CommandPalette open={open} onOpenChange={setOpen} items={[{id:'copy',label:'Copy',onSelect:noop},{id:'archive',label:'Archive',onSelect:noop}]}/>}</>;
    case 'HoverPanel': return <UI.HoverPanel label="Audit HoverPanel" summary="Open HoverPanel">{inner}</UI.HoverPanel>;
    case 'NavigationMenu': return <UI.NavigationMenu label="Audit navigation" items={[{id:'audit',label:'Open NavigationMenu',content:inner}]}/>;
    case 'InlineComments': return <UI.InlineComments currentUser={{id:'me',name:'Reviewer'}} defaultAnchors={[{id:'audit',x:.5,y:.5,title:'Audit thread',comments:[]}]}><div className="overlay-audit-inline">Open the numbered comment pin.</div></UI.InlineComments>;
    case 'Nested Select': return <UI.Popover label="Open Nested Select" triggerIcon="filter"><div data-color="teal"><UI.Select label="Nested select" options={options} defaultValue="one"/></div></UI.Popover>;
  }
}
function visible(element:Element) {
  const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
  return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&!element.closest('[inert],[aria-hidden="true"],[data-state="closed"]');
}
function alpha(color:string) {
  if(color==='transparent')return 0;
  const slash=color.match(/\/\s*([\d.]+)(%)?\s*\)/),rgba=color.match(/^rgba\([^)]*,\s*([\d.]+)\)$/);
  return slash?Number(slash[1])/(slash[2]?100:1):rgba?Number(rgba[1]):1;
}
function sample(panel:HTMLElement):NodeSample[] {
  return [panel,...panel.querySelectorAll<HTMLElement>('[class*="cap-"]')].filter(visible).map(element=>{
    const style=getComputedStyle(element),rect=element.getBoundingClientRect(),parts:string[]=[];
    for(let current:Element|null=element;current&&current!==panel;current=current.parentElement)parts.unshift(`${current.tagName.toLowerCase()}:${Array.from(current.parentElement!.children).indexOf(current)}`);
    const attrs=Object.fromEntries(['theme','radius','borders','accent','color','shadow','surface'].map(axis=>[`data-${axis}`,element.closest(`[data-${axis}]`)?.getAttribute(`data-${axis}`)??null]));
    return {path:parts.join('/')||'surface',classes:element.getAttribute('class')??'',radius:style.borderRadius,borders:['Top','Right','Bottom','Left'].map(side=>{const width=style.getPropertyValue(`border-${side.toLowerCase()}-width`),color=style.getPropertyValue(`border-${side.toLowerCase()}-color`);return {width,color,alpha:alpha(color)};}),attrs,rect:{width:rect.width,height:rect.height},background:style.backgroundColor,foreground:style.color,outline:`${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`};
  });
}
function panelFor(selector:string) { return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(element=>!element.classList.contains('overlay-audit-control-popup')&&visible(element)); }
function check(kind:Kind,profiles:Profile[]) {
  const assertions:{name:string;pass:boolean;details?:unknown}[]=[];
  for(const profile of profiles)for(const [index,panel] of profile.panels.entries()) {
    const main=panel.nodes[0], attrs=main?.attrs;
    const expectedColor=kind==='Nested Select'&&index===1?'teal':'blue';
    assertions.push({name:`${profile.mode.theme}/${profile.mode.radius}/${profile.mode.borders}/${panel.selector}: live scope`,pass:!!attrs&&attrs['data-theme']===profile.mode.theme&&attrs['data-radius']===profile.mode.radius&&attrs['data-borders']===profile.mode.borders&&attrs['data-color']===expectedColor&&attrs['data-shadow']==='compact'&&attrs['data-surface']==='floating',details:attrs});
    const painted=main?.borders.some(border=>parseFloat(border.width)>0&&border.alpha>.01)??false;
    assertions.push({name:`${profile.mode.theme}/${profile.mode.radius}/${profile.mode.borders}/${panel.selector}: decorative border`,pass:!!main&&painted===(profile.mode.borders==='on'),details:main?.borders});
  }
  for(const theme of ['light','dark'])for(const selector of selectors[kind]) {
    const radii=['compact','default','rounded'].map(radius=>parseFloat(profiles.find(profile=>profile.mode.theme===theme&&profile.mode.radius===radius&&profile.mode.borders==='off')?.panels.find(panel=>panel.selector===selector)?.nodes[0]?.radius??'NaN'));
    assertions.push({name:`${theme}/${selector}: radius increases compact < default < rounded`,pass:radii.every(Number.isFinite)&&radii[0]<radii[1]&&radii[1]<radii[2],details:radii});
    const light=profiles.find(profile=>profile.mode.theme==='light'&&profile.mode.radius==='default'&&profile.mode.borders==='off')?.panels.find(panel=>panel.selector===selector)?.nodes[0];
    const dark=profiles.find(profile=>profile.mode.theme==='dark'&&profile.mode.radius==='default'&&profile.mode.borders==='off')?.panels.find(panel=>panel.selector===selector)?.nodes[0];
    if(theme==='light')assertions.push({name:`${selector}: live theme changes paint`,pass:!!light&&!!dark&&(light.background!==dark.background||light.foreground!==dark.foreground)});
  }
  return {passed:assertions.every(assertion=>assertion.pass),assertions,failures:assertions.filter(assertion=>!assertion.pass)};
}

function Fixture() {
  const [kind,setKind]=useState<Kind>('Menu'),[epoch,setEpoch]=useState(0),[mounted,setMounted]=useState(true),[running,setRunning]=useState(false),[status,setStatus]=useState('Ready'),[result,setResult]=useState('');
  const [mode,setMode]=useState<Mode>({theme:'light',radius:'default',borders:'off'}),scope=useRef<HTMLDivElement>(null),anchor=useRef<HTMLDivElement>(null),landing=useRef<HTMLHeadingElement>(null),resultDisclosure=useRef<HTMLDetailsElement>(null);
  const activePanels=()=>Array.from(new Set(Object.values(selectors).flat())).flatMap(selector=>Array.from(document.querySelectorAll<HTMLElement>(selector))).filter(element=>!element.classList.contains('overlay-audit-control-popup')&&visible(element));
  async function clearFixture(expectedOverflow?:string) {
    const lifecycleErrors:string[]=[];
    // Escape exercises the ordinary dismissal path, including nested child-first layers.
    for(let attempt=0;attempt<4&&activePanels().length;attempt++) {
      (document.activeElement??document).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      await settle();
    }
    await new Promise<void>(resolve=>setTimeout(resolve,220));await settle();
    if(activePanels().length)lifecycleErrors.push(`Escape left active panels: ${activePanels().map(panel=>panel.className).join(', ')}`);
    if(document.getElementById('root')?.inert)lifecycleErrors.push('Modal dismissal left the fixture root inert');
    flushSync(()=>setMounted(false));await settle();
    if(activePanels().length)lifecycleErrors.push(`Unmount left active panels: ${activePanels().map(panel=>panel.className).join(', ')}`);
    if(document.getElementById('root')?.inert)lifecycleErrors.push('Modal unmount left the fixture root inert');
    if(expectedOverflow!==undefined&&document.body.style.overflow!==expectedOverflow)lifecycleErrors.push(`Scroll lock was not restored: expected ${expectedOverflow||'(empty)'}, found ${document.body.style.overflow}`);
    if(!lifecycleErrors.length)landing.current?.focus({preventScroll:true});
    await settle();return lifecycleErrors;
  }
  function apply(next:Mode) {
    for(const [axis,value] of Object.entries(next))scope.current!.setAttribute(`data-${axis}`,value);
    document.documentElement.dataset.theme=next.theme==='light'?'dark':'light';
    document.documentElement.dataset.radius=next.radius==='rounded'?'compact':'rounded';
    document.documentElement.dataset.borders=next.borders==='on'?'off':'on';
  }
  async function open(current:Kind) {
    const trigger=current==='InlineComments'?anchor.current?.querySelector<HTMLElement>('.cap-inline-pin'):anchor.current?.querySelector<HTMLElement>('[role="combobox"],button');
    if(!trigger)throw new Error(`Missing public trigger for ${current}`);
    if(current==='Tooltip'||current==='Tooltip inverse'||current==='HoverPanel'||current==='ComboBox'||current==='MultiSelect')trigger.focus();
    trigger.click();await settle();
    if(current==='Nested Select') { const child=panelFor('.cap-popover-v2')?.querySelector<HTMLElement>('[aria-label="Nested select"]')??panelFor('.cap-popover-v2')?.querySelector<HTMLElement>('[role="combobox"]');if(!child)throw new Error('Missing nested trigger');child.click();await settle(); }
    for(const selector of selectors[current])if(!panelFor(selector))throw new Error(`Public trigger did not open ${selector}`);
  }
  async function run(all:boolean) {
    setRunning(true);setResult('');if(resultDisclosure.current)resultDisclosure.current.open=false;
    const results:unknown[]=[],uncovered:string[]=[];let configurations=0,stopped=false;
    const publish=(complete:boolean)=>setResult(JSON.stringify({date:new Date().toISOString(),complete,viewport:{width:innerWidth,height:innerHeight},configurations,scope:'Open public overlays; radius/borders/theme changed after opening; root uses opposite modes; nearest color/shadow live on a separate wrapper.',uncovered,notCovered:['Exit animation visual correctness','Focus trap correctness','Internal ColorPicker format popup','DatePicker year/schedule nested popups','InlineComments reaction/mention popups','All overlay size/placement variants'],results},null,2));
    try {
      for(const current of all?kinds:[kind]) {
        flushSync(()=>setStatus(`Closing previous fixture before ${current}`));const previousErrors=await clearFixture();
        if(previousErrors.length){results.push({kind:current,passed:false,lifecycleErrors:previousErrors});uncovered.push(current);publish(false);throw new Error('Previous overlay did not close cleanly');}
        apply({theme:'light',radius:'default',borders:'off'});
        flushSync(()=>{setKind(current);setEpoch(value=>value+1);setMounted(true);setStatus(`Opening ${current}`);});await settle();
        const baselineOverflow=document.body.style.overflow;
        try {
          await open(current);const profiles:Profile[]=[];
          for(const theme of ['light','dark'] as const)for(const radius of ['compact','default','rounded'] as const)for(const borders of ['off','on'] as const) {
            const next={theme,radius,borders};apply(next);setStatus(`${current} · ${theme} / ${radius} / ${borders}`);await settle();
            profiles.push({mode:next,panels:selectors[current].map(selector=>{const panel=panelFor(selector);return {selector,nodes:panel?sample(panel):[]};})});
            configurations++;
          }
          flushSync(()=>setStatus(`Closing ${current}`));const lifecycleErrors=await clearFixture(baselineOverflow),checked=check(current,profiles);
          results.push({kind:current,...checked,passed:checked.passed&&!lifecycleErrors.length,lifecycleErrors,profiles});
          publish(false);if(lifecycleErrors.length){uncovered.push(current);stopped=true;break;}
        } catch(error) {uncovered.push(current);results.push({kind:current,passed:false,error:String(error)});}
      }
      publish(!stopped);setStatus(`${stopped?'Stopped after lifecycle failure':'Complete'} · ${results.length} results · ${uncovered.length} incomplete fixtures`);
    } catch(error) {results.push({phase:'run',passed:false,error:String(error)});publish(false);setStatus('Failed');}
    finally {await clearFixture();apply(mode);setRunning(false);if(resultDisclosure.current)resultDisclosure.current.open=false;flushSync(()=>{setEpoch(value=>value+1);setMounted(true);});}
  }
  const chooseMode=(next:Mode)=>{setMode(next);apply(next);};
  return <main className="overlay-audit"><h1 ref={landing} tabIndex={-1}>Live overlay context audit</h1><p>The audit changes local modes while each fixture stays open. Controls prepare individual previews. The HTML root intentionally uses different modes.</p>
    <section className="overlay-audit-controls" data-surface="raised">
      <UI.Select label="Fixture" popupClassName="overlay-audit-control-popup" disabled={running} value={kind} onValueChange={value=>{setKind(value as Kind);setEpoch(value=>value+1);}} options={kinds.map(value=>({value,label:value}))}/>
      <UI.Select label="Local theme" popupClassName="overlay-audit-control-popup" disabled={running} value={mode.theme} onValueChange={value=>chooseMode({...mode,theme:value as Mode['theme']})} options={['light','dark'].map(value=>({value,label:value}))}/>
      <UI.Select label="Local radius" popupClassName="overlay-audit-control-popup" disabled={running} value={mode.radius} onValueChange={value=>chooseMode({...mode,radius:value as Mode['radius']})} options={['compact','default','rounded'].map(value=>({value,label:value}))}/>
      <UI.Select label="Local borders" popupClassName="overlay-audit-control-popup" disabled={running} value={mode.borders} onValueChange={value=>chooseMode({...mode,borders:value as Mode['borders']})} options={['off','on'].map(value=>({value,label:value}))}/>
      <UI.Button disabled={running} onClick={()=>void run(true)}>Run overlay contexts</UI.Button><UI.Button disabled={running} onClick={()=>void run(false)}>Run selected fixture</UI.Button>
    </section>
    <div ref={scope} className="overlay-audit-scope" data-theme={mode.theme} data-radius={mode.radius} data-borders={mode.borders} data-accent="rose" data-shadow="soft" data-surface="canvas"><div>Local mode scope · outer accent rose / shadow soft; trigger scope color blue / shadow compact.</div><div ref={anchor} className="overlay-audit-anchor" data-color="blue" data-shadow="compact">{mounted&&<ComponentFixture key={`${kind}:${epoch}`} kind={kind}/>}</div></div>
    <output id="overlay-context-status" className="overlay-audit-status" aria-live="polite">{status}</output><details ref={resultDisclosure}><summary>Results (JSON)</summary><pre id="overlay-context-result" data-surface="raised">{result||'Run the audit to collect computed styles and assertions.'}</pre></details>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
