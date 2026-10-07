import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import * as UI from '../src';
export function FieldFamily() {
 const ct=useCatalogText();

  const [inside,setInside]=useState(true);
  const placement = inside ? 'inside' : 'outside';
  return <div className="catalog-stack"><UI.Switch size="sm" label={ct("Подпись внутри")} checked={inside} onChange={event=>setInside(event.target.checked)}/><div className="catalog-fields">
    <UI.Input label={ct("Название")} labelPlacement={placement} placeholder={ct("Сад идей")}/>
    <UI.Select label={ct("Тип объекта")} labelPlacement={placement} options={[{value:'project',label:ct('Проект')},{value:'note',label:ct('Заметка')}]}/>
    <UI.Textarea label={ct("Описание")} labelPlacement={placement} rows={3} placeholder={ct("О чём этот проект?")}/>
  </div></div>;
}
