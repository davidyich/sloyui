import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Button, Icon } from './primitives.js';
import { stackLayout, type StackDirection, type StackSize } from './stack-layout.js';
import type { FeedbackStyleProps } from './feedback.js';
import { Toast, useOverlayPresence } from './overlays.js';
import { useDisclosurePresence, type DisclosurePhase } from './disclosure.js';

export type { StackDirection } from './stack-layout.js';
export interface ToastStackItem extends FeedbackStyleProps { id:string; title:string; description?:string; duration?:number; action?:{label:string;onAction:()=>void} }
export interface ToastStackProps { items:ToastStackItem[]; onDismiss:(id:string)=>void; position?:'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right'|'inline'; expandDirection?:StackDirection; expanded?:boolean; onExpandedChange?:(expanded:boolean)=>void; label?:string; limit?:number; className?:string }

function useStackSizes(ref: React.RefObject<HTMLDivElement | null>, signature: string, selector: string, fallbackHeight: number) {
  const [state,setState] = useState<{width:number;sizes:Record<string,StackSize>}>({width:320,sizes:{}});
  useLayoutEffect(()=>{
    const root=ref.current;if(!root)return;
    const measure=()=>{const style=getComputedStyle(root),width=(root.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0))||320;const sizes=Object.fromEntries(Array.from(root.querySelectorAll<HTMLElement>(selector)).map(node=>[node.dataset.stackKey!,{width,height:node.offsetHeight||fallbackHeight}]));setState(previous=>JSON.stringify(previous)===JSON.stringify({width,sizes})?previous:{width,sizes});};
    measure();if(typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(measure);observer.observe(root);root.querySelectorAll(selector).forEach(node=>observer.observe(node));return()=>observer.disconnect();
  },[signature,selector,fallbackHeight]);
  return state;
}
function TimedToast({item,onDismiss,paused,depth,expanded,position,phase,x,y,width}:{item:ToastStackItem;onDismiss:(id:string)=>void;paused:boolean;depth:number;expanded:boolean;position:ToastStackProps['position'];phase:DisclosurePhase;x:number;y:number;width:number}){
  const remaining=useRef(item.duration??5000),started=useRef(0);
  useEffect(()=>{if(phase==='exit'||item.action||item.duration===Infinity||paused||remaining.current<=0)return;started.current=performance.now();const timer=setTimeout(()=>onDismiss(item.id),remaining.current);return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-started.current))}},[item.id,item.duration,item.action,paused,onDismiss,phase]);
  return <li className="cap-toast-stack-item" data-toast-id={item.id} data-stack-key={item.id} data-depth={depth} data-phase={phase} data-expanded={expanded||undefined} aria-hidden={phase==='exit'||depth>0&&!expanded||undefined} inert={phase==='exit'||depth>0&&!expanded} style={{'--cap-toast-depth':depth,'--cap-toast-x':`${x}px`,'--cap-toast-y':`${y}px`,width} as CSSProperties}><Toast tone={item.tone} color={item.color} appearance={item.appearance} contrast={item.contrast} surface={item.surface??(position==='inline'?'inherit':'floating')} title={item.title} description={item.description} onDismiss={()=>onDismiss(item.id)} action={item.action&&<Button size="sm" variant="ghost" onClick={item.action.onAction}>{item.action.label}</Button>}/></li>
}
export function ToastStack({items,onDismiss,position='bottom-right',expandDirection,expanded:controlledExpanded,onExpandedChange,label='Notifications',limit=4,className=''}:ToastStackProps){
  const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[manuallyExpanded,setManuallyExpanded]=useState<boolean|null>(null),[hidden,setHidden]=useState(false);
  const viewport=useRef<HTMLDivElement>(null);
  useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);change();return()=>document.removeEventListener('visibilitychange',change)},[]);
  const shown=items.slice(-Math.max(1,limit)).reverse(),present=useDisclosurePresence(shown,item=>item.id);
  const direction=expandDirection??(position.startsWith('bottom')?'up':'down'),expanded=controlledExpanded??(manuallyExpanded??(hovered||focused)),paused=expanded||hidden;
  const signature=present.map(entry=>entry.key).join('\u0000'),measurement=useStackSizes(viewport,signature,'.cap-toast-stack-item',80);
  const geometry=stackLayout(present.map(entry=>measurement.sizes[entry.key]??{width:measurement.width,height:80}),direction,expanded);
  useLayoutEffect(()=>{if(viewport.current)viewport.current.scrollLeft=expanded&&direction==='left'?Math.max(0,geometry.width-viewport.current.clientWidth):0},[expanded,direction,geometry.width]);
  const changeExpanded=(next:boolean)=>{if(controlledExpanded===undefined)setManuallyExpanded(next);onExpandedChange?.(next)};
  const hover=(next:boolean)=>{if(controlledExpanded!==undefined)return;setHovered(next);if(!next&&manuallyExpanded===false)setManuallyExpanded(null)};
  return <div className={`cap-toast-stack ${className}`} role="region" aria-label={label} data-position={position} data-direction={direction} data-expanded={expanded||undefined} onPointerEnter={e=>{if(e.pointerType==='mouse')hover(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')hover(false)}} onMouseEnter={()=>hover(true)} onMouseLeave={()=>hover(false)} onFocusCapture={event=>setFocused(!!(event.target as Element).closest('.cap-toast-stack-item'))} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}>
    {present.length>1&&<Button className="cap-toast-stack-expand" size="xs" variant="ghost" aria-expanded={expanded} onClick={()=>changeExpanded(!expanded)}>{expanded?'Свернуть уведомления':'Развернуть уведомления'}</Button>}
    <div ref={viewport} className="cap-toast-stack-viewport"><ol className="cap-toast-stack-list" style={{width:geometry.width,height:geometry.height,'--cap-toast-inline-clearance':`${geometry.height}px`} as CSSProperties}>{present.map(({key,item,phase},i)=><TimedToast key={key} item={item} onDismiss={onDismiss} paused={paused} depth={i} expanded={expanded} position={position} phase={phase} x={geometry.positions[i]?.x??0} y={geometry.positions[i]?.y??0} width={measurement.width}/>)}</ol></div>
  </div>;
}

export interface AnnouncementAction { label:string; href?:string; onClick?:()=>void }
export interface Announcement { id:string; message:ReactNode; action?:AnnouncementAction; countdown?:{to:Date|string|number;label?:string} }
export interface AnnouncementBarProps { surface?: 'inherit'|'base'|'canvas'|'raised'|'floating'; messages:Announcement[]; id?:string; open?:boolean; defaultOpen?:boolean; onOpenChange?:(open:boolean)=>void; index?:number; defaultIndex?:number; onIndexChange?:(index:number)=>void; interval?:number; autoPlay?:boolean; dismissible?:boolean; controls?:boolean; label?:string; onAction?:(message:Announcement)=>void; onCountdownEnd?:(message:Announcement)=>void; className?:string }
const announcementStorageKey=(id:string)=>`cap-announcement:${id}`;
function wasAnnouncementDismissed(id?:string){if(!id||typeof window==='undefined')return false;try{return window.localStorage.getItem(announcementStorageKey(id))==='1'}catch{return false}}
export function clearAnnouncementDismissal(id:string){if(typeof window==='undefined')return;try{window.localStorage.removeItem(announcementStorageKey(id))}catch{/* storage can be unavailable */}}
function countdownText(to:Date|string|number,now:number){const ms=Math.max(0,(Number.isFinite(new Date(to).getTime())?new Date(to).getTime():now)-now),s=Math.floor(ms/1000);return {ended:ms===0,text:`${Math.floor(s/86400)}d ${String(Math.floor(s%86400/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}}
export function AnnouncementBar({messages,id:persistenceId,open,defaultOpen=true,onOpenChange,index,defaultIndex=0,onIndexChange,interval=6000,autoPlay=true,dismissible=true,controls=false,label='Announcement',onAction,onCountdownEnd,surface='inherit',className=''}:AnnouncementBarProps){
  const [innerOpen,setInnerOpen]=useState(()=>defaultOpen&&!wasAnnouncementDismissed(persistenceId)),[innerIndex,setInnerIndex]=useState(defaultIndex),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[manuallyPaused,setManuallyPaused]=useState(false),[hidden,setHidden]=useState(false),[now,setNow]=useState(Date.now());
  const isOpen=open??innerOpen,active=Math.max(0,Math.min(messages.length-1,index??innerIndex)),message=messages[active],domId=useId(),endCalled=useRef(new Set<string>()),lastMessage=useRef<Announcement|undefined>(message),paused=hovered||focused||manuallyPaused||hidden,present=useOverlayPresence(isOpen&&!!message);
  if(message)lastMessage.current=message;
  const setOpen=(value:boolean)=>{if(!value&&persistenceId)try{window.localStorage.setItem(announcementStorageKey(persistenceId),'1')}catch{/* storage can be unavailable */}if(open===undefined)setInnerOpen(value);onOpenChange?.(value)};
  const setIndex=(value:number)=>{if(!messages.length)return;const next=(value+messages.length)%messages.length;if(index===undefined)setInnerIndex(next);onIndexChange?.(next)};
  useEffect(()=>{const cb=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',cb);cb();return()=>document.removeEventListener('visibilitychange',cb)},[]);
  useEffect(()=>{if(open===undefined)setInnerOpen(defaultOpen&&!wasAnnouncementDismissed(persistenceId))},[persistenceId]);
  useEffect(()=>{if(!isOpen||!autoPlay||paused||messages.length<2||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;const timer=setTimeout(()=>setIndex(active+1),Math.max(1000,interval));return()=>clearTimeout(timer)},[isOpen,autoPlay,paused,messages.length,active,interval]);
  useEffect(()=>{if(!message?.countdown)return;const update=()=>setNow(Date.now());update();const timer=setInterval(update,1000);return()=>clearInterval(timer)},[message?.id,message?.countdown?.to]);
  const clock=message?.countdown?countdownText(message.countdown.to,now):null;
  useEffect(()=>{if(clock?.ended&&message&&!endCalled.current.has(message.id)){endCalled.current.add(message.id);onCountdownEnd?.(message)}},[clock?.ended,message?.id,onCountdownEnd]);
  if(!present||!lastMessage.current)return null;
  const shownMessage=message??lastMessage.current;
  return <div id={domId} className={`cap-announcement-bar ${className}`} data-surface={surface==='inherit'?undefined:surface} role="region" aria-label={label} aria-hidden={!isOpen} inert={!isOpen} data-state={isOpen?'open':'closed'} onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')setHovered(false)}} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false)}}><div className="cap-announcement-inner"><div className="cap-announcement-content"><span key={shownMessage.id} className="cap-announcement-message">{shownMessage.message}</span>{shownMessage.countdown&&clock&&<span className="cap-announcement-countdown" role="timer" aria-label={shownMessage.countdown.label??'Time remaining'}>{clock.ended?'Ended':clock.text}</span>}{shownMessage.action&&(shownMessage.action.href?<a href={shownMessage.action.href} className="cap-button cap-announcement-action" data-variant="ghost" data-size="sm" onClick={()=>{shownMessage.action?.onClick?.();onAction?.(shownMessage)}}>{shownMessage.action.label}</a>:<Button type="button" size="sm" variant="ghost" className="cap-announcement-action" onClick={()=>{shownMessage.action?.onClick?.();onAction?.(shownMessage)}}>{shownMessage.action.label}</Button>)}</div><div className="cap-announcement-controls" aria-label="Управление объявлениями">{controls&&messages.length>1&&<><Button type="button" variant="ghost" size="sm" aria-label="Previous announcement" onClick={()=>setIndex(active-1)}><Icon name="chevron" className="cap-announcement-prev-icon"/></Button><Button type="button" variant="ghost" size="sm" aria-label={manuallyPaused?'Resume announcements':'Pause announcements'} onClick={()=>setManuallyPaused(v=>!v)}>{manuallyPaused?'Play':'Pause'}</Button><Button type="button" variant="ghost" size="sm" aria-label="Next announcement" onClick={()=>setIndex(active+1)}><Icon name="chevron"/></Button></>}{dismissible&&<Button type="button" variant="ghost" size="sm" aria-label="Dismiss announcement" onClick={()=>setOpen(false)}><Icon name="close"/></Button>}</div></div></div>
}

export type CardDecision = 'previous' | 'next' | 'left' | 'right';
export type CardReviewDecision = 'left' | 'right';
export interface CardStackProps<T> {
  items: T[];
  expandDirection?: StackDirection;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  activeIndex?: number;
  defaultIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  renderCard: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string;
  getLabel?: (item: T, index: number) => string;
  /** A review deck consumes every card, including the last. Omit for simple previous/next browsing. */
  review?: boolean;
  labels?: { left: string; right: string };
  onDecision?: (item: T, decision: CardDecision) => void;
  onDecide?: (item: T, decision: CardReviewDecision) => void;
  onUndo?: (item: T, decision: CardDecision) => void;
  onReset?: () => void;
  renderEmpty?: ReactNode | ((reset: () => void) => ReactNode);
  label?: string;
  className?: string;
}
type CardHistory<T> = { index: number; item: T; decision: CardDecision };
export function CardStack<T>({items,expandDirection='down',expanded:controlledExpanded,defaultExpanded=false,onExpandedChange,activeIndex,defaultIndex=0,onActiveIndexChange,renderCard,getKey,getLabel=(_,i)=>`Card ${i+1}`,review=false,labels={left:'Pass',right:'Keep'},onDecision,onDecide,onUndo,onReset,renderEmpty,label='Card review',className=''}:CardStackProps<T>){
  const [inner,setInner]=useState(defaultIndex),[history,setHistory]=useState<Array<CardHistory<T>>>([]),[dragX,setDragX]=useState(0),[returnDirection,setReturnDirection]=useState(-1),[returning,setReturning]=useState(false),[exit,setExit]=useState<{item:T;index:number;direction:number;x:number;y:number}|null>(null),[message,setMessage]=useState('');
  const drag=useRef<{pointerId:number;startX:number;width:number}|null>(null),exitTimer=useRef<ReturnType<typeof setTimeout>|null>(null),returnTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const viewport=useRef<HTMLDivElement>(null),[innerExpanded,setInnerExpanded]=useState(defaultExpanded);
  const expanded=controlledExpanded??innerExpanded;
  const current=Math.max(0,Math.min(review?items.length:Math.max(0,items.length-1),activeIndex??inner)),deck=items.slice(current,current+3),complete=review&&current>=items.length;
  const signature=deck.map((item,index)=>getKey?.(item,current+index)??String(current+index)).join('\u0000');
  const measurement=useStackSizes(viewport,signature,'.cap-card-stack-card[data-depth]',196);
  const geometry=stackLayout(deck.map((item,index)=>measurement.sizes[getKey?.(item,current+index)??String(current+index)]??{width:measurement.width,height:196}),expandDirection,expanded,10);
  useLayoutEffect(()=>{if(viewport.current)viewport.current.scrollLeft=expanded&&expandDirection==='left'?Math.max(0,geometry.width-viewport.current.clientWidth):0},[expanded,expandDirection,geometry.width]);
  useEffect(()=>()=>{if(exitTimer.current)clearTimeout(exitTimer.current);if(returnTimer.current)clearTimeout(returnTimer.current)},[]);
  const setIndex=(index:number)=>{if(activeIndex===undefined)setInner(index);onActiveIndexChange?.(index)};
  const clearExit=()=>{if(exitTimer.current)clearTimeout(exitTimer.current);exitTimer.current=setTimeout(()=>setExit(null),210)};
  const decide=(decision:CardReviewDecision)=>{
    if(!review||complete||!items[current])return;
    const item=items[current],direction=decision==='left'?-1:1;
    setExit({item,index:current,direction,x:geometry.positions[0]?.x??0,y:geometry.positions[0]?.y??0});clearExit();setHistory(previous=>[...previous,{index:current,item,decision}]);setIndex(current+1);setDragX(0);
    setMessage(`${getLabel(item,current)}: ${labels[decision]}. ${items.length-current-1} remaining.`);
    onDecision?.(item,decision);onDecide?.(item,decision);
  };
  const move=(next:number,decision:'previous'|'next')=>{
    if(review||!items.length)return;
    const index=Math.max(0,Math.min(items.length-1,next));if(index===current)return;
    const item=items[current],direction=decision==='next'?-1:1;
    setExit({item,index:current,direction,x:geometry.positions[0]?.x??0,y:geometry.positions[0]?.y??0});clearExit();setHistory(previous=>[...previous,{index:current,item,decision}]);setIndex(index);setDragX(0);
    setMessage(`${getLabel(item,current)}: ${decision}.`);onDecision?.(item,decision);
  };
  const undo=()=>{
    const last=history.at(-1);if(!last)return;
    if(exitTimer.current)clearTimeout(exitTimer.current);setExit(null);setReturnDirection(last.decision==='next'||last.decision==='left'?-1:1);setReturning(true);
    if(returnTimer.current)clearTimeout(returnTimer.current);returnTimer.current=setTimeout(()=>setReturning(false),210);
    setHistory(previous=>previous.slice(0,-1));setIndex(last.index);setMessage(`${getLabel(last.item,last.index)} restored.`);onUndo?.(last.item,last.decision);
  };
  const reset=()=>{if(!review)return;if(exitTimer.current)clearTimeout(exitTimer.current);setExit(null);setHistory([]);setIndex(0);setDragX(0);setMessage('All cards restored.');onReset?.()};
  const interactiveTarget=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="link"]');
  const down=(e:ReactPointerEvent<HTMLDivElement>)=>{if(e.button!==0||interactiveTarget(e.target)||!deck.length)return;drag.current={pointerId:e.pointerId,startX:e.clientX,width:e.currentTarget.getBoundingClientRect().width||320};e.currentTarget.setPointerCapture?.(e.pointerId)};
  const movePointer=(e:ReactPointerEvent<HTMLDivElement>)=>{if(drag.current?.pointerId===e.pointerId)setDragX(e.clientX-drag.current.startX)};
  const up=(e:ReactPointerEvent<HTMLDivElement>)=>{const state=drag.current;if(!state||state.pointerId!==e.pointerId)return;const delta=e.clientX-state.startX;drag.current=null;if(Math.abs(delta)>Math.min(64,state.width*.22)){if(review)decide(delta<0?'left':'right');else move(current+(delta<0?1:-1),delta<0?'next':'previous')}else setDragX(0)};
  const cancel=(e:ReactPointerEvent<HTMLDivElement>)=>{if(drag.current?.pointerId!==e.pointerId)return;drag.current=null;setDragX(0)};
  const onKeyDown=(e:React.KeyboardEvent<HTMLDivElement>)=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'){e.preventDefault();review?decide('right'):move(current+1,'next')}else if(e.key==='ArrowLeft'){e.preventDefault();review?decide('left'):move(current-1,'previous')}else if((e.key==='Backspace'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'))&&history.length){e.preventDefault();undo()}};
  const empty=typeof renderEmpty==='function'?renderEmpty(reset):renderEmpty;
  if(!items.length)return <section className={`cap-card-stack ${className}`} role="region" aria-label={label}>{empty??<p>No cards</p>}</section>;
  return <section className={`cap-card-stack ${className}`} role="region" aria-label={label} data-review={review||undefined} data-expanded={expanded||undefined} data-direction={expandDirection}>
    <div ref={viewport} className="cap-card-stack-viewport"><div className="cap-card-stack-stage" style={{width:geometry.width||measurement.width,height:geometry.height||196}} role="group" aria-roledescription="card stack" aria-label={label} tabIndex={0} onKeyDown={onKeyDown} onPointerDown={down} onPointerMove={movePointer} onPointerUp={up} onPointerCancel={cancel}>
      {deck.slice().reverse().map((item,reverseIndex)=>{const depth=deck.length-1-reverseIndex,index=current+depth,active=depth===0,offset=active?dragX:0,lift=drag.current?Math.min(1,Math.abs(dragX)/120):0;return <div key={getKey?.(item,index)??index} className={`cap-card-stack-card${active&&returning?' cap-card-stack-returning':''}`} data-depth={depth} data-stack-key={getKey?.(item,index)??String(index)} data-dragging={active&&drag.current!==null||undefined} data-surface="raised" aria-label={`${getLabel(item,index)}, ${index+1} of ${items.length}`} aria-hidden={!active&&!expanded||undefined} inert={!active} style={{'--cap-card-depth':depth,width:measurement.width,'--cap-card-x':`${(geometry.positions[depth]?.x??0)+offset}px`,'--cap-card-y':`${geometry.positions[depth]?.y??0}px`,'--cap-card-scale':expanded?1:1-depth*.025+lift*depth*.015,'--cap-card-rotation':`${offset*.035}deg`,'--cap-card-return-x':`${returnDirection*26}px`} as CSSProperties}>{renderCard(item,index)}{review&&active&&Math.abs(offset)>24&&<span className="cap-card-stack-stamp" data-surface="floating" data-direction={offset<0?'left':'right'} aria-hidden="true">{labels[offset<0?'left':'right']}</span>}</div>})}
      {exit&&<div key={`exit-${getKey?.(exit.item,exit.index)??exit.index}`} className="cap-card-stack-card cap-card-stack-exit" data-surface="raised" aria-hidden="true" inert style={{width:measurement.width,'--cap-card-x':`calc(${exit.x}px + ${exit.direction*110}%)`,'--cap-card-y':`${exit.y}px`,'--cap-card-exit-start-x':`${exit.x}px`,'--cap-card-exit-start-y':`${exit.y}px`,'--cap-card-rotation':`${exit.direction*8}deg`} as CSSProperties}>{renderCard(exit.item,exit.index)}</div>}
      {complete&&!exit&&<div className="cap-card-stack-empty">{empty??<><p>All cards reviewed</p><Button type="button" variant="ghost" size="sm" onClick={reset}>Start over</Button></>}</div>}
    </div>
    </div><div className="cap-card-stack-controls">
      {deck.length>1&&<Button size="sm" variant="ghost" aria-expanded={expanded} onClick={()=>{if(controlledExpanded===undefined)setInnerExpanded(!expanded);onExpandedChange?.(!expanded)}}>{expanded?'Свернуть карточки':'Развернуть карточки'}</Button>}
      {review?<><Button type="button" variant="outline" size="sm" onClick={()=>decide('left')} disabled={complete}>{labels.left}</Button><Button type="button" variant="ghost" size="sm" onClick={undo} disabled={!history.length}><Icon name="arrow"/>Undo</Button><Button type="button" variant="accent" size="sm" onClick={()=>decide('right')} disabled={complete}>{labels.right}</Button></>:<><Button type="button" variant="outline" size="sm" onClick={()=>move(current-1,'previous')} disabled={current===0}><Icon name="chevron" className="cap-announcement-prev-icon"/>Previous</Button><span aria-live="polite">{current+1} of {items.length}</span><Button type="button" variant="outline" size="sm" onClick={()=>move(current+1,'next')} disabled={current===items.length-1}>Next<Icon name="chevron"/></Button><Button type="button" variant="ghost" size="sm" onClick={undo} disabled={!history.length}><Icon name="arrow"/>Undo</Button></>}
    </div>
    <span role="status" aria-live="polite" className="cap-sr-only">{message}</span>
  </section>;
}

export interface TextShimmerProps { children:string; active?:boolean; duration?:number; as?:'span'|'p'|'div'|'h2'|'h3'|'h4'; className?:string; id?:string }
export function TextShimmer({children,active=true,duration=1.8,as='span',className='',id}:TextShimmerProps){
  const ref=useRef<HTMLElement|null>(null),[visible,setVisible]=useState(true),[hidden,setHidden]=useState(false);
  useEffect(()=>{const node=ref.current;if(!node||typeof IntersectionObserver==='undefined')return;setVisible(true);const observer=new IntersectionObserver(entries=>{const entry=entries.find(item=>item.target===node);if(entry)setVisible(entry.isIntersecting)},{rootMargin:'64px'});observer.observe(node);return()=>observer.disconnect()},[as]);
  useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);change();return()=>document.removeEventListener('visibilitychange',change)},[]);
  const Tag=as;return <Tag ref={ref as never} id={id} className={`cap-text-shimmer ${className}`} data-active={active||undefined} data-paused={!visible||hidden||undefined} aria-busy={active} style={{'--cap-shimmer-duration':`${Number.isFinite(duration)?Math.max(.4,duration):1.8}s`} as CSSProperties}>{children}</Tag>;
}
