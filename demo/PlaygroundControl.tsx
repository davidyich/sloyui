import * as UI from '../src';
import { FocusColorControl } from './focus-controls';
import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

export type PlaygroundValue = string | number | boolean;
export type PlaygroundControlSpec = { key: string; label: string; initial: PlaygroundValue; options?: readonly string[]; min?: number; max?: number; step?: number; kind?: 'color' };

function NumericParameter({label,value,min,max,step,onChange,translate}:{label:string;value:number;min?:number;max?:number;step:number;onChange:(value:number)=>void;translate:(text:string)=>string}) {
 const hint=useId();
 const [altDown,setAltDown]=useState(false);
 const drag=useRef<{id:number; start:number; lastX:number; y:number; offset:number; target:HTMLElement; changed:boolean}|null>(null);
 const current=useRef(value); current.current=value;
 const bound=(next:number)=>Math.min(max??Infinity,Math.max(min??-Infinity,Number(next.toFixed(8))));
 const finish=(cancel:boolean)=>{const active=drag.current;if(!active)return;drag.current=null;if(cancel&&active.changed)onChange(active.start);try{if(active.target.hasPointerCapture?.(active.id))active.target.releasePointerCapture(active.id);}catch{/* Capture may already be gone. */}};
 useEffect(()=>{const down=(event:globalThis.KeyboardEvent)=>{setAltDown(event.altKey||event.key==='Alt');if(event.key==='Escape'&&drag.current){event.preventDefault();finish(true);}};const up=(event:globalThis.KeyboardEvent)=>setAltDown(event.key==='Alt'?false:event.altKey);const blur=()=>{setAltDown(false);finish(true);};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};});
 const start=(event:PointerEvent<HTMLElement>,requiresAlt:boolean)=>{if(event.button!==0||(requiresAlt&&!event.altKey))return;event.preventDefault();drag.current={id:event.pointerId,start:current.current,lastX:event.clientX,y:event.clientY,offset:0,target:event.currentTarget,changed:false};try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{/* Pointer capture is optional. */}};
 const move=(event:PointerEvent<HTMLElement>)=>{const active=drag.current;if(!active||active.id!==event.pointerId)return;const vertical=event.clientY-active.y, speed=vertical<=-80?2:vertical>=160?.25:vertical>=80?.5:1;active.offset+=(event.clientX-active.lastX)*speed;active.lastX=event.clientX;const next=bound(active.start+Math.trunc(active.offset)*step);if(next!==current.current){active.changed=true;current.current=next;onChange(next);}};
 const bindings={onPointerMove:move,onPointerUp:()=>finish(false),onPointerCancel:()=>finish(true),onLostPointerCapture:()=>finish(true)};
 const onKeyDown=(event:KeyboardEvent<HTMLInputElement>)=>{if(!event.shiftKey||(event.key!=='ArrowUp'&&event.key!=='ArrowDown'))return;event.preventDefault();onChange(bound(current.current+(event.key==='ArrowUp'?1:-1)*step*10));};
 return <div className="playground-parameter-number" data-alt={altDown||undefined}><span id={hint} className="cap-sr-only">{translate("Перетащите подпись или удерживайте Alt и перетащите значение. Стрелки меняют значение; Shift увеличивает шаг. Escape отменяет перетаскивание.")}</span><UI.NumberField aria-describedby={hint} label={label} size="md" compact value={value} min={min} max={max} step={step} onValueChange={onChange} scrubbable={false} {...bindings} onPointerDown={event=>start(event,true)} onKeyDown={onKeyDown} prefix={<span {...bindings} onPointerDown={event=>start(event,false)} className="playground-number-label">{label}</span>}/></div>;
}

const unrestrictedPositive = new Set(['width','height','maxWidth','minWidth','maxHeight','popupWidth','paneHeight','leftWidth','rightWidth','contentWidth','iconSize','pixels','length','fadeSize','fadeReveal','radius','stroke','step','largeStep','maxTags','maxVisible']);

/** Figma-inspired parameter rows, shared by both component registries. */
export function PlaygroundControl({ control, value, set, translate, icons = [] }: {
 control: PlaygroundControlSpec; value: PlaygroundValue; set: (key: string, value: PlaygroundValue) => void;
 translate: (text: string) => string; icons?: readonly UI.IconOption[];
}) {
 const label=translate(control.label), change=(next:PlaygroundValue)=>set(control.key,next);
 if(control.kind==='color') return <div className="playground-parameter-color"><UI.ColorPicker label={label} size="md" value={String(value)} onValueChange={change}/></div>;
 if(control.key==='focusColor') return <FocusColorControl label={label} value={String(value)} onValueChange={change}/>;
 if(typeof control.initial==='boolean') return <UI.Switch className="playground-parameter-switch" label={<span title={label}>{label}</span>} size="md" checked={value===true} onChange={event=>change(event.target.checked)}/>;
 if(typeof control.initial==='number') {
  const unrestricted=unrestrictedPositive.has(control.key);
  return <NumericParameter label={label} value={Number(value)} min={unrestricted?(control.key==='step'||control.key==='largeStep'?.01:0):control.min} max={unrestricted?undefined:control.max} step={control.step??(!Number.isInteger(control.initial)?.05:1)} onChange={change} translate={translate}/>;
 }
 if(control.initial.includes('\n')) return <div className="playground-parameter-multiline"><UI.Popover label={label} size="md" align="end" triggerContent={<><span className="playground-multiline-label">{label}</span><span className="playground-multiline-value">{String(value).split('\n')[0]}</span></>}><UI.Textarea label={label} size="md" rows={6} value={String(value)} onChange={event=>change(event.target.value)}/></UI.Popover></div>;
 if(control.label==='Дата ISO'||control.key==='rangeEnd') return <div className="playground-control-wide"><UI.DatePicker label={label} value={String(value)} onValueChange={change}/></div>;
 if(control.key==='icon'&&control.options) return <UI.Field className="playground-parameter-icon" label={label}>{props=><UI.IconPicker {...props} label={label} size="md" variant="combobox" value={String(value)} options={icons} onValueChange={change}/>}</UI.Field>;
 if(control.options) return <UI.Select appearance="parameter" label={label} size="md" value={String(value)} options={control.options.map(option=>({value:option,label:translate(option||'Не выбрано')}))} onValueChange={change}/>;
 return <UI.Field className="playground-parameter-text" label={label}>{props=><UI.Input {...props} size="md" value={String(value)} onChange={event=>change(event.target.value)}/>}</UI.Field>;
}
