# Changelog

Все заметные изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-04-01

### Added
- Динамическая схема инструмента: параметры `generate-spring-boot-project` строятся из метаданных Spring Initializr API при старте сервера (ADR-002)
- Валидация параметров перед запросом к Spring Initializr — невалидные значения возвращаются как `isError` с понятным сообщением
- Ресурсы `springinitializr://options` и `springinitializr://options/json` динамически итерируют по полям метаданных
- Модуль `src/resource/metadata.ts` — общие типы и кэширование метаданных для инструмента и ресурсов
- Логирование тела ответа при ошибках от Spring Initializr (`download.ts`)
- Логирование полного URL запроса на уровне INFO

### Changed
- `registerTools()` стал async — загружает метаданные до регистрации инструмента
- `createServer()` в `index.ts` стал async
- `url-builder.ts` упрощён: fluent-класс `SpringInitializrUrlBuilder` заменён на функцию `buildDownloadUrl(params)`
- Ошибки генерации возвращаются как `isError: true` вместо `throw` — AI-ассистент может скорректировать параметры
- Ресурсы используют общий `fetchMetadata()` из `metadata.ts` вместо локальной функции

### Removed
- `src/tool/constants.ts` — автогенерируемый файл с описаниями параметров
- `scripts/generate-constants.ts` — скрипт генерации констант
- Скрипты `generate` и `prebuild` из `package.json`
- Fallback-схема инструмента — при недоступности API сервер не стартует (fail-fast)

## [1.0.0] - 2026-04-01

### Added
- MCP-сервер на Node.js + TypeScript, оборачивающий Spring Initializr API
- Инструмент `generate-spring-boot-project` — генерация ZIP-архива Spring Boot проекта
- Ресурсы метаданных в text/plain и application/json форматах (ADR-001)
- Промпт `generate-spring-boot-project` для пошаговой генерации проекта
- Два транспорта: stdio (Claude Desktop, Claude Code, Cursor) и HTTP (Streamable HTTP)
- Docker и Docker Compose с Watchtower для автообновления
- Автогенерация описаний параметров из Spring Initializr API (`scripts/generate-constants.ts`)
- Архитектурная документация: C4-диаграммы, sequence-диаграммы, ADR