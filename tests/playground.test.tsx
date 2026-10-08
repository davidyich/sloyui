import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Playground } from '../demo/Playground';
import { SplitButton } from '../src';

it('changes Button slots, loading and resets without losing an accessible icon-only action',async()=>{
 const user=userEvent.setup(),notify=vi.fn();const {container}=render(<Playground name="Button" notify={notify}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры Button'}));
 await user.click(controls.getByRole('checkbox',{name:'Текст'}));
 await user.click(controls.getByRole('checkbox',{name:'Иконка справа'}));
 const preview=within(container.querySelector('.playground-preview')! as HTMLElement);
 const button=preview.getByRole('button',{name:'Сад идей'});expect(button.querySelectorAll('svg')).toHaveLength(2);
 await user.click(button);expect(notify).toHaveBeenCalledOnce();
 await user.click(controls.getByRole('checkbox',{name:'Loading'}));expect(button).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Сбросить'}));expect(within(container.querySelector('.playground-preview')! as HTMLElement).getByRole('button',{name:'Сад идей'})).toHaveTextContent('Сад идей');
});
it('updates Tag count text and removes all actions when the interactive control is off',async()=>{
 const user=userEvent.setup(),notify=vi.fn();const {container}=render(<Playground name="Tag" notify={notify}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры Tag'}));
 await user.clear(controls.getByRole('textbox',{name:'Счётчик'}));await user.type(controls.getByRole('textbox',{name:'Счётчик'}),'12345');
 expect(container.querySelector('.playground-preview .cap-counter')).toHaveTextContent('12345');
 await user.click(controls.getByRole('checkbox',{name:'Интерактивный'}));
 expect(container.querySelectorAll('.playground-preview button')).toHaveLength(0);
 await user.click(controls.getByRole('checkbox',{name:'Счётчик'}));expect(container.querySelector('.playground-preview .cap-counter')).toBeNull();
});
it.each(['joined','separated'] as const)('keeps %s SplitButton actions independent and inherits Floating context in its menu',async layout=>{
 const user=userEvent.setup(),main=vi.fn(),secondary=vi.fn();render(<div data-theme="dark" data-surface="canvas"><SplitButton label="Создать" layout={layout} onClick={main} items={[{id:'note',label:'Заметка',onSelect:secondary}]}/></div>);
 await user.click(screen.getByRole('button',{name:'Создать'}));expect(main).toHaveBeenCalledOnce();expect(secondary).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Создать: дополнительные действия'}));expect(screen.getByRole('menu')).toHaveAttribute('data-surface','floating');
 await user.click(screen.getByRole('menuitem',{name:'Заметка'}));expect(secondary).toHaveBeenCalledOnce();expect(main).toHaveBeenCalledOnce();
});
