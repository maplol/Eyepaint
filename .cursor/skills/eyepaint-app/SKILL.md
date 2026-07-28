---
name: eyepaint-app
description: >-
  Полная карта приложения EYEPAINT: продукт, архитектура, экраны, данные, слои,
  комнаты, storage, модули, инварианты, скиллы и куда класть код. Используй при
  любой фиче, рефакторе, баге, e2e, онбординге и планировании — как единый
  «что это за приложение» skill. Детали UI — eyepaint-design; краткие фичи —
  eyepaint-features; бэклог идей — docs/IDEAS.md.
---

# EYEPAINT — приложение целиком

Веб-«калька»: референс поверх камеры листа. **Телефон = сенсор, ПК = мозг.**  
Стек: Vite 8 + React 19 + TS, Tailwind v4, Trystero MQTT (P2P WebRTC), GitHub Pages  
`base: /Eyepaint/` → https://maplol.github.io/Eyepaint/

| Skill / doc | Зачем |
|-------------|--------|
| **eyepaint-app** (этот) | Система: архитектура, данные, инварианты, модули |
| `eyepaint-features` | Что умеет пользователь прямо сейчас |
| `eyepaint-design` | Визуальный мир, панели, антипаттерны UI |
| `docs/ROADMAP.md` | Фазы 0–5, принципы, критерии PR |
| `docs/IDEAS.md` | Бэклог идей: что / зачем / как / ценность |

---

## 1. Продукт в одном абзаце

Художник кладёт телефон над листом → стрим на ПК → накладывает референс(ы) → крутит прозрачность, цвета, гиды, лупу, проекцию → рисует на бумаге, глядя сквозь «кальку». Без аккаунтов и бэкенда: P2P + localStorage/IndexedDB + файлы проекта.

---

## 2. Экраны и навигация

Нет React Router. `App.tsx`: `mode = 'welcome' | 'studio' | 'camera'`.

| Mode | Вход | Компонент |
|------|------|-----------|
| welcome | дефолт / выход | `Welcome` |
| studio | файл, урок, проект, автосейв (+ `imageUrl`) | `Studio` |
| camera | CTA или `?join=CODE` | `CameraRoom` |

Все экраны в `HelpProvider`. Туры: welcome / studio / camera (`Onboarding`).

**Священные пути:** join по коду и `?join=` не ломать.

---

## 3. Роли устройств

| Роль | Где | Делает | Не делает |
|------|-----|--------|-----------|
| **host** | Studio (ПК) | слои, цвета, позы, настройки, команды в data-channel | не обязан быть камерой |
| **camera** | CameraRoom (телефон) | стрим, freeze/torch/exposure/focus, штатив-UX | **не** вторая студия |

Инвариант: на телефоне не появляется рельса инструментов и панели рисования.

---

## 4. Архитектура папок

```
src/
  App.tsx, main.tsx, index.css
  components/          # экраны + shared UI
    studio/            # панели, rail, chrome helpers
  hooks/               # камера, комната, жесты, хоткеи
  lib/                 # чистый домен (без React где возможно)
public/                # manifest, lessons, favicon
e2e/                   # Playwright
docs/                  # ROADMAP, IDEAS
.cursor/skills/        # product skills (versioned)
```

**Правило роста:** не раздувать `Studio.tsx` — UI → `components/studio/*`, логика → `lib/*` / hooks.

---

## 5. Studio — сцена и chrome

```
Stage (full-bleed video + layer stack + loupe/guides/mask)
├── Header          бренд · статус · settings · hide UI
├── ToolRail        слева, без внутреннего скролла
├── Tool panel      ПК: left inspector | Mobile: bottom dock
├── Layers          ПК: right column | Mobile: sheet
├── Settings modal  связь / клавиши / тема / флаги / проект
└── FAB             «Показать UI» когда chrome скрыт
```

Breakpoint: **960px** (`useDesktopStudioLayout`).

### Инструменты → панели

