import { Children, Fragment, cloneElement, createContext, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { cx } from './primitives.js';
import { useTranslate } from './locale.js';
import { feasiblePanelBounds, fitPanelLayout, panelBounds, panelPairBounds, type PanelBounds } from './resizable-layout.js';
import { useFrameResize } from './resize-utils.js';

export interface ResizablePanelGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  /** Percentages in panel order, normalized to the available space after handle widths. */
  layout?: number[]; defaultLayout?: number[];
  onLayoutChange?: (layout: number[]) => void; onLayoutCommit?: (layout: number[]) => void;
  disabled?: boolean; step?: number; label?: string;
}
export interface ResizablePanelProps extends HTMLAttributes<HTMLDivElement> {
  defaultSize?: number; minSize?: number; maxSize?: number; label?: string;
  surface?: 'inherit' | 'base' | 'canvas' | 'raised' | 'floating';
}
export interface ResizableHandleProps extends HTMLAttributes<HTMLDivElement> { withHandle?: boolean; disabled?: boolean; label?: string }
interface GroupContext {
  orientation:'horizontal'|'vertical'; layout:number[]; bounds:PanelBounds[]; panelIds:string[]; panelLabels:string[]; handleIndices:Map<string,number>;
  disabled:boolean; active:string|null; rtl:boolean; step:number; helpId:string;
  change:(index:number,value:number)=>number[];
  start:(index:number,id:string,handle:HTMLDivElement,pointerId:number,coordinate:number)=>void;
  move:(id:string,pointerId:number,coordinate:number)=>void;
  finish:(id:string,cancel?:boolean,pointerId?:number)=>void;
  commit:(layout:number[])=>void;
}
const GroupContext=createContext<GroupContext|null>(null);
const flatten=(children:ReactNode):ReactNode[]=>Children.toArray(children).flatMap(child=>isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment?flatten(child.props.children):[child]);
const same=(left:number[],right:number[])=>left.length===right.length&&left.every((value,index)=>Math.abs(value-right[index])<1e-6);

