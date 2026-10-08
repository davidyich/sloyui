import {describe,it,expect} from 'vitest';
import {render} from '@testing-library/react';
import {LocaleProvider} from '../src';
import {ComponentStatusDot,ComponentStatusTag} from '../demo/ComponentStatus';
import type {ComponentStatus} from '../demo/catalog';

const statuses:[ComponentStatus,string,string,string][]=[['ready','Готов','Ready','neutral'],['needs-review','Проверка','Review','pink'],['not-ready','Доработка','Rework','orange'],['archived','Архив','Archive','neutral']];

describe('Catalogue status presentation',()=>{
 it.each(statuses)('%s has a translated static tag and an accessible marker', (status,ru,en,color)=>{
   for(const [locale,label] of [['ru',ru],['en',en]] as const){
     const view=render(<LocaleProvider locale={locale}><ComponentStatusTag status={status}/><ComponentStatusDot status={status}/></LocaleProvider>);
     const tag=view.getByText(label).closest('.cap-tag');
     expect(tag).toHaveAttribute('data-color',color);
     expect(tag).not.toHaveAttribute('data-interactive');
     expect(view.getByRole('img',{name:label})).toHaveAttribute('data-accent',color);
     view.unmount();
   }
 });
});
