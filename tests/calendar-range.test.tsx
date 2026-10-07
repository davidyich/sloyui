import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Calendar, DatePicker, type CalendarRange, type CalendarProps } from '../src/components/content.js';

// Typecheck also protects legacy consumers that extend the original interface.
interface LegacyCalendarProps extends CalendarProps { consumerLabel?: string }
const day = (key: string) => document.querySelector<HTMLButtonElement>(`.cap-calendar-day[data-date="${key}"]`)!;
const sampleEvents = [
  {id:'review',date:'2026-10-07',title:'Design review',time:'10:00',description:'Review the prototype.'},
  {id:'focus',date:'2026-10-07',title:'Focus work',time:'14:00–16:00',emphasis:'time' as const},
];

describe('Calendar range and schedules', () => {
  it('searches a year with typing and Enter without changing controlled selection', async () => {
    const change=vi.fn(), user=userEvent.setup();
    render(<Calendar value="2026-10-07" onValueChange={change} yearRange={[1900,2100]} />);
    const year=screen.getByRole('combobox',{name:'Год'});
    await user.click(year); await user.type(year,'2042');
    expect(within(screen.getByRole('listbox',{name:'Год'})).getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('grid')).toHaveAccessibleName('октябрь 2042 г.');
    expect(year).toHaveFocus(); expect(year).toHaveAttribute('aria-expanded','false'); expect(change).not.toHaveBeenCalled();
  });
  it('keeps one date button and one tab stop across two months, including keyboard crossing', async () => {
    const change=vi.fn(),user=userEvent.setup();
    render(<Calendar mode="range" range={{start:'2026-10-31'}} onRangeChange={change} today="2026-10-07" />);
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(document.querySelectorAll('[data-date="2026-11-01"]')).toHaveLength(1);
    expect(document.querySelectorAll('.cap-calendar-day[tabindex="0"]')).toHaveLength(1);
    act(()=>day('2026-10-31').focus()); await user.keyboard('{ArrowRight}');
    expect(day('2026-11-01')).toHaveFocus(); expect(change).not.toHaveBeenCalled();
    expect(screen.getAllByRole('grid')[0]).toHaveAccessibleName('октябрь 2026 г.');
    await user.keyboard('{Enter}'); expect(change).toHaveBeenLastCalledWith({start:'2026-10-31',end:'2026-11-01'});
    // Controlled selection remains partial until its owner supplies the result.
    expect(day('2026-11-01').closest('[role="gridcell"]')).toHaveAttribute('aria-selected','false');
  });
  it('normalizes reverse endpoints, previews without committing, then restarts a completed range', async () => {
    const change=vi.fn(), user=userEvent.setup();
    function Example(){const [range,setRange]=useState<CalendarRange>();return <Calendar mode="range" range={range} onRangeChange={next=>{setRange(next);change(next);}} today="2026-10-07"/>;}
    render(<Example/>);
    await user.click(day('2026-11-03'));
    expect(change).toHaveBeenLastCalledWith({start:'2026-11-03'});
    await user.hover(day('2026-10-29'));
    expect(day('2026-10-30').closest('[role="gridcell"]')).toHaveAttribute('data-preview','true');
    expect(change).toHaveBeenCalledTimes(1);
    await user.click(day('2026-10-29'));
    expect(change).toHaveBeenLastCalledWith({start:'2026-10-29',end:'2026-11-03'});
    expect(document.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(6);
    await user.click(day('2026-11-05')); expect(change).toHaveBeenLastCalledWith({start:'2026-11-05'});
  });
  it('restarts a blocked range and supports a same-day range', async () => {
    const change=vi.fn(),user=userEvent.setup();
    function Example(){const [range,setRange]=useState<CalendarRange>({start:'2026-10-07'});return <Calendar mode="range" range={range} onRangeChange={next=>{setRange(next);change(next);}} today="2026-10-07" min="2026-10-01" max="2026-11-30" isDateUnavailable={key=>key==='2026-10-09'}/>;}
    render(<Example/>);
    expect(day('2026-10-09')).toBeDisabled();
    await user.click(day('2026-10-11'));
    expect(change).toHaveBeenLastCalledWith({start:'2026-10-11'});
    expect(screen.getByText(/Период не может включать недоступные дни/)).toBeInTheDocument();
    await user.click(day('2026-10-11'));
    expect(change).toHaveBeenLastCalledWith({start:'2026-10-11',end:'2026-10-11'});
  });
  it('exposes independent highlights and all day events on hover/focus with descriptions and time hierarchy', async () => {
    const user=userEvent.setup();
    render(<Calendar value="2026-10-06" onValueChange={()=>{}} today="2026-10-07" events={sampleEvents} highlightedDates={[{date:'2026-10-09',label:'Milestone',color:'orange'}]} showAgenda agendaPosition="side" />);
    expect(day('2026-10-09')).toHaveAccessibleName(/Milestone/);
    expect(day('2026-10-09')).not.toHaveAttribute('data-selected');
    expect(day('2026-10-07')).toHaveAttribute('aria-current','date');
    await user.hover(day('2026-10-07'));
    const tooltip=await screen.findByRole('tooltip');
    expect(within(tooltip).getAllByRole('listitem')).toHaveLength(2);
    expect(within(tooltip).getByText('Review the prototype.')).toBeInTheDocument();
    expect(tooltip.querySelectorAll('strong')[2]).toHaveTextContent('14:00–16:00');
    await user.keyboard('{Escape}'); expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(()=>day('2026-10-07').focus()); expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(day('2026-10-07')).toHaveAttribute('aria-describedby',screen.getByRole('tooltip').id);
    expect(screen.getByRole('region',{name:'Календарь: события выбранного дня'})).toHaveTextContent('На этот день событий нет');
  });
  it('keeps a range picker open after its start and nested search, closes after its end, and restores focus', async () => {
    const user=userEvent.setup();
    function Example(){const [range,setRange]=useState<CalendarRange>();return <div data-theme="dark" data-borders="on" data-accent="purple" data-radius="rounded" data-shadow="compact"><DatePicker label="Project period" mode="range" range={range} onRangeChange={setRange} today="2026-10-07" events={sampleEvents}/></div>;}
    render(<Example/>);
    const trigger=screen.getByRole('button',{name:'Project period'});await user.click(trigger);
    const dialog=screen.getByRole('dialog');
    for(const [name,value] of Object.entries({'data-theme':'dark','data-borders':'on','data-accent':'purple','data-radius':'rounded','data-shadow':'compact','data-surface':'floating'}))expect(dialog).toHaveAttribute(name,value);
    await user.click(day('2026-10-28')); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox',{name:'Год'}));
    await user.type(screen.getByRole('combobox',{name:'Год'}),'2026');
    await user.keyboard('{Escape}'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(day('2026-11-03')); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus(); expect(trigger).toHaveTextContent('28 окт. 2026 г. — 3 нояб. 2026 г.');
  });
  it('preserves single-picker close-on-select and external selection navigation', async () => {
    const user=userEvent.setup(),change=vi.fn();
    const legacyProps: LegacyCalendarProps = {label:"Date",value:"2026-10-07",onValueChange:change};
    const {rerender}=render(<DatePicker {...legacyProps}/>);
    await user.click(screen.getByRole('button',{name:/Date:/})); await user.click(day('2026-10-08'));
    expect(change).toHaveBeenCalledWith('2026-10-08'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<Calendar value="2027-02-03" onValueChange={change}/>);
    expect(screen.getByRole('grid')).toHaveAccessibleName('февраль 2027 г.');
  });
  it('keeps multi-month selection and event previews semantically accessible', async () => {
    const {container}=render(<main><Calendar label="Project" mode="range" range={{start:'2026-10-07',end:'2026-11-03'}} onRangeChange={()=>{}} today="2026-10-07" events={sampleEvents} showAgenda/><Calendar label="Personal" value="2026-10-07" onValueChange={()=>{}} showAgenda/></main>);
    const result=await axe.run(container,{rules:{'color-contrast':{enabled:false}}});
    expect(result.violations).toEqual([]);
  });
  it('animates month changes without remounting the focused grid and cancels for reduced motion', () => {
    const animate=vi.fn(()=>({cancel:vi.fn()})), original=Element.prototype.animate;
    Object.defineProperty(Element.prototype,'animate',{configurable:true,writable:true,value:animate});
    try {
      render(<Calendar value="2026-10-07" onValueChange={()=>{}}/>);
      fireEvent.click(screen.getByRole('button',{name:'Следующий месяц'})); expect(animate).toHaveBeenCalledOnce();
      vi.stubGlobal('matchMedia',()=>({matches:true}));
      fireEvent.click(screen.getByRole('button',{name:'Следующий месяц'})); expect(animate).toHaveBeenCalledOnce();
    } finally {Element.prototype.animate=original;vi.unstubAllGlobals();}
  });
});
