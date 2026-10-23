import { useState, type CSSProperties } from 'react';
import * as UI from '../src';
import { useCatalogText } from './catalog-locale';
import { StorySection } from './stories-controls';
import publicRoles from '../src/tokens/public-roles.json';

export function PopupSelectStory() {
 const c=useCatalogText(),[surface,setSurface]=useState('raised'),[token,setToken]=useState('--cap-focus-ring');
 const roles=new Map(publicRoles.map(role=>[role.css,role.name]));
 return <><StorySection title={c('Выбор без поиска')}><div className="catalog-row"><UI.PopupSelect label={c('Поверхность')} showLabel value={surface} onValueChange={setSurface} options={[{value:'base',label:'Page'},{value:'canvas',label:'Inset'},{value:'raised',label:'Panel'},{value:'floating',label:'Overlay'}]} popupWidth={320}/></div></StorySection>
 <StorySection title={c('Отдельное поле поиска')}><UI.PopupSelect label={c('Поверхность')} searchable searchPlacement="separate" value={surface} onValueChange={setSurface} options={[{value:'base',label:'Page'},{value:'canvas',label:'Inset'},{value:'raised',label:'Panel'},{value:'floating',label:'Overlay'}]}/></StorySection>
 <StorySection title={c('Компактный выбор токена')}><UI.PopupSelect label={c('Цвет (токен)')} searchable showLabel value={token} onValueChange={setToken} popupWidth={360} className="catalog-popup-token-example" triggerContent={<span className="catalog-popup-token-dot" style={{background:`var(${token})`}} aria-hidden="true"/>} options={UI.focusRingColorTokens.map(value=>({value,label:roles.get(value)??value,aliases:[value],leading:<span className="catalog-popup-token-dot" style={{background:`var(${value})`} as CSSProperties}/>}))}/></StorySection></>;
}