/** Percent-based compound layout. Nest another group inside a panel for a second axis. */
export function ResizablePanelGroup({ orientation='horizontal',layout:controlled,defaultLayout,onLayoutChange,onLayoutCommit,disabled=false,step=1,label,children,className,...props }:ResizablePanelGroupProps){
  const t=useTranslate(),groupId=useId(),root=useRef<HTMLDivElement>(null),vertical=orientation==='vertical';
  const nodes=flatten(children),panels=nodes.filter((node):node is ReactElement<ResizablePanelProps>=>isValidElement<ResizablePanelProps>(node)&&node.type===ResizablePanel);
  const bounds=feasiblePanelBounds(panels.map(panel=>panelBounds(panel.props.minSize,panel.props.maxSize)));
  const explicit=panels.reduce((sum,panel)=>sum+(Number.isFinite(panel.props.defaultSize)?panel.props.defaultSize!:0),0),automatic=panels.filter(panel=>!Number.isFinite(panel.props.defaultSize)).length;
  const defaults=panels.map(panel=>Number.isFinite(panel.props.defaultSize)?panel.props.defaultSize!:Math.max(0,100-explicit)/Math.max(1,automatic));
  const [inner,setInner]=useState(()=>fitPanelLayout(defaultLayout??defaults,bounds)),[active,setActive]=useState<string|null>(null),[space,setSpace]=useState({size:0,rtl:false});
  const layout=fitPanelLayout(controlled??(inner.length===panels.length?inner:defaults),bounds),current=useRef(layout);current.current=layout;
  const drag=useRef<{id:string;index:number;pointerId:number;start:number;initial:number[];size:number;handle:HTMLDivElement}|null>(null);
  const panelIds=panels.map((panel,index)=>panel.props.id??`${groupId}-panel-${index}`),panelLabels=panels.map((panel,index)=>panel.props.label??t(`Панель ${index+1}`,`Panel ${index+1}`));
  const handleIndices=new Map<string,number>();let panelIndex=-1,handleIndex=0;
  const rendered=nodes.map(node=>{if(!isValidElement(node))return node;
    if(node.type===ResizablePanel){panelIndex++;return cloneElement(node as ReactElement<ResizablePanelProps>,{id:panelIds[panelIndex]});}
    if(node.type===ResizableHandle){const child=node as ReactElement<ResizableHandleProps>,id=child.props.id??`${groupId}-handle-${handleIndex++}`;if(panelIndex>=0&&panelIndex<panels.length-1)handleIndices.set(id,panelIndex);return cloneElement(child,{id});}
    return node;
  });
  const enabled=!disabled&&(controlled===undefined||!!onLayoutChange);
  const apply=(next:number[])=>{if(same(current.current,next))return;current.current=next;if(controlled===undefined)setInner(next);onLayoutChange?.([...next]);};
  const change=(index:number,value:number)=>{if(!enabled||index<0||index>=layout.length-1)return layout;const limits=panelPairBounds(current.current,bounds,index),valueBounded=Math.max(limits.min,Math.min(limits.max,value)),next=[...current.current],total=next[index]+next[index+1];next[index]=valueBounded;next[index+1]=total-valueBounded;apply(next);return next;};
  const scheduled=useFrameResize<{index:number;value:number}>(next=>change(next.index,next.value));
  const finish=(id:string,cancel=false,pointerId?:number)=>{const state=drag.current;if(!state||state.id!==id||pointerId!==undefined&&state.pointerId!==pointerId)return;
    if(cancel){scheduled.clear();apply(state.initial);}else{scheduled.flush();if(!same(current.current,state.initial))onLayoutCommit?.([...current.current]);}
    drag.current=null;setActive(null);if(state.handle.hasPointerCapture?.(state.pointerId))state.handle.releasePointerCapture?.(state.pointerId);
  };
  const signature=panelIds.join('\u0000')+':'+[...handleIndices.keys()].join('\u0000');
  useEffect(()=>{scheduled.clear();const state=drag.current;drag.current=null;setActive(null);if(state?.handle.hasPointerCapture?.(state.pointerId))state.handle.releasePointerCapture?.(state.pointerId);},[orientation,signature,enabled,scheduled.clear]);
  useLayoutEffect(()=>{const element=root.current;if(!element)return;
    const handles=Array.from(element.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node.classList.contains('cap-resizable-handle'));
    const measure=()=>{const computed=getComputedStyle(element),padding=vertical?(parseFloat(computed.paddingTop)||0)+(parseFloat(computed.paddingBottom)||0):(parseFloat(computed.paddingLeft)||0)+(parseFloat(computed.paddingRight)||0),handleSpace=handles.reduce((sum,node)=>sum+(vertical?node.offsetHeight:node.offsetWidth),0),size=Math.max(0,(vertical?element.clientHeight:element.clientWidth)-padding-handleSpace),rtl=computed.direction==='rtl';setSpace(previous=>previous.size===size&&previous.rtl===rtl?previous:{size,rtl});};
    measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(element);handles.forEach(handle=>observer?.observe(handle));window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure)};
  },[orientation,signature,props.dir,props.style?.direction]);
  const context:GroupContext={orientation,layout,bounds,panelIds,panelLabels,handleIndices,disabled:!enabled,active,rtl:space.rtl,step:Math.max(.1,Number.isFinite(step)?step:1),helpId:`${groupId}-help`,change,finish,commit:next=>onLayoutCommit?.([...next]),start:(index,id,handle,pointerId,coordinate)=>{
    if(!enabled||drag.current)return;const available=space.size||(vertical?root.current?.getBoundingClientRect().height:root.current?.getBoundingClientRect().width)||0;if(!available)return;
    drag.current={id,index,handle,pointerId,start:coordinate,initial:[...layout],size:available};setActive(id);handle.setPointerCapture?.(pointerId);
  },move:(id,pointerId,coordinate)=>{const state=drag.current;if(!state||state.id!==id||state.pointerId!==pointerId)return;scheduled.queue({index:state.index,value:state.initial[state.index]+(coordinate-state.start)/state.size*100*(!vertical&&space.rtl?-1:1)});}};
  return <GroupContext.Provider value={context}><div {...props} ref={root} role={props.role??'group'} aria-label={props['aria-label']??label??t('Изменяемые панели','Resizable panels')} className={cx('cap-resizable-group',className)} data-orientation={orientation} data-resizing={active||undefined}><span className="cap-sr-only" id={context.helpId}>{t('Перетащите разделитель или используйте стрелки. Shift увеличивает шаг. Home и End задают границы; Escape отменяет перетаскивание.','Drag the separator or use arrow keys. Shift increases the step. Home and End set the limits; Escape cancels dragging.')}</span>{rendered}</div></GroupContext.Provider>;
}
export function ResizablePanel({defaultSize:_defaultSize,minSize:_minSize,maxSize:_maxSize,label,surface='inherit',id,children,className,style,...props}:ResizablePanelProps){
  const context=useContext(GroupContext),t=useTranslate(),index=context?.panelIds.indexOf(id??'')??-1;
  const collapsed=index>=0&&context!.layout[index]<=1e-6;
  return <div {...props} {...(surface==='inherit'?{}:{'data-surface':surface})} inert={collapsed||props.inert} aria-hidden={collapsed||props['aria-hidden']} data-collapsed={collapsed||undefined} id={id} role={props.role??'group'} aria-label={props['aria-label']??label??(index>=0?context!.panelLabels[index]:t('Панель','Panel'))} className={cx('cap-resizable-panel',className)} style={{...style,...(index>=0?{'--cap-resizable-panel-size':context!.layout[index]}:{})} as CSSProperties}>{children}</div>;
}
export function ResizableHandle({withHandle=false,disabled=false,label,id,className,onKeyDown,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture,...props}:ResizableHandleProps){
  const context=useContext(GroupContext),t=useTranslate(),index=context?.handleIndices.get(id??'')??-1,valid=!!context&&index>=0;
  const limits=valid?panelPairBounds(context.layout,context.bounds,index):{min:0,max:100},enabled=valid&&!context!.disabled&&!disabled&&limits.max-limits.min>1e-6,vertical=context?.orientation==='vertical';
  useEffect(()=>{if(!enabled&&context&&context.active===id)context.finish(id!,true);},[enabled,id]);
  return <div {...props} id={id} role="separator" tabIndex={enabled?props.tabIndex??0:-1} aria-disabled={!enabled||undefined} aria-orientation={vertical?'horizontal':'vertical'} aria-label={label??props['aria-label']??t('Изменить размер панелей','Resize panels')} aria-controls={valid?context.panelIds[index]:undefined} aria-describedby={[props['aria-describedby'],context?.helpId].filter(Boolean).join(' ')||undefined} aria-valuemin={Math.round(limits.min*100)/100} aria-valuemax={Math.round(limits.max*100)/100} aria-valuenow={valid?Math.round(context.layout[index]*100)/100:0} aria-valuetext={valid?`${Math.round(context.layout[index]*100)/100}%`:undefined} className={cx('cap-resizable-handle',className)} data-with-handle={withHandle||undefined} data-resizing={!!context&&context.active===id||undefined} onPointerDown={event=>{onPointerDown?.(event);if(event.defaultPrevented||!context||!enabled||event.button!==0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});context.start(index,id!,event.currentTarget,event.pointerId,vertical?event.clientY:event.clientX);}} onPointerMove={event=>{onPointerMove?.(event);if(!event.defaultPrevented&&enabled&&context)context.move(id!,event.pointerId,vertical?event.clientY:event.clientX);}} onPointerUp={event=>{onPointerUp?.(event);if(!event.defaultPrevented&&context&&context.active===id)context.finish(id!,false,event.pointerId);}} onPointerCancel={event=>{onPointerCancel?.(event);if(context&&context.active===id)context.finish(id!,true,event.pointerId);}} onLostPointerCapture={event=>{onLostPointerCapture?.(event);if(context&&context.active===id)context.finish(id!,true,event.pointerId);}} onKeyDown={event=>{
    onKeyDown?.(event);if(event.defaultPrevented||!context||!enabled)return;if(event.key==='Escape'&&context.active===id){event.preventDefault();context.finish(id!,true);return;}
    const increase=vertical?'ArrowDown':context.rtl?'ArrowLeft':'ArrowRight',decrease=vertical?'ArrowUp':context.rtl?'ArrowRight':'ArrowLeft';if(![increase,decrease,'Home','End'].includes(event.key))return;event.preventDefault();
    const value=event.key==='Home'?limits.min:event.key==='End'?limits.max:context.layout[index]+(event.key===increase?1:-1)*context.step*(event.shiftKey?10:1),next=context.change(index,value);if(!same(next,context.layout))context.commit(next);
  }}>{withHandle&&<span className="cap-resizable-handle-grip" aria-hidden="true"><svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="4" cy="4" r="1"/><circle cx="8" cy="4" r="1"/><circle cx="4" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="8" cy="12" r="1"/></svg></span>}</div>;
}
