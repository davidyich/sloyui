import {useEffect,useState} from 'react';
import * as UI from '../src';
import {AppearanceSchemeButton} from './CatalogAppearanceControls';

export interface CatalogAppearanceProps {
 theme:'light'|'dark';onTheme:(value:'light'|'dark')=>void;
 surface:'shell'|'workspace'|'content'|'overlay'|'invert'|'glass';onSurface:(value:CatalogAppearanceProps['surface'])=>void;
 accent:UI.Color;onAccent:(value:UI.Color)=>void;
 density:'default'|'compact';onDensity:(value:'default'|'compact')=>void;
 radius:string;onRadius:(value:string)=>void;
 borders:boolean;onBorders:(value:boolean)=>void;
 focusRing:boolean;onFocusRing:(value:boolean)=>void;
 surfaceScheme:'standard'|'dimmed';onSurfaceScheme:(value:'standard'|'dimmed')=>void;
}

/** The mobile bar reserves its own space; appearance controls open only on demand. */
export function CatalogMobileControls({onMenu,onSearch,...appearance}:CatalogAppearanceProps & {onMenu:()=>void;onSearch:()=>void}) {
 const t=UI.useTranslate(),[open,setOpen]=useState(false);
 const {theme,onTheme,surface,onSurface,accent,onAccent}=appearance;
 useEffect(()=>{
  const desktop=matchMedia('(min-width:721px)');
  const close=()=>{if(desktop.matches)setOpen(false);};
  desktop.addEventListener('change',close);return()=>desktop.removeEventListener('change',close);
 },[]);
 return <>
  <nav className="catalog-mobile-bar" data-surface="overlay" aria-label={t('Действия каталога','Catalogue actions')}>
   <UI.IconButton variant="ghost" icon={theme==='dark'?'moon':'sun'} label={theme==='dark'?t('Светлая тема','Light theme'):t('Тёмная тема','Dark theme')} onClick={()=>onTheme(theme==='dark'?'light':'dark')}/>
   <UI.Button variant="ghost" leading={<UI.Icon name="menu"/>} onClick={onMenu} aria-label={t('Открыть каталог','Open catalogue')}>{t('Каталог','Catalogue')}</UI.Button>
   <UI.IconButton variant="ghost" icon="search" label={t('Поиск компонентов','Find components')} onClick={onSearch}/>
   <UI.Button variant="secondary" leading={<UI.Icon name="settings"/>} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>{t('Вид','View')}</UI.Button>
  </nav>
  <UI.Drawer open={open} onOpenChange={setOpen} side="bottom" variant="edge" className="catalog-appearance-sheet" title={t('Вид каталога','Catalogue appearance')}>
   <div className="catalog-appearance-fields">
    <UI.Select appearance="parameter" label={t('Поверхность','Surface')} value={surface} onValueChange={value=>onSurface(value as typeof surface)} options={['shell','workspace','content','overlay','invert','glass'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))}/>
    <UI.Select appearance="parameter" label={t('Акцент','Accent')} value={accent} onValueChange={value=>onAccent(value as UI.Color)} options={UI.colors.map(color=>({value:color,label:color,leading:<span className="catalog-popup-color-dot" data-color={color}/>}))}/>
    <UI.Switch label={t('Компактные отступы','Compact spacing')} checked={appearance.density==='compact'} onChange={event=>appearance.onDensity(event.target.checked?'compact':'default')}/>
    <UI.Switch label={t('Максимальное скругление','Maximum corner radius')} checked={appearance.radius==='rounded'} onChange={event=>appearance.onRadius(event.target.checked?'rounded':'default')}/>
    <UI.Switch label={t('Обводки','Borders')} checked={appearance.borders} onChange={event=>appearance.onBorders(event.target.checked)}/>
    <div className="catalog-appearance-modes"><AppearanceSchemeButton appearance={appearance}/><UI.Switch label={t('Контур фокуса','Focus outline')} checked={appearance.focusRing} onChange={event=>appearance.onFocusRing(event.target.checked)}/></div>
   </div>
  </UI.Drawer>
 </>;
}
