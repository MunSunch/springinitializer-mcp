# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

MCP-сервер на Node.js + TypeScript, оборачивающий Spring Initializr API (start.spring.io). Позволяет AI-ассистентам генерировать Spring Boot проекты через MCP-протокол.

## Команды

```bash
npm install          # установить зависимости
npm run build        # компиляция (tsc), перед этим автоматически запускается npm run generate
npm run dev          # запуск без компиляции (tsx, stdio)
npm run dev:http     # запуск без компиляции (tsx, HTTP)
npm test             # запуск тестов (vitest)
npx vitest run tests/tool/url-builder.test.ts  # запуск одного теста
npm run generate     # обновить constants.ts из Spring Initializr API
```

## Архитектура

### Транспорты

Сервер поддерживает два режима, выбираемых через `--transport`:
- **stdio** (по умолчанию) — для Claude Desktop, Claude Code, Cursor. Логи в stderr.
- **HTTP** (Streamable HTTP) — Express на `/mcp`. Каждый клиент получает отдельную сессию (`McpServer` + `StreamableHTTPServerTransport`). `sessionId` доступен только после `handleRequest()`, не после `connect()`. Процесс удерживается через `await new Promise(() => {})`.

### MCP-возможности

- **Tool** `generate-spring-boot-project` — принимает параметры проекта (тип, язык, версия Boot, зависимости и др.), скачивает ZIP из Spring Initializr в память и возвращает клиенту как base64 blob. На диск ничего не пишется.
- **Resources** — метаданные Spring Initializr в двух форматах: `text/plain` и `application/json` (суффикс `/json`). Метаданные кэшируются в памяти модуля.
- **Prompt** `generate-spring-boot-project` — структурированный промпт, направляющий AI через чтение ресурсов → выбор параметров → вызов инструмента.

### Генерация кода

`src/tool/constants.ts` — автогенерируемый файл. Скрипт `scripts/generate-constants.ts` запрашивает `https://start.spring.io/metadata/client` и генерирует описания параметров с актуальными версиями Java и списком зависимостей. Запускается автоматически перед `npm run build` через `prebuild`.

## Соглашения

- ESM-модули (`"type": "module"`), импорты с `.js` расширением
- Strict TypeScript
- Тесты в `tests/`, зеркалят структуру `src/`
- Имена файлов отражают содержимое, не роль (не `register.ts` в каждой папке)
- Логирование через `logger` из `src/util/logger.ts`, уровень в `.env` (`LOG_LEVEL`)
- Скрипты запуска — парами `.sh` + `.cmd`, используют `--env-file=.env`
- Архитектурные решения документируются в `docs/adr/`