import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import { Select } from '../src/components/forms.js';
import { NumberField } from '../src/components/selection.js';
import { ValueScrubber } from '../src/components/value-scrubber.js';
import { StorySection } from './stories-controls';

export function ValueScrubberStory() {
 const ct=useCatalogText();

  const [zoom, setZoom] = useState(100), [density, setDensity] = useState(.5), [precision, setPrecision] = useState(1.25), [view, setView] = useState('month');
  return <>
    <StorySection title={ct("Управление значением")}><div className="catalog-fields catalog-narrow">
      <ValueScrubber label={ct("Масштаб просмотра")} value={zoom} min={50} max={200} step={10} onValueChange={setZoom} formatValue={value => `${value}%`}/>
      <ValueScrubber label={ct("Плотность")} value={density} min={0} max={1} step={.05} orientation="vertical" onValueChange={setDensity} formatValue={value => `${Math.round(value * 100)}%`}/>
      <ValueScrubber label={ct("Дробное значение")} value={precision} min={0} max={5} step={.25} onValueChange={setPrecision}/>
    </div><p className="catalog-muted">{ct("Удерживайте Alt и двигайте курсор по горизонтали или вертикали. Стрелки меняют значение на шаг, Shift уменьшает шаг в десять раз.")}</p></StorySection>
    <StorySection title={ct("В числовом поле и Select")}><div className="catalog-fields catalog-narrow">
      <NumberField label={ct("Масштаб NumberField")} scrubbable min={50} max={200} step={10} suffix="%" value={zoom} onValueChange={setZoom}/>
      <Select label={ct("Период Select")} scrubbable value={view} onValueChange={setView} options={[{value:'day',label:ct('День')},{value:'week',label:ct('Неделя')},{value:'month',label:ct('Месяц')},{value:'locked',label:ct('В архиве'),disabled:true}]}/>
    </div></StorySection>
  </>;
}
