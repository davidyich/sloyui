import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import * as UI from '../src';
const initial = [
  ['cover','Обложка',true],['header','Тип объекта',true],['title','Название',true],['tags','Теги',true],
  ['content-preview','Превью контента',false],['collections','Коллекции',false],['aliases','Алиасы',false],
  ['description','Описание',true],['content','Контент',false],['last-updated','Обновлено',true],
  ['created-at','Дата создания',false],['word-count','Количество слов',false],['footer','Автор',false],
] as const;
export function CardComposer({title,density,orientation,selectionPosition,selectable,selected,onSelectedChange,onOpen}: Pick<UI.ContentCardProps,'title'|'density'|'orientation'|'selectionPosition'|'selectable'|'selected'|'onSelectedChange'|'onOpen'>) {
 const ct=useCatalogText();

  const [properties,setProperties] = useState(localizeCatalogueFixture(initial,ct).map(([id,label,visible])=>({id:String(id),label,visible:Boolean(visible)})));
  const blocks: UI.ContentCardBlock[] = [
    {id:'tags',content:<div className="catalog-row"><UI.Tag size="xs" icon="tag">{ct("Дизайн")}</UI.Tag><UI.Tag size="xs">{ct("Исследование")}</UI.Tag></div>},
    {id:'content-preview',content:<blockquote className="card-composer-quote">{ct("Сохранять наблюдения, находить связи и возвращаться к важному.")}</blockquote>},
    {id:'collections',kind:'metadata',content:<><UI.Icon name="folder" size={14}/><span>{ct("Работа · Референсы")}</span></>},
    {id:'aliases',kind:'metadata',content:<span>{ct("Также: Idea Garden, Блокнот")}</span>},
    {id:'content',content:<ul className="card-composer-notes"><li>{ct("Собрать примеры")}</li><li>{ct("Обсудить следующий шаг")}</li></ul>},
    {id:'last-updated',kind:'metadata',content:<><UI.Icon name="clock" size={13}/>{ct("Обновлено сегодня")}</>},
    {id:'created-at',kind:'metadata',content:<><UI.Icon name="calendar" size={13}/>{ct("Создано 5 октября")}</>},
    {id:'word-count',kind:'metadata',content:<span>{ct("256 слов · 2 минуты")}</span>},
  ];
  return <div className="card-composer">
    <UI.ContentCard title={title} density={density} orientation={orientation} selectionPosition={selectionPosition} selectable={selectable} selected={selected} onSelectedChange={onSelectedChange} onOpen={onOpen}
      cover={<UI.Icon name="cube" size={36}/>} header={<UI.Tag size="xs" icon="cube">{ct("Проект")}</UI.Tag>}
      description={ct("Личная коллекция наблюдений и небольших проектов.")} footer={<><UI.Avatar name={ct("Анна Ким")} size="xs"/><span>{ct("Анна Ким")}</span></>}
      blocks={blocks} blockOrder={properties.map(property=>property.id)} hiddenBlocks={properties.filter(property=>!property.visible).map(property=>property.id)}/>
    <fieldset className="card-composer-properties"><legend>{ct("Состав и порядок")}</legend>
      <UI.ScrollArea label={ct("Настройки блоков карточки")} style={{height:300}}>
        <UI.ReorderableList label={ct("Блоки карточки")} items={properties} onOrderChange={setProperties} getItemLabel={property=>property.label}
          renderItem={property=><UI.Checkbox size="sm" label={property.label} checked={property.visible} onChange={event=>setProperties(current=>current.map(entry=>entry.id===property.id?{...entry,visible:event.target.checked}:entry))}/>}/>
      </UI.ScrollArea>
    </fieldset>
  </div>;
}
export function ReorderExample({disabled=false,cards=false}: {disabled?:boolean;cards?:boolean}) {
 const ct=useCatalogText();

  const [items,setItems]=useState([{id:'ideas',title:ct('Собрать идеи')},{id:'references',title:ct('Найти референсы')},{id:'prototype',title:ct('Сделать прототип')}]);
  return <UI.ReorderableList label={ct("Порядок работы")} items={items} onOrderChange={setItems} disabled={disabled} handlePlacement={cards?'custom':'start'} getItemLabel={item=>item.title}
    renderItem={(item,{handle})=>cards?<UI.ContentCard title={item.title} density="compact" dragHandle={handle} header={<UI.Tag size="xs">{ct("Задача")}</UI.Tag>} description={ct("Порядок сохраняет состояние и действия карточки.")}/>:<div className="reorder-example-row"><UI.Icon name="page" size={16}/>{item.title}</div>}/>;
}
