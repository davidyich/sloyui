import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button, Card, CardStack, ContentCard, ContentLayout, ResizableCard, Select, ToastStack, type StackDirection } from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './layout-resize.css';
const directions:StackDirection[]=['up','down','left','right'];
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const settle=async()=>{await nextFrame();await new Promise(resolve=>setTimeout(resolve,230));await nextFrame();};
function Fixture(){
  const [vertical,setVertical]=useState(false),[autoStack,setAutoStack]=useState(false),[right,setRight]=useState(false),[direction,setDirection]=useState<StackDirection>('down'),[expanded,setExpanded]=useState(false),[size,setSize]=useState({width:360,height:240}),[active,setActive]=useState(0),[status,setStatus]=useState('Готово'),[result,setResult]=useState<unknown>(null),[running,setRunning]=useState(false);
  const [notifications,setNotifications]=useState([{id:'one',title:'Изменения сохранены',description:'Первая короткая запись.',duration:Infinity},{id:'two',title:'Новая заметка',description:'Уведомление с более длинным текстом переносится по доступной ширине.',duration:Infinity},{id:'three',title:'Готово к проверке',description:'Третий элемент проверяет layered геометрию.',duration:Infinity}]);
  const run=async()=>{
    setRunning(true); const failures:unknown[]=[]; let checks=0;
    for(const currentDirection of directions)for(const open of [false,true]){
      flushSync(()=>{setDirection(currentDirection);setExpanded(open);setActive(0)});await settle();
      for(const kind of ['card','toast']){
        const viewport=document.querySelector<HTMLElement>(`.cap-${kind}-stack-viewport`)!,front=viewport.querySelector<HTMLElement>('[data-depth="0"]')!,style=getComputedStyle(viewport),box=viewport.getBoundingClientRect(),paint=front.getBoundingClientRect();
        const left=box.left+parseFloat(style.paddingLeft),right=box.right-parseFloat(style.paddingRight),top=box.top+parseFloat(style.paddingTop),bottom=box.bottom-parseFloat(style.paddingBottom);checks++;
        if(paint.left<left-2||paint.right>right+2||paint.top<top-2||paint.bottom>bottom+2)failures.push({kind,direction:currentDirection,expanded:open,paint:{left:paint.left,right:paint.right,top:paint.top,bottom:paint.bottom},inner:{left,right,top,bottom}});
      }
      checks++;if(document.documentElement.scrollWidth>window.innerWidth+1)failures.push({direction:currentDirection,expanded:open,pageOverflow:document.documentElement.scrollWidth-window.innerWidth});
    }
    flushSync(()=>{setDirection('down');setExpanded(false);setActive(0)});await settle();
    const card=document.querySelector<HTMLElement>('.cap-resizable-card')!,host=card.closest('.resize-audit-card-host')!;checks++;
    if(card.getBoundingClientRect().width>host.getBoundingClientRect().width+1)failures.push({kind:'ResizableCard',parentOverflow:true});
    const output={checks,failures};setResult(output);setStatus(failures.length?`${failures.length} failures / ${checks} checks`:`PASS: ${checks} checks`);setRunning(false);
  };
  return <main className="resize-audit"><h1>Layout / resize / stacks</h1><p>Tab и стрелки проверяют ручки; drag — мышью или touch. Панели и карточки должны помещаться в ширину окна.</p>
    <section className="resize-audit-section"><h2>ContentLayout</h2><div className="resize-audit-controls"><Button variant="secondary" onClick={()=>setVertical(v=>!v)}>{vertical?'Vertical':'Horizontal'}</Button><Button variant="secondary" onClick={()=>setAutoStack(v=>!v)}>Auto stack: {autoStack?'On':'Off'}</Button><Button variant="secondary" onClick={()=>setRight(v=>!v)}>Правая панель: {right?'On':'Off'}</Button></div><ContentLayout orientation={vertical?'vertical':'horizontal'} collapseAt={autoStack?760:0} minContentSize={vertical?120:220} style={{height:vertical?620:360}} left={{label:'Навигация',defaultWidth:180,defaultHeight:160,content:<p>Заметки и страницы проекта.</p>}} right={{label:'Свойства',open:right,onOpenChange:setRight,defaultWidth:200,defaultHeight:180,content:<p>Описание, теги и текущий статус.</p>}}><div className="resize-audit-copy"><h3>Сад идей</h3><p>Потяните разделитель или сфокусируйте его и используйте стрелки. Escape отменяет жест.</p><ContentCard title="Следующий шаг" description="Основной контент сохраняет доступную ширину."/></div></ContentLayout></section>
    <section className="resize-audit-section"><h2>ResizableCard</h2><p>{size.width} × {size.height} px</p><div className="resize-audit-card-host"><ResizableCard label="Заметка" size={size} onSizeChange={setSize}><div className="resize-audit-copy"><h3>Исследование</h3><p>Угол появляется на hover/focus. При уменьшении окна желаемая ширина сохраняется, а видимая карточка помещается в родителя.</p><Button size="sm" variant="secondary">Вложенное действие</Button></div></ResizableCard></div></section>
    <section className="resize-audit-section"><h2>Stacks</h2><div className="resize-audit-controls"><Select label="Направление" value={direction} onValueChange={value=>setDirection(value as StackDirection)} options={directions.map(value=>({value,label:value}))}/><Button variant="secondary" onClick={()=>setExpanded(v=>!v)}>{expanded?'Свернуть':'Развернуть'}</Button></div><div className="resize-audit-stacks"><CardStack label="Card audit" expanded={expanded} onExpandedChange={setExpanded} expandDirection={direction} activeIndex={active} onActiveIndexChange={setActive} items={['Первая карточка','Длинная карточка','Последняя карточка']} renderCard={(item,index)=><Card><div className="resize-audit-copy" style={{minHeight:index===1?240:156}}><h3>{item}</h3><p>Next и Undo оставляют тени внутри viewport. Swipe принимает решение по полному жесту.</p><Button size="sm" variant="secondary">Открыть</Button></div></Card>}/><ToastStack label="Toast audit" position="inline" expandDirection={direction} expanded={expanded} onExpandedChange={setExpanded} items={notifications} onDismiss={id=>setNotifications(items=>items.filter(item=>item.id!==id))}/></div></section>
    <div className="resize-audit-controls"><Button onClick={run} disabled={running||notifications.length!==3}>Run layout checks</Button><span id="layout-resize-status" role="status">{status}</span></div><details><summary>JSON result</summary><pre id="layout-resize-result">{JSON.stringify(result,null,2)}</pre></details>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
