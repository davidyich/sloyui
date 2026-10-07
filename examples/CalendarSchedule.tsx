import { useState } from 'react';
import { Calendar, Card, DatePicker, type CalendarEvent, type CalendarRange, useTranslate } from '@personal/capacities-ui';

export const scheduleEvents: CalendarEvent[] = [
  { id:'review', date:'2026-10-07', title:'Обсудить дизайн', time:'10:00–11:00', color:'blue', description:'Проверить прототип календаря и договориться о следующем шаге.' },
  { id:'focus', date:'2026-10-07', title:'Работа над прототипом', time:'14:00–16:00', color:'purple', emphasis:'time', description:'Без встреч. Подготовить сценарий выбора периода.' },
  { id:'handoff', date:'2026-10-09', title:'Передать макеты', time:'12:30', color:'teal' },
  { id:'planning', date:'2026-11-03', title:'Планирование', time:'09:30', color:'orange' },
];
/** Both consumers own their selection; the inline calendar inherits Card's raised surface. */
export function CalendarSchedule() {
  const t=useTranslate();
  const events=scheduleEvents.map(event=>({...event,title:t(event.title,({review:"Discuss design",focus:"Prototype work",handoff:"Hand off designs",planning:"Planning"} as Record<string,string>)[event.id]),description:event.description?t(event.description,event.id==='review'?"Review the calendar prototype and agree on the next step.":"No meetings. Prepare the range selection scenario."):undefined}));
  const [date, setDate] = useState('2026-10-07');
  const [range, setRange] = useState<CalendarRange | undefined>();
  return <div style={{display:'grid',gap:24}}>
    <Card><Calendar label={t("Расписание проекта","Project schedule")} value={date} onValueChange={setDate} today="2026-10-07" events={events} showAgenda agendaPosition="side" highlightedDates={[{date:'2026-10-09',label:t('Срок передачи','Handoff deadline'),color:'orange'}]} /></Card>
    <DatePicker label={t("Период проекта","Project period")} mode="range" range={range} onRangeChange={setRange} defaultMonth="2026-10" today="2026-10-07" numberOfMonths={2} events={events} showAgenda />
  </div>;
}
