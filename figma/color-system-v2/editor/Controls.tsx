import {t} from './Locale';
import React, { useId, useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { NumberField, Tooltip, ParameterSlider, Slider2D, useValueScrubber, ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../../../src/index';
/** Reuse the kit's numeric input and scrub gesture; the short prefix is the drag handle. */
export function Numeric({ label, short, value, min, max, step = 1, suffix = '', onChange }: {
    label: string;
    short: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (n: number) => void;
}) {
    const scrub = useValueScrubber({ value, min, max, step, onValueChange: onChange });
    return <div className="cap-pl-numeric"><NumberField label={label} compact size="md" value={Number(value.toFixed(step < 1 ? Math.min(6,String(step).split('.')[1]?.length??0) : 0))} min={min} max={max} step={step} suffix={suffix} onValueChange={onChange} prefix={<span {...scrub} className="cap-pl-scrub-label" title={t("Потяните влево или вправо. Shift — точнее.")} onPointerDown={e => scrub.onPointerDown(new Proxy(e, { get(target, key) { return key === 'altKey' ? true : Reflect.get(target, key); } }))}>{short}</span>}/></div>;
}
export function FillSlider({ label, description, value, min, max, step = 1, suffix = '', onChange }: {
    label: string;
    description?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (n: number) => void;
}) {
    const slider = <ParameterSlider label={label} value={value} min={min} max={max} step={step} suffix={suffix} showHandle size="md" formatValue={n => String(Number(n.toFixed(step < 1 ? Math.min(6, String(step).split('.')[1]?.length ?? 0) : 0)))} onValueChange={onChange}/>;
    return description ? <Tooltip variant="inverse" content={label} description={description}>{slider}</Tooltip> : slider;
}
export function CharacterPad({chroma,density,showFields=false,onChange}:{chroma:number;density:number;showFields?:boolean;onChange:(chroma:number,density:number)=>void}) {
 return <div className="cap-pl-character"><Slider2D label={t("Мягкие заливки")} value={{x:chroma,y:density}} onValueChange={({x,y})=>onChange(x,y)} x={{label:t('Цветность роли'),min:.3,max:2,step:.01,startLabel:t('Спокойнее'),endLabel:t('Ярче')}} y={{label:t('Плотность'),min:.5,max:1.8,step:.01,startLabel:t('Легче'),endLabel:t('Плотнее'),reversed:true}}/><div className="cap-pl-exact-fields" data-open={showFields} aria-hidden={!showFields} inert={!showFields}><div><div className="cap-pl-duo"><Numeric label={t("Цветность заливок")} short={t("Цвет")} value={chroma*100} min={30} max={200} step={.1} suffix="%" onChange={n=>onChange(n/100,density)}/><Numeric label={t("Плотность заливок")} short={t("Слой")} value={density*100} min={50} max={180} step={.1} suffix="%" onChange={n=>onChange(chroma,n/100)}/></div></div></div></div>;
}

export function Workspace({left,right,children,widths,onWidths}:{left:ReactNode;right?:ReactNode;children:ReactNode;widths:{left:number;right:number};onWidths:(widths:{left:number;right:number})=>void}) {
 const [width,setWidth]=useState(window.innerWidth);
 useEffect(()=>{const update=()=>setWidth(window.innerWidth);window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 const desktop=!!right&&width>1100,tablet=width>620,available=width,percent=(n:number)=>n/available*100;
 const leftPx=Math.max(184,Math.min(widths.left,Math.min(380,available-360-(desktop?248:0))));
 const rightPx=Math.max(248,Math.min(widths.right,Math.min(460,available-leftPx-360)));
 const layout=desktop?[percent(leftPx),percent(available-leftPx-rightPx),percent(rightPx)]:tablet?[percent(leftPx),percent(available-leftPx)]:[100];
 return <ResizablePanelGroup className="cap-pl-layout" label={t("Рабочие области")} layout={layout} onLayoutChange={values=>onWidths({left:tablet?values[0]*available/100:widths.left,right:desktop?values[2]*available/100:widths.right})}>
  {tablet&&<ResizablePanel minSize={percent(184)} maxSize={percent(380)} label={t("Навигация")}><aside className="cap-pl-sidebar" data-surface="workspace">{left}</aside></ResizablePanel>}
  {tablet&&<ResizableHandle appearance="line" label={t("Ширина меню")}/>}
  <ResizablePanel minSize={tablet?percent(360):100} label={t("Холст")}>{children}</ResizablePanel>
  {desktop&&<ResizableHandle appearance="line" label={t("Ширина параметров")}/>}
  {desktop&&<ResizablePanel minSize={percent(248)} maxSize={percent(460)} label={t("Параметры цвета")}><aside className="cap-pl-properties" data-surface="workspace">{right}</aside></ResizablePanel>}
 </ResizablePanelGroup>;
}
