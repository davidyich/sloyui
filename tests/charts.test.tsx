import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { ActivityHeatmap, AnimatedCounter, BarChart, BrushChart, DonutChart, Gauge, LineChart, Ridgeline, SlopeChart, Sparkline, Streamgraph, Treemap, WaffleChart } from '../src/components/charts';

describe('chart families',()=>{
  it('renders accessible chart descriptions and data table rows',()=>{
    render(<LineChart label="Weekly output" labels={['Mon','Tue']} series={[{name:'Notes',values:[2,4]}]}/>);
    expect(screen.getByRole('group',{name:'Weekly output'})).toBeInTheDocument();
    fireEvent.click(screen.getByText('View data table'));
    expect(screen.getAllByRole('cell',{name:'Notes'})).toHaveLength(2);
    expect(screen.getAllByText('Mon')).toHaveLength(2);
  });

  it('keeps zero and negative bars operable and reports selected data',()=>{
    const select=vi.fn();
    render(<BarChart label="Balance" data={[{label:'Credit',value:0},{label:'Debt',value:-5}]} onSelect={select}/>);
    const debt=screen.getByRole('button',{name:'Debt: -5'});
    fireEvent.keyDown(debt,{key:'Enter'});
    expect(select).toHaveBeenCalledWith({label:'Debt',value:-5},1);
  });

  it('handles empty and all-zero charts without invalid SVG values',()=>{
    const {container}=render(<><DonutChart label="Empty" data={[]}/><WaffleChart label="None" data={[]}/><WaffleChart label="Zero allocation" data={[{label:'No share',value:0}]}/><Treemap label="Tree" data={[]}/></>);
    expect(container.querySelectorAll('svg[aria-label]').length).toBe(4);
    expect(container.querySelectorAll('[aria-label="None cells"] [role="button"]')).toHaveLength(0);
    expect(container.querySelectorAll('[aria-label="Zero allocation cells"] [role="button"]')).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('lets donut slices drive the center readout and supports a controlled hideable legend',()=>{
    const hidden=vi.fn(),{container}=render(<DonutChart label="Sources" activeKey="referral" hiddenKeys={[]} onHiddenKeysChange={hidden} legendAction="toggle" data={[{id:'search',label:'Search',value:6},{id:'referral',label:'Referral',value:4}]}/>);
    const referral=screen.getByRole('button',{name:'Referral: 4'});
    fireEvent.focus(referral);
    expect(container.querySelector('.cap-chart-center-value')).toHaveTextContent('4');
    expect(container.querySelector('.cap-chart-center-label')).toHaveTextContent('Referral');
    fireEvent.click(screen.getByRole('button',{name:'Search'}));
    expect(hidden).toHaveBeenCalledWith(['search']);
  });

  it('exposes gauge keyboard adjustment and clamps values',()=>{
    const change=vi.fn();
    render(<Gauge label="Completion" value={240} min={10} max={110} onValueChange={change}/>);
    const slider=screen.getByRole('slider',{name:'Completion'});
    expect(slider).toHaveAttribute('aria-valuenow','110');
    fireEvent.keyDown(slider,{key:'ArrowLeft'});
    expect(change).toHaveBeenCalledWith(105);
  });

  it('makes individual heatmap days keyboard selectable',()=>{
    const select=vi.fn();
    render(<ActivityHeatmap label="Year" year={2024} data={[{date:'2024-01-01',value:3}]} onSelect={select}/>);
    const day=screen.getByRole('button',{name:'2024-01-01: 3 activities'});
    fireEvent.keyDown(day,{key:' '});
    expect(select).toHaveBeenCalledWith({date:'2024-01-01',value:3});
  });

  it('maps positive and negative bars around the actual zero baseline',()=>{
    const {container}=render(<BarChart label="Net change" height={220} data={[{label:'Gain',value:6},{label:'Loss',value:-3},{label:'Flat',value:0}]}/>);
    const zero=Number(container.querySelector('.cap-chart-zero')?.getAttribute('y1'));
    const bars=[...container.querySelectorAll<SVGRectElement>('.cap-chart-bar')];
    expect(Number(bars[0].getAttribute('y'))+Number(bars[0].getAttribute('height'))).toBeCloseTo(zero);
    expect(Number(bars[1].getAttribute('y'))).toBeCloseTo(zero);
    expect(Number(bars[0].getAttribute('y'))).toBeLessThan(zero);
    expect(Number(bars[1].getAttribute('height'))).toBeGreaterThan(0);
  });

  it('keeps all-zero bar and stream baselines inside the plot instead of pinning them to an edge',()=>{
    const {container}=render(<><BarChart label="Zero bars" height={220} data={[{label:'Flat',value:0}]}/><Streamgraph label="Zero stream" offset="zero" height={240} series={[{name:'Flat',values:[0,0]}]}/></>);
    const barSvg=container.querySelector('svg[aria-label="Zero bars"]')!,zero=Number(barSvg.querySelector('.cap-chart-zero')?.getAttribute('y1')),bar=barSvg.querySelector('.cap-chart-bar')!;
    expect(zero).toBeCloseTo(196);
    expect(Number(bar.getAttribute('y'))+Number(bar.getAttribute('height'))).toBeCloseTo(zero+.5);
    const stream=container.querySelector('svg[aria-label="Zero stream"] polygon')!,streamY=Number(stream.getAttribute('points')!.split(' ')[0].split(',')[1]);
    expect(streamY).toBeCloseTo(120);
  });

  it('shows the average, exposes a scrubbed value, and roves bar keyboard focus',()=>{
    const active=vi.fn(),{container}=render(<BarChart label="Daily totals" data={[{label:'Mon',value:2},{label:'Tue',value:8}]} onActiveChange={active}/>);
    expect(container.querySelector('.cap-chart-range')).toHaveTextContent('Average: 5');
    const monday=screen.getByRole('button',{name:'Mon: 2'}),tuesday=screen.getByRole('button',{name:'Tue: 8'});
    expect(monday).toHaveAttribute('tabindex','0'); expect(tuesday).toHaveAttribute('tabindex','-1');
    fireEvent.keyDown(monday,{key:'ArrowRight'});
    expect(tuesday).toHaveAttribute('tabindex','0');
    expect(active).toHaveBeenLastCalledWith({label:'Tue',value:8},1);
    expect(container.querySelector('.cap-chart-range')).toHaveTextContent('Tue: 8');
  });

  it('toggles line series and shows a readable crosshair value without hiding controls from assistive tech',()=>{
    render(<LineChart label="Output" labels={['Mon','Tue']} series={[{name:'Notes',values:[2,4]},{name:'Tasks',values:[1,3]}]}/>);
    const point=screen.getByRole('button',{name:'Notes, Mon: 2'}),next=screen.getByRole('button',{name:'Notes, Tue: 4'}),other=screen.getByRole('button',{name:'Tasks, Tue: 3'});
    expect(document.querySelectorAll('.cap-chart-point[tabindex="0"]')).toHaveLength(1);
    fireEvent.focus(point);fireEvent.keyDown(point,{key:'ArrowRight'});
    expect(next).toHaveAttribute('tabindex','0');fireEvent.keyDown(next,{key:'ArrowDown'});
    expect(other).toHaveAttribute('tabindex','0');
    expect(screen.getByText('Tue · Tasks: 3')).toBeInTheDocument();
    const series=screen.getByRole('button',{name:'Notes'});
    fireEvent.click(series);
    expect(series).toHaveAttribute('aria-pressed','false');
    expect(document.querySelector('[data-series="Notes"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Tasks'})).toHaveAttribute('aria-pressed','true');
  });

  it('uses supplied point labels for a sparse readable x-axis',()=>{
    const labels=Array.from({length:20},(_,index)=>`Day ${index+1}`);
    const {container}=render(<LineChart label="Timeline" labels={labels} series={[{name:'Notes',values:labels.map((_,index)=>index)}]}/>);
    const ticks=[...container.querySelectorAll('.cap-chart-x-label')].map(node=>node.textContent);
    expect(ticks[0]).toBe('Day 1');
    expect(ticks.at(-1)).toBe('Day 20');
    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it('keeps the remaining line visible when the series data shrinks',()=>{
    const {rerender}=render(<LineChart label="Changing output" series={[{name:'Notes',values:[2,4]},{name:'Tasks',values:[1,3]}]}/>);
    fireEvent.click(screen.getByRole('button',{name:'Notes'}));
    rerender(<LineChart label="Changing output" series={[{name:'Notes',values:[2,4]}]}/>);
    expect(document.querySelector('[data-series="Notes"]')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Notes'})).toHaveAttribute('aria-pressed','true');
  });

  it('keeps negative streamgraph layers in the plot and can isolate a layer',()=>{
    const select=vi.fn();
    const {container}=render(<Streamgraph label="Net flow" labels={['A','B','C']} series={[{name:'Up',values:[3,-2,4]},{name:'Down',values:[-1,-4,2]}]} onLayerSelect={select}/>);
    const up=screen.getByRole('button',{name:'Focus Up'});
    fireEvent.click(up);
    expect(select).toHaveBeenCalledWith('Up',0);
    expect(up).toHaveAttribute('aria-pressed','true');
    expect(container.querySelector('[data-series="Down"]')).toHaveAttribute('opacity','0.18');
    expect(container.querySelectorAll('.cap-chart-area').length).toBe(2);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('reports visible streamgraph layers as visible and preserves signed ridgeline distributions',()=>{
    render(<><Streamgraph label="Flow" series={[{name:'In',values:[2,-1]}]}/><Ridgeline label="Latency" series={[{name:'Signed',values:[-10,-2,0,2,8]}]}/></>);
    expect(screen.getByRole('button',{name:'In'})).toHaveAttribute('aria-pressed','true');
    expect(screen.getByRole('button',{name:/Signed: нижний квартиль -2, медиана 0, верхний квартиль 2/})).toBeInTheDocument();
  });

  it('centers streamgraph baselines by mode and reports a focused time point',()=>{
    const {container,rerender}=render(<Streamgraph label="Mix" labels={['Mon','Tue','Wed']} series={[{name:'Notes',values:[2,3,2]},{name:'Tasks',values:[3,2,3]}]}/>);
    const wiggle=Number(container.querySelector('.cap-chart-zero')?.getAttribute('y1'));
    fireEvent.focus(screen.getByRole('button',{name:'Focus Notes'}));
    expect(screen.getByText('Mon · Notes: 2')).toBeInTheDocument();
    rerender(<Streamgraph label="Mix" offset="zero" labels={['Mon','Tue','Wed']} series={[{name:'Notes',values:[2,3,2]},{name:'Tasks',values:[3,2,3]}]}/>);
    const zero=Number(container.querySelector('.cap-chart-zero')?.getAttribute('y1'));
    expect(wiggle).not.toBeCloseTo(zero);
  });

  it('stacks positive and negative streamgraph layers between their real boundaries',()=>{
    const {container}=render(<Streamgraph label="Stack geometry" offset="zero" height={240} directLabels={false} series={[{id:'lower',name:'Lower',values:[2,2]},{id:'upper',name:'Upper',values:[3,3]}]}/>);
    const upper=[...container.querySelectorAll<SVGPolygonElement>('.cap-chart-layer polygon')][1];
    const points=upper.getAttribute('points')!.split(' ').map(point=>point.split(',').map(Number));
    expect(points[0][1]).toBeLessThan(points.at(-1)![1]);
    expect(points[2][1]).toBeCloseTo(24+(3/5)*192,4);

    const mixed=render(<Streamgraph label="Mixed stack geometry" offset="zero" height={240} directLabels={false} series={[{id:'lower',name:'Lower',values:[2,-2]},{id:'upper',name:'Upper',values:[3,-3]}]}/>);
    const negativeUpper=[...mixed.container.querySelectorAll<SVGPolygonElement>('.cap-chart-layer polygon')][1].getAttribute('points')!.split(' ').map(point=>point.split(',').map(Number));
    expect(negativeUpper[1][1]).toBeGreaterThan(negativeUpper[2][1]);
    expect(negativeUpper[2][1]).toBeCloseTo(24+(7/10)*192,4);
  });

  it('keys streamgraph visibility by stable series ID and reports hidden keys',()=>{
    const change=vi.fn();
    render(<Streamgraph label="Stable mix" series={[{id:'notes-id',name:'Notes',values:[2,4]},{id:'tasks-id',name:'Tasks',values:[1,3]}]} onHiddenSeriesChange={change}/>);
    fireEvent.click(screen.getByRole('button',{name:'Notes'}));
    expect(change).toHaveBeenCalledWith(['notes-id']);
  });

  it('draws filled distribution ridges and reports quartiles',()=>{
    render(<Ridgeline label="Response distribution" series={[{name:'North',values:[1,2,3,4,10]},{name:'South',values:[2,3,4,5,6]}]}/>);
    expect(screen.getByRole('button',{name:/North: нижний квартиль 2, медиана 3, верхний квартиль 4/})).toBeInTheDocument();
    expect(document.querySelectorAll('.cap-chart-ridge-area').length).toBe(2);
    expect(screen.getByText(/Q1 2 · Median 3 · Q3 4/)).toBeInTheDocument();
  });

  it('lifts the focused ridgeline and reports its stable active key',()=>{
    const active=vi.fn(),{container}=render(<Ridgeline label="Latency" series={[{id:'north-id',name:'North',values:[1,2,3,4,5]},{id:'south-id',name:'South',values:[2,3,4,5,6]}]} onActiveChange={active}/>);
    const north=screen.getByRole('button',{name:/North: нижний квартиль/});
    fireEvent.mouseEnter(north);
    expect(north).toHaveAttribute('data-active','true');
    expect(active).toHaveBeenCalledWith('north-id');
    expect(container.querySelector('.cap-chart-ridge[data-active=true]')).toBe(north);
  });

  it('keeps heatmap and waffle cells to one tab stop while supporting arrow navigation',()=>{
    const {container}=render(<><ActivityHeatmap label="Leap year" year={2024} data={[]}/><WaffleChart label="Allocation" data={[{label:'A',value:1},{label:'B',value:3}]}/></>);
    const heatCells=container.querySelectorAll('[role="group"][aria-label="Leap year, 2024 days"] [role="button"]');
    const waffleCells=container.querySelectorAll('[role="group"][aria-label="Allocation cells"] [role="button"]');
    expect(heatCells.length).toBe(366);
    expect(waffleCells.length).toBe(100);
    const tabbable=container.querySelectorAll('[role="button"][tabindex="0"]'); expect(tabbable).toHaveLength(2);
    const first=screen.getByRole('button',{name:'2024-01-01: 0 activities'}); fireEvent.keyDown(first,{key:'ArrowRight'});
    expect(screen.getByRole('button',{name:'2024-01-08: 0 activities'})).toHaveAttribute('tabindex','0');
  });

  it('uses valid accessible semantics for heatmap and waffle cells',async()=>{
    const {container}=render(<><ActivityHeatmap label="Audit activity" year={2024} data={[]}/><WaffleChart label="Audit allocation" data={[{label:'A',value:1}]}/></>);
    expect((await axe.run(container,{rules:{'color-contrast':{enabled:false}}})).violations).toEqual([]);
  // A full leap year plus waffle has 466 SVG controls; axe needs more time on CI CPUs.
  },20_000);

  it('allocates exactly 100 waffle cells by largest remainder and activates data by keyboard',()=>{
    const select=vi.fn(),{container}=render(<WaffleChart label="Share" columns={8} data={[{label:'A',value:1},{label:'B',value:2}]} onSelect={select}/>);
    const cells=container.querySelectorAll('[role="group"][aria-label="Share cells"] [role="button"]');
    expect(cells).toHaveLength(100); expect(container.querySelectorAll('[role="button"][tabindex="0"]')).toHaveLength(1);
    fireEvent.click(screen.getByText('View data table'));
    expect(screen.getByRole('row',{name:/A Percent 33\.33%/})).toBeInTheDocument();
    fireEvent.keyDown(screen.getAllByRole('button',{name:/A: 1/})[0],{key:'Enter'});
    expect(select).toHaveBeenCalledWith({label:'A',value:1});
  });

  it('preserves treemap areas and drills through parent children with a working breadcrumb',()=>{
    const select=vi.fn(),{container}=render(<Treemap label="Storage" data={[{label:'Work',value:0,children:[{label:'Research',value:3},{label:'Design',value:1}]},{label:'Home',value:0,children:[{label:'Photos',value:4}]}]} onSelect={select}/>);
    const rects=[...container.querySelectorAll<SVGRectElement>('.cap-treemap-item > .cap-chart-cell')];
    expect(rects).toHaveLength(2);
    expect(Number(rects[0].getAttribute('data-area'))/Number(rects[1].getAttribute('data-area'))).toBeCloseTo(1);
    fireEvent.click(screen.getByRole('button',{name:/Work: 4/}));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({label:'Work'}));
    expect(screen.getByRole('button',{name:'Research: 3'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Storage'}));
    expect(screen.getByRole('button',{name:/Home: 4/})).toBeInTheDocument();
  });

  it('squarifies treemap tiles, reports a secondary measure, and supports controlled focus',()=>{
    const change=vi.fn(),{container}=render(<Treemap label="Revenue" colorLabel="Growth" formatColor={v=>`${v}%`} focus="region" onFocusChange={change} data={[{id:'region',label:'Region',value:0,colorValue:12,children:[{id:'a',label:'North',value:7,colorValue:22},{id:'b',label:'South',value:2,colorValue:-4,children:[{id:'b-city',label:'City',value:2,colorValue:-4}]},{id:'c',label:'East',value:1,colorValue:0}]}]}/>);
    const rects=[...container.querySelectorAll<SVGRectElement>('.cap-treemap-item > .cap-chart-cell')];
    expect(rects).toHaveLength(3);
    expect(new Set(rects.map(rect=>rect.getAttribute('x'))).size).toBeGreaterThan(1);
    expect(screen.getByRole('button',{name:/North: 7, Growth: 22%/})).toBeInTheDocument();
    expect(screen.getByText('-4%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/South: 2/}));
    expect(change).toHaveBeenCalledWith('b');
  });

  it('keeps a large treemap to one tab stop and navigates to the nearest tile',()=>{
    const data=Array.from({length:12},(_,index)=>({id:`tile-${index}`,label:`Tile ${index}`,value:index+1}));
    const {container}=render(<Treemap label="Many tiles" data={data}/>);
    expect(container.querySelectorAll('.cap-treemap-item[tabindex="0"]')).toHaveLength(1);
    const first=screen.getByRole('button',{name:/Tile 11:/});
    fireEvent.focus(first); fireEvent.keyDown(first,{key:'ArrowRight'});
    expect(container.querySelectorAll('.cap-treemap-item[tabindex="0"]')).toHaveLength(1);
    expect(container.querySelector('.cap-treemap-item:focus')).not.toBe(first);
  });

  it('uses defaultFocus once but still lets an uncontrolled breadcrumb return to root',()=>{
    render(<Treemap label="Storage" defaultFocus="work" data={[{id:'work',label:'Work',value:0,children:[{id:'research',label:'Research',value:4}]},{id:'home',label:'Home',value:3}]}/>);
    expect(screen.getByRole('button',{name:'Research: 4'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Storage'}));
    expect(screen.getByRole('button',{name:'Home: 3'})).toBeInTheDocument();
  });

  it('drags a brush window and supports bounded keyboard range handles',()=>{
    const change=vi.fn(),{container}=render(<BrushChart label="History" labels={['D1','D2','D3','D4','D5']} series={[{name:'Visits',values:[1,4,2,5,3]}]} initialRange={[1,3]} onRangeChange={change}/>);
    const svg=screen.getByRole('group',{name:'History overview with range handles'});
    Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({left:0,top:0,width:640,height:58,right:640,bottom:58,x:0,y:0,toJSON:()=>({})})});
    const window=container.querySelector('.cap-brush-selection')!;
    const pointer=(target:Element,type:string,clientX:number)=>target.dispatchEvent(Object.assign(new MouseEvent(type,{bubbles:true,clientX}),{pointerId:1}));
    act(()=>{pointer(window,'pointerdown',320); pointer(svg,'pointermove',468); pointer(svg,'pointerup',468)});
    expect(change).toHaveBeenLastCalledWith([2,4]);
    const start=screen.getByRole('slider',{name:'Range start'}); fireEvent.change(start,{target:{value:'3'}});
    expect(screen.getByRole('slider',{name:'Range start'})).toHaveValue('3');
    expect(screen.getByText('Selected range: D4–D5')).toBeInTheDocument();
  });

  it('makes readonly gauges noninteractive while keeping active gauges bounded',()=>{
    const {rerender}=render(<Gauge label="Static goal" value={25}/>);
    expect(screen.queryByRole('slider',{name:'Static goal'})).not.toBeInTheDocument();
    const change=vi.fn(); rerender(<Gauge label="Editable goal" value={100} min={0} max={100} onValueChange={change}/>);
    const slider=screen.getByRole('slider',{name:'Editable goal'}); fireEvent.keyDown(slider,{key:'ArrowRight'});
    expect(change).toHaveBeenCalledWith(100);
  });

  it('applies named gauge thresholds and exposes boundary semantics to keyboard users',()=>{
    const change=vi.fn();
    render(<Gauge label="Storage" value={75} onValueChange={change} thresholds={[{from:50,tone:'warning',label:'Near limit'},{from:90,tone:'danger',label:'Full'}]}/>);
    const slider=screen.getByRole('slider',{name:'Storage'});
    expect(slider).toHaveAttribute('aria-valuetext','75, Near limit');
    fireEvent.keyDown(slider,{key:'End'});
    expect(change).toHaveBeenCalledWith(100);
  });

  it('keeps all-negative sparklines inside their viewport and counters readable',()=>{
    const {container}=render(<><Sparkline label="Losses" values={[-8,-5,-11]}/><AnimatedCounter label="Total" value={12}/></>);
    const points=container.querySelector('.cap-sparkline polyline')?.getAttribute('points')?.split(' ').map(point=>Number(point.split(',')[1]))??[];
    expect(points.every(y=>y>=0&&y<=32)).toBe(true);
    expect(screen.getByLabelText('Total: 12')).toBeInTheDocument();
  });

  it('formats counter prefixes, suffixes and fixed decimals in one live announcement',()=>{
    render(<AnimatedCounter label="Revenue" value={128.5} prefix="$" suffix=" USD" decimals={2}/>);
    expect(screen.getByLabelText('Revenue: $128.50 USD')).toBeInTheDocument();
  });

  it('gives the animated counter a named image role while hiding decorative digit wheels',()=>{
    const {container}=render(<AnimatedCounter label="Archived notes" value={1234}/>);
    expect(screen.getByRole('img',{name:'Archived notes: 1,234'})).toBeInTheDocument();
    expect(container.querySelector('.cap-animated-counter-value')).toHaveAttribute('aria-hidden','true');
  });

  it('makes sparklines scrub points by keyboard with an area cue and readable current value',()=>{
    const active=vi.fn(),{container}=render(<Sparkline label="Latency" labels={['Mon','Tue','Wed']} values={[8,3,6]} onActiveChange={active}/>);
    const chart=screen.getByRole('group',{name:/Latency: Mon 8, Tue 3, Wed 6/});
    expect(container.querySelector('.cap-sparkline-area')).toBeInTheDocument();
    fireEvent.focus(chart); fireEvent.keyDown(chart,{key:'ArrowLeft'});
    expect(container.querySelector('.cap-sparkline-readout')).toHaveTextContent('Tue: 3');
    expect(active).toHaveBeenLastCalledWith(3,1);
  });

  it('renders sparklines with their requested intrinsic viewport instead of the default 300 by 150 SVG',()=>{
    const {container}=render(<Sparkline label="Recent change" values={[1,4,2,5]} width={160} height={48}/>);
    const svg=container.querySelector('svg.cap-sparkline')!;
    expect(svg).toHaveAttribute('width','160');
    expect(svg).toHaveAttribute('height','48');
    expect(svg.querySelector('polyline')?.getAttribute('points')).toContain('160,');
  });

  it('shows slope rank movement and offers one roving keyboard stop',()=>{
    const active=vi.fn(),{container}=render(<SlopeChart label="Rank shift" data={[{label:'A very long category name that must remain available',before:9,after:2},{label:'Other',before:4,after:12}]} onActiveChange={active}/>);
    const first=screen.getByRole('button',{name:/A very long category name that must remain available: 9 to 2, rank 1 to 2/});
    expect(first).toHaveAttribute('tabindex','0');
    fireEvent.keyDown(first,{key:'ArrowDown'});
    expect(screen.getByRole('button',{name:'Other: 4 to 12, rank 2 to 1'})).toHaveAttribute('tabindex','0');
    expect(active).toHaveBeenLastCalledWith(expect.objectContaining({label:'Other'}),1);
    expect(container.querySelector('.cap-chart-range')).toHaveTextContent('#2 → #1');
  });

  it('rolls only the changed counter digits and sizes the number strip to its content',()=>{
    const {container,rerender}=render(<AnimatedCounter value={124}/>);
    const digits=container.querySelectorAll('.cap-counter-digit');
    expect(digits).toHaveLength(3);
    const tens=digits[2].querySelector('.cap-counter-wheel') as HTMLElement;
    const initial=tens.style.transform;
    rerender(<AnimatedCounter value={125}/>);
    expect(tens.style.transform).not.toBe(initial);
    expect(container.querySelector('.cap-animated-counter')?.getAttribute('style')).toContain('--cap-counter-width: 3ch');
  });

  it('preserves keyed data motion when a line series updates and exposes controlled visibility and empty state',()=>{
    const changed=vi.fn(),{container,rerender}=render(<LineChart label="Line" series={[{id:'stable',name:'Stable',values:[1,2]},{id:'other',name:'Other',values:[2,4]}]}/>);
    expect(container.querySelector('.cap-chart-line')).toBeInTheDocument();
    rerender(<LineChart label="Line" hiddenSeries={['stable']} onHiddenSeriesChange={changed} series={[{id:'stable',name:'Stable',values:[1,3]},{id:'other',name:'Other',values:[2,4]}]}/>);
    expect(screen.queryByRole('button',{name:'Stable, 1: 1'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Stable'}));
    expect(changed).toHaveBeenCalledWith([]);
    rerender(<LineChart label="Line" series={[]} emptyLabel="No series"/>);
    expect(screen.getByText('No series')).toBeInTheDocument();
  });

  it('scales SVG text against the actual rendered height in narrow containers',()=>{
    const original=globalThis.ResizeObserver;
    let notify=()=>{}; class ResizeObserverMock { constructor(callback:()=>void){notify=callback;} observe(){} disconnect(){} }
    vi.stubGlobal('ResizeObserver',ResizeObserverMock);
    const {container}=render(<BarChart label="Responsive" height={240} data={[{label:'A',value:2}]}/>);
    const svg=container.querySelector('.cap-chart > svg')!;
    Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({height:120,width:320,top:0,left:0,right:320,bottom:120,x:0,y:0,toJSON:()=>({})})});
    act(()=>notify());
    expect(container.querySelector('.cap-chart')?.getAttribute('style')).toContain('--cap-chart-text-scale: 2');
    vi.stubGlobal('ResizeObserver',original);
  });

  it('supports a controlled brush range, annotations, and semantic range formatting',()=>{
    const change=vi.fn(),{container,rerender}=render(<BrushChart label="Controlled history" labels={['A','B','C','D']} range={[1,2]} annotations={[{index:2,label:'Release'}]} formatRange={(start,end)=>`${start} to ${end}`} series={[{name:'Visits',values:[1,4,2,5]}]} onRangeChange={change}/>);
    expect(screen.getByText('Selected range: B to C')).toBeInTheDocument();
    expect(container.querySelectorAll('.cap-brush-event')).toHaveLength(1);
    fireEvent.change(screen.getByRole('slider',{name:'Range start'}),{target:{value:'2'}});
    expect(change).toHaveBeenCalledWith([2,2]);
    rerender(<BrushChart label="Controlled history" labels={['A','B','C','D']} range={[2,3]} series={[{name:'Visits',values:[1,4,2,5]}]}/>);
    expect(screen.getByText('Selected range: C–D')).toBeInTheDocument();
  });

  it('supports controlled waffle selection, custom grid dimensions, and stable cell identity',()=>{
    const active=vi.fn(),{container}=render(<WaffleChart label="Allocation" rows={4} columns={5} activeKey="b" onActiveChange={active} data={[{id:'a',label:'A',value:1},{id:'b',label:'B',value:3}]}/>);
    const cells=container.querySelectorAll('[role="group"][aria-label="Allocation cells"] [role="button"]');
    expect(cells).toHaveLength(20);
    expect(container.querySelectorAll('[data-active=true]')).toHaveLength(15);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:/A 25%/}));
    expect(active).toHaveBeenCalledWith('a');
  });

  it('supports date windows, week starts, thresholds, and controlled heatmap selection',()=>{
    const select=vi.fn(),{container}=render(<ActivityHeatmap label="Range" dateRange={['2024-01-01','2024-01-04']} weekStart={1} thresholds={[2,4]} selectedDate="2024-01-02" onSelectedDateChange={select} data={[{date:'2024-01-01',value:3},{date:'2024-01-02',value:5}]}/>);
    const monday=screen.getByRole('button',{name:'2024-01-01: 3 activities'}),tuesday=screen.getByRole('button',{name:'2024-01-02: 5 activities'});
    expect(monday).toHaveAttribute('class','cap-heatmap-level-1');
    expect(tuesday).toHaveAttribute('class','cap-heatmap-level-2');
    expect(tuesday).toHaveAttribute('data-selected','true');
    expect(monday).toHaveAttribute('y','18');
    fireEvent.click(screen.getByRole('button',{name:'2024-01-03: 0 activities'}));
    expect(select).toHaveBeenCalledWith('2024-01-03');
    expect(container.querySelector('.cap-heatmap-months')).toHaveTextContent('Jan');
  });

  it('spaces heatmap month labels from the measured SVG width on mobile',()=>{
    vi.spyOn(SVGSVGElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,width:300,height:69,top:0,right:300,bottom:69,left:0,toJSON(){return {};}} as DOMRect);
    const {container}=render(<ActivityHeatmap label="Mobile calendar" year={2026} data={[]}/>);
    const months=[...container.querySelectorAll('.cap-heatmap-months text')];
    expect(months.length).toBeLessThanOrEqual(7);
    expect(months[0]).toHaveTextContent(/Jan/i);
  });

  it('interpolates keyed chart geometry from the current value and remains interruptible',()=>{
    const frames:FrameRequestCallback[]=[];
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});
    vi.stubGlobal('cancelAnimationFrame',()=>{});
    const chart=(value:number)=><BarChart label="Motion" data={[{id:'moving',label:'Moving',value},{id:'limit',label:'Limit',value:20}]}/>;
    const {container,rerender}=render(chart(2));
    const height=()=>Number(container.querySelector('.cap-chart-bar')?.getAttribute('height'));
    const start=height();
    rerender(chart(10));
    expect(frames.length).toBeGreaterThan(0);
    act(()=>frames.shift()?.(100));
    act(()=>frames.shift()?.(190));
    const middle=height();
    expect(middle).toBeGreaterThan(start);
    expect(middle).toBeLessThan(86);
    rerender(chart(6));
    expect(frames.length).toBeGreaterThan(0);
    act(()=>frames.shift()?.(200));
    vi.unstubAllGlobals();
  });

  it('snaps geometry updates when reduced motion is requested',()=>{
    const frames:FrameRequestCallback[]=[];
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});
    vi.stubGlobal('cancelAnimationFrame',()=>{});
    vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
    const chart=(value:number)=><BarChart label="Reduced motion" data={[{id:'moving',label:'Moving',value},{id:'limit',label:'Limit',value:20}]}/>;
    const {container,rerender}=render(chart(2));
    rerender(chart(10));
    expect(frames).toHaveLength(0);
    expect(Number(container.querySelector('.cap-chart-bar')?.getAttribute('height'))).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });


  it('chooses Treemap label ink from each resolved tile fill without outline strokes',()=>{
    const {container}=render(<Treemap label="Contrast" data={[{id:'dark-tile',label:'Dark',value:3,color:'#000000'},{id:'light-tile',label:'Light',value:2,color:'#ffffff'}]}/>);
    expect(container.querySelector('.cap-treemap-item[data-ink="light"] .cap-treemap-label')).toHaveTextContent('Dark');
    expect(container.querySelector('.cap-treemap-item[data-ink="dark"] .cap-treemap-label')).toHaveTextContent('Light');
    expect(container.querySelector('.cap-treemap-label')?.getAttribute('stroke')).toBeNull();
  });

  it('parses modern OKLCH fills and keeps Treemap value spacing tied to the text size',()=>{
    const {container}=render(<Treemap label="Modern color" data={[{id:'dark',label:'Dark cyan',value:6,color:'oklch(28% 0.11 220)'},{id:'light',label:'Light cyan',value:4,color:'oklch(84% 0.1 205)'}]}/>);
    expect(container.querySelector('.cap-treemap-item[aria-label^="Dark cyan"]')).toHaveAttribute('data-ink','light');
    expect(container.querySelector('.cap-treemap-item[aria-label^="Light cyan"]')).toHaveAttribute('data-ink','dark');
    expect(container.querySelector('.cap-treemap-value')?.getAttribute('dy')).toBe('1.35em');
  });

  it('seeds Treemap drill animation from the selected branch tile',()=>{
    const frames:FrameRequestCallback[]=[];
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',()=>{});
    const {container}=render(<Treemap label="Space" data={[{id:'branch',label:'Branch',value:0,children:[{id:'one',label:'One',value:3},{id:'two',label:'Two',value:1}]},{id:'other',label:'Other',value:4}]}/>);
    const parent=container.querySelector('.cap-treemap-item[aria-label^="Branch"] > .cap-chart-cell')!;
    const parentRect=['x','y','width','height'].map(key=>parent.getAttribute(key));
    fireEvent.click(screen.getByRole('button',{name:/Branch: 4/}));
    const childRects=[...container.querySelectorAll<SVGRectElement>('.cap-treemap-item > .cap-chart-cell')];
    expect(childRects).toHaveLength(2);
    expect(childRects.map(rect=>['x','y','width','height'].map(key=>rect.getAttribute(key)))).toEqual([parentRect,parentRect]);
    vi.unstubAllGlobals();
  });

  it('rolls 9 to 0 in the increasing direction while adding a digit',()=>{
    const {container,rerender}=render(<AnimatedCounter value={9}/>);
    const first=container.querySelector('.cap-counter-wheel') as HTMLElement;
    expect(first.style.transform).toBe('translateY(-19em)');
    rerender(<AnimatedCounter value={10}/>);
    expect(first.style.transform).toBe('translateY(-21em)');
  });

});
