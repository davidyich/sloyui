import {useEffect,useState} from 'react';
import * as UI from '../src';
import {PublishDevelop} from './PublishDevelop';

export interface CatalogAppearanceProps {
 theme:'light'|'dark';onTheme:(value:'light'|'dark')=>void;
 surface:'shell'|'workspace'|'content'|'overlay'|'invert'|'glass';onSurface:(value:CatalogAppearanceProps['surface'])=>void;
 accent:UI.Color;onAccent:(value:UI.Color)=>void;
 density:'default'|'compact';onDensity:(value:'default'|'compact')=>void;
 radius:string;onRadius:(value:string)=>void;
 borders:boolean;onBorders:(value:boolean)=>void;
 surfaceScheme:'standard'|'dimmed';onSurfaceScheme:(value:'standard'|'dimmed')=>void;
}

/** The mobile bar reserves its own space; appearance controls open only on demand. */
export function CatalogMobileControls({onMenu,onSearch,...appearance}:CatalogAppearanceProps & {onMenu:()=>void;onSearch:()=>void}) {
 const t=UI.useTranslate(),[open,setOpen]=useState(false);
 const {theme,onTheme,surface,onSurface,accent,onAccent,density,onDensity,radius,onRadius,borders,onBorders,surfaceScheme,onSurfaceScheme}=appearance;
 useEffect(()=>{
  const desktop=matchMedia('(min-width:721px)');
  const close=()=>{if(desktop.matches)setOpen(false);};
  desktop.addEventListener('change',close);return()=>desktop.removeEventListener('change',close);
 },[]);
 return <>
  <nav className="catalog-mobile-bar" data-surface="overlay" aria-label={t('Действия каталога','Catalogue actions')}>
   <UI.Button variant="ghost" leading={<UI.Icon name="menu"/>} onClick={onMenu} aria-label={t('Открыть каталог','Open catalogue')}>{t('Каталог','Catalogue')}</UI.Button>
   <UI.IconButton variant="ghost" icon="search" label={t('Поиск компонентов','Find components')} onClick={onSearch}/>
   <UI.Button variant="secondary" leading={<UI.Icon name="settings"/>} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>{t('Вид','View')}</UI.Button>
   <UI.IconButton variant="ghost" icon={theme==='dark'?'moon':'sun'} label={theme==='dark'?t('Светлая тема','Light theme'):t('Тёмная тема','Dark theme')} onClick={()=>onTheme(theme==='dark'?'light':'dark')}/>
  </nav>
  <UI.Drawer open={open} onOpenChange={setOpen} side="bottom" variant="edge" className="catalog-appearance-sheet" title={t('Вид каталога','Catalogue appearance')}>
   <div className="catalog-appearance-fields">
    <UI.Select appearance="parameter" label={t('Тема','Theme')} value={theme} onValueChange={value=>onTheme(value as typeof theme)} options={[{value:'light',label:t('Светлая','Light')},{value:'dark',label:t('Тёмная','Dark')}]}/>
    <UI.Select appearance="parameter" label={t('Поверхность','Surface')} value={surface} onValueChange={value=>onSurface(value as typeof surface)} options={['shell','workspace','content','overlay','invert','glass'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))}/>
    <UI.Select appearance="parameter" label={t('Акцент','Accent')} value={accent} onValueChange={value=>onAccent(value as UI.Color)} options={UI.colors.map(color=>({value:color,label:color,leading:<span className="catalog-popup-color-dot" data-color={color}/>}))}/>
    <UI.Select appearance="parameter" label={t('Компактность','Density')} value={density} onValueChange={value=>onDensity(value as typeof density)} options={[{value:'default',label:t('Обычно','Default')},{value:'compact',label:t('Плотно','Compact')}]}/>
    <UI.Select appearance="parameter" label={t('Скругление','Radius')} value={radius} onValueChange={onRadius} options={[{value:'none',label:'0 px'},{value:'compact',label:'4 px'},{value:'default',label:'8 px'},{value:'rounded',label:'16 px'}]}/>
    {<UI.Select appearance="parameter" label={t('Схема','Scheme')} value={surfaceScheme} onValueChange={value=>onSurfaceScheme(value as typeof surfaceScheme)} options={[{value:'standard',label:'Standard'},{value:'dimmed',label:'Dimmed'}]}/>}
    <UI.Switch className="catalog-appearance-borders" label={t('Обводки','Borders')} checked={borders} onChange={event=>onBorders(event.target.checked)}/>
    <PublishDevelop/>
   </div>
  </UI.Drawer>
 </>;
}
