import {isDevelop} from './catalog-channel';
import * as UI from '../src';
import './installation.css';

import { version } from '../package.json';
const release = `${UI.SLOY_UI.url}${isDevelop()?'/develop':''}/downloads/${UI.SLOY_UI.slug}-${version}.tgz`;
const install = `npm install react@^19 react-dom@^19\nnpm install ${release}`;
const entry = `import { createRoot } from 'react-dom/client';
import { Button, Card, LocaleProvider, Tag } from '${UI.SLOY_UI.packageName}';
import '${UI.SLOY_UI.packageName}/styles.css';
import '${UI.SLOY_UI.packageName}/fonts.css'; // optional
import './app.css';

// Set appearance at the application root.
document.documentElement.dataset.theme = 'light';

function App() {
  return (
    <LocaleProvider locale="en">
      <main className="app cap-surface" data-surface="content" data-accent="green">
        <Card>
          <Tag>Ready</Tag>
          <h1>My first project</h1>
          <Button variant="accent" onClick={() => alert('Saved')}>Save</Button>
        </Card>
      </main>
    </LocaleProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);`;
const css = `body { margin: 0; }
.app {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: var(--cap-surface-current);
  color: var(--cap-content-primary);
  font-family: var(--cap-font-sans);
}`;
const context = `<html data-theme="dark" data-borders="off" data-radius="default">
  <!-- Set local context independently where needed. -->
  <section class="cap-surface" data-accent="purple" data-surface="content">
    <!-- Components inherit this context. -->
  </section>
</html>`;

