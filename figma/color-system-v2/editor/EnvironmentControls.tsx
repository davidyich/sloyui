import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {Button,ColorPicker,Drawer,FloatingActionBar,Icon,PopupSelect,Select,Switch,Tooltip} from '../../../src/index';
import {Contrast,ChevronLeft,Ellipsis,Minimize2,SquareRoundCorner,Square} from 'lucide-react';
import {surfaces} from './model.mjs';
import {t,usePaletteLocale} from './Locale';
type Props={
 onEditNeutrals:()=>void;
 surface:string;onSurface:(value:string)=>void;themes:string;onThemes:(value:string)=>void;
 scheme:string;onScheme:(value:string)=>void;radius:string;onRadius:(value:string)=>void;
 density:string;onDensity:(value:string)=>void;borders:string;onBorders:(value:string)=>void;
 backgroundErrors?:Partial<Record<'Light'|'Dark',string>>;
 backgrounds:{Light:string;Dark:string};onBackground:(theme:'Light'|'Dark',value:string)=>void;
};
/** Desktop settings expand in place; only a narrow canvas uses a settings drawer. */
export function EnvironmentControls(p:Props){
 usePaletteLocale();
 const [open,setOpen]=useState(false),[expanded,setExpanded]=useState(false),[compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.innerWidth<640);
 const toggle=useRef<HTMLButtonElement>(null),dock=useRef<HTMLDivElement>(null),id=useId();
 useLayoutEffect(()=>{
  const node=dock.current?.closest('.cap-pl-center')??dock.current;if(!node)return;
  const measure=()=>setCompact((node.clientWidth||window.innerWidth)<640);
  measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(node);window.addEventListener('resize',measure);
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 useEffect(()=>{if(!compact)setOpen(false);},[compact]);
 const surfaceOptions=surfaces.map(value=>({value,label:value==='Custom'?t('Свой фон'):value}));
 const changeSurface=(value:string)=>{p.onSurface(value);if(value==='Custom'){if(compact)setOpen(true);else setExpanded(true);}};
 const themeLabel=t(p.themes==='Light'?'Включить тёмную тему':'Включить светлую тему');
 const expandLabel=t((compact?open:expanded)?'Свернуть параметры':'Развернуть параметры');
 return <>
 <div className="cap-pl-environment-dock" ref={dock}>
  <FloatingActionBar position="static" label={t('Среда просмотра')} size="sm" rovingFocus={false} className="cap-pl-environment-toolbar" onKeyDown={event=>{if(event.key==='Escape'&&expanded){setExpanded(false);toggle.current?.focus();}}}>
   <Tooltip content={themeLabel}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={themeLabel} onClick={()=>p.onThemes(p.themes==='Light'?'Dark':'Light')}><Icon name={p.themes==='Light'?'sun':'moon'} size={18}/></Button></Tooltip>
   <PopupSelect label={t('Поверхность')} value={p.surface} onValueChange={changeSurface} options={surfaceOptions} side="top" align="center"/>
   <div className="cap-pl-dock-reveal" data-expanded={expanded&&!compact} aria-hidden={!expanded||compact} inert={!expanded||compact} id={id}><div className="cap-pl-dock-secondary">
    <Tooltip content={t('Плотность интерфейса')}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={t('Плотность интерфейса')} aria-pressed={p.density==='compact'} onClick={()=>p.onDensity(p.density==='compact'?'default':'compact')}><Icon name={Minimize2} size={18}/></Button></Tooltip>
    <Tooltip content={t('Скругление')}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={t('Скругление')} aria-pressed={p.radius==='rounded'} disabled={p.radius==='none'} onClick={()=>p.onRadius(p.radius==='rounded'?'default':'rounded')}><Icon name={SquareRoundCorner} size={18}/></Button></Tooltip>
    <Tooltip content={t(p.borders==='on'?'Выключить обводки':'Включить обводки')}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={t('Границы элементов')} aria-pressed={p.borders==='on'} onClick={()=>p.onBorders(p.borders==='on'?'off':'on')}><Icon name="border" size={18}/></Button></Tooltip>
    <Tooltip content={`${t('Схема')}: ${p.scheme}`}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={t('Схема поверхностей')} aria-pressed={p.scheme==='Dimmed'} onClick={()=>p.onScheme(p.scheme==='Standard'?'Dimmed':'Standard')}><Icon name={Contrast} size={18}/></Button></Tooltip>
    <Tooltip content={t('Прямые углы')}><Button className="cap-pl-dock-icon" variant="ghost" aria-label={t('Прямые углы')} aria-pressed={p.radius==='none'} onClick={()=>p.onRadius(p.radius==='none'?'default':'none')}><Icon name={Square} size={18}/></Button></Tooltip>
    {!compact&&p.surface==='Custom'&&(['Light','Dark'] as const).map(theme=><div className="cap-pl-dock-custom" key={theme}><Icon name={theme==='Light'?'sun':'moon'} size={14}/><ColorPicker label={`${t('Фон')} ${theme}`} value={p.backgrounds[theme]} format="hex" size="sm" error={p.backgroundErrors?.[theme]} onValueChange={value=>p.onBackground(theme,value)}/></div>)}
   </div></div>
   <Tooltip content={expandLabel}><Button ref={toggle} className="cap-pl-dock-icon" variant="ghost" aria-label={expandLabel} aria-expanded={compact?open:expanded} aria-controls={compact?undefined:id} onClick={()=>compact?setOpen(true):setExpanded(value=>!value)}><Icon name={expanded&&!compact?ChevronLeft:Ellipsis} size={18}/></Button></Tooltip>
  </FloatingActionBar>
 </div>
 {compact&&<Drawer open={open} onOpenChange={setOpen} title={t('Среда просмотра')} side="bottom" className="cap-pl-environment-drawer"><div className="cap-pl-environment-panel">
  <Button variant="secondary" onClick={()=>{setOpen(false);p.onEditNeutrals();}} leading={<Icon name="layers" size={18}/>}>{t('Нейтральная палитра и фоны')}</Button>
  <Select label={t('Тема')} appearance="parameter" value={p.themes} onValueChange={p.onThemes} options={['Light','Dark'].map(value=>({value,label:value}))}/>
  <Select label={t('Поверхность')} appearance="parameter" value={p.surface} onValueChange={p.onSurface} options={surfaceOptions}/>
  {p.surface==='Custom'&&(['Light','Dark'] as const).map(theme=><ColorPicker key={theme} label={`${t('Фон')} ${theme}`} value={p.backgrounds[theme]} format="hex" size="md" error={p.backgroundErrors?.[theme]} onValueChange={value=>p.onBackground(theme,value)}/>)}
  <Select label={t('Схема')} appearance="parameter" value={p.scheme} onValueChange={p.onScheme} options={['Standard','Dimmed'].map(value=>({value,label:value}))}/>
  <Select label={t('Плотность')} appearance="parameter" value={p.density} onValueChange={p.onDensity} options={[{value:'default',label:t('Обычно')},{value:'compact',label:t('Плотно')}]}/>
  <Select label={t('Скругление')} appearance="parameter" value={p.radius} onValueChange={p.onRadius} options={[{value:'none',label:'0 px'},{value:'default',label:'8 px'},{value:'rounded',label:'16 px'}]}/>
  <Switch label={t('Границы элементов')} checked={p.borders==='on'} onChange={e=>p.onBorders(e.target.checked?'on':'off')}/>
 </div></Drawer>}
 </>;
}
