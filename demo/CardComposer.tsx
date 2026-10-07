import { useState } from 'react';
import * as UI from '../src';
const initial = [
  ['cover','Обложка',true],['header','Тип объекта',true],['title','Название',true],['tags','Теги',true],
  ['content-preview','Превью контента',false],['collections','Коллекции',false],['aliases','Алиасы',false],
  ['description','Описание',true],['content','Контент',false],['last-updated','Обновлено',true],
  ['created-at','Дата создания',false],['word-count','Количество слов',false],['footer','Автор',false],
] as const;
export function CardComposer({title,density,orientation,selectionPosition,selectable,selected,onSelectedChange,onOpen}: Pick<UI.ContentCardProps,'title'|'density'|'orientation'|'selectionPosition'|'selectable'|'selected'|'onSelectedChange'|'onOpen'>) {
  const [properties,setProperties] = useState(initial.map(([id,label,visible])=>({id:String(id),label,visible:Boolean(visible)})));
  const blocks: UI.ContentCardBlock[] = [
    {id:'tags',content:<div className="catalog-row"><UI.Tag size="xs" icon="tag">Дизайн</UI.Tag><UI.Tag size="xs">Исследование</UI.Tag></div>},
    {id:'content-preview',content:<blockquote className="card-composer-quote">Сохранять наблюдения, находить связи и возвращаться к важному.</blockquote>},
    {id:'collections',kind:'metadata',content:<><UI.Icon name="folder" size={14}/><span>Работа · Референсы</span></>},
    {id:'aliases',kind:'metadata',content:<span>Также: Idea Garden, Блокнот</span>},
    {id:'content',content:<ul className="card-composer-notes"><li>Собрать примеры</li><li>Обсудить следующий шаг</li></ul>},
    {id:'last-updated',kind:'metadata',content:<><UI.Icon name="clock" size={13}/>Обновлено сегодня</>},
    {id:'created-at',kind:'metadata',content:<><UI.Icon name="calendar" size={13}/>Создано 5 октября</>},
    {id:'word-count',kind:'metadata',content:<span>256 слов · 2 минуты</span>},
  ];
  return <div className="card-composer">
    <UI.ContentCard title={title} density={density} orientation={orientation} selectionPosition={selectionPosition} selectable={selectable} selected={selected} onSelectedChange={onSelectedChange} onOpen={onOpen}
      cover={<UI.Icon name="cube" size={36}/>} header={<UI.Tag size="xs" icon="cube">Проект</UI.Tag>}
      description="Личная коллекция наблюдений и небольших проектов." footer={<><UI.Avatar name="Анна Ким" size="xs"/><span>Анна Ким</span></>}
      blocks={blocks} blockOrder={properties.map(property=>property.id)} hiddenBlocks={properties.filter(property=>!property.visible).map(property=>property.id)}/>
    <fieldset className="card-composer-properties"><legend>Состав и порядок</legend>
      <UI.ScrollArea label="Настройки блоков карточки" style={{height:300}}>
        <UI.ReorderableList label="Блоки карточки" items={properties} onOrderChange={setProperties} getItemLabel={property=>property.label}
          renderItem={property=><UI.Checkbox size="sm" label={property.label} checked={property.visible} onChange={event=>setProperties(current=>current.map(entry=>entry.id===property.id?{...entry,visible:event.target.checked}:entry))}/>}/>
      </UI.ScrollArea>
    </fieldset>
  </div>;
}
export function ReorderExample({disabled=false,cards=false}: {disabled?:boolean;cards?:boolean}) {
  const [items,setItems]=useState([{id:'ideas',title:'Собрать идеи'},{id:'references',title:'Найти референсы'},{id:'prototype',title:'Сделать прототип'}]);
  return <UI.ReorderableList label="Порядок работы" items={items} onOrderChange={setItems} disabled={disabled} handlePlacement={cards?'custom':'start'} getItemLabel={item=>item.title}
    renderItem={(item,{handle})=>cards?<UI.ContentCard title={item.title} density="compact" dragHandle={handle} header={<UI.Tag size="xs">Задача</UI.Tag>} description="Порядок сохраняет состояние и действия карточки."/>:<div className="reorder-example-row"><UI.Icon name="page" size={16}/>{item.title}</div>}/>;
}