export default function Installation() {
  const t = UI.useTranslate();
  const axes = [
    ['data-theme', 'light · dark', t('Тема на html; локально можно переопределить.', 'Set appearance on html; local overrides are supported.')],
    ['data-accent', 'neutral · blue · green · orange · red · pink · purple', t('Локальный акцент для компонентов без явного color.', 'Local accent for components without an explicit color.')],
    ['data-surface', 'shell · workspace · content · overlay · invert · glass', t('Контекст поверхности. Класс cap-surface также задаёт заливку контейнера.', 'Surface context. The cap-surface class also paints the container.')],
    ['data-focus-ring', 'on · off', t('Контур фокуса; по умолчанию on.', 'Focus outline; on by default.')],
    ['data-borders', 'off · on', t('Декоративные рамки; по умолчанию off.', 'Decorative borders; off by default.')],
    ['data-radius', 'none · compact · default · rounded', t('Скругления страницы или локального контейнера.', 'Corner geometry for the page or a local container.')],
  ];
  return <div className="cap-installation">
    <header className="page-intro">
      <h1>{t('Установка', 'Installation')}</h1>
      <p>{t('Подключите пакет, добавьте стили и соберите первый экран.', 'Install the package, add styles and build your first screen.')}</p>
      <div className="cap-installation-meta"><UI.Tag>v{version}</UI.Tag><UI.Tag>React 19+</UI.Tag><UI.Tag>TypeScript</UI.Tag></div>
    </header>
    <section aria-labelledby="installation-package">
      <h2 id="installation-package">{t('1. Установите пакет', '1. Install the package')}</h2>
      <p>{t('В существующем React-проекте выполните команды ниже. Готовый архив содержит собранный код, стили и типы.', 'Run these commands in your React project. The release archive includes compiled code, styles and types.')}</p>
      <UI.CodeBlock filename="Terminal" language="bash" showLanguageSelector={false} showActionsMenu={false} wrap>{install}</UI.CodeBlock>
      <p className="cap-installation-note">{t('Card сохраняет Surface родителя и рисует surface/block; всплывающие окна устанавливают Overlay и наследуют остальные оси. Для своих окрашенных областей используйте className="cap-surface" с явным data-surface или background: var(--cap-surface-current). Invert меняет локальную полярность без переключения Theme. Значения page/base, inset/canvas, panel/raised и floating поддерживаются для совместимости.', 'Card preserves its parent Surface and paints surface/block; floating windows establish Overlay while inheriting the other axes. Paint custom regions with className="cap-surface" and explicit data-surface, or background: var(--cap-surface-current). Invert changes local polarity without switching Theme. The page/base, inset/canvas, panel/raised and floating names remain compatibility aliases.')}</p>
      <a href={release} target="_blank" rel="noreferrer">{t('Скачать пакет', 'Download package')} v{version} ↗</a>
      <p>{t('Если архив уже скачан, установите его из файла:', 'If you have downloaded the archive, install the local file:')}</p>
      <UI.CodeBlock language="bash" showLanguageSelector={false} showActionsMenu={false} wrap>{`npm install ./${UI.SLOY_UI.slug}-${version}.tgz`}</UI.CodeBlock>
    </section>
    <section aria-labelledby="installation-start">
      <h2 id="installation-start">{t('2. Добавьте стили и компоненты', '2. Add styles and components')}</h2>
      <p>{t('Импортируйте styles.css один раз в точке входа. Он уже содержит runtime-токены. fonts.css по желанию подключает локальные Medeo Sans и Medeo Mono.', 'Import styles.css once in your entry point. It already includes runtime tokens. The optional fonts.css adds local Medeo Sans and Medeo Mono fonts.')}</p>
      <UI.CodeBlock filename="src/main.tsx" language="tsx" showLanguageSelector={false} showActionsMenu={false}>{entry}</UI.CodeBlock>
      <p>{t('Пример ожидает элемент <div id="root"></div> в HTML вашего приложения. Раскладка и стили body принадлежат приложению:', 'The example expects a <div id="root"></div> element in your application HTML. Your application owns layout and body styles:')}</p>
      <UI.CodeBlock filename="src/app.css" language="css" showLanguageSelector={false} showActionsMenu={false}>{css}</UI.CodeBlock>
    </section>
    <section aria-labelledby="installation-context">
      <h2 id="installation-context">{t('3. Настройте контекст', '3. Set the context')}</h2>
      <p>{t('Все оси наследуются независимо. Меняйте тему на html, а акцент, поверхность, рамки и скругления — на странице или отдельном контейнере.', 'All axes inherit independently. Set appearance on html and adjust accent, surface, borders and corners on a page or a local container.')}</p>
      <dl className="cap-installation-axes">{axes.map(([name, values, description]) => <div key={name}><dt><code>{name}</code></dt><dd><code>{values}</code><p>{description}</p></dd></div>)}</dl>
      <UI.CodeBlock filename="index.html" language="text" showLanguageSelector={false} showActionsMenu={false} wrap>{context}</UI.CodeBlock>
      <p className="cap-installation-note">{t('Card сохраняет Surface родителя и рисует surface/block; всплывающие окна устанавливают Overlay и наследуют остальные оси. Для своих окрашенных областей используйте className="cap-surface" с явным data-surface или background: var(--cap-surface-current). Invert меняет локальную полярность без переключения Theme. Значения page/base, inset/canvas, panel/raised и floating поддерживаются для совместимости.', 'Card preserves its parent Surface and paints surface/block; floating windows establish Overlay while inheriting the other axes. Paint custom regions with className="cap-surface" and explicit data-surface, or background: var(--cap-surface-current). Invert changes local polarity without switching Theme. The page/base, inset/canvas, panel/raised and floating names remain compatibility aliases.')}</p>
    </section>
    <UI.Card className="cap-installation-agents">
      <h2>{t('Подключите агента', 'Connect your agent')}</h2>
      <p>{t('Дайте агенту карту инструкций из установленного пакета. Затем пусть он читает только нужные записи manifest и подходящий рецепт.', 'Give your agent the instruction map from the installed package. It should then read only the relevant manifest records and composition recipe.')}</p>
      <UI.CodeBlock filename={t('Пути в проекте', 'Project paths')} language="text" showLanguageSelector={false} showActionsMenu={false} wrap>{'node_modules/sloyui/llms.txt\nnode_modules/sloyui/AGENTS.md\nnode_modules/sloyui/agent-manifest.json\nnode_modules/sloyui/docs/recipes.md'}</UI.CodeBlock>
      <a href="#agents">{t('Открыть инструкции', 'Open instructions')}</a>
    </UI.Card>
  </div>;
}
