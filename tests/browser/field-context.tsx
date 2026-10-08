import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './field-context.css';

const families=['Input','Textarea','Select','FloatingField','NumberField','Checkbox','Radio','Switch','Slider'] as const;
type Family=typeof families[number];
type Mode={theme:'light'|'dark';radius:'compact'|'default'|'rounded';borders:'off'|'on'};
type Axes={'data-theme':Mode['theme'];'data-radius':Mode['radius'];'data-borders':Mode['borders'];'data-surface':'canvas'|'base';'data-accent':'purple'|'orange';'data-color':'purple'|'orange';'data-shadow':'compact'|'soft'};
type Paint={radius:string;fg:string;bg:string;border:string;outline:string};
type Failure={mode:Mode;family:Family;target:string;phase:'normal'|'error'|'focus'|'transition';actual:unknown;expected:unknown};
type Profile={mode:Mode;family:Family;paint:Paint;reference:Paint};
const noop=()=>{},frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const settle=async()=>{await frame();await frame();};
const modes:Mode[]=(['light','dark'] as const).flatMap(theme=>(['compact','default','rounded'] as const).flatMap(radius=>(['off','on'] as const).map(borders=>({theme,radius,borders}))));
const ownAxes=(mode:Mode):Axes=>({'data-theme':mode.theme,'data-radius':mode.radius,'data-borders':mode.borders,'data-surface':'canvas','data-accent':'purple','data-color':'purple','data-shadow':'compact'});
const parentAxes=(mode:Mode):Axes=>({'data-theme':mode.theme==='light'?'dark':'light','data-radius':mode.radius==='compact'?'rounded':'compact','data-borders':mode.borders==='off'?'on':'off','data-surface':'base','data-accent':'orange','data-color':'orange','data-shadow':'soft'});
const rectangular=new Set<Family>(['Input','Textarea','Select','FloatingField','NumberField','Checkbox']);
const decorative=new Set<Family>(['Input','Textarea','Select','FloatingField','NumberField']);
const targets:Record<Family,string[]>={
  Input:['.cap-input','.cap-labeled-control > label','.cap-field-leading'],
  Textarea:['.cap-textarea','.cap-labeled-control > label'],
  Select:['.cap-select-trigger','.cap-labeled-control > label'],
  FloatingField:['.cap-input','.cap-labeled-control > label'],
  NumberField:['.cap-number-field','.cap-selection-label','.cap-number-field input'],
  Checkbox:['.cap-checkbox','.cap-check-label'],Radio:['.cap-radio','.cap-check-label'],
  Switch:['.cap-switch','.cap-switch-label'],Slider:['.cap-slider-thumb','.cap-slider-rail','.cap-slider-heading label'],
};
const focusTargets:Record<Family,string>={Input:'.cap-input',Textarea:'.cap-textarea',Select:'.cap-select-trigger',FloatingField:'.cap-input',NumberField:'.cap-number-field',Checkbox:'.cap-checkbox',Radio:'.cap-radio',Switch:'.cap-switch',Slider:'.cap-slider-thumb'};
function Fields({family,axes,error=false,reference=false}:{family:Family;axes?:Axes;error?:boolean;reference?:boolean}) {
  const context=axes??{}, label=`${family} local`, message=error?'Meaningful error':undefined;
  switch(family) {
    case 'Input':return <UI.Input {...context} label={label} labelPlacement="inside" leading={<UI.Icon name="search" size={16}/>} defaultValue="Direct context" error={message}/>;
    case 'Textarea':return <UI.Textarea {...context} label={label} labelPlacement="inside" size="xs" defaultValue="Native textarea and its label share one context." error={message}/>;
    case 'Select':return <UI.Select {...context} label={label} labelPlacement="inside" error={message} options={[{value:'one',label:'First option'},{value:'two',label:'Second option'}]}/>;
    case 'FloatingField':return <UI.FloatingField {...context} label={label} defaultValue="Floating label" error={message}/>;
    case 'NumberField':return <UI.NumberField {...context} label={label} defaultValue={42} error={message}/>;
    case 'Checkbox':return <UI.Checkbox {...context} label={label} defaultChecked/>;
    case 'Radio':return <UI.Radio {...context} label={label} name={`context-${reference?'reference':'own'}`} defaultChecked/>;
    case 'Switch':return <UI.Switch {...context} label={label} defaultChecked/>;
    case 'Slider':return <UI.Slider {...context} label={label} defaultValue={42}/>;
  }
}
function paint(element:Element):Paint {
  const style=getComputedStyle(element);
  const paintedForeground=!!element.textContent?.trim()||!!element.querySelector('svg')||element.matches('.cap-checkbox,.cap-radio,input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea');
  const paintedBorder=!['none','hidden'].includes(style.borderTopStyle)&&visibleLine(style.borderTopWidth,style.borderTopColor);
  const paintedOutline=!['none','hidden'].includes(style.outlineStyle)&&visibleLine(style.outlineWidth,style.outlineColor);
  return {radius:style.borderRadius,fg:paintedForeground?style.color:'',bg:style.backgroundColor,border:paintedBorder?[style.borderTopWidth,style.borderTopStyle,style.borderTopColor].join(' '):'none',outline:paintedOutline?[style.outlineWidth,style.outlineStyle,style.outlineColor,style.outlineOffset].join(' '):'none'};
}
function visibleLine(width:string,color:string) {
  return parseFloat(width)>0&&color!=='transparent'&&!/(?:\/\s*0(?:\.0+)?\s*\)|rgba\([^)]*,\s*0(?:\.0+)?\s*\))/.test(color);
}
function Fixture() {
  const [mode,setMode]=useState<Mode>({theme:'light',radius:'default',borders:'off'}),[error,setError]=useState(false),[running,setRunning]=useState(false),[status,setStatus]=useState('Ready'),[result,setResult]=useState('');
  const root=useRef<HTMLDivElement>(null);
  const lane=(family:Family,kind:'own'|'reference')=>root.current!.querySelector<HTMLElement>(`[data-family="${family}"] .field-context-${kind}`)!;
  const get=(family:Family,kind:'own'|'reference',selector:string)=>{
    const element=lane(family,kind).querySelector<HTMLElement>(selector);
    if(!element)throw Error(`Missing ${family}/${kind}/${selector}`);
    return element;
  };
  async function run() {
    setRunning(true);setResult('');
    const failures:Failure[]=[],profiles:Profile[]=[],focus:{family:Family;mode:Mode;visible:boolean;outline:string}[]=[];
    let comparisons=0,errorChecks=0;
    try {
      for(const current of modes) {
        flushSync(()=>{setMode(current);setError(false);setStatus(`Running ${current.theme}/${current.radius}/${current.borders}`);});
        await settle();
        for(const family of families) {
          for(const selector of targets[family]) {
            const actual=paint(get(family,'own',selector)),expected=paint(get(family,'reference',selector));
            comparisons++;
            if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push({mode:current,family,target:selector,phase:'normal',actual,expected});
          }
          profiles.push({mode:current,family,paint:paint(get(family,'own',targets[family][0])),reference:paint(get(family,'reference',targets[family][0]))});
        }
      }
      // Decorative border transitions are separate from meaningful selection contours.
      for(const family of families) {
        const find=(radius:Mode['radius'],borders:Mode['borders'])=>profiles.find(profile=>profile.family===family&&profile.mode.theme==='light'&&profile.mode.radius===radius&&profile.mode.borders===borders)!;
        if(rectangular.has(family)&&find('compact','off').paint.radius===find('rounded','off').paint.radius)failures.push({mode:find('rounded','off').mode,family,target:targets[family][0],phase:'transition',actual:find('rounded','off').paint.radius,expected:'Radius changes between compact and rounded'});
        if(decorative.has(family)&&find('default','off').paint.border===find('default','on').paint.border)failures.push({mode:find('default','on').mode,family,target:targets[family][0],phase:'transition',actual:find('default','on').paint.border,expected:'Decorative border changes between off and on'});
      }
      for(const theme of ['light','dark'] as const) {
        const current:Mode={theme,radius:'rounded',borders:'off'};
        flushSync(()=>{setMode(current);setError(true);});await settle();
        for(const family of families.filter(family=>decorative.has(family))) {
          const actual=get(family,'own',targets[family][0]),expected=get(family,'reference',targets[family][0]),style=getComputedStyle(actual);
          errorChecks++;
          if(JSON.stringify(paint(actual))!==JSON.stringify(paint(expected))||!visibleLine(style.borderTopWidth,style.borderTopColor))failures.push({mode:current,family,target:targets[family][0],phase:'error',actual:paint(actual),expected:paint(expected)});
        }
        flushSync(()=>setError(false));await settle();
        for(const family of families) {
          const owner=lane(family,'own').querySelector<HTMLElement>('input:not([type=hidden]),textarea,button[role=combobox]')!;
          const reference=lane(family,'reference').querySelector<HTMLElement>('input:not([type=hidden]),textarea,button[role=combobox]')!;
          owner.focus();await frame();
          const actual=paint(get(family,'own',focusTargets[family])),isVisible=owner.matches(':focus-visible');
          const focusedStyle=getComputedStyle(get(family,'own',focusTargets[family]));
          const hasFocusedContour=visibleLine(focusedStyle.outlineWidth,focusedStyle.outlineColor);
          reference.focus();await frame();
          const expected=paint(get(family,'reference',focusTargets[family])),referenceVisible=reference.matches(':focus-visible');
          focus.push({family,mode:current,visible:isVisible,outline:actual.outline});
          if(isVisible&&referenceVisible&&(actual.outline!==expected.outline||actual.border!==expected.border))failures.push({mode:current,family,target:focusTargets[family],phase:'focus',actual,expected});
          if(isVisible&&!hasFocusedContour)failures.push({mode:current,family,target:focusTargets[family],phase:'focus',actual:actual.outline,expected:'Meaningful focus contour remains visible with Borders Off'});
          reference.blur();
        }
      }
      const summaries=families.map(family=>{
        const own=profiles.filter(profile=>profile.family===family);
        return {family,modes:own.length,targets:targets[family].length,radiusValues:[...new Set(own.map(profile=>profile.paint.radius))],borderValues:[...new Set(own.map(profile=>profile.paint.border))],backgroundValues:[...new Set(own.map(profile=>profile.paint.bg))],foregroundValues:[...new Set(own.map(profile=>profile.paint.fg))]};
      });
      const report={pass:failures.length===0,families:families.length,modes:modes.length,comparisons,errorChecks,oracle:'Direct native-component attrs vs equivalent enclosing context; React live props, no remount',exceptions:{circlePill:['Radio','Switch','Slider'],meaningfulChoiceBorders:['Checkbox','Radio','Slider'],programmaticFocus:'Only focus-visible owners require a visible contour; keyboard QA remains separate'},summaries,focus,failures};
      setResult(JSON.stringify(report));setStatus(`${report.pass?'PASS':'FAIL'} · ${comparisons} paint comparisons · ${errorChecks} error checks · ${failures.length} failures`);
    } catch(caught) {
      setResult(JSON.stringify({pass:false,error:String(caught),failures}));setStatus(`FAIL · ${String(caught)}`);
    } finally {flushSync(()=>{setRunning(false);setError(false);});}
  }
  return <main>
    <h1>Native field context audit</h1>
    <p>Own attributes override opposite ancestors. Each field is compared with an equivalent enclosing context through 12 live theme/radius/borders combinations. Selection circles, pills, focus and errors remain meaningful exceptions.</p>
    <div className="field-context-toolbar"><UI.Button disabled={running} onClick={run}>Run fields</UI.Button><p id="field-context-status" role="status">{status}</p></div>
    <div ref={root} id="field-context-fixture" className="field-context-grid">
      {families.map(family=><section key={family} className="field-context-case" data-family={family}><h2>{family}</h2><div className="field-context-parent" {...parentAxes(mode)}><div className="field-context-own"><span className="field-context-caption">Own component attributes</span><Fields family={family} axes={ownAxes(mode)} error={error}/></div><div className="field-context-reference" {...ownAxes(mode)}><span className="field-context-caption">Reference enclosing context</span><Fields family={family} error={error} reference/></div></div></section>)}
    </div>
    <details><summary>JSON report</summary><pre id="field-context-result">{result}</pre></details>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
