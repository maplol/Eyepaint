---
name: eyepaint-design
description: >-
  Дизайн-система EYEPAINT целиком: визуальный мир, токены, типографика, glass,
  раскладка Studio/Welcome/CameraRoom, панели, чипы, углы сброса, табы, модалки,
  мобилка vs ПК, motion, RU-копирайт и антипаттерны. Используй при любой UI-правке,
  аудите, новых панелях, онбординге, настройках и рефакторе chrome.
---

# EYEPAINT — дизайн всего приложения

Источник правды: код (`src/index.css`, `components/studio/studioUi.ts`, панели),
не выдуманный Figma. Продуктовая карта фич — соседний skill `eyepaint-features`.
Общий craft-floor — `impeccable` (после этого skill, не вместо).

**Режимы поверхностей**

| Поверхность | Mode | Главное |
|-------------|------|---------|
| Welcome | Persuade | бренд + 1 CTA-группа; сцена атмосферы |
| Studio | Operate | сцена важнее панелей; chrome плавает |
| CameraRoom | Operate | телефон = сенсор; огромные кнопки, минимум текста |
| Onboarding / Help | Read + Operate | короткие шаги, не маркетинг |

---

## 1. Идентичность (нельзя ломать)

- **Продукт:** «калька» — референс поверх камеры листа. UI обслуживает рисование, не конкурирует со сценой.
- **Палитра:** холодные ink/mist + тёплый clay-акцент `#e09a6a`. Cool neutrals, warm accent.
- **Шрифты только:** Outfit (display) + Manrope (body). Никаких Inter/Roboto/Arial/system как основного стека.
- **Материал:** frosted glass поверх live-video + **обязательный непрозрачный fallback**.
- **Язык UI:** русский, короткий, честный. Технические ярлыки (AND/OR, JSON, QR, hex) можно EN.

### Жёсткий запрет визуальных клише

Не уводить продукт в:

1. purple / indigo градиенты и «AI SaaS» glow;
2. тёплый cream `#F4F1EA` + контрастный serif + terracotta-как-тема (у нас terracotta — **акцент**, не фон);
3. broadsheet / газетная вёрстка (hairline rules, zero radius, плотные колонки);
4. dark-mode ради dark-mode, multi-layer shadows, emoji в chrome;
5. карточки как структура страницы / hero-карточки / inset-hero;
6. «коробка в коробке» внутри панелей инструментов.

---

## 2. Принципы продукта → UI

Из `docs/ROADMAP.md` + практика Studio:

1. **Сцена важнее панелей** — full-bleed камера; chrome не перекрывает бумагу без нужды.
2. **Телефон = сенсор, ПК = мозг** — CameraRoom минимален; Studio держит точные настройки.
3. **Один состав на viewport** — Welcome: бренд + headline + 1 supporting + CTA. Studio: сцена + точечный chrome.
4. **Одна работа на секцию** — один заголовок, одна короткая подсказка, одна группа контролов.
5. **Плоские панели** — группы через линию (`sectionDividerClass`), не nested cards.
6. **Честный эфир** — статусы «с камеры» / «в эфир» без ложного 4K.
7. **Safe areas** — всегда `var(--safe-top)` / `var(--safe-bottom)`.

---

## 3. Токены и атмосфера

**Файлы:** `src/index.css`, `src/lib/theme.ts`  
**Переключение:** `data-atmosphere="dark|light"` на корне Studio. Хранение: `eyepaint-atmosphere-v1`.

### Базовые цвета (`@theme`)

| Token | Hex / значение | Роль |
|-------|----------------|------|
| `--color-ink` | `#1c2428` | база dark |
| `--color-ink-deep` | `#141a1d` | глубина / scrim |
| `--color-mist` | `#e7eef0` | светлый текст / light ink flip |
| `--color-paper` | `#f5f7f8` | сильнейший светлый |
| `--color-accent` | `#e09a6a` | CTA, active, range accent |
| `--color-accent-ink` | `#2a1a10` | текст на залитом акценте |
| `--color-accent-soft` | `#ffd9bd` | мягкий accent-fg |
| `--color-danger` / `--color-danger-soft` | `#ef8b8b` / `#ffb4b4` | удаление / сброс |
| `--shadow-glass` | мягкая тень панелей | не multi-layer neon |

### Семантика (flip с atmosphere) — всегда предпочитать эти

