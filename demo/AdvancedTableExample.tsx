import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../src/components/data-table';
import { Button, IconBox, Tag } from '../src/components/primitives';
import { Sparkline } from '../src/components/charts';
import { useLocale, useTranslate } from '../src/components/locale';

interface Company { id: string; name: string; deals: number; value: number; probability: number; trend: number[]; owner: string; date: Date }
const companyNames = ['Orbit', 'Fieldwork', 'Northstar', 'Forma', 'Prism', 'Daylight', 'Mosaic', 'Linear Labs'];
const companies: Company[] = Array.from({ length: 40 }, (_, i) => ({ id: `company-${i}`, name: `${companyNames[i % 8]}${i > 7 ? ` ${Math.floor(i / 8) + 1}` : ''}`, deals: 2 + i % 6, value: 259700 - i * 4790, probability: 28 + (i * 17) % 65, trend: Array.from({ length: 14 }, (_, j) => 25 + Math.sin(j * .9 + i) * 15 + ((j * 7 + i * 3) % 13)), owner: ['Alex', 'Robin', 'Sam', 'Taylor'][i % 4], date: new Date(2026, i % 12, i % 27 + 1) }));
/** Wide, bounded table demonstrating pins, summaries and rich cell slots. */
export function AdvancedTableExample() {
  const t = useTranslate(), locale = useLocale();
  const [selected, setSelected] = useState<string[]>([]), [pinRows, setPinRows] = useState(false), [pinOwner, setPinOwner] = useState(true);
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const columns: DataTableColumn<Company>[] = [
    { id: 'company', header: t('Компании', 'Companies'), value: row => row.name, width: 240, pin: 'left', cell: row => <span className="cap-data-table-company"><IconBox icon={Building2} size="sm"/>{row.name}</span>, footer: rows => `${rows.length} ${t('компаний', 'companies')}` },
    { id: 'deals', header: t('Сделки', 'Open deals'), value: row => row.deals, numeric: true, width: 130 },
    { id: 'value', header: t('Объём воронки', 'Pipeline value'), value: row => row.value, numeric: true, width: 210, cell: row => money(row.value), footer: rows => `${t('Сумма', 'Sum')}: ${money(rows.reduce((sum, row) => sum + row.value, 0))}` },
    { id: 'probability', header: t('Вероятность', 'Win probability'), value: row => row.probability, width: 210, numeric: true, cell: row => <span className="cap-data-table-probability">{row.probability}%<span className="cap-data-table-segments" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} data-filled={i < Math.round(row.probability / 20) || undefined}/>)}</span></span>, footer: rows => `${t('Среднее', 'Average')}: ${Math.round(rows.reduce((sum, row) => sum + row.probability, 0) / rows.length)}%` },
    { id: 'trend', header: t('Активность', 'Activity trend'), value: row => row.trend.at(-1), sortable: false, width: 190, cell: row => <Sparkline values={row.trend} label={`${row.name}: ${t('активность', 'activity')}`} width={150} height={32} interactive={false} animate={false} color="var(--cap-accent-solid-normal)"/> },
    { id: 'date', header: t('Последний контакт', 'Last interaction'), value: row => row.date, width: 185, cell: row => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(row.date) },
    { id: 'owner', header: t('Ответственный', 'Owner'), value: row => row.owner, width: 150, pin: pinOwner ? 'right' : undefined, cell: row => <Tag size="sm">{row.owner}</Tag> },
  ];
  return <div><div className="cap-data-table-demo-actions"><Button size="sm" variant="secondary" onClick={() => setPinRows(!pinRows)} aria-pressed={pinRows}>{t('Закрепить первую и последнюю строки', 'Pin first and last rows')}</Button><Button size="sm" variant="secondary" onClick={() => setPinOwner(!pinOwner)} aria-pressed={pinOwner}>{t('Закрепить ответственного', 'Pin owner column')}</Button><span>{selected.length} {t('выбрано', 'selected')}</span></div><DataTable label={t('Воронка компаний', 'Company pipeline')} rows={companies} columns={columns} rowId={row => row.id} selectable selectedIds={selected} onSelectedIdsChange={setSelected} maxHeight={470} minWidth={1350} pinnedRows={pinRows ? { top: [companies[0].id, companies[1].id], bottom: [companies.at(-2)!.id, companies.at(-1)!.id] } : undefined}/></div>;
}
