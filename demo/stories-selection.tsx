import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import { ComboBox, ColorPicker, MultiSelect, NumberField, RadioGroup, TagInput, type SelectionOption } from '../src/components/selection.js';
import { Chip } from '../src/components/chip.js';
import { Sample, StorySection } from './stories-controls';

const options: SelectionOption[] = [
  { value:'design', label:'Дизайн', color:'purple', icon:'sparkle', aliases:['визуальное','макеты'], group:'Работа' },
  { value:'research', label:'Исследование', color:'blue', icon:'search', aliases:['поиск','изучение'], group:'Работа' },
  { value:'personal', label:'Личное', icon:'folder', group:'Другое' },
  { value:'archived', label:'В архиве', icon:'page', disabled:true, group:'Другое' },
];

export function ComboBoxStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState('design');
  return <StorySection title={ct("Выбор проекта")}><div className="catalog-narrow"><ComboBox label={ct("Проект")} variant="ghost" options={localizeCatalogueFixture(options,ct)} value={value} onValueChange={setValue} name="project"/><p className="catalog-muted">{ct("Начните вводить название или синоним, например «макеты».")}</p></div></StorySection>;
}

export function MultiSelectStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState(['research']);
  return <StorySection title={ct("Несколько тем")}><div className="catalog-narrow"><MultiSelect label={ct("Темы проекта")} description={ct("Выберите одну или несколько тем")} variant="ghost" options={localizeCatalogueFixture(options,ct)} value={value} onValueChange={setValue} name="topics" maxVisible={2} color="neutral"/><p className="catalog-muted">{ct("Выбранные темы остаются отмеченными в списке; очистка возвращает фокус к поиску.")}</p></div></StorySection>;
}

export function TagInputStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState([ct('Входящие'), ct('На этой неделе')]);
  return <StorySection title={ct("Метки проекта")}><div className="catalog-narrow"><TagInput label={ct("Метки")} description={ct("Переходите между метками стрелками")} variant="ghost" value={value} onValueChange={setValue} placeholder={ct("Добавить метку")} name="tags"/><p className="catalog-muted">{ct("Enter или запятая добавляют метку; Backspace выбирает последнюю, стрелки перемещают выбор, Delete удаляет.")}</p></div></StorySection>;
}

export function RadioGroupStory() {
 const ct=useCatalogText();

  const [layout, setLayout] = useState('grid');
  return <StorySection title={ct("Вид коллекции")}><RadioGroup label={ct("Представление")} variant="cards" layout="grid" value={layout} onValueChange={setLayout} options={[{value:'grid',label:ct('Карточки'),meta:ct('Популярно'),description:ct('Обзор элементов'),icon:'grid'},{value:'list',label:ct('Список'),description:ct('Компактные строки'),icon:'list'},{value:'timeline',label:ct('Хронология'),disabled:true,disabledReason:ct('Будет доступно позже'),icon:'calendar'}]}/></StorySection>;
}

export function ColorPickerStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState('#3E63DD');
  return <StorySection title={ct("Цвет акцента")}><div className="catalog-narrow"><Sample label={ct("Редактируйте HEX, RGB, HSL или OKLCH")}><ColorPicker label={ct("Цвет проекта")} variant="ghost" value={value} onValueChange={setValue} name="accent" background="#FFFFFF" showRecent/></Sample><p className="catalog-muted">{ct("HSV-плоскость и ползунки меняют оттенок и прозрачность; недавние цвета сохраняются после закрытия панели. Формат выбирается рядом с полем значения.")}</p></div></StorySection>;
}

export function NumberFieldStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState(100);
  return <StorySection title={ct("Масштаб просмотра")}><div className="catalog-narrow"><NumberField label={ct("Масштаб")} variant="ghost" compact value={value} min={50} max={200} step={10} largeStep={50} suffix="%" onValueChange={setValue}/><p className="catalog-muted">{ct("Шаг — 10%; удерживайте кнопку для повтора, PageUp/PageDown меняют масштаб крупнее, Alt + перетаскивание позволяет скраббить значение.")}</p></div></StorySection>;
}

export function SelectionStories() {
 const ct=useCatalogText();

  return <><ComboBoxStory/><MultiSelectStory/><TagInputStory/><RadioGroupStory/><ColorPickerStory/><NumberFieldStory/></>;
}

export function ChipStory() {
 const ct=useCatalogText();

  const [selected, setSelected] = useState([ct('Дизайн')]);
  const [items, setItems] = useState([ct('Дизайн'), ct('Исследование'), ct('Прототип'), ct('Документация')]);
  return <StorySection title={ct("Нейтральные метки")}><Sample label={ct("Облако тем с независимыми действиями")}><div className="demo-row">{items.map(item=><Chip key={item} selected={selected.includes(item)} onClick={()=>setSelected(current=>current.includes(item)?current.filter(value=>value!==item):[...current,item])} onRemove={()=>{setItems(current=>current.filter(value=>value!==item));setSelected(current=>current.filter(value=>value!==item));}}>{item}</Chip>)}</div></Sample><Sample label={ct("Статичная метка и размеры")}><div className="demo-row">{(['xs','sm','md','lg','xl'] as const).map(size=><Chip key={size} size={size} icon="folder">{size.toUpperCase()}</Chip>)}<Chip shape="pill" count={8}>{ct("Задачи")}</Chip><Chip disabled onRemove={()=>{}}>{ct("Недоступно")}</Chip></div></Sample></StorySection>;
}
