# Capacities UI 0.2.0 — сохранённая версия

Снимок создан до изменения оформления и каталога 0.3.0. Сборка не перезаписывает эти архивы.

- `workspace.tar.gz` — полный рабочий снимок исходников, примеров, документации, тестов и результатов сборки; без `.git`, `node_modules`, вложенных архивов versions и временных artifacts.
- `personal-capacities-ui-0.2.0.tgz` — готовый npm-пакет для отката проекта-потребителя.
- `SHA256SUMS` — контрольные суммы обоих архивов.

Проверка из этой папки:

```sh
shasum -a 256 -c SHA256SUMS
```

Суммы проверены при подготовке инструкции; оба архива совпали с `SHA256SUMS`.

| Архив | SHA-256 |
| --- | --- |
| workspace.tar.gz | dcf3c126daf7abda43799376fd672d39fd1b2455d2b95850878bddfd8f7eeb98 |
| personal-capacities-ui-0.2.0.tgz | 466b95d96b9a40f86ec93bc2ba7303f3ace66fb2cdcf4e8d62a6f36785d9e6af |

Чтобы открыть старый каталог, выполните из корня репозитория:

```sh
restore_dir="$(mktemp -d /tmp/capacities-ui-v2.XXXXXX)"
tar -xzf versions/v0.2.0/workspace.tar.gz -C "$restore_dir"
cd "$restore_dir"
npm ci
npm run dev -- --port 4318
```

Откройте `http://127.0.0.1:4318`. Восстановление идёт в новую папку и сохраняет текущий checkout.

Для отката потребителя выполните в его проекте:

```sh
npm install /absolute/path/to/capacities-style/versions/v0.2.0/personal-capacities-ui-0.2.0.tgz
```

Закрепите обновлённый lockfile проекта. Предыдущая версия 0.1.0 также сохранена отдельно в `versions/v0.1.0`.
