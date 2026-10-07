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
  const [value, setValue] = useState('design');
  return <StorySection title="Выбор проекта"><div className="catalog-narrow"><ComboBox label="Проект" variant="ghost" options={options} value={value} onValueChange={setValue} name="project"/><p className="catalog-muted">Начните вводить название или синоним, например «макеты».</p></div></StorySection>;
}

export function MultiSelectStory() {
  const [value, setValue] = useState(['research']);
  return <StorySection title="Несколько тем"><div className="catalog-narrow"><MultiSelect label="Темы проекта" description="Выберите одну или несколько тем" variant="ghost" options={options} value={value} onValueChange={setValue} name="topics" maxVisible={2} color="neutral"/><p className="catalog-muted">Выбранные темы остаются отмеченными в списке; очистка возвращает фокус к поиску.</p></div></StorySection>;
}

export function TagInputStory() {
  const [value, setValue] = useState(['Входящие', 'На этой неделе']);
  return <StorySection title="Метки проекта"><div className="catalog-narrow"><TagInput label="Метки" description="Переходите между метками стрелками" variant="ghost" value={value} onValueChange={setValue} placeholder="Добавить метку" name="tags"/><p className="catalog-muted">Enter или запятая добавляют метку; Backspace выбирает последнюю, стрелки перемещают выбор, Delete удаляет.</p></div></StorySection>;
}

export function RadioGroupStory() {
  const [layout, setLayout] = useState('grid');
  return <StorySection title="Вид коллекции"><RadioGroup label="Представление" variant="cards" layout="grid" value={layout} onValueChange={setLayout} options={[{value:'grid',label:'Карточки',meta:'Популярно',description:'Обзор элементов',icon:'grid'},{value:'list',label:'Список',description:'Компактные строки',icon:'list'},{value:'timeline',label:'Хронология',disabled:true,disabledReason:'Будет доступно позже',icon:'calendar'}]}/></StorySection>;
}

export function ColorPickerStory() {
  const [value, setValue] = useState('#3E63DD');
  return <StorySection title="Цвет акцента"><div className="catalog-narrow"><Sample label="Редактируйте HEX, RGB, HSL или OKLCH"><ColorPicker label="Цвет проекта" variant="ghost" value={value} onValueChange={setValue} name="accent" background="#FFFFFF" showRecent/></Sample><p className="catalog-muted">HSV-плоскость и ползунки меняют оттенок и прозрачность; недавние цвета сохраняются после закрытия панели. Формат выбирается рядом с полем значения.</p></div></StorySection>;
}

export function NumberFieldStory() {
  const [value, setValue] = useState(100);
  return <StorySection title="Масштаб просмотра"><div className="catalog-narrow"><NumberField label="Масштаб" variant="ghost" compact value={value} min={50} max={200} step={10} largeStep={50} suffix="%" onValueChange={setValue}/><p className="catalog-muted">Шаг — 10%; удерживайте кнопку для повтора, PageUp/PageDown меняют масштаб крупнее, Alt + перетаскивание позволяет скраббить значение.</p></div></StorySection>;
}

export function SelectionStories() {
  return <><ComboBoxStory/><MultiSelectStory/><TagInputStory/><RadioGroupStory/><ColorPickerStory/><NumberFieldStory/></>;
}

export function ChipStory() {
  const [selected, setSelected] = useState(['Дизайн']);
  const [items, setItems] = useState(['Дизайн', 'Исследование', 'Прототип', 'Документация']);
  return <StorySection title="Нейтральные метки"><Sample label="Облако тем с независимыми действиями"><div className="demo-row">{items.map(item=><Chip key={item} selected={selected.includes(item)} onClick={()=>setSelected(current=>current.includes(item)?current.filter(value=>value!==item):[...current,item])} onRemove={()=>{setItems(current=>current.filter(value=>value!==item));setSelected(current=>current.filter(value=>value!==item));}}>{item}</Chip>)}</div></Sample><Sample label="Статичная метка и размеры"><div className="demo-row">{(['xs','sm','md','lg','xl'] as const).map(size=><Chip key={size} size={size} icon="folder">{size.toUpperCase()}</Chip>)}<Chip shape="pill" count={8}>Задачи</Chip><Chip disabled onRemove={()=>{}}>Недоступно</Chip></div></Sample></StorySection>;
}
