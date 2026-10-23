import React, { useState } from 'react';
import { Button, ColorPicker, Drawer, FloatingActionBar, Icon, PopupSelect, Select, Switch, Tooltip } from '../../../src/index';
import { Contrast } from 'lucide-react';
import { surfaces } from './model.mjs';

type Props = {
  onEditNeutrals:()=>void;
  surface:string; onSurface:(value:string)=>void;
  themes:string; onThemes:(value:string)=>void;
  scheme:string; onScheme:(value:string)=>void;
  radius:string; onRadius:(value:string)=>void;
  density:string; onDensity:(value:string)=>void;
  borders:string; onBorders:(value:string)=>void;
  backgroundErrors?:Partial<Record<'Light'|'Dark',string>>;
  backgrounds:{Light:string;Dark:string}; onBackground:(theme:'Light'|'Dark',value:string)=>void;
};
const themeOptions=[{value:'Light',label:'Light'},{value:'Dark',label:'Dark'}];
const densityOptions=[{value:'default',label:'Обычно'},{value:'compact',label:'Плотно'}];
const radiusOptions=[{value:'none',label:'0 px'},{value:'compact',label:'4 px'},{value:'default',label:'8 px'},{value:'rounded',label:'16 px'}];
const surfaceOptions=surfaces.map(value=>({value,label:value==='Custom'?'Свой фон':value}));

/** The catalogue's floating controls, anchored to the preview region rather than the page. */
export function EnvironmentControls(p:Props) {
  const [open,setOpen]=useState(false);
  const backgroundThemes=['Light','Dark'] as const;
  return <>
    <div className="cap-pl-environment-dock">
      <FloatingActionBar position="static" label="Среда просмотра" rovingFocus={false} className="cap-pl-environment-toolbar">
        <PopupSelect label="Поверхность" value={p.surface} onValueChange={value=>{p.onSurface(value);if(value==='Custom')setOpen(true);}} options={surfaceOptions} side="top" align="center"/>
        <PopupSelect className="cap-pl-dock-extra" label="Плотность интерфейса" value={p.density} onValueChange={p.onDensity} options={densityOptions} side="top" align="center"/>
        <PopupSelect className="cap-pl-dock-extra" label="Скругление" value={p.radius} onValueChange={p.onRadius} options={radiusOptions} side="top" align="center"/>
        <Tooltip content={p.borders==='on'?'Выключить обводки':'Включить обводки'} variant="inverse"><Button className="cap-pl-dock-extra cap-pl-dock-icon" variant="ghost" aria-label="Границы элементов" aria-pressed={p.borders==='on'} onClick={()=>p.onBorders(p.borders==='on'?'off':'on')}><Icon name="border" size={18}/></Button></Tooltip>
        <Tooltip content={`Схема: ${p.scheme}`} variant="inverse"><Button className="cap-pl-dock-extra cap-pl-dock-icon" variant="ghost" aria-label="Схема поверхностей" aria-pressed={p.scheme==='Dimmed'} onClick={()=>p.onScheme(p.scheme==='Standard'?'Dimmed':'Standard')}><Icon name={Contrast} size={18}/></Button></Tooltip>
        <Tooltip content={p.surface==='Custom'?'Настроить фон и среду':'Настройки среды'} variant="inverse"><Button className={`cap-pl-dock-settings cap-pl-dock-icon${p.surface==='Custom'?' cap-pl-dock-settings-visible':''}`} variant="ghost" aria-label="Настройки среды" onClick={()=>setOpen(true)}><Icon name="sliders" size={18}/></Button></Tooltip>
        <Button className="cap-pl-dock-icon" variant="ghost" aria-label={p.themes==='Light'?'Включить тёмную тему':'Включить светлую тему'} onClick={()=>p.onThemes(p.themes==='Light'?'Dark':'Light')}><Icon name={p.themes==='Light'?'sun':'moon'} size={18}/></Button>
      </FloatingActionBar>
    </div>
    <Drawer open={open} onOpenChange={setOpen} title="Среда просмотра" side="right">
      <div className="cap-pl-environment-panel">
        <Button variant="secondary" onClick={()=>{setOpen(false);p.onEditNeutrals();}} leading={<Icon name="layers" size={18}/>}>Нейтральная палитра и фоны</Button>
        <Select label="Тема" appearance="parameter" value={p.themes} onValueChange={p.onThemes} options={themeOptions}/>
        <Select label="Поверхность" appearance="parameter" value={p.surface} onValueChange={p.onSurface} options={surfaceOptions}/>
        {p.surface==='Custom'&&backgroundThemes.map(theme=><ColorPicker key={theme} label={`Фон ${theme}`} value={p.backgrounds[theme]} format="hex" size="md" error={p.backgroundErrors?.[theme]} onValueChange={value=>p.onBackground(theme,value)}/>)}
        <Select label="Схема" appearance="parameter" value={p.scheme} onValueChange={p.onScheme} options={['Standard','Dimmed'].map(value=>({value,label:value}))}/>
        <Select label="Плотность" appearance="parameter" value={p.density} onValueChange={p.onDensity} options={densityOptions}/>
        <Select label="Скругление" appearance="parameter" value={p.radius} onValueChange={p.onRadius} options={radiusOptions}/>
        <Switch label="Границы элементов" checked={p.borders==='on'} onChange={e=>p.onBorders(e.target.checked?'on':'off')}/>
      </div>
    </Drawer>
  </>;
}
