import * as UI from '../src';
import './installation.css';

const release = 'https://github.com/davidyich/sloyui/releases/tag/v0.8.0';
const install = 'npm install react@^19 react-dom@^19\nnpm install https://github.com/davidyich/sloyui/releases/download/v0.8.0/personal-capacities-ui-0.8.0.tgz';
const entry = `import { createRoot } from 'react-dom/client';
import { Button, Card, LocaleProvider, Tag } from '@personal/capacities-ui';
import '@personal/capacities-ui/styles.css';
import '@personal/capacities-ui/fonts.css'; // optional
import './app.css';

// Set appearance at the application root.
document.documentElement.dataset.theme = 'light';

function App() {
  return (
    <LocaleProvider locale="en">
      <main className="app" data-surface="canvas" data-accent="teal">
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
  <section data-accent="purple" data-surface="raised"
           style="background: var(--cap-surface-current)">
    <!-- Components inherit this context. -->
  </section>
</html>`;

export default function Installation() {
  const t = UI.useTranslate();
  const axes = [
    ['data-theme', 'light · dark', t('Тема на html; локально можно переопределить.', 'Set appearance on html; local overrides are supported.')],
    ['data-accent', 'neutral · teal · purple · …', t('Локальный акцент для компонентов без явного color.', 'Local accent for components without an explicit color.')],
    ['data-surface', 'base · canvas · raised · floating', t('Контекст поверхности. Произвольный контейнер нужно также покрасить.', 'Surface context. Paint custom containers as well.')],
    ['data-borders', 'off · on', t('Декоративные рамки; по умолчанию off.', 'Decorative borders; off by default.')],
    ['data-radius', 'compact · default · rounded', t('Скругления страницы или локального контейнера.', 'Corner geometry for the page or a local container.')],
  ];
  return <div className="cap-installation">
    <header className="page-intro">
      <div className="eyebrow">{t('ДОКУМЕНТАЦИЯ', 'DOCS')}</div>
      <h1>{t('Установка', 'Installation')}</h1>
      <p>{t('Подключите пакет, добавьте стили и соберите первый экран.', 'Install the package, add styles and build your first screen.')}</p>
      <div className="cap-installation-meta"><UI.Tag>v0.8.0</UI.Tag><UI.Tag>React 19+</UI.Tag><UI.Tag>TypeScript</UI.Tag></div>
    </header>
    <section aria-labelledby="installation-package">
      <h2 id="installation-package">{t('1. Установите пакет', '1. Install the package')}</h2>
      <p>{t('В существующем React-проекте выполните команды ниже. Готовый архив содержит собранный код, стили и типы.', 'Run these commands in your React project. The release archive includes compiled code, styles and types.')}</p>
      <UI.CodeBlock filename="Terminal" language="bash" showLanguageSelector={false} showActionsMenu={false} wrap>{install}</UI.CodeBlock>
      <p className="cap-installation-note">{t('Пакет @personal/capacities-ui распространяется через GitHub Release и пока не опубликован в npm. React и React DOM — peer-зависимости; дополнительных runtime-зависимостей нет.', 'The @personal/capacities-ui package is distributed through GitHub Releases and is not published on npm yet. React and React DOM are peers; there are no other runtime dependencies.')}</p>
      <a href={release} target="_blank" rel="noreferrer">{t('Открыть релиз v0.8.0', 'Open release v0.8.0')} ↗</a>
      <p>{t('Если архив уже скачан, установите его из файла:', 'If you have downloaded the archive, install the local file:')}</p>
      <UI.CodeBlock language="bash" showLanguageSelector={false} showActionsMenu={false} wrap>{'npm install ./personal-capacities-ui-0.8.0.tgz'}</UI.CodeBlock>
    </section>
    <section aria-labelledby="installation-start">
      <h2 id="installation-start">{t('2. Добавьте стили и компоненты', '2. Add styles and components')}</h2>
      <p>{t('Импортируйте styles.css один раз в точке входа. Он уже содержит runtime-токены. fonts.css по желанию подключает локальные Inter и Overpass Mono.', 'Import styles.css once in your entry point. It already includes runtime tokens. The optional fonts.css adds local Inter and Overpass Mono fonts.')}</p>
      <UI.CodeBlock filename="src/main.tsx" language="tsx" showLanguageSelector={false} showActionsMenu={false}>{entry}</UI.CodeBlock>
      <p>{t('Пример ожидает элемент <div id="root"></div> в HTML вашего приложения. Раскладка и стили body принадлежат приложению:', 'The example expects a <div id="root"></div> element in your application HTML. Your application owns layout and body styles:')}</p>
      <UI.CodeBlock filename="src/app.css" language="css" showLanguageSelector={false} showActionsMenu={false}>{css}</UI.CodeBlock>
    </section>
    <section aria-labelledby="installation-context">
      <h2 id="installation-context">{t('3. Настройте контекст', '3. Set the context')}</h2>
      <p>{t('Все оси наследуются независимо. Меняйте тему на html, а акцент, поверхность, рамки и скругления — на странице или отдельном контейнере.', 'All axes inherit independently. Set appearance on html and adjust accent, surface, borders and corners on a page or a local container.')}</p>
      <dl className="cap-installation-axes">{axes.map(([name, values, description]) => <div key={name}><dt><code>{name}</code></dt><dd><code>{values}</code><p>{description}</p></dd></div>)}</dl>
      <UI.CodeBlock filename="index.html" language="text" showLanguageSelector={false} showActionsMenu={false} wrap>{context}</UI.CodeBlock>
      <p className="cap-installation-note">{t('Card сам задаёт raised. Всплывающие окна задают floating и сохраняют ближайший контекст. Для своих обёрток используйте --cap-surface-current и семантические --cap-* роли.', 'Card establishes raised. Overlays establish floating and preserve the nearest context. Paint custom wrappers with --cap-surface-current and semantic --cap-* roles.')}</p>
    </section>
    <UI.Card className="cap-installation-agents">
      <h2>{t('Подключите агента', 'Connect your agent')}</h2>
      <p>{t('Дайте агенту карту инструкций из установленного пакета. Затем пусть он читает только нужные записи manifest и подходящий рецепт.', 'Give your agent the instruction map from the installed package. It should then read only the relevant manifest records and composition recipe.')}</p>
      <UI.CodeBlock filename={t('Пути в проекте', 'Project paths')} language="text" showLanguageSelector={false} showActionsMenu={false} wrap>{'node_modules/@personal/capacities-ui/llms.txt\nnode_modules/@personal/capacities-ui/AGENTS.md\nnode_modules/@personal/capacities-ui/agent-manifest.json\nnode_modules/@personal/capacities-ui/docs/recipes.md'}</UI.CodeBlock>
      <a href="#agents">{t('Открыть инструкции', 'Open instructions')}</a>
    </UI.Card>
  </div>;
}
