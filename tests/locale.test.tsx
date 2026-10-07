import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LocaleProvider, useLocale, useTranslate } from '../src/components/locale';
import { Spinner } from '../src/components/primitives';
import { Select } from '../src/components/forms';
import { ComboBox } from '../src/components/selection';
import { CodeBlock } from '../src/components/code-block';
import { CommentThread } from '../src/components/comments';
import { DailyHeader, Calendar } from '../src/components/content';
import { AnimatedCounter, BarChart } from '../src/components/charts';
import { Dialog, CommandPalette } from '../src/components/overlays';

afterEach(cleanup);
const author = { id: 'me', name: 'Автор без перевода' };
it('defaults to Russian and keeps nested provider translations isolated', () => {
  function Probe() { const t = useTranslate(), locale = useLocale(); return <span>{locale}: {t('Тест', 'Test')}</span>; }
  render(<><Probe/><LocaleProvider locale="en"><Probe/><LocaleProvider locale="ru"><Probe/></LocaleProvider></LocaleProvider><Spinner/></>);
  expect(screen.getAllByText('ru: Тест')).toHaveLength(2);
  expect(screen.getByText('en: Test')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Загрузка');
});

it('switches defaults in existing fields and portaled menus while preserving consumer options', () => {
  const change = vi.fn();
  const view = render(<LocaleProvider locale="ru"><Select value="" label="Данные клиента" options={[{ value: 'first', label: 'Потребительский текст' }]}/><ComboBox label="Custom field" options={[]} onValueChange={change}/></LocaleProvider>);
  fireEvent.click(screen.getByRole('combobox', { name: 'Данные клиента' }));
  const popup = screen.getByRole('listbox', { name: 'Данные клиента' });
  expect(popup).toHaveTextContent('Потребительский текст');
  expect(view.container).not.toContainElement(popup);
  view.rerender(<LocaleProvider locale="en"><Select value="" label="Данные клиента" options={[{ value: 'first', label: 'Потребительский текст' }]}/><ComboBox label="Custom field" options={[]} onValueChange={change}/></LocaleProvider>);
  expect(screen.getByRole('listbox', { name: 'Данные клиента' })).toHaveTextContent('Потребительский текст');
  fireEvent.click(screen.getByRole('combobox', { name: 'Данные клиента' }));
  expect(screen.getByRole('combobox', { name: 'Данные клиента' })).toHaveTextContent('Choose…');
  fireEvent.focus(screen.getByRole('combobox', { name: 'Custom field' }));
  expect(screen.getByRole('status')).toHaveTextContent('No results');
  expect(change).not.toHaveBeenCalled();
});

it('localizes modal actions across portals and respects explicit supplied text', () => {
  const close = vi.fn();
  const view = render(<LocaleProvider locale="ru"><Dialog open onOpenChange={close} title="Consumer heading">Custom body</Dialog></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  view.rerender(<LocaleProvider locale="en"><Dialog open onOpenChange={close} title="Consumer heading" closeLabel="Авторское закрытие">Custom body</Dialog></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Авторское закрытие' })).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Consumer heading' })).toHaveTextContent('Custom body');
});

it('changes built-in comment and code labels without translating stored user content', () => {
  const comment = { id: 'one', author, body: 'Непереведённый текст пользователя', createdAt: '2026-10-01' };
  const view = render(<LocaleProvider locale="ru"><CommentThread currentUser={author} comments={[comment]}/><CodeBlock defaultLanguage="text">{'const message = "Русский текст";'}</CodeBlock></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Ответить' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Язык кода' })).toHaveTextContent('Обычный текст');
  view.rerender(<LocaleProvider locale="en"><CommentThread currentUser={author} comments={[comment]}/><CodeBlock defaultLanguage="text">{'const message = "Русский текст";'}</CodeBlock></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Code language' })).toHaveTextContent('Plain text');
  expect(screen.getByText(comment.body)).toBeInTheDocument();
  expect(screen.getByText(author.name)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Write a comment' })).toHaveAttribute('placeholder', 'Write a comment…');
});

it('formats dates and numbers by provider while explicit locales and formatters win', () => {
  const date = new Date(2026, 9, 1, 12);
  render(<><LocaleProvider locale="ru"><section data-testid="ru"><DailyHeader date="2026-10-01"/><AnimatedCounter value={1234.5} decimals={1} label="Сумма" animate={false}/><BarChart label="График" data={[{label:'Данные',value:1}]} formatValue={()=>'custom value'}/></section></LocaleProvider><LocaleProvider locale="en"><section data-testid="en"><DailyHeader date="2026-10-01"/><AnimatedCounter value={1234.5} decimals={1} label="Сумма" animate={false}/><DailyHeader date="2026-10-01" locale="de-DE"/><AnimatedCounter value={1234.5} decimals={1} locale="de-DE" label="Явный формат" animate={false}/></section></LocaleProvider></>);
  const ru = within(screen.getByTestId('ru')), en = within(screen.getByTestId('en'));
  expect(ru.getByRole('img', { name: `Сумма: ${new Intl.NumberFormat('ru', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(1234.5)}` })).toBeInTheDocument();
  expect(en.getByRole('img', { name: `Сумма: ${new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(1234.5)}` })).toBeInTheDocument();
  expect(en.getByRole('img', { name: `Явный формат: ${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(1234.5)}` })).toBeInTheDocument();
  expect(ru.getByText(new Intl.DateTimeFormat('ru', { weekday: 'long' }).format(date))).toBeInTheDocument();
  expect(en.getByText(new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date))).toBeInTheDocument();
  expect(en.getByText(new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date))).toBeInTheDocument();
  expect(ru.getByText('Среднее: custom value')).toBeInTheDocument();
});
