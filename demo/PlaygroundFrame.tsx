import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../src';
import { useCatalogText } from './catalog-locale';
import './playground-frame.css';

/** Shared preview/settings composition; the kit owns pointer and keyboard resizing. */
export function PlaygroundFrame({children,name}:{children:ReactNode;name:string}) {
 const c=useCatalogText(),root=useRef<HTMLDivElement>(null),[width,setWidth]=useState(0);
 useLayoutEffect(()=>{const node=root.current;if(!node)return;const measure=()=>setWidth(node.clientWidth);measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(node);return()=>observer?.disconnect();},[]);
 const stacked=width>0&&width<=720,panes=Children.toArray(children),usable=Math.max(1,width);
 const settingsMin=width?Math.min(40,240/usable*100):25,previewMin=width?Math.min(40,220/usable*100):25;
 return <div ref={root} className="playground-frame" data-stacked={stacked||undefined}>
  <ResizablePanelGroup className="playground-layout" label={`${name}: ${c('Превью и параметры')}`} defaultLayout={[68,32]} disabled={stacked}>
   <ResizablePanel className="playground-preview-pane" minSize={previewMin} label={`${name}: ${c('Превью')}`}>{panes[0]}</ResizablePanel>
   <ResizableHandle appearance="line" className="playground-settings-resizer" aria-hidden={stacked||undefined} label={c('Изменить ширину параметров')}/>
   <ResizablePanel className="playground-settings-pane" minSize={settingsMin} maxSize={70} label={`${name}: ${c('Параметры')}`}>{panes[1]}</ResizablePanel>
  </ResizablePanelGroup>
 </div>;
}