| Tool | RU | Панель |
|------|-----|--------|
| hand | Рука | `MainPanel` (tabs: референс / сессия / телефон) |
| eyedropper | Цвета | `ColorsPanel` |
| loupe | Лупа | `MainPanel` loupe (sticky) |
| perspective | Проекция | `ProjectPanel` |
| calc | Калька | `MainPanel` calc (sticky; фильтр **только на video**) |
| guides | Гиды | `MainPanel` guides (sticky; пресеты) |
| poses | Позы | `PosesPanel` |
| layers | Слои | `LayersPanel` (не inspector) |

⚙ Settings — модалка, не инструмент рельсы. Тема UI — в Settings.

Sticky: лупа/калька/гиды могут оставаться on после «Закрыть» панели; exclusive modes гасятся при смене tool.

---

## 6. Модель данных

### Transform (`OverlayTransform`)
`{ x, y, scale, rotation, rotateX, rotateY }` — per active layer (через `useOverlayTransform`).

### Слой (`RefLayer` в `lib/layers.ts`)
`{ id, url, name, opacity, visible, transform, flipped, kind: 'primary' | 'aux' | 'guide', shapes? }`  
- Порядок: index 0 сзади, last спереди; в UI сверху = ближе.  
- `MAX_LAYERS = 48`. Primary из props Studio; aux — локальные blob/dataURL.  
- **`guide`**: без картинки, `shapes: GuideShape[]` в coords 0..100; один общий слой (флаг `guideLayers`). Пресеты/рисование в инструменте Гиды; жесты Руки двигают весь слой.  
- Активный слой владеет transform / flip / цветами (цвета — только photo-слои).

### Поза (`SavedPose`)
transform + flip + opacity (+ thumbnail, selectedColorIds) — сейчас **активного** слоя.

### Цвета
палитра, precision 1–5, tolerance, mode `off|gray|mask`, brush mask, saved palettes.

### Инструменты сцены
- Calc: `{ enabled, strength }` → CSS filter на video  
- Guides: `{ kind: none|thirds|face|figure, opacity }`  
- Loupe: `{ enabled, size, zoom }`

### Проект (`ProjectSnapshotV1`)
`.eyepaint.json` / IndexedDB autosave: слои (dataURL), activeLayerId, opacity, calc/guides/loupe, atmosphere, lock, colors, brush, poses, flags, hotkeys, savedAt.

### Комната
host/camera, код, topic `eyepaint-{CODE}`, commands: `ping|freeze|torch|exposure|focus`.

---

## 7. Hooks

| Hook | Роль |
|------|------|
| `useCamera` | local/remote stream → `<video>`, quality |
| `useRoomPeer` | MQTT room, WebRTC stream, bitrate, data-channel |
| `useOverlayTransform` | жесты pan/rotate/scale/tilt + CSS transform |
| `useStudioHotkeys` | hold-режимы + remap, persist |

---

## 8. `lib/` — карта модулей

| Модуль | Зачем |
|--------|-------|
| `layers` | модель/порядок слоёв |
| `poses` | CRUD + JSON import/export |
| `colors` / `palettes` / `brushMask` | палитра, фильтр, кисть |
| `studioTools` | calc / guides / loupe defaults |
| `projectSession` | файл проекта + IndexedDB autosave |
| `sessionGallery` | до/прогресс/после снимки |
| `captureComposite` | JPEG композит |
| `rooms` / `roomQr` / `roomCommands` | код, QR, команды |
| `cameraControls` / `videoQuality` | torch/focus/exposure, bitrate honesty |
| `hotkeys` / `flags` / `theme` | persist UX |
| `onboarding` / `lessons` / `helpTips` | туры, уроки, справка |

---

## 9. Storage

**localStorage:** flags, atmosphere, poses-v3, hotkeys, room codes, video quality, color precision/tolerance, palettes, session gallery, autosave meta, tours done, panel tab keys, layers sheet.  
**sessionStorage:** camera caps cache.  
**IndexedDB** `eyepaint-sessions-v1` / store `autosave` / key `current` → полный snapshot.

---

## 10. Feature flags (`eyepaint-flags-v1`)

`multiLayers` · `brushMask` · `sessionGallery` · `lessons` · `lightTheme`  
Новые эксперименты — за флаг или явный toggle.

---

## 11. UI-контракт (кратко; детали в eyepaint-design)