Текст: `--fg`, `--fg-strong`, `--fg-muted`, `--fg-faint`, `--fg-slider`  
Glass fill: `--glass-fill`, `--glass-fill-mid`, `--glass-fill-strong`  
Borders: `--glass-border`, `--glass-border-soft`, `--line`, `--line-soft`  
Поверхности: `--panel-solid`, `--chip-solid`, `--dock-bg`, `--tab-strip-bg`, `--header-fade`, `--panel-inset-bg`  
Chips accent: `--chip-accent-fg`, `--chip-accent-fg-active`, `--chip-accent-bg`, `--chip-accent-bg-active`, `--chip-accent-border`

**Правило:** не хардкодить `text-white` / `#e7eef0` в панелях — только `--fg*`, иначе light-atmosphere ломается.

Legacy aliases (`--ink`, `--mist`, `--glass`, `--text-muted`…) ещё встречаются — новые правки → семантика.

### Радиусы

| Token / class | Когда |
|---------------|--------|
| `rounded-full` | CTA, header icons, pills, CornerAction |
| `rounded-3xl` / `--radius-lg` (24) | крупные glass-панели, settings, dock |
| `rounded-2xl` | rail shell, status, списки |
| `rounded-[14px]` | чипы, pose save |
| `rounded-xl` | tab strip, pose stats |
| `rounded-lg` | tab cell, мелкие icon-btn |

---

## 4. Glass-система

| Класс | Назначение |
|-------|------------|
| `.eyepaint-glass` | панели / docks / settings — `--panel-solid` + `--dock-bg` + blur |
| `.eyepaint-glass-chip` | компактный chrome: header chips, toast, tooltips |
| `.eyepaint-glass-edge` | рельса у края экрана — короче тень, чтобы `#root { overflow:hidden }` не резал |
| `.glass-panel` | Welcome / CameraRoom dock |
| `.eyepaint-coach-card` | плотная карточка coachmark |
| `.eyepaint-coach-spot` | мягкое кольцо + dim, **не** заливка акцентом |
| `.eyepaint-scroll` | тонкий accent-scrollbar |

**Обязательно:** поверх `<video>` glass читаем → opaque `--panel-solid` / `--chip-solid`, blur = enhancement.  
На мобилке (`max-width: 959px`) токены плотнее (ещё менее прозрачные).

Хелпер: `glassSurfaceClass` в `studioUi.ts` → `eyepaint-glass`.

---

## 5. Типографика

| Роль | Family | Где |
|------|--------|-----|
| Display | Outfit 500–800 | Welcome бренд, room code, coach/help titles |
| Body | Manrope 400–700 | весь chrome |

Шкала (привычки кода):

- Welcome brand: `clamp(2.6rem, 11vw, 3.6rem)`, extrabold, tracking `-0.04em`
- Studio header brand: `~0.78rem`, bold, tracking `0.08em`
- Заголовок панели: `sectionTitleClass` → `text-sm font-bold --fg-strong`
- Чипы / поля: `0.72–0.86rem`, часто `leading-tight` (текст не должен вылезать)
- Tips: `tipClass` / `--fg-faint`, `0.68–0.78rem`
- Таймеры / статы: `[font-variant-numeric:tabular-nums]`

`StableLabel` — держит ширину чипа, когда RU on/off разной длины (не прыгает layout при атмосфере/состоянии).

---

## 6. Архитектура экранов и «разделения»

```
App
├── Welcome          Persuade: бренд, CTA, уроки, атмосфера (orbs)
├── Studio           Operate: full-bleed stage + floating chrome
│   ├── Header       бренд · статус · настройки · скрыть UI
│   ├── ToolRail     слева, вертикаль, без внутреннего скролла
│   ├── Tool panel   ПК: left inspector | Mobile: bottom dock
│   ├── Layers       ПК: right column | Mobile: bottom sheet
│   ├── Settings     modal overlay
│   ├── Overlays     Loupe / Guides / Mask / Toast / Onboarding
│   └── FAB          «Показать UI» когда chrome скрыт
├── CameraRoom       телефон: крупный статус + connect
├── Onboarding       coachmarks
└── HelpSystem       режим «?» + tip modal
```

### Разделение ответственности chrome

| Зона | Что лежит | Чего там нет |
|------|-----------|--------------|
| **Сцена** | video, слои референса, лупа, гиды, жесты | настройки, списки, формы |
| **Рельса** | только иконки инструментов + active | подписи, скролл, вторичные CTA |
| **Панель инструмента** | настройки **текущего** tool | глобальные настройки проекта/темы |
| **Слои** | список слоёв, DnD, меню порядка | цвета / позы / проекция |
| **Settings modal** | связь, хоткеи, тема, флаги, проект-файл | ежедневные tool-controls |
| **Header** | бренд, статус эфира, вход в settings, hide UI | слайдеры инструментов |

