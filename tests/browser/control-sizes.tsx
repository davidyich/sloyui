import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
const sizes: UI.Size[] = ['xs','sm','md','lg','xl'];
const options = [{value:'one',label:'First',icon:'folder' as const},{value:'two',label:'Second',icon:'page' as const}];
const noOp = () => {};
const style = document.createElement('style');
style.textContent = `body{margin:0;background:var(--cap-surface-current);color:var(--cap-content-primary);font-family:Inter,sans-serif}main{padding:20px;display:grid;gap:24px}section{min-width:0}h2{font-size:18px}.row{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.size-section{display:grid;gap:20px}.size-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:24px}.item{display:grid;gap:6px;min-width:0}#outline-scope{padding:20px;background:var(--cap-surface-current)}.modal-content{min-height:150px}.cap-icon-picker{width:100%}`;
document.head.append(style);
function Fixture() {
 const [modal,setModal]=useState(''),[side,setSide]=useState<'left'|'right'|'bottom'>('right'),[count,setCount]=useState(0);
 return <main>
 <section id="outline-scope" data-theme="light" data-surface="base" data-borders="off" data-accent="blue"><h2>Outline states</h2><div className="row"><UI.Button id="outline" size="xl" variant="outline" leading={<UI.Icon name="plus"/>} trailing={<UI.Icon name="down"/>} onClick={()=>setCount(n=>n+1)}>Outline</UI.Button><UI.Button id="secondary" size="xl">Secondary</UI.Button><UI.Button id="disabled-outline" size="xl" variant="outline" disabled onClick={()=>setCount(n=>n+1)}>Disabled</UI.Button><UI.Button id="loading-outline" size="xl" variant="outline" loading>Loading</UI.Button><output id="clicks">{count}</output></div><UI.ButtonGroup label="Outline group" size="xl"><UI.Button id="group-outline" variant="outline">Outline group</UI.Button><UI.IconButton label="Group icon" icon="plus"/></UI.ButtonGroup></section>
 <div className="size-grid">{sizes.map(size=><section key={size} id={`size-${size}`} className="size-section"><h2>{size.toUpperCase()}</h2>
 <div className="row"><UI.Button id={`button-${size}`} size={size} leading={<UI.Icon name="plus"/>} trailing={<UI.Icon name="down"/>}>Create</UI.Button><UI.IconButton id={`icon-${size}`} size={size} label={`${size} icon`} icon="plus"/><UI.Button id={`loading-${size}`} size={size} loading>Saving</UI.Button></div>
 <div className="row"><UI.Tag size={size} icon="folder" count="99+" onRemove={noOp}>Research</UI.Tag><UI.Tag size={size} shape="pill" icon="tag" count={8}>Pill</UI.Tag><UI.Counter size={size} value="9"/><UI.Counter size={size} value="999+"/><UI.Avatar size={size} name="Anna Kim"/><UI.IconBox size={size} icon="folder"/></div>
 <UI.Input label={`${size} input`} size={size} leading={<UI.Icon name="search"/>} trailing={<UI.Icon name="info"/>} defaultValue="A readable value"/>
 <UI.Input label={`${size} search`} type="search" labelPlacement="inside" size={size} leading={<UI.Icon name="search"/>} trailing={<UI.Icon name="info"/>} defaultValue="Find notes"/>
 <UI.Textarea label={`${size} textarea`} size={size} defaultValue="A multi-line description"/>
 <UI.Textarea label={`${size} inside textarea`} labelPlacement="inside" size={size} defaultValue="A multi-line description"/>
 <UI.Select label={`${size} select`} size={size} options={options} defaultValue="one"/>
 <UI.Select label={`${size} inside select`} labelPlacement="inside" size={size} options={[{value:"one",label:"A deliberately long selected option that must truncate before the arrow"}]} defaultValue="one"/>
 <UI.FloatingField label={`${size} floating`} size={size} defaultValue="Project"/>
 <div className="row"><UI.Checkbox label={`${size} checkbox`} size={size} defaultChecked/><UI.Radio label={`${size} radio`} name={`radio-${size}`} size={size} defaultChecked/><UI.Switch label={`${size} switch`} size={size} defaultChecked/></div>
 <UI.Slider label={`${size} slider`} size={size} defaultValue={40}/>
 <UI.ComboBox label={`${size} combo`} size={size} options={options} defaultValue="one"/>
 <UI.MultiSelect label={`${size} multi`} size={size} options={options} defaultValue={['one','two']}/>
 <UI.TagInput label={`${size} tags`} size={size} defaultValue={['Research','A longer tag']}/>
 <UI.RadioGroup label={`${size} choices`} size={size} options={options} defaultValue="one" variant="cards"/>
 <UI.ColorPicker label={`${size} color`} size={size}/>
 <UI.NumberField label={`${size} number`} size={size} defaultValue={42} prefix="+" suffix="%"/>
 <UI.NumberField label={`${size} compact number`} size={size} compact defaultValue={42}/>
 <UI.IconPicker label={`${size} picker`} size={size} variant="grid" options={options.map(o=>({name:o.value,icon:o.icon}))} value="one" onValueChange={noOp}/>
 <UI.IconPicker label={`${size} icon combo`} size={size} variant="combobox" options={options.map(o=>({name:o.value,icon:o.icon}))} value="one" onValueChange={noOp}/>
 <UI.SegmentedControl label={`${size} segments`} size={size} options={options.map(o=>({...o,icon:<UI.Icon name={o.icon}/>}))} value="one" onValueChange={noOp}/>
 <UI.Tabs label={`${size} tabs`} size={size} variant="segment" value="one" onValueChange={noOp} items={options.map(o=>({...o,content:'Panel content'}))}/>
 <UI.TreeView label={`${size} tree`} size={size} nodes={[{id:'root',label:'Root',icon:'folder',children:[{id:'leaf',label:'Leaf',icon:'page'}]}]} defaultExpandedIds={['root']}/>
 <UI.NavigationMenu label={`${size} nav`} size={size} items={[{id:'menu',label:'Projects',content:'Project details'},{id:'link',label:'Link',href:'#outline-scope'}]}/>
 <div className="row"><UI.Menu label={`${size} menu`} size={size} items={[{id:'copy',label:'Copy',onSelect:noOp}]}/><UI.Popover label={`${size} popover`} size={size}><UI.Button size="sm">Popup action</UI.Button></UI.Popover><UI.HoverPanel label={`${size} preview`} summary="Preview" size={size}>Details</UI.HoverPanel></div>
 <UI.ButtonGroup label={`${size} group`} size={size} prefix="99+"><UI.IconButton label={`${size} grouped icon`} icon="plus"/><UI.Button>Group</UI.Button></UI.ButtonGroup>
 <UI.SplitButton label={`${size} split`} size={size} variant="outline" items={[{id:'copy',label:'Copy',onSelect:noOp}]}/>
 <UI.ActionBar label={`${size} toolbar`} size={size}><UI.IconButton label={`${size} toolbar icon`} icon="plus"/><UI.ButtonGroup label={`${size} inherited group`} prefix="99+"><UI.Button>Grouped</UI.Button></UI.ButtonGroup><UI.ButtonGroup label={`${size} override`} size="sm"><UI.IconButton label={`${size} overridden icon`} icon="plus"/></UI.ButtonGroup></UI.ActionBar>
 <UI.FloatingActionBar label={`${size} floating toolbar`} size={size} position="static" variant="divided" leading={<UI.Counter value="9"/>} action={{label:'Save',icon:'check',onClick:noOp}}><UI.IconButton label={`${size} floating icon`} icon="plus"/></UI.FloatingActionBar>
 <UI.RichTextEditor label={`${size} editor`} toolbarSize={size} value={{blocks:[{id:'a',type:'paragraph',content:[{text:'Editable note'}]}]}} onValueChange={noOp}/>
 </section>)}</div>
 <section className="row"><UI.Button onClick={()=>setModal('dialog')}>Open XL dialog</UI.Button>{(['left','right','bottom'] as const).map(s=><UI.Button key={s} onClick={()=>{setSide(s);setModal('drawer');}}>Open XL {s} drawer</UI.Button>)}</section>
 <UI.Dialog title="XL dialog" size="xl" open={modal==='dialog'} onOpenChange={()=>setModal('')}><div className="modal-content">Large content</div></UI.Dialog><UI.Drawer title="XL drawer" size="xl" side={side} open={modal==='drawer'} onOpenChange={()=>setModal('')}><div className="modal-content">Large content</div></UI.Drawer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