- Сцена важнее панелей; flat panels + `sectionDividerClass`; chips из `studioUi.ts`.  
- Glass: opaque + blur (`.eyepaint-glass`).  
- Сброс/удаление: **corner absolute** (`PanelFrame` / `PanelTabs.corner`), не sticky в конце скролла.  
- Tooltips/menus — portal.  
- Outfit + Manrope; accent `#e09a6a`; RU copy короткий.  
- Запрет: purple SaaS, nested cards, вторая студия на телефоне.

---

## 12. Комната и честность эфира

1. ПК: Settings → Связь → создать комнату → код + QR.  
2. Телефон: CameraRoom / `?join=` → стрим.  
3. ПК видит remote video; команды freeze/torch/exposure/focus best-effort.  
4. Бейдж: **с камеры** vs **в эфир** (bitrate часто ниже capture) — не обещать фейковый 4K.

---

## 13. Типичные user flows

1. Welcome → урок → Studio (гид/opacity).  
2. Файл → слои → aux → двигать только активный.  
3. Цвета: precision → пресет → mask → coverage %.  
4. Поза: сохранить → сбросить → применить.  
5. Комната: QR → телефон в эфире → freeze/torch.  
6. Лупа / калька / гиды sticky.  
7. Сессия 25/45/90 + снимок прогресса.  
8. Hide UI → FAB показать.  
9. Проект `.eyepaint.json` / продолжить автосейв.  
10. Онбординг Skip → done keys.

---

## 14. E2E

`npm run test:e2e` = build + Playwright (Desktop Chrome + Pixel 7), base `/Eyepaint/`.  
Specs: `welcome`, `studio`, `colors-layers`, `rooms` + helpers/fixtures.

---

## 15. Build / deploy

- `vite` base `/Eyepaint/`; `tsc -b && vite build` → `dist/`  
- Actions: push `main` → GitHub Pages  
- PWA: `public/manifest.webmanifest`

---

## 16. Инварианты (не нарушать)

1. Phone ≠ second Studio.  
2. Scene full-bleed; один job на секцию chrome.  
3. PC brain / phone sensor.  
4. P2P only — нет обязательного бэкенда.  
5. Honest stream badge.  
6. Kill-switch для экспериментов.  
7. Не раздувать `Studio.tsx`.  
8. Join code + `?join=` священны.  
9. Calc filter только на video.  
10. Active layer owns transform/colors.  
11. Вне скоупа пока: аккаунты, облако, оплата, native apps, полный image editor.

---

## 17. Фазы и бэклог

- **0–4** в коде (см. ROADMAP): split, QR/freeze, калька/лупа/гиды/слои/позы, цвета 2.0, онбординг/PWA/сессия/уроки.  
- **5** spikes: markerless paper, ML lineart, teacher→student, мультикомнаты.  
- **Живые идеи следующего горизонта:** `docs/IDEAS.md` — в т.ч. режим **Свободный | AR** (маркер → lock плоскости → plane-space жесты + Перекалибровать), guide-слои, линейка, reconnect.

При реализации идеи из IDEAS — сначала сверь инварианты §16 и design skill; крупные модели данных (тип слоя `guide`) описывай в этом skill после мержа.

---

## 18. Куда класть новый код

| Что | Куда |
|-----|------|
| Панель / контрол studio | `components/studio/*` + `studioUi.ts` |
| Токены / glass / motion | `index.css` |
| Слои / позы / цвета / проект | `lib/*` |
| Камера / комната | hooks + `lib/rooms*` / `cameraControls` |
| Справка / туры | `helpTips`, `onboarding`, `Onboarding.tsx` |
| Оркестрация | тонкая проводка в `Studio.tsx` / `App.tsx` |
| Тест сценария | `e2e/*.spec.ts` |

---

## 19. Чеклист агента перед PR

- [ ] Не ломает join / `?join=`  
- [ ] На телефоне нет второй студии  
- [ ] ПК: сцена full-bleed  
- [ ] Есть флаг/toggle если эксперимент  
- [ ] UI через tokens + studioUi; уголки через PanelFrame pattern  
- [ ] `tsc` / e2e по затронутым сценариям  
- [ ] Коммит: `feat|fix|refactor|docs: EN — русский`  
- [ ] Обновить `eyepaint-features` / этот skill / IDEAS status если поведение продукта изменилось