### Z-index (не плодить свои)

| Слой | z | Пример |
|------|---|--------|
| Stage / loupe | 0–5 | сцена |
| Hotkey hint | 2 | только desktop |
| Dock / inspector / layers | 20 | |
| Toast | 25 | |
| Header | 30 | `--header-fade` |
| Tool rail / show-UI FAB | 40 | |
| Settings | 70 | |
| Context menu / onboarding / DnD ghost | 80–90 | |
| Help tip | 90 | |
| HoverTooltip (portal) | 120 | |

**Оверлеи с текстом** (tooltip, menu, help) — через **portal** в `document.body`. Не оставлять в overflow панели.

---

## 7. Mobile vs Desktop

Breakpoint Studio: **`960px`** (`useDesktopStudioLayout`). Glass density CSS: `max-width: 959px`.

| | Mobile &lt;960 | Desktop ≥960 |
|--|----------------|--------------|
| Tool settings | `dockShellClass` + `dockClass` снизу | `toolInspectorClass` слева |
| Layers | sheet снизу; compact header если tool open | `layersColumnClass` справа |
| Rail | всегда; `overflow-hidden`, без скролла | чуть крупнее кнопки |
| Glass | почти opaque | больше translucency + blur |
| Toast | низ над chrome | под header |
| Hotkeys hint | скрыт | по центру |
| Welcome | контент к низу | центр/лево |

Классы раскладки — только из `studioUi.ts` (`dock*`, `toolRail*`, `toolInspector*`, `layers*`). Не копипастить absolute-координаты в JSX.

Фиксируй **высоту** инспектора/дока (`h-[min(...)]`), не только `max-h`, если внутри нужен `flex-1` + внутренний скролл + уголок.

---

## 8. Паттерн панели инструмента

Канон chrome панели:

```
[ Заголовок инструмента + PanelHint(?) ] …… [ Закрыть ]
──────────────── border-b ────────────────
[ body: flex min-h-0 flex-1 flex-col overflow-hidden ]
```

- Один заголовок — не дублировать название секциими внутри.
- Body **не** должен быть единственным scrollport, если внутри нужен фиксированный угол:
  - scroll → внутрь `PanelFrame` / `Pane` вкладки;
  - родитель: `overflow-hidden flex flex-col min-h-0`.

### Плоские секции

```ts
sectionDividerClass // mt-3 border-t … pt-3
fieldLabelClass     // мелкий ярлык группы без коробки
sliderLabelsClass   // label слева · value справа
```

`panelCardClass` — legacy inset-card; **не возвращать** как структуру панели.  
Карточки допустимы только как контейнер **взаимодействия** (урок, saved palette row, layer menu item) — если убрать border/shadow/radius и ничего не ломается, это не карточка.

### PanelHint + HoverTooltip

- `?` рядом с заголовком → hover tooltip (portal) + click → HelpSystem tipId.
- Не складывать длинный help в сам panel body.

### PanelTabs

- Таб-strip: `rounded-xl`, glass fill, `role=tablist`.
- Контент — карусель `translateX` 300ms, easing `cubic-bezier(0.22,1,0.36,1)`.
- Каждая вкладка скроллит **сама**; опциональный `corner` на вкладке.
- `storageKey` → `sessionStorage` индекс вкладки.

Использовать для Цвета / Рука / Позы — не плодить второй набор табов.

---

## 9. CornerAction / сброс / удаление (критично)

Кнопки «сбросить / очистить / удалить всё» живут **слева снизу видимой области панели**, всегда на виду.

### Канон (обязательный)

```
PanelFrame / Pane
├── scroll area (overflow-auto, pb-12 если есть corner)
└── absolute overlay inset-0 → button bottom-2 left-2
```

- `CornerAction` — только разметка кнопки (круг 36×36, danger hover).
- Позиционирует **оболочка** (`PanelFrame` или `PanelTabs` `corner` prop), не `sticky` внутри контента.
- Иконки: `ResetIcon`, `TrashIcon` из того же модуля.

### Запрещено

