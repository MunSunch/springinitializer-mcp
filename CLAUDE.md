# CLAUDE.md

## Проект

MCP-сервер на Node.js + TypeScript, оборачивающий Spring Initializr API (start.spring.io). Позволяет AI-ассистентам генерировать Spring Boot проекты через MCP-протокол.

## Команды

```bash
npm install          # установить зависимости
npm run build        # компиляция (tsc), перед этим автоматически запускается npm run generate
npm run dev          # запуск без компиляции (tsx, stdio)
npm run dev:http     # запуск без компиляции (tsx, HTTP)
npm test             # запуск тестов (vitest)
npm run generate     # обновить constants.ts из Spring Initializr API
```

## Структура

```
src/
  index.ts                              — точка входа, транспорты (stdio / HTTP)
  tool/
    generate-project.ts                 — MCP tool: generate-spring-boot-project
    url-builder.ts                      — fluent-построитель URL для Spring Initializr
    constants.ts                        — автогенерируемые описания параметров
  resource/
    spring-initializr-metadata.ts       — MCP resources: опции и зависимости (text + JSON)
  prompt/
    generate-project-prompt.ts          — MCP prompt для генерации проекта
  util/
    download.ts                         — HTTP-загрузка ZIP в память
    logger.ts                           — логгер (stderr для stdio, stdout для HTTP)
tests/
  tool/
    url-builder.test.ts                 — тесты URL builder
scripts/
  generate-constants.ts                 — скрипт генерации constants.ts из API метаданных
  install.sh / install.cmd              — установка + сборка
  start.sh / start.cmd                  — запуск stdio
  start-http.sh / start-http.cmd        — запуск HTTP
docs/
  diagrams/                             — PlantUML диаграммы (C4 + sequence) и PNG
  adr/                                  — Architecture Decision Records
```

## Соглашения

- ESM-модули (`"type": "module"` в package.json), импорты с `.js` расширением
- Strict TypeScript
- Тесты через vitest, лежат в `tests/` (зеркалят структуру `src/`)
- `constants.ts` — автогенерируемый файл, не редактировать вручную
- Логирование через `logger` из `src/util/logger.ts`, уровень задаётся в `.env` (`LOG_LEVEL`)
- В stdio режиме логи идут в stderr, в HTTP — в stdout
- ZIP-архив возвращается клиенту как base64 blob, на диск ничего не пишется
- Ресурсы доступны в двух форматах: `text/plain` и `application/json` (суффикс `/json`)

## Зависимости

- `@modelcontextprotocol/sdk` — MCP-протокол (сервер, транспорты)
- `express` — HTTP-сервер для Streamable HTTP транспорта
- `zod` — валидация параметров инструмента