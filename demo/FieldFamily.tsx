import { useState } from 'react';
import * as UI from '../src';
export function FieldFamily() {
  const [inside,setInside]=useState(true);
  const placement = inside ? 'inside' : 'outside';
  return <div className="catalog-stack"><UI.Switch size="sm" label="Подпись внутри" checked={inside} onChange={event=>setInside(event.target.checked)}/><div className="catalog-fields">
    <UI.Input label="Название" labelPlacement={placement} placeholder="Сад идей"/>
    <UI.Select label="Тип объекта" labelPlacement={placement} options={[{value:'project',label:'Проект'},{value:'note',label:'Заметка'}]}/>
    <UI.Textarea label="Описание" labelPlacement={placement} rows={3} placeholder="О чём этот проект?"/>
  </div></div>;
}
