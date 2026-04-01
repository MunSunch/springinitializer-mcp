# ADR-002: Динамическая схема инструмента из метаданных Spring Initializr

## Статус

Реализовано

## Контекст

Описания и набор параметров инструмента `generate-spring-boot-project` были захардкожены в коде. При изменении параметров на стороне Spring Initializr (новые версии Java, типы проектов, зависимости) наш сервер отставал — AI-ассистент видел устаревший список, а запросы с невалидными значениями приводили к HTTP 500 без понятной диагностики.

Spring Initializr API (`https://start.spring.io/metadata/client`) возвращает полное описание всех полей формы:

```json
{
  "type":        { "type": "action",        "default": "gradle-project", "values": [...] },
  "language":    { "type": "single-select",  "default": "java",           "values": [...] },
  "javaVersion": { "type": "single-select",  "default": "17",             "values": [...] },
  "packaging":   { "type": "single-select",  "default": "jar",            "values": [...] },
  "bootVersion": { "type": "single-select",  "default": "...",            "values": [...] },
  "groupId":     { "type": "text",           "default": "com.example" },
  "artifactId":  { "type": "text",           "default": "demo" },
  "version":     { "type": "text",           "default": "0.0.1-SNAPSHOT" },
  "name":        { "type": "text" },
  "description": { "type": "text" },
  "packageName": { "type": "text",           "default": "com.example.demo" },
  "dependencies": { "values": [ { "name": "Web", "values": [...] }, ... ] },
  "_links":      { ... }
}
```

Каждое поле содержит `type` (`text`, `single-select`, `action`), опциональный `default` и для select-полей — массив `values` с допустимыми значениями. Этого достаточно, чтобы полностью сгенерировать Zod-схему, описания параметров и валидацию.

## Решение

При старте сервера `registerTools()` запрашивает метаданные и **динамически** строит из них:

1. **Zod-схему** — для каждого поля из метаданных создаётся `z.string().optional().describe(...)`. Описание формируется автоматически из `default` и `values`.
2. **Валидацию** — перед запросом к Spring Initializr проверяются все select-поля (`values`) и зависимости.

### Маппинг ключей

Метаданные API используют ключ `type` для типа проекта, но в URL-параметрах и нашем инструменте он называется `projectType` (чтобы не конфликтовать с зарезервированными словами). Маппинг хранится в `PARAM_KEY_MAP`.

### Особые параметры

Два параметра отсутствуют в метаданных и добавляются отдельно:
- `baseDir` — параметр URL Spring Initializr, не описан в metadata
- `dependencies` — структура отличается от остальных полей (категории → зависимости), обрабатывается особо

### Fallback

Если метаданные недоступны при старте (сеть, таймаут), сервер завершает работу с ошибкой (fail-fast). Это гарантирует, что сервер не начнёт работу с устаревшими или неполными данными.

### Формирование описания поля

```
text-поле:   "The {label}. Defaults to '{default}'."
select-поле: "The {label}. Defaults to '{default}'. Supported values: 'a', 'b', 'c'."
```

Лейбл получается из camelCase-ключа (`javaVersion` → `java version`).

### Формирование валидации

Итерация по метаданным: для каждого поля с непустым `values` проверяется, что переданное значение входит в список допустимых. Для `dependencies` — проверяется каждый ID по плоскому списку всех зависимостей.

## Поток данных

```
Старт сервера
  → fetchMetadata()
  → buildSchema(metadata)     — Record<string, z.ZodOptional<z.ZodString>>
  → server.tool(..., schema, handler)

Вызов инструмента
  → fetchMetadata()           — из кэша
  → validate(params, metadata)
  → если ошибки → isError: true + понятное сообщение
  → если ок → построить URL → fetch ZIP → вернуть base64
```

## Затронутые файлы

- `src/resource/metadata.ts` — расширен `Metadata` полями `groupId`, `artifactId`, `version`, `name`, `description`, `packageName` и интерфейсом `MetadataField` с полем `type`
- `src/tool/generate-project.ts` — динамическое построение схемы и валидации из метаданных
- `src/resource/spring-initializr-metadata.ts` — ресурсы options и options/json динамически итерируют по полям метаданных
- `src/tool/url-builder.ts` — упрощён до функции `buildDownloadUrl(params)` вместо fluent-класса
- `src/index.ts` — `createServer()` стал async для поддержки async `registerTools()`

## Удалённые файлы

- `src/tool/constants.ts` — больше не нужен
- `scripts/generate-constants.ts` — больше не нужен
- `package.json` — удалены скрипты `generate` и `prebuild`

## Альтернативы

1. **Статический `constants.ts` + скрипт генерации** — предыдущий подход. Устаревает между сборками, требует ручного обновления.
2. **CI-планировщик для обновления `constants.ts`** — добавляет сложность инфраструктуры, не решает проблему долгоживущих серверов.
3. **Захардкоженные описания + рантайм-валидация** — промежуточный вариант. Описания устаревают, хотя валидация актуальна.