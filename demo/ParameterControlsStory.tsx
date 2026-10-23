import { useState } from 'react';
import { Icon, ParameterSlider, Slider2D, Select, Switch } from '../src';
import { StorySection } from './stories-controls';
import { useCatalogText } from './catalog-locale';

export function ParameterSliderStory() {
  const t = useCatalogText(), [value,setValue] = useState(64);
  return <StorySection title="Настройка параметров"><div style={{width:320,maxWidth:'100%',display:'grid',gap:'var(--cap-space-3)'}}>
    <ParameterSlider label={t('Насыщенность')} value={value} onValueChange={setValue} suffix="%" showHandle icon={<Icon name="sun"/>}/>
    <ParameterSlider label={t('Скругление')} defaultValue={16} max={32} suffix="px"/>
    <ParameterSlider label={t('Без индикатора')} defaultValue={40} showValue={false}/>
    <ParameterSlider label={t('Недоступно')} value={50} disabled suffix="%"/>
    <Select appearance="parameter" label={t('Интерфейс')} defaultValue="light" options={[{value:'light',label:t('Светлая')},{value:'dark',label:t('Тёмная')}]}/>
  </div></StorySection>;
}
export function Slider2DStory() {
  const t = useCatalogText(), [value,setValue] = useState({x:65,y:40}), [showFields,setShowFields] = useState(false);
  return <StorySection title="Характер заливок"><div style={{width:360,maxWidth:'100%',display:'grid',gap:'var(--cap-space-3)'}}><Switch label={t('Точные значения')} checked={showFields} onChange={event=>setShowFields(event.currentTarget.checked)}/><Slider2D label={t('Характер заливок')} value={value} onValueChange={setValue} x={{label:t('Насыщенность'),min:0,max:100,step:1,startLabel:t('Спокойнее'),endLabel:t('Ярче'),suffix:'%'}} y={{label:t('Плотность'),min:0,max:100,step:1,startLabel:t('Легче'),endLabel:t('Плотнее'),reversed:true,suffix:'%'}} showFields={showFields}/></div></StorySection>;
}
