import { useCatalogText } from './catalog-locale';
import type { ReactNode } from 'react';
import {Accordion} from '../src';
/** Presentation order is shared by both playground registries. */
export function ControlList<T extends {key:string}>({controls,render}:{controls:readonly T[];render:(control:T)=>ReactNode}) {
 const c=useCatalogText();
 const focus=controls.filter(control=>control.key==='focusWidth'||control.key==='focusOffset'||control.key==='focusColor');
 const rest=controls.filter(control=>!focus.includes(control)).sort((a,b)=>Number(b.key==='size')-Number(a.key==='size'));
 return <>{rest.map(render)}{focus.length>0&&<Accordion className="playground-focus-settings" title={c("Фокус")}><div role="group" aria-label={c("Фокус")} className="playground-control-pair" data-color-control={focus.some(control=>control.key==='focusColor')||undefined}>{focus.map(render)}</div></Accordion>}</>;
}
