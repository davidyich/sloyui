import { useState } from 'react';
import { Calendar, Card, DatePicker, type CalendarEvent, type CalendarRange } from '@personal/capacities-ui';

export const scheduleEvents: CalendarEvent[] = [
  { id:'review', date:'2026-10-07', title:'Обсудить дизайн', time:'10:00–11:00', color:'blue', description:'Проверить прототип календаря и договориться о следующем шаге.' },
  { id:'focus', date:'2026-10-07', title:'Работа над прототипом', time:'14:00–16:00', color:'purple', emphasis:'time', description:'Без встреч. Подготовить сценарий выбора периода.' },
  { id:'handoff', date:'2026-10-09', title:'Передать макеты', time:'12:30', color:'teal' },
  { id:'planning', date:'2026-11-03', title:'Планирование', time:'09:30', color:'orange' },
];
/** Both consumers own their selection; the inline calendar inherits Card's raised surface. */
export function CalendarSchedule() {
  const [date, setDate] = useState('2026-10-07');
  const [range, setRange] = useState<CalendarRange | undefined>();
  return <div style={{display:'grid',gap:24}}>
    <Card><Calendar label="Расписание проекта" value={date} onValueChange={setDate} today="2026-10-07" events={scheduleEvents} showAgenda agendaPosition="side" highlightedDates={[{date:'2026-10-09',label:'Срок передачи',color:'orange'}]} /></Card>
    <DatePicker label="Период проекта" mode="range" range={range} onRangeChange={setRange} defaultMonth="2026-10" today="2026-10-07" numberOfMonths={2} events={scheduleEvents} showAgenda />
  </div>;
}