- `position: sticky` для уголка внутри любого предка с `overflow: auto|hidden|scroll`.
- Класть кнопку в конец длинного контента («долистать до сброса»).
- Дублировать текстовый «Сбросить» рядом с иконкой в углу (label = `aria-label` / `title`).

Если уголок снова «уезжает» — сначала проверь цепочку overflow у родителей (Studio body, PanelTabs, Settings content), а не усиливай sticky.

---

## 10. Чипы, кнопки, контролы

Всё из `studioUi.ts` — не изобретать размеры.

| Класс | Роль |
|-------|------|
| `chipBaseClass` | база: `min-h-10`, `rounded-[14px]`, `text-[0.78rem]`, `leading-tight` |
| `chipNeutralClass` | вторичное действие |
| `chipAccentClass(active)` | выбор режима; active = заливка accent + dark ink text |
| `chipFileClass` | label + hidden file input |
| `poseSaveClass` | полная ширина accent CTA в панели |
| `ctaPrimaryClass` / `ctaSecondaryClass` | онбординг / help (rounded-full) |
| `glassButtonClass` | pill frosted text |
| `glassIconButtonClass` | 40×40 header |
| `chromePillClass` | статус-пилюля |
| `rangeInputClass` | range на всю ширину, `accent-[var(--accent)]` |
| `rowClass` | сетка чипов `grid-cols-3 gap-2` |

Touch targets: чипы ≥40px; primary CTA ≥44–56px (CameraRoom крупнее); rail 36→40px на desktop.

Danger — только для разрушительных действий (удалить позу, очистить автосейв, сбросить хоткеи). Hover у CornerAction уже danger-tint.

---

## 11. Карта инструментов → панели

| Tool id | RU label | Панель | Заметки UI |
|---------|----------|--------|------------|
| hand | Рука | `MainPanel` focus hand + PanelTabs | Референс / Сессия / Телефон |
| eyedropper | Цвета | `ColorsPanel` + PanelTabs | Палитра / Кисть / Избранное; крупная пипетка |
| loupe | Лупа | `MainPanel` loupe | sticky mode: Закрыть панель ≠ выкл |
| perspective | Проекция | `ProjectPanel` + PanelFrame corner | сброс углов |
| calc | Калька | `MainPanel` calc | sticky |
| guides | Гиды | `MainPanel` guides | sticky |
| poses | Позы | `PosesPanel` + PanelTabs | равные stat-чипы; clear в corner списка |
| layers | Слои | `LayersPanel` | не в tool inspector — своя колонка/sheet |

Settings (⚙) — **модалка**, не вкладка рельсы: Связь / Клавиши / Тема / Флаги / Проект.

Тема UI живёт в Settings, не в панели Руки.

---

## 12. Motion

| Имя | Когда |
|-----|--------|
| `rise-in` | появление chrome, dock, settings, toast, Welcome card |
| `soft-float` | **только** Welcome orbs (долго, ambient) |
| `shutter-flash` | снимок / composite capture |
| PanelTabs translateX | смена вкладки |
| `transition-colors` | чипы, rail, corners |
| `active:scale-[0.98]` | Welcome CTA |
| coach spot 200ms | онбординг highlight |

Не анимировать всё подряд. Studio chrome — короткий rise-in; никаких decorative glow-pulse на панелях.

---

## 13. Копирайт (RU)

- Тон: коротко, по делу, разговорно («Смотри сквозь референс», «Жми «?»»).
- Инструменты — как в `STUDIO_TOOL_LABELS`.
- Действия: Закрыть, Назад, Скрыть, Показать, Создать комнату, Пропустить / Дальше / Готово.
- Процесс: многоточие — «Подключаюсь…», «Рисую…».
- Статусы: разделитель `·` (`Телефон · 1080p`).
- Help: `src/lib/helpTips.ts` — title + 1–3 предложения; объяснять sticky-режимы и роли устройств.
- Коды комнаты / бренд / settings dialog: `translate="no"` где автоперевод опасен.
- Не раздувать маркетингом Operate-экраны.

---

## 14. Welcome (Persuade) — отдельно

- Brand-first: имя EYEPAINT — hero-level, не eyebrow в nav.
- Первый viewport: бренд + один headline + одна supporting + CTA-группа + атмосфера (градиент/orbs). Без stats, расписаний, карточек-промо.
- Full-bleed атмосфера, не inset hero image / collage / floating media card.
- Нет detached badges / stickers поверх hero.
- Motion: soft-float orbs + rise-in карточки контента.
- Уроки — ниже первого fold или вторичный блок; карточка урока = interactive container.

