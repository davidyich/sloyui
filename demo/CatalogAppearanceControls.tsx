import {useRef,useState} from 'react';
import {Minimize2,SquareRoundCorner,SquareDashed,Contrast,Focus,Ellipsis,ChevronLeft} from 'lucide-react';
import * as UI from '../src';
import type {CatalogAppearanceProps} from './CatalogMobileControls';

export function AppearanceSchemeButton({appearance:a}:{appearance:CatalogAppearanceProps}) {
 const t=UI.useTranslate();
 return <UI.Tooltip content={`${t('Схема','Scheme')}: ${a.surfaceScheme==='dimmed'?'Dimmed':'Standard'}`}><UI.IconButton icon={Contrast} label={t('Приглушённая схема','Dimmed scheme')} aria-pressed={a.surfaceScheme==='dimmed'} variant="ghost" onClick={()=>a.onSurfaceScheme(a.surfaceScheme==='standard'?'dimmed':'standard')}/></UI.Tooltip>;
}

export function AppearanceButtons({appearance:a}:{appearance:CatalogAppearanceProps}) {
 const t=UI.useTranslate();
 return <>
  <UI.Tooltip content={t('Компактные отступы','Compact spacing')}><UI.IconButton icon={Minimize2} label={t('Компактные отступы','Compact spacing')} aria-pressed={a.density==='compact'} variant="ghost" onClick={()=>a.onDensity(a.density==='default'?'compact':'default')}/></UI.Tooltip>
  <UI.Tooltip content={t('Максимальное скругление','Maximum corner radius')}><UI.IconButton icon={SquareRoundCorner} label={t('Максимальное скругление','Maximum corner radius')} aria-pressed={a.radius==='rounded'} variant="ghost" onClick={()=>a.onRadius(a.radius==='rounded'?'default':'rounded')}/></UI.Tooltip>
  <UI.Tooltip content={t('Обводки','Borders')}><UI.IconButton icon={SquareDashed} label={t('Обводки','Borders')} aria-pressed={a.borders} variant="ghost" onClick={()=>a.onBorders(!a.borders)}/></UI.Tooltip>
  <AppearanceSchemeButton appearance={a}/>
  <UI.Tooltip content={t('Контур фокуса','Focus outline')}><UI.IconButton icon={Focus} label={t('Контур фокуса','Focus outline')} aria-pressed={a.focusRing} variant="ghost" onClick={()=>a.onFocusRing(!a.focusRing)}/></UI.Tooltip>
 </>;
}

/** A finite horizontal reveal keeps primary controls stable and secondary options reachable. */
export function CatalogAppearanceControls(a:CatalogAppearanceProps) {
 const t=UI.useTranslate(),[expanded,setExpanded]=useState(false),toggle=useRef<HTMLButtonElement>(null);
 const themeLabel=a.theme==='dark'?t('Светлая тема','Light theme'):t('Тёмная тема','Dark theme');
 return <UI.FloatingActionBar size="sm" position="static" label={t('Параметры превью','Preview settings')} rovingFocus={false} className="catalog-preview-toolbar catalog-appearance-toolbar" onKeyDown={event=>{if(event.key==='Escape'&&expanded){setExpanded(false);toggle.current?.focus();}}}>
  <UI.Tooltip content={themeLabel}><UI.IconButton icon={a.theme==='dark'?'moon':'sun'} label={themeLabel} variant="ghost" onClick={()=>a.onTheme(a.theme==='dark'?'light':'dark')}/></UI.Tooltip>
  <UI.PopupSelect className="catalog-accent-setting" side="top" align="center" label={t('Акцент','Accent')} value={a.accent} onValueChange={value=>a.onAccent(value as UI.Color)} triggerContent={<span className="catalog-popup-color-dot" data-color={a.accent} aria-hidden="true"/>} options={UI.colors.map(color=>({value:color,label:color,leading:<span className="catalog-popup-color-dot" data-color={color}/>}))}/>
  <UI.PopupSelect className="catalog-surface-setting" label={t('Поверхность','Surface')} side="top" align="center" value={a.surface} onValueChange={value=>a.onSurface(value as typeof a.surface)} options={['shell','workspace','content','overlay','invert','glass'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))}/>
  <div className="catalog-appearance-reveal" data-expanded={expanded} aria-hidden={!expanded} inert={!expanded} id="catalog-appearance-extra"><div className="catalog-appearance-extra"><AppearanceButtons appearance={a}/></div></div>
  <UI.Tooltip content={expanded?t('Свернуть параметры','Collapse settings'):t('Развернуть параметры','Expand settings')}><UI.IconButton ref={toggle} icon={expanded?ChevronLeft:Ellipsis} label={expanded?t('Свернуть параметры','Collapse settings'):t('Развернуть параметры','Expand settings')} aria-expanded={expanded} aria-controls="catalog-appearance-extra" variant="ghost" onClick={()=>setExpanded(value=>!value)}/></UI.Tooltip>
 </UI.FloatingActionBar>;
}
