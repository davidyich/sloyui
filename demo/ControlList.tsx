import type { ReactNode } from 'react';
/** Presentation order is shared by both playground registries. */
export function ControlList<T extends {key:string}>({controls,render}:{controls:readonly T[];render:(control:T)=>ReactNode}) {
 const focus=controls.filter(control=>control.key==='focusWidth'||control.key==='focusOffset');
 const rest=controls.filter(control=>!focus.includes(control)).sort((a,b)=>Number(b.key==='size')-Number(a.key==='size'));
 return <>{rest.map(render)}{focus.length>0&&<fieldset className="playground-control-pair"><legend>Фокус</legend>{focus.map(render)}</fieldset>}</>;
}
