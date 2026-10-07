import { useEffect, useId, useMemo, useRef, useState, type AriaAttributes, type CSSProperties } from 'react';
import { Icon, iconNames, Button, type IconSource, type Size } from './primitives.js';
import { Input, type FocusRing } from './forms.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';
export interface IconOption { name: string; icon: IconSource; keywords?: string }
export interface IconPickerProps extends Pick<AriaAttributes, 'aria-describedby' | 'aria-invalid'> {
  value?: string; onValueChange: (name: string) => void; options?: readonly IconOption[];
  iconSize?: number; label?: string; disabled?: boolean; id?: string; size?: Size;
  variant?: 'grid' | 'combobox'; focusRing?: FocusRing;
}
const aliases: Partial<Record<string,string>> = {close:'x dismiss cancel удалить закрыть', search:'find поиск', folder:'directory папка', page:'file-text document файл документ', down:'chevron-down', chevron:'chevron-right', more:'ellipsis dots', trash:'trash-2 delete удалить', settings:'cog настройки', sparkle:'sparkles', microphone:'mic', grid:'grid-2x2', sort:'arrow-down-wide-narrow', filter:'list-filter', sliders:'sliders-horizontal', book:'book-open', cube:'box', calendar:'calendar-days'};
const defaults = /* @__PURE__ */ iconNames.map(name => ({name, icon:name, keywords:aliases[name]}));
const normalize = (text: string) => text.toLocaleLowerCase().replace(/[\s_-]+/g,'');
export function IconPicker({ value, onValueChange, options = defaults, iconSize = 20, label = 'Иконки', disabled = false, variant = 'grid', size = 'md', focusRing, id: suppliedId, ...aria }: IconPickerProps) {
  const [query,setQuery] = useState(''), [limit,setLimit] = useState(120), [open,setOpen] = useState(false), [active,setActive] = useState(0), generatedId=useId(), id=suppliedId??generatedId;
  const anchor=useRef<HTMLInputElement>(null), panel=useRef<HTMLDivElement>(null);
  const scope=useOverlayScope(anchor), position=useAnchoredOverlay(open,anchor,panel,{matchWidth:true}), present=useOverlayPresence(open);
  const matches = useMemo(() => options.filter(option => normalize(`${option.name} ${option.keywords ?? ''}`).includes(normalize(query))),[options,query]);
  const visible=matches.slice(0,Math.max(limit,active+1)), selected=options.find(option=>option.name===value);
  const close=(restore=false)=>{setOpen(false);setQuery('');setActive(0);setLimit(120);if(restore)anchor.current?.focus();};
  useOverlayDismiss(open,panel,anchor,close);
  useEffect(()=>{if(disabled)close();},[disabled]);
  useEffect(()=>{if(open)panel.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({block:'nearest'});},[open,active]);
  const search=(text:string)=>{setQuery(text);setActive(0);setLimit(120);};
  const choose=(option:IconOption|undefined)=>{if(!option||disabled)return;onValueChange(option.name);close(true);};
  if(variant==='combobox')return <span className="cap-icon-combobox" style={{'--cap-picker-icon-size':`${iconSize}px`} as CSSProperties}>
    <Input focusRing={focusRing} ref={anchor} id={id} size={size} {...aria} aria-label={label} role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?`${id}-options`:undefined} aria-activedescendant={open&&matches[active]?`${id}-option-${active}`:undefined} autoComplete="off" disabled={disabled} value={open?query:value??''} placeholder={open?'Найти иконку…':'Выберите иконку…'} leading={<Icon name={open?'search':selected?.icon??'search'} size={iconSize}/>} trailing={<Icon name="down" size={14}/>} onClick={()=>{if(!open){search('');setOpen(true);}}} onChange={e=>{search(e.target.value);setOpen(true);}} onBlur={e=>{if(!panel.current?.contains(e.relatedTarget))close();}} onKeyDown={e=>{
      if(e.key==='Tab'){close();return;}
      if(e.key==='Enter'){e.preventDefault();if(open)choose(matches[active]);else{search('');setOpen(true);}return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){search('');setOpen(true);}else setActive(i=>(i+(e.key==='ArrowDown'?1:-1)+matches.length)%Math.max(1,matches.length));}
      if(open&&e.altKey&&(e.key==='Home'||e.key==='End')){e.preventDefault();setActive(e.key==='Home'?0:Math.max(0,matches.length-1));}
    }}/>
    {present&&<OverlayPortal anchor={anchor} panel={panel}><div ref={panel} role="region" aria-label={`${label}: результаты поиска`} tabIndex={0} className="cap-select-popup cap-icon-combobox-popup" data-state={open?'open':'closed'} style={position} {...scope} aria-hidden={!open||undefined} inert={!open} onMouseDown={e=>e.preventDefault()}>
      <div id={`${id}-options`} role="listbox" aria-label={label}>{visible.map((option,index)=><div key={option.name} id={`${id}-option-${index}`} className="cap-select-option cap-icon-combobox-option" role="option" aria-selected={value===option.name} data-active={active===index||undefined} onPointerMove={()=>setActive(index)} onClick={()=>choose(option)}><Icon name={option.icon} size={iconSize}/><span>{option.name}</span>{option.name===value&&<Icon name="check" size={14}/>}</div>)}</div>
      {!matches.length&&<p className="cap-icon-empty" role="status">Иконки не найдены</p>}
      {matches.length>visible.length&&<Button variant="ghost" size="sm" onClick={()=>setLimit(visible.length+120)}>Показать ещё</Button>}
    </div></OverlayPortal>}
  </span>;
  return <section className="cap-icon-picker" data-size={size} aria-label={label}><Input size={size} focusRing={focusRing} type="search" aria-label="Найти иконку" placeholder="Найти иконку…" value={query} disabled={disabled} onChange={event=>search(event.target.value)}/><div className="cap-icon-picker-grid" role="radiogroup" aria-label={label}>{visible.map(option=><label key={option.name} className="cap-icon-option" title={option.name}><input type="radio" name={id} value={option.name} checked={value===option.name} disabled={disabled} onChange={()=>onValueChange(option.name)}/><span><Icon name={option.icon} size={iconSize}/><span className="cap-sr-only">{option.name}</span></span></label>)}</div>{matches.length===0 && <p role="status">Иконки не найдены</p>}{matches.length>limit && <Button size="sm" variant="ghost" onClick={()=>setLimit(current=>current+120)}>Показать ещё</Button>}</section>;
}
