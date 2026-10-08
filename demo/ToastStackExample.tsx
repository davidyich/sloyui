import { useState } from 'react';
import { Button } from '../src/components/primitives.js';
import { Select } from '../src/components/forms.js';
import { ToastStack, type ToastStackItem } from '../src/components/messages.js';
import { useTranslate } from '../src/components/locale.js';

/** The positioned frame owns container placement; viewport placement inherits its local context. */
export function ToastStackExample() {
  const t = useTranslate();
  const [position, setPosition] = useState<'top-center' | 'bottom-center'>('bottom-center');
  const [scope, setScope] = useState<'container' | 'viewport'>('container');
  const createItems = (): ToastStackItem[] => [
    { id: 'saved', title: t('Изменения сохранены', 'Changes saved'), description: t('Все правки уже в проекте.', 'Your latest edits are in the project.'), tone: 'success', duration: Infinity },
    { id: 'ready', title: t('Сборка готова', 'Build ready'), description: t('Можно открыть предпросмотр.', 'The preview is ready to open.'), tone: 'info', duration: Infinity },
    { id: 'deploy', title: t('Публикуем проект…', 'Deploying to production…'), description: t('Собираем 24 страницы и прогреваем кеш.', 'Building 24 routes and warming the cache.'), tone: 'neutral', loading: true },
  ];
  const [items, setItems] = useState<ToastStackItem[]>(createItems);
  // Translate the fixture again when locale changes without restoring dismissed items.
  const localized = createItems();
  const shown = items.map(item => localized.find(next => next.id === item.id) ?? item);
  return <div style={{ display: 'grid', gap: 16, width: '100%' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
      <Select label={t('Положение', 'Position')} value={position} onValueChange={value => setPosition(value as typeof position)} options={[{ value: 'top-center', label: t('Сверху по центру', 'Top center') }, { value: 'bottom-center', label: t('Снизу по центру', 'Bottom center') }]}/>
      <Select label={t('Область', 'Placement area')} value={scope} onValueChange={value => setScope(value as typeof scope)} options={[{ value: 'container', label: t('Внутри блока', 'Containing block') }, { value: 'viewport', label: t('Экран', 'Viewport') }]}/>
      <Button size="sm" onClick={() => setItems(createItems())}>{t('Показать уведомления', 'Show notifications')}</Button>
      {scope === 'viewport' && <Button size="sm" variant="ghost" onClick={() => setItems([])}>{t('Скрыть все', 'Dismiss all')}</Button>}
    </div>
    <div data-surface="canvas" className="cap-surface-boundary" style={{ position: 'relative', minHeight: 380, background: 'var(--cap-surface-current)', borderRadius: 'var(--cap-radius-xl)' }}>
      <ToastStack label={t('Обновления проекта', 'Project updates')} items={shown} onDismiss={id => setItems(current => current.filter(item => item.id !== id))} position={position} scope={scope}/>
    </div>
  </div>;
}
