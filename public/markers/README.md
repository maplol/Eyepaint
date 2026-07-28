# EYEPAINT AR markers

Печатные маркеры для режима **Свободный | AR**.

| Файл | Назначение |
|------|------------|
| `eyepaint-ar-marker-a4.png` | Лист A4: центр + 4 угла |
| `eyepaint-ar-marker-card.png` | Карточка — убрать после фиксации |
| `eyepaint-aruco-id0.png` | Чистый ID 0 |
| `marker.json` | Спека детектора |

## Спека

- Детектор: **js-aruco2** `ARUCO_4X4_1000`
- Центр: **ID 0** (~90 мм на A4)
- Углы: ID **1–4** (~28 мм)
- В словаре bit `1` = белый модуль (конвенция js-aruco2)
- Печать: **100% / Actual size**, матовая бумага

Перегенерация: `node scripts/generate-ar-marker.mjs` (после `npm i`).
