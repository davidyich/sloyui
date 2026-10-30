import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Playground } from '../demo/Playground';
import { SplitButton } from '../src';

it('updates a field ring from the compact token and fractional geometry controls',async()=>{
 const user=userEvent.setup(),{container}=render(<Playground name="Input" notify={()=>{}}/>);
 await user.click(screen.getByText('Фокус'));
 const focus=within(screen.getByRole('group',{name:'Фокус'})),input=container.querySelector('.playground-preview .cap-input')!;
 expect(input).toHaveStyle({'--cap-field-focus-offset':'0px','--cap-field-focus-color':'var(--cap-focus-ring)'});
 fireEvent.change(focus.getByRole('spinbutton',{name:'Толщина'}),{target:{value:'0.5'}});
 expect(input).toHaveStyle({'--cap-field-focus-width':'0.5px'});
 await user.click(focus.getByRole('button',{name:'Цвет (токен)'}));
 await user.click(screen.getByRole('option',{name:'border/orange-normal'}));
 expect(input).toHaveStyle({'--cap-field-focus-color':'var(--cap-v4-theme-border-orange-normal)'});
});

it('changes Button slots, loading and resets without losing an accessible icon-only action',async()=>{
 const user=userEvent.setup(),notify=vi.fn();const {container}=render(<Playground name="Button" notify={notify}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры Button'}));
 await user.click(controls.getByRole('switch',{name:'Текст'}));
 await user.click(controls.getByRole('switch',{name:'Иконка справа'}));
 const preview=within(container.querySelector('.playground-preview')! as HTMLElement);
 const button=preview.getByRole('button',{name:'Сад идей'});expect(button.querySelectorAll('svg')).toHaveLength(2);
 await user.click(button);expect(notify).toHaveBeenCalledOnce();
 await user.click(controls.getByRole('switch',{name:'Loading'}));expect(button).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Сбросить'}));expect(within(container.querySelector('.playground-preview')! as HTMLElement).getByRole('button',{name:'Сад идей'})).toHaveTextContent('Сад идей');
});
it('updates Tag count text and removes all actions when the interactive control is off',async()=>{
 const user=userEvent.setup(),notify=vi.fn();const {container}=render(<Playground name="Tag" notify={notify}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры Tag'}));
 await user.clear(controls.getByRole('textbox',{name:'Счётчик'}));await user.type(controls.getByRole('textbox',{name:'Счётчик'}),'12345');
 expect(container.querySelector('.playground-preview .cap-counter')).toHaveTextContent('12345');
 await user.click(controls.getByRole('switch',{name:'Интерактивный'}));
 expect(container.querySelectorAll('.playground-preview button')).toHaveLength(0);
 await user.click(controls.getByRole('switch',{name:'Счётчик'}));expect(container.querySelector('.playground-preview .cap-counter')).toBeNull();
});
it('updates and resets an Arc playground through compact parameter rows',async()=>{
 const user=userEvent.setup(),{container}=render(<Playground name="ValueScrubber" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры ValueScrubber'}));
 await user.clear(controls.getByRole('spinbutton',{name:'Значение'})); await user.type(controls.getByRole('spinbutton',{name:'Значение'}),'120');
 expect(within(container.querySelector('.playground-preview')!).getByRole('slider',{name:'Масштаб просмотра'})).toHaveAttribute('aria-valuenow','120');
 await user.click(controls.getByRole('switch',{name:'Показывать процент'}));
 await user.click(screen.getByRole('button',{name:'Сбросить'}));
 expect(controls.getByRole('spinbutton',{name:'Значение'})).toHaveValue(100);
 expect(controls.getByRole('switch',{name:'Показывать процент'})).toBeChecked();
});

it('opens the color parameter picker and updates the preview',async()=>{
 const user=userEvent.setup(),{container}=render(<Playground name="ColorPicker" notify={()=>{}}/>);
 const settings=within(screen.getByRole('group',{name:'Параметры ColorPicker'}));
 await user.click(settings.getByRole('button',{name:'Цвет'}));
 const dialog=screen.getByRole('dialog',{name:'Цвет: цвет'});
 const input=within(dialog).getByRole('textbox',{name:'Цвет, формат HEX'});
 await user.clear(input); await user.type(input,'#FF0000{Enter}');
 expect(container.querySelector('.playground-preview .cap-color-trigger-value')).toHaveTextContent('#FF0000');
 await user.click(within(dialog).getByRole('button',{name:'Готово'}));
 expect(settings.getByRole('button',{name:'Цвет'})).toHaveTextContent('#FF0000');
});
it('edits multiline parameters in a popup and updates the preview',async()=>{
 const user=userEvent.setup(),{container}=render(<Playground name="MarkdownPreview" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры MarkdownPreview'}));
 await user.click(controls.getByRole('button',{name:'Markdown'}));
 const editor=within(screen.getByRole('dialog',{name:'Markdown'})).getByRole('textbox',{name:'Markdown'});
 await user.clear(editor);await user.type(editor,'# Changed');
 expect(container.querySelector('.playground-preview')).toHaveTextContent('Changed');
 await user.keyboard('{Escape}');
 expect(controls.getByRole('button',{name:'Markdown'})).toHaveFocus();
});
it('scrubs numeric parameters from label or Alt-drag and cancels with Escape',()=>{
 class Pointer extends MouseEvent { pointerId:number; constructor(type:string,init:PointerEventInit={}) { super(type,init); this.pointerId=init.pointerId??0; } }
 vi.stubGlobal('PointerEvent',Pointer);
 const {container}=render(<Playground name="ValueScrubber" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры ValueScrubber'}));
 const field=controls.getByRole('spinbutton',{name:'Минимум'}), label=container.querySelectorAll('.playground-number-label')[1];
 fireEvent.pointerDown(label,{pointerId:1,button:0,clientX:100,clientY:100});
 fireEvent.pointerMove(label,{pointerId:1,clientX:120,clientY:100}); expect(field).toHaveValue(70);
 fireEvent.keyDown(window,{key:'Escape'}); expect(field).toHaveValue(50);
 fireEvent.pointerDown(field,{pointerId:2,button:0,altKey:true,clientX:100,clientY:100});
 fireEvent.pointerMove(field,{pointerId:2,altKey:true,clientX:120,clientY:100}); expect(field).toHaveValue(70);
 fireEvent.pointerMove(field,{pointerId:2,altKey:true,clientX:120,clientY:180}); expect(field).toHaveValue(70);
 fireEvent.pointerMove(field,{pointerId:2,altKey:true,clientX:140,clientY:180}); expect(field).toHaveValue(80);
 fireEvent.pointerUp(field,{pointerId:2});
 fireEvent.keyDown(field,{key:'ArrowUp',shiftKey:true}); expect(field).toHaveValue(90);
 vi.unstubAllGlobals();
});
it('accepts sizes beyond former preview presets',()=>{
 const {container}=render(<Playground name="Icon" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры Icon'}));
 fireEvent.change(controls.getByRole('spinbutton',{name:'Размер, px'}),{target:{value:'128'}});
 expect(controls.getByRole('spinbutton',{name:'Размер, px'})).toHaveValue(128);
 expect(container.querySelector('.playground-preview svg')).toHaveAttribute('width','128');
});
it('allows range limits beyond old playground presets',()=>{
 render(<Playground name="ValueScrubber" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры ValueScrubber'}));
 fireEvent.change(controls.getByRole('spinbutton',{name:'Максимум'}),{target:{value:'1000'}});
 expect(controls.getByRole('spinbutton',{name:'Максимум'})).toHaveValue(1000);
 expect(controls.getByRole('spinbutton',{name:'Значение'})).toHaveAttribute('max','1000');
});

it.each(['joined','separated'] as const)('keeps %s SplitButton actions independent and inherits Floating context in its menu',async layout=>{
 const user=userEvent.setup(),main=vi.fn(),secondary=vi.fn();render(<div data-theme="dark" data-surface="canvas"><SplitButton label="Создать" layout={layout} onClick={main} items={[{id:'note',label:'Заметка',onSelect:secondary}]}/></div>);
 await user.click(screen.getByRole('button',{name:'Создать'}));expect(main).toHaveBeenCalledOnce();expect(secondary).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Создать: дополнительные действия'}));expect(screen.getByRole('menu')).toHaveAttribute('data-surface','floating');
 await user.click(screen.getByRole('menuitem',{name:'Заметка'}));expect(secondary).toHaveBeenCalledOnce();expect(main).toHaveBeenCalledOnce();
});

it('edits the active command in the CodeBlock preview and copies its updated source',async()=>{
 const user=userEvent.setup(),writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 const {container}=render(<Playground name="CodeBlock" notify={()=>{}}/>);
 const controls=within(screen.getByRole('group',{name:'Параметры CodeBlock'}));
 await user.click(controls.getByRole('switch',{name:'Редактировать код в превью'}));
 let editor=screen.getByRole('textbox',{name:'Код в превью'});
 await user.clear(editor);await user.type(editor,'const updated = 7;');
 await user.click(within(container.querySelector('.playground-preview')!).getByRole('button',{name:'Копировать код'}));
 expect(writeText).toHaveBeenLastCalledWith('const updated = 7;');
 await user.click(controls.getByRole('switch',{name:'Выбор команды'}));
 editor=screen.getByRole('textbox',{name:'Код в превью'});
 await user.clear(editor);await user.type(editor,'pnpm add changed');
 await user.click(screen.getByRole('tab',{name:'npm'}));
 expect(screen.getByRole('textbox',{name:'Код в превью'})).toHaveValue('npm install sloyui');
 await user.click(screen.getByRole('tab',{name:'pnpm'}));
 expect(screen.getByRole('textbox',{name:'Код в превью'})).toHaveValue('pnpm add changed');
 await user.click(within(container.querySelector('.playground-preview')!).getByRole('button',{name:'Копировать код'}));
 expect(writeText).toHaveBeenLastCalledWith('pnpm add changed');
 const names=controls.getByRole('textbox',{name:'Названия опций через запятую'});
 await user.type(names,'Desktop, Mobile');
 expect(screen.getAllByRole('tab')).toHaveLength(2);
 expect(screen.getByRole('tab',{name:'Desktop'})).toHaveAttribute('aria-selected','true');
 expect(screen.getByRole('textbox',{name:'Код в превью'})).toHaveValue('pnpm add changed');
 await user.clear(names);
 await user.click(controls.getByRole('combobox',{name:'Пример опций'}));
 await user.click(screen.getByRole('option',{name:'platforms'}));
 expect(screen.getByRole('tab',{name:'macOS'})).toHaveAttribute('aria-selected','true');
 expect(screen.getByRole('textbox',{name:'Код в превью'})).toHaveValue('brew install node');
});
