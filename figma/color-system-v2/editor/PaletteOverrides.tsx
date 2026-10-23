import { Pencil } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Icon, Input, Switch, Tooltip } from '../../../src/index';
import { Numeric } from './Controls';
import { readable, PaletteStepDetails } from './Views';
import { generatePalette, toHex, css, toHsl, fromHsl, fromHex, setPaletteStep, resetPaletteStep, resetPaletteEdits, setPaletteInterpolation, type Accent, type Rules } from './model.mjs';
import './overrides.css';

/** Authoring is separate from the copy-on-click palette browser. Drafts commit explicitly. */
export function PaletteOverrides({accent,rules,onChange}:{accent:Accent;rules:Rules;onChange:(accent:Accent)=>void}) {
  const [index,setIndex]=useState(1),[hex,setHex]=useState(''),[error,setError]=useState(''),[resetOpen,setResetOpen]=useState(false);
  const scale=useMemo(()=>generatePalette(accent,rules)[0],[accent,rules]);
  const step=scale.steps[Math.min(index,accent.paletteSteps)-1];
  const savedHex=toHex(step.value);
  useEffect(()=>{setHex(savedHex);setError('');},[accent.id,step.name,savedHex]);
  const validHex=/^#[\da-f]{6}$/i.test(hex);
  const draft=validHex?fromHex(hex):step.value,hsl=toHsl(draft),anchors=accent.paletteEdits?.anchors.length??0;
  const dirty=hex.toUpperCase()!==savedHex.toUpperCase(),interpolate=accent.paletteEdits?.interpolate??false;
  const changeHsl=(key:'h'|'s'|'l',value:number)=>{const next={...hsl,[key]:value};setHex(toHex(fromHsl(next.h,next.s,next.l)));setError('');};
  const cancelDraft=()=>{setHex(savedHex);setError('');};
  function apply(){if(!validHex){setError('Введите HEX из шести символов, например #7854E8.');return;}onChange(setPaletteStep(accent,'ramp',step.index,hex));}
  return <section className="cap-pl-edits cap-pl-overrides" aria-label="Ручные правки палитры">
    <div className="cap-pl-overrides-heading"><p className="cap-pl-view-note">Выберите ступень и задайте точный цвет.</p><span>{anchors} опорных точек</span></div>
    <div className="cap-pl-overrides-ramp" role="group" aria-label="Ступени общей растяжки">{scale.steps.map(s=><Tooltip key={s.name} variant="inverse" content={<PaletteStepDetails scale={scale} step={s}/>}><button type="button" className="cap-pl-overrides-step" aria-label={`Редактировать ступень ${s.index}${s.authored?', опорный цвет':s.interpolated?', интерполяция':''}`} aria-pressed={step.index===s.index} style={{background:css(s.value),color:readable(s.value)}} onClick={()=>setIndex(s.index)}><span>{String(s.index).padStart(2,'0')}</span><span className="cap-pl-overrides-mark">{step.index===s.index?<Icon name="check" size={14}/>:s.authored?<Icon name={Pencil} size={12}/>:s.modified?<i/>:null}</span></button></Tooltip>)}</div>
    <div className="cap-pl-overrides-panel cap-surface-boundary">
      <div className="cap-pl-overrides-selection"><div className="cap-pl-overrides-title"><h2>Ступень {String(step.index).padStart(2,'0')}</h2><span>{step.authored?'Опорный цвет':step.interpolated?'Интерполяция':'По формуле'}</span></div>
        <div className="cap-pl-overrides-comparison"><div><i style={{background:css(step.original)}}/><span>Расчёт<code>{toHex(step.original)}</code></span></div><div><i style={{background:css(draft)}}/><span>{dirty?'Черновик':'Текущий'}<code>{toHex(draft)}</code></span></div></div>
      </div>
      <form onSubmit={e=>{e.preventDefault();apply();}} className="cap-pl-overrides-form">
        <div className="cap-pl-overrides-fields"><Input label="HEX" size="md" value={hex} onChange={e=>{setHex(e.target.value);setError('');}} error={error||undefined} spellCheck={false} autoComplete="off"/><div className="cap-pl-overrides-hsl"><Numeric label="HSL: тон" short="H" value={hsl.h} min={0} max={360} step={.1} suffix="°" onChange={v=>changeHsl('h',v)}/><Numeric label="HSL: насыщенность" short="S" value={hsl.s} min={0} max={100} step={.1} suffix="%" onChange={v=>changeHsl('s',v)}/><Numeric label="HSL: светлота" short="L" value={hsl.l} min={0} max={100} step={.1} suffix="%" onChange={v=>changeHsl('l',v)}/></div></div>
        <div className="cap-pl-overrides-actions"><Button type="submit" variant="primary" size="md">Сохранить точку</Button>{dirty&&<Button type="button" variant="ghost" size="md" onClick={cancelDraft}>Отменить</Button>}{step.authored&&<Button type="button" variant="ghost" size="md" onClick={()=>onChange(resetPaletteStep(accent,'ramp',step.index))}>Убрать точку</Button>}</div>
      </form>
    </div>
    <div className="cap-pl-overrides-settings"><Tooltip variant="inverse" content="Интерполяция между точками" description={<span className="cap-pl-overrides-help">Плавно соединяет соседние опорные цвета в OKLab. Вне этих участков остаётся расчётная палитра. Нужны минимум две точки.</span>}><Switch label="Интерполяция" checked={interpolate} onChange={e=>onChange(setPaletteInterpolation(accent,e.target.checked))}/></Tooltip><Button disabled={!anchors&&!interpolate} variant="ghost" size="md" onClick={()=>setResetOpen(true)}>Сбросить все правки</Button></div>
    <p className="cap-pl-view-note">Одна растяжка для всех ролей и тем. Правки сохраняются при смене количества ступеней и попадают в токены.</p>
    {!!accent.paletteEdits?.legacyAnchors?.length&&<p className="cap-pl-view-note">Ручные цвета прежних шкал сохранены в архиве проекта: {accent.paletteEdits.legacyAnchors.length}.</p>}
    <Dialog open={resetOpen} onOpenChange={setResetOpen} title="Сбросить ручные правки?" description="Растяжка этого цвета вернётся к расчёту с текущими параметрами. Изменение можно отменить." footer={<><Button onClick={()=>setResetOpen(false)}>Оставить</Button><Button variant="primary" onClick={()=>{onChange(resetPaletteEdits(accent));setResetOpen(false);}}>Сбросить</Button></>}>{null}</Dialog>
  </section>;
}
