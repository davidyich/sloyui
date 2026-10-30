import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import '../../demo/catalog-shell.css';
import { CatalogAnnouncementMessage } from '../../demo/announcement';
const style = document.createElement('style');
style.textContent = 'body{margin:0;font-family:var(--cap-font-sans);background:var(--cap-surface-current);color:var(--cap-content-primary)}main{padding:24px;display:grid;gap:24px}section{padding:20px;display:grid;gap:16px;border:1px solid var(--cap-panel-border);min-width:0}.row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}h2{font-size:16px;margin:0}.cap-floating-action-bar{width:fit-content}';
document.head.append(style);
const choices = [{value:'one',label:'Подпись'},{value:'two',label:'Подготовка'}];
function Case({ radius, density, shape }: { radius: string; density: string; shape: string }) {
 const [value,setValue] = useState('one');
 return <section data-radius={radius} data-density={density} data-corner-shape={shape} id={`${radius}-${density}-${shape}`}>
 <h2>{radius} / {density} / {shape}</h2>
 <UI.AnnouncementBar className="catalog-announcement" autoPlay={false} messages={[{id:'version',message:<CatalogAnnouncementMessage message="Новая версия [v0.10.0]" actionLabel="Смотреть" href="#changelog"/>}]}/>
 <div className="row"><UI.Tag onRemove={()=>{}}>Rounded tag</UI.Tag><UI.Tag shape="pill" onRemove={()=>{}}>Pill tag</UI.Tag><UI.Chip onRemove={()=>{}}>Rounded chip</UI.Chip><UI.IconBox icon="folder"/><UI.Counter value={42} shape="rounded"/><UI.Counter value={42}/></div>
 <UI.FileCard name="report.pdf" sizeLabel="248 KB" onRemove={()=>{}}/>
 <UI.CodeBlock language="ts">{"const radius = 'concentric';"}</UI.CodeBlock>

 <div data-surface="invert" className="cap-surface row" style={{padding:16}}>{(['surface','outline','ghost','accent'] as const).map(variant=><UI.SegmentedControl key={variant} variant={variant} options={choices} value={value} onValueChange={setValue} label={`Invert ${variant}`}/>)}<UI.Tabs items={choices.map(item=>({...item,content:''}))} value={value} onValueChange={setValue} label="Invert tabs"/></div>
 <div className="row">{(['sm','md','lg'] as UI.Size[]).map(size=><UI.SegmentedControl key={size} size={size} options={choices} value={value} onValueChange={setValue} label={`${size} segments`}/>)}</div>
 <UI.Tabs items={choices.map(item=>({...item,content:''}))} value={value} onValueChange={setValue} label="Tabs"/>
 <div className="row"><UI.ButtonGroup label="Actions" appearance="framed" size="md"><UI.Button>Подпись</UI.Button><UI.Button>Подготовка</UI.Button></UI.ButtonGroup>
 <UI.FloatingActionBar label="Floating actions" size="md"><UI.Button>Подпись</UI.Button><UI.Button>Подготовка</UI.Button></UI.FloatingActionBar>
 <UI.Menu label="Open menu" items={[{id:'one',label:'Подпись'},{id:'two',label:'Подготовка'}]}/>
 <UI.Tag shape="pill">Pill</UI.Tag><UI.Radio label="Circle" name={`${radius}-${density}-${shape}`} defaultChecked/></div>
 <div data-corner-shape="round"><UI.Input label="Local round reset" defaultValue="Round"/></div>
 </section>;
}
function GeometryAudit(){const [result,setResult]=useState('Not checked');const run=()=>{const failures:string[]=[];let cases=0;document.querySelectorAll<HTMLElement>('section .row > .cap-segmented').forEach(el=>{const style=getComputedStyle(el),child=getComputedStyle(el.querySelector('.cap-segment')!),outer=parseFloat(style.borderTopLeftRadius),inner=parseFloat(child.borderTopLeftRadius),inset=parseFloat(style.paddingLeft)+parseFloat(style.borderLeftWidth),factor=Number(style.getPropertyValue('--cap-concentric-factor'))||1;cases++;if(Math.abs(outer-Math.round((inner+inset*factor)*Number(style.getPropertyValue('--cap-radius-enabled'))))>1)failures.push(el.closest('section')!.id+':'+el.dataset.size);});document.querySelectorAll<HTMLElement>('section [data-corner-shape="round"] input').forEach(el=>{if(!['round','superellipse(1)'].includes(getComputedStyle(el).getPropertyValue('corner-shape')))failures.push('local reset');});let promoCases=0;document.querySelectorAll<HTMLElement>('section .catalog-announcement').forEach(shell=>{const scale=Number(getComputedStyle(shell).getPropertyValue('--cap-radius-scale'));for(const el of [shell,...shell.querySelectorAll<HTMLElement>('.cap-tag,.cap-button')]){const s=getComputedStyle(el),r=parseFloat(s.borderTopLeftRadius),box=el.getBoundingClientRect();promoCases++;const expected=Math.round((el===shell?12:6)*scale);if(Math.abs(r-expected)>1)failures.push('promo corner:'+el.className+':'+r+'/'+expected);if(!['round','superellipse(1)'].includes(s.getPropertyValue('corner-shape')))failures.push('promo shape:'+el.className);}});setResult(`${cases} segment geometries and ${promoCases} promo corners checked; ${failures.length} failures: ${failures.join(', ')||'none'}`);};return <><UI.Button onClick={run}>Check geometry</UI.Button><p role="status">{result}</p></>;}
createRoot(document.getElementById('root')!).render(<main><GeometryAudit/>{['default','rounded','none','compact'].flatMap(radius=>['default','compact'].flatMap(density=>['round','squircle'].map(shape=><Case key={`${radius}-${density}-${shape}`} {...{radius,density,shape}}/>)))}</main>);
