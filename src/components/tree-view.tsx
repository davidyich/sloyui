import { MovingHighlight } from './moving-highlight.js';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx, Icon, type IconSource, type Size } from './primitives.js';
import { useDisclosurePresence } from './disclosure.js';
export interface TreeNode { id: string; label: string; icon?: IconSource | false; children?: TreeNode[]; disabled?: boolean; meta?: ReactNode; href?: string }
export interface TreeViewProps { nodes: TreeNode[]; label: string; selectedId?: string; onSelect?: (node:TreeNode)=>void; expandedIds?: string[]; defaultExpandedIds?: string[]; onExpandedChange?: (ids:string[])=>void; size?: Size; className?: string; showGuides?: boolean }
type Row = { node:TreeNode; level:number; parent?:string; ancestors:string[]; pos:number; count:number };
type GuideIndicator = { rowX:number; rowY:number; rowWidth:number; rowHeight:number; markerX:number; markerY:number; visible:boolean; ready:boolean };
export function TreeView({nodes,label,selectedId,onSelect,expandedIds,defaultExpandedIds=[],onExpandedChange,size='md',className,showGuides=false}:TreeViewProps){
 const id=useId(),[internal,setInternal]=useState(defaultExpandedIds),[focused,setFocused]=useState(selectedId),[indicator,setIndicator]=useState<GuideIndicator>({rowX:0,rowY:0,rowWidth:0,rowHeight:0,markerX:0,markerY:0,visible:false,ready:false}),treeRef=useRef<HTMLDivElement>(null),refs=useRef(new Map<string,HTMLElement>()),search=useRef({text:'',at:0});
 const expanded=new Set(expandedIds??internal),rows:Row[]=[];
 const flatten=(items:TreeNode[],level=1,parent?:string,ancestors:string[]=[])=> items.forEach((node,index)=>{rows.push({node,level,parent,ancestors,pos:index+1,count:items.length});if(expanded.has(node.id)&&node.children)flatten(node.children,level+1,node.id,[...ancestors,node.id]);});flatten(nodes);
 const presentRows=useDisclosurePresence(rows,row=>row.node.id);
 const presenceSignature=presentRows.map(item=>`${item.key}:${item.phase}`).join('|');
 const visibleSignature=rows.map(row=>`${row.node.id}:${row.ancestors.join('/')}`).join('|');
 useLayoutEffect(()=>{
  const tree=treeRef.current,selected=selectedId?refs.current.get(selectedId):undefined;
  if(!showGuides||!tree||!selected||!rows.some(row=>row.node.id===selectedId)){setIndicator(current=>({...current,visible:false,ready:current.ready}));return;}
  const measure=()=>{
   const currentTree=treeRef.current,currentSelected=selectedId?refs.current.get(selectedId):undefined;
   if(!currentTree||!currentSelected){setIndicator(current=>({...current,visible:false,ready:current.ready}));return;}
   const treeRect=currentTree.getBoundingClientRect(),rowRect=currentSelected.getBoundingClientRect(),guide=currentSelected.parentElement?.querySelector<HTMLElement>('.cap-tree-guide:last-child'),guideRect=guide?.getBoundingClientRect();
   setIndicator(current=>({rowX:rowRect.left-treeRect.left+currentTree.scrollLeft,rowY:rowRect.top-treeRect.top+currentTree.scrollTop,rowWidth:rowRect.width,rowHeight:rowRect.height,markerX:guideRect?guideRect.left-treeRect.left+currentTree.scrollLeft:0,markerY:rowRect.top-treeRect.top+currentTree.scrollTop+rowRect.height/2,visible:true,ready:current.ready}));
  };
  measure();
  if(typeof ResizeObserver==='undefined')return;
  // Disclosure rows resize together; measure the selection after they settle, not every frame.
  let timer:ReturnType<typeof setTimeout>;
  const widths=new WeakMap<Element,number>();
  const observer=new ResizeObserver(entries=>{
   clearTimeout(timer);
   const widthChanged=!entries.length||entries.some(entry=>widths.get(entry.target)!==entry.contentRect.width);
   entries.forEach(entry=>widths.set(entry.target,entry.contentRect.width));
   if(widthChanged)measure();else timer=setTimeout(measure,180);
  });
  observer.observe(tree);observer.observe(selected);
  return ()=>{clearTimeout(timer);observer.disconnect();};
 },[showGuides,selectedId,visibleSignature,size]);
 useEffect(()=>{if(indicator.visible&&!indicator.ready)setIndicator(current=>({...current,ready:true}));},[indicator.visible,indicator.ready]);
 const enabled=rows.filter(r=>!r.node.disabled),focusId=enabled.find(r=>r.node.id===focused)?.node.id??enabled.find(r=>r.node.id===selectedId)?.node.id??enabled[0]?.node.id;
 useLayoutEffect(()=>{
  const active=document.activeElement as HTMLElement|null;
  if(!active||!treeRef.current?.contains(active)||!active.closest('[data-presence="exit"]'))return;
  const previous=presentRows.find(item=>item.item.node.id===focused)?.item;
  const destination=previous?.ancestors.slice().reverse().find(ancestor=>enabled.some(row=>row.node.id===ancestor))??focusId;
  if(destination)refs.current.get(destination)?.focus();
 },[presenceSignature,focusId]);
 const toggle=(node:TreeNode,open=!expanded.has(node.id))=>{const next=new Set(expanded);open?next.add(node.id):next.delete(node.id);if(expandedIds===undefined)setInternal([...next]);onExpandedChange?.([...next]);};
 const focus=(nodeId?:string)=>{if(nodeId&&enabled.some(row=>row.node.id===nodeId)){setFocused(nodeId);refs.current.get(nodeId)?.focus();}};
 return <div ref={treeRef} className={cx('cap-tree','cap-shared-hover',className)} role="tree" aria-label={label} data-size={size} data-guides={showGuides||undefined}>
 <MovingHighlight root={treeRef} hover target=".cap-tree-item:not([aria-disabled=true]):not([data-presence=exit])" revision={presenceSignature}/>{showGuides&&<><span role="presentation" aria-hidden="true" className="cap-tree-selection-indicator" data-visible={indicator.visible||undefined} data-ready={indicator.ready||undefined} style={{width:indicator.rowWidth,height:indicator.rowHeight,transform:`translate3d(${indicator.rowX}px,${indicator.rowY}px,0)`}}/><span role="presentation" aria-hidden="true" className="cap-tree-active-guide-indicator" data-visible={!!(indicator.visible&&selectedId!==undefined&&rows.find(row=>row.node.id===selectedId)?.ancestors.length)||undefined} data-ready={indicator.ready||undefined} style={{transform:`translate3d(${indicator.markerX}px,${indicator.markerY}px,0) translateY(-50%)`}}/></>}
 {presentRows.map(({item:row,phase})=>{
  const exiting=phase==='exit';
  const {node,level,parent,ancestors,pos,count}=row,branch=!!node.children?.length,open=expanded.has(node.id),index=enabled.findIndex(r=>r.node.id===node.id),rowIndex=rows.findIndex(item=>item.node.id===node.id),childIds=branch&&open?rows.filter(item=>item.parent===node.id).map(item=>`${id}-item-${encodeURIComponent(item.node.id)}`).join(' '):undefined;
  const content=<><span className="cap-tree-arrow" data-open={open||undefined} aria-hidden="true">{branch&&<Icon name="chevron" size={12}/>}</span>{node.icon!==false&&<Icon name={node.icon??(branch?'folder':'page')}/>}<span className="cap-tree-label">{node.label}</span>{node.meta&&<span className="cap-tree-meta">{node.meta}</span>}</>;
  const common={id:`${id}-item-${encodeURIComponent(node.id)}`,role:'treeitem',className:'cap-tree-item','data-presence':phase,'aria-hidden':exiting||undefined,inert:exiting||undefined,'aria-label':node.label,'aria-level':level,'aria-posinset':pos,'aria-setsize':count,'aria-expanded':branch?open:undefined,'aria-owns':childIds,'aria-selected':selectedId===node.id,'aria-disabled':node.disabled||undefined,tabIndex:!exiting&&focusId===node.id?0:-1,style:{'--cap-tree-depth':level} as CSSProperties,ref:(element:HTMLElement|null)=>{if(element&&!exiting)refs.current.set(node.id,element);else refs.current.delete(node.id);},onFocus:()=>{if(!exiting)setFocused(node.id)},onClick:(event:React.MouseEvent)=>{if(exiting||node.disabled){event.preventDefault();return;}if(branch){toggle(node);return;}const modified=event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey;if(node.href&&modified)return;onSelect?.(node);},onKeyDown:(event:React.KeyboardEvent)=>{
   if(exiting)return;
   if(node.disabled)return;
   let destination:string|undefined;
   if(event.key==='ArrowDown')destination=enabled[Math.min(index+1,enabled.length-1)]?.node.id;
   else if(event.key==='ArrowUp')destination=enabled[Math.max(index-1,0)]?.node.id;
   else if(event.key==='Home')destination=enabled[0]?.node.id;
   else if(event.key==='End')destination=enabled.at(-1)?.node.id;
   else if(event.key==='ArrowRight'&&branch){if(open)destination=enabled.find(r=>r.parent===node.id)?.node.id;else toggle(node,true);}
   else if(event.key==='ArrowLeft'){if(branch&&open)toggle(node,false);else destination=parent;}
   else if(event.key==='*'){for(const sibling of rows.filter(r=>r.parent===parent&&r.node.children?.length))expanded.add(sibling.node.id);if(expandedIds===undefined)setInternal([...expanded]);onExpandedChange?.([...expanded]);}
   else if(event.key===' '){event.preventDefault();if(branch)toggle(node);else onSelect?.(node);return;}
   else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const now=Date.now(),char=event.key.toLocaleLowerCase(),previous=now-search.current.at<=600?search.current.text:'',repeating=previous.length>0&&[...previous].every(value=>value===char),text=repeating?char:previous+char;search.current={text,at:now};const ordered=[...enabled.slice(index+1),...enabled.slice(0,index+1)];destination=ordered.find(r=>r.node.label.toLocaleLowerCase().startsWith(text))?.node.id;}
   else return;
   event.preventDefault();focus(destination);
  }};
  const item=node.href&&!branch?<a key={node.id} {...common} href={node.href} aria-current={selectedId===node.id?'page':undefined}>{content}</a>:<button key={node.id} type="button" {...common}>{content}</button>;
  if(!showGuides)return item;
  if(!ancestors.length)return <div key={node.id} role="presentation" className="cap-tree-entry cap-tree-entry-root" data-presence={phase}>{item}</div>;
  return <div key={node.id} role="presentation" className="cap-tree-entry" data-presence={phase} data-guided-child="true" style={{'--cap-tree-guide-width':`${ancestors.length*16}px`} as CSSProperties}>
   <span className="cap-tree-guide-column" aria-hidden="true">{ancestors.map((ancestor,index)=><span key={ancestor} className="cap-tree-guide" data-continues={rowIndex>=0&&rows[rowIndex+1]?.ancestors.includes(ancestor)||undefined} style={{'--cap-guide-offset':`${index*16+8}px`} as CSSProperties}/>)}</span>
   {item}
  </div>;
 })}</div>;
}