---

## 15. CameraRoom

- Крупный статус связи, огромные primary actions.
- Минимум вторичного текста; инструкция сворачивается.
- Glass dock читаем на камере; safe areas.
- Не тащить Studio-рельсу и панели на телефон.

---

## 16. Антипаттерны (уже жгли — не повторять)

| Симптом | Почему | Правильно |
|---------|--------|-----------|
| Сброс в конце скролла | sticky + overflow предков | PanelFrame / tabs `corner` absolute |
| Коробка в коробке | nested cards + дубль заголовков | divider + один title + PanelHint |
| Текст вылезает из чипа | мало padding / leading | `leading-tight`, общий `chipBaseClass` |
| Glass нечитаем на video (mobile) | слишком прозрачный | плотные `--panel-solid`, blur сверху |
| Тень рельсы обрезана | overflow root | `eyepaint-glass-edge`, visible на нужной оси |
| Скролл у рельсы | «на всякий» overflow-auto | rail без скролла |
| Вкл/Выкл рядом с tool | дубль состояния | выбор tool / sticky mode |
| Слои перекрывают dock | z + высота | compact sheet, фикс высоты колонок |
| Тема в Руке | смешение concerns | Settings → Тема |
| Tooltip обрезан | нет portal | `HoverTooltip` → body |
| Прыгающие подписи | разная длина RU | `StableLabel` + полные `--fg*` |
| Stock hero.png | чужой бренд | своя атмосфера |

---

## 17. Куда класть код

| Что | Куда |
|-----|------|
| Классы chrome / layout shells | `components/studio/studioUi.ts` |
| Токены / glass / keyframes | `src/index.css` |
| Панель инструмента | `components/studio/*Panel.tsx` |
| Общие куски панелей | `CornerAction`, `PanelTabs`, `PanelHint`, `HoverTooltip` |
| Оркестрация | `Studio.tsx` (не раздувать разметкой контролов) |
| Tips / atmosphere | `lib/helpTips.ts`, `lib/theme.ts` |

Новый контрол → сначала ищи существующий chip/row/slider helper. Новый цвет → сначала токен.

---

## 18. Чеклист перед сдачей UI

1. Сцена не перекрыта без нужды; один job у секции.
2. Только Outfit/Manrope; accent `#e09a6a`; нет purple/cream-serif/glow.
3. Текст и границы через `--fg*` / `--glass*`; light atmosphere не ломается.
4. Glass: opaque fallback + blur; mobile плотнее.
5. Панель плоская: dividers, не nested cards; один title + `?`.
6. Сброс/удаление — corner absolute, виден без скролла к концу.
7. Чипы из `studioUi`; `min-h-10+`, `leading-tight`.
8. Desktop ≥960: inspector left + layers right; mobile: dock/sheet.
9. Tooltip/menu через portal; z по таблице.
10. RU короткий; коды с `translate="no"`.
11. Motion только осмысленный (rise-in / shutter / tab / Welcome float).
12. Safe-area учтён; e2e smoke Studio/Welcome/Colors не красные.

---

## 19. Ключевые файлы

| Файл | Зачем открыть |
|------|----------------|
| `src/index.css` | токены, glass, анимации, coach |
| `src/components/studio/studioUi.ts` | все layout/chip helpers |
| `src/components/studio/CornerAction.tsx` | PanelFrame + corner |
| `src/components/studio/PanelTabs.tsx` | табы + corner |
| `src/components/studio/PanelHint.tsx` | `?` |
| `src/components/studio/HoverTooltip.tsx` | portal tooltip |
| `src/components/Studio.tsx` | оркестрация chrome |
| `src/components/Welcome.tsx` | Persuade |
| `src/components/CameraRoom.tsx` | phone Operate |
| `src/lib/theme.ts` | atmosphere |
| `src/lib/helpTips.ts` | микрокопирайт |
| `docs/ROADMAP.md` | продуктовые принципы |
| `.cursor/skills/eyepaint-features/SKILL.md` | что умеет продукт |

---

## Связь с impeccable

- Этот skill = **incumbent visual world** EYEPAINT (Operate + Persuade Welcome).
- `impeccable` / `craft-floor` — качество исполнения; не переписывать палитру/шрифты «на вкус».
- `document` → при желании вынести сжатую версию в `DESIGN.md`, но агентам достаточно этого skill.
- Новая поверхность: mode из таблицы §0; не смешивать Persuade-hero приёмы в Studio Operate.
