import {act,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import registry from '../source/component-registry.json';
import {ComponentInstruction,ComponentUsage,COMPONENT_INSTRUCTION_SAVED,parseComponentUsage} from '../demo/ComponentUsage';

vi.mock('../demo/CatalogAdmin',()=>({useCatalogAdmin:()=>({admin:false})}));
afterEach(()=>vi.unstubAllGlobals());
const response=(content:string)=>({ok:true,json:async()=>({instruction:{content}})});

describe('component instructions',()=>{
 it('covers every canonical stable ID with distinct actionable guidance in its authored language',()=>{
  const active=Object.entries(registry.components).filter(([,record])=>record.status!=='archived');
  const files=readdirSync('docs/components').filter(file=>/^cp-\d+\.md$/.test(file));
  expect(files.sort()).toEqual(active.map(([,record])=>record.id+'.md').sort());
  const choices=new Set<string>();
  for(const [name,record] of active){
   const text=readFileSync(`docs/components/${record.id}.md`,'utf8'),sections=parseComponentUsage(text);
   expect(text.startsWith(`# ${name}\n`),name).toBe(true);
   const english=sections[0]?.title==='When to choose';
   expect(sections.map(section=>section.title),name).toEqual(english?['When to choose','How to use','States and accessibility','Do',"Don't"]:['Когда выбрать','Как применять','Состояния и доступность','Делать','Не делать']);
   for(const title of (english?['Do',"Don't"]:['Делать','Не делать']))expect(sections.find(section=>section.title===title)!.content.match(/^- /gm)?.length,name).toBeGreaterThanOrEqual(2);
   const choose=sections[0].content;expect(choices.has(choose),name).toBe(false);choices.add(choose);
  }
 });
 it('preserves owner prose and code containing Markdown-looking headings',()=>{
  const sections=parseComponentUsage('# Owner intro\nKeep this explanation.\n\n## Делать\n```md\n## Sample heading\n```\n- A rule\n\n## Custom notes\nKeep this too.');
  expect(sections.map(section=>section.title)).toEqual(['','Делать','Custom notes']);
  expect(sections[0].content).toContain('Keep this explanation.');
  expect(sections[0].content).toContain('# Owner intro');
  expect(sections[1].content).toContain('## Sample heading');
 });
 it('compares paired guidance in a table while retaining custom Markdown and lone sections',()=>{
  const view=render(<ComponentInstruction content={'## Custom introduction\nOwner prose.\n\n## Делать\n- Keep labels.\n\n## Не делать\n- Hide actions.\n\n## Notes\nLast section.'}/>);
  const table=screen.getByRole('table',{name:'Рекомендации по применению'});
  expect(within(table).getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['Делать','Не делать']);
  expect(within(table).getAllByRole('cell').map(cell=>cell.textContent)).toEqual(['Keep labels.','Hide actions.']);
  expect(screen.getByText('Owner prose.')).toBeVisible();
  expect(screen.getByText('Last section.')).toBeVisible();
  view.rerender(<ComponentInstruction content={'## Делать\n- Keep labels.'}/>);
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.getByRole('heading',{name:'Делать'})).toBeVisible();
 });
 it('uses the saved API document and refreshes after the existing editor saves',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response('## Делать\n- Правило владельца')).mockResolvedValueOnce(response('## Делать\n- Обновлённое правило'));
  vi.stubGlobal('fetch',fetcher);render(<ComponentUsage componentId="cp-001" componentName="Button"/>);
  await screen.findByText('Правило владельца');
  expect(screen.queryByText('Выделять главное действие через')).toBeNull();
  act(()=>window.dispatchEvent(new CustomEvent(COMPONENT_INSTRUCTION_SAVED,{detail:'cp-001'})));
  await screen.findByText('Обновлённое правило');
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('respects a successfully saved empty document instead of restoring bundled text',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response('')));render(<ComponentUsage componentId="cp-001" componentName="Button"/>);
  await screen.findByText('Отдельная инструкция пока не добавлена.');
  expect(screen.queryByRole('heading',{name:'Делать'})).toBeNull();
 });
 it('labels bundled fallback when the API is unavailable',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));render(<ComponentUsage componentId="cp-001" componentName="Button"/>);
  await screen.findByText(/Показана инструкция из сборки/);
  expect(screen.getByRole('heading',{name:'Делать'})).toBeVisible();
 });
 it('does not show a late response from a previous component',async()=>{
  let finish!:(value:ReturnType<typeof response>)=>void;
  vi.stubGlobal('fetch',vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(response('## Делать\n- Поле ввода')));
  const view=render(<ComponentUsage componentId="cp-001" componentName="Button"/>);
  view.rerender(<ComponentUsage componentId="cp-016" componentName="Input"/>);
  await screen.findByText('Поле ввода');
  await act(async()=>finish(response('## Делать\n- Старая кнопка')));
  await waitFor(()=>expect(screen.queryByText('Старая кнопка')).toBeNull());
 });
});

it('shows actionable English guidance while retaining the owner-authored Russian source',async()=>{
 const {LocaleProvider}=await import('../src');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response('## Делать\n- Сохранённая владельцем инструкция\n\n```tsx\n<Button>Русский пример</Button>\n```')));
 render(<LocaleProvider locale="en"><ComponentUsage componentId="cp-001" componentName="Button"/></LocaleProvider>);
 await screen.findByRole('heading',{name:'Recommended usage'});
 expect(screen.getByRole('heading',{name:'Interaction contract'})).toBeInTheDocument();
 expect(screen.getByText('Original instruction (Russian)')).toBeInTheDocument();
 expect(screen.getByText('Сохранённая владельцем инструкция')).not.toBeVisible();
 screen.getByText('Original instruction (Russian)').click();
 expect(screen.getByText('Сохранённая владельцем инструкция')).toBeVisible();
 expect(screen.getByText(/Русский пример/)).toBeInTheDocument();
});
