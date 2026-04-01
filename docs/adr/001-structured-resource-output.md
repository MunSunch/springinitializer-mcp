# ADR-001: Структурированный вывод ресурсов

## Статус

Реализовано

## Контекст

Сейчас ресурсы (`springinitializr://options`, `springinitializr://dependencies`, `springinitializr://dependencies/{category}`) возвращают данные в формате `text/plain` — человекочитаемый Markdown. Это удобно для отображения, но неудобно для программного использования: клиенту приходится парсить текст, чтобы извлечь идентификаторы зависимостей или версии.

## Предлагаемые изменения

### 1. Дублирование ресурсов в JSON-формате

Добавить параллельные ресурсы с суффиксом `/json`, возвращающие `application/json`:

| Текущий ресурс (text/plain) | Новый ресурс (application/json) |
|---|---|
| `springinitializr://options` | `springinitializr://options/json` |
| `springinitializr://dependencies` | `springinitializr://dependencies/json` |
| `springinitializr://dependencies/{category}` | `springinitializr://dependencies/{category}/json` |

### 2. Структура JSON-ответа для `springinitializr://options/json`

```json
{
  "projectTypes": {
    "default": "gradle-project",
    "values": [
      { "id": "gradle-project", "name": "Gradle - Groovy", "description": "..." },
      { "id": "maven-project", "name": "Maven", "description": "..." }
    ]
  },
  "languages": {
    "default": "java",
    "values": [
      { "id": "java", "name": "Java" },
      { "id": "kotlin", "name": "Kotlin" }
    ]
  },
  "javaVersions": {
    "default": "17",
    "values": [{ "id": "26" }, { "id": "25" }, { "id": "21" }, { "id": "17" }]
  },
  "packaging": {
    "default": "jar",
    "values": [{ "id": "jar" }, { "id": "war" }]
  },
  "bootVersions": {
    "default": "4.0.5.RELEASE",
    "values": [{ "id": "4.0.5.RELEASE", "name": "4.0.5" }]
  }
}
```

### 3. Структура JSON-ответа для `springinitializr://dependencies/json`

```json
{
  "categories": [
    {
      "name": "Web",
      "dependencies": [
        { "id": "web", "name": "Spring Web", "description": "Build web applications..." },
        { "id": "webflux", "name": "Spring WebFlux", "description": "..." }
      ]
    }
  ]
}
```

### 4. Структура JSON-ответа для `springinitializr://dependencies/{category}/json`

```json
{
  "category": "Web",
  "dependencies": [
    { "id": "web", "name": "Spring Web", "description": "..." },
    { "id": "webflux", "name": "Spring WebFlux", "description": "..." }
  ]
}
```

## Что не меняется

- Текстовые ресурсы (`text/plain`) остаются как есть — обратная совместимость
- Инструмент `generate-spring-boot-project` — без изменений
- Промпт — без изменений

## Затронутые файлы

- `src/resource/spring-initializr-metadata.ts` — добавление 3 новых ресурсов
- `src/resource/metadata.ts` — общие типы и функция загрузки метаданных

## Альтернативы

1. **Заменить text/plain на JSON** — ломает обратную совместимость, хуже для AI-клиентов которые лучше работают с текстом
2. **Отдавать оба формата в одном ресурсе** — MCP-ресурс может содержать только один content type
3. **Не добавлять JSON** — оставить как есть, но теряем возможность программного использования