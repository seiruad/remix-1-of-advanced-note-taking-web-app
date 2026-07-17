# Рефакторинг середины UnifiedSidebar

## Решения по открытым вопросам

1. **Search** — сворачиваем в иконку **только на мобиле** (`< sm`, <640px). На десктопе сайдбар шире, place есть, постоянный input удобнее (не нужен лишний тап). На мобиле каждая строка на счету — иконка выигрывает.
2. **«+ New» в режиме папок** — **всплывающее меню** (New Note / New Folder). Одна точка входа, масштабируется, не спорит с nav-пилюлей. Две иконки рядом создают визуальный шум и хуже читаются на мобиле.
3. **Primary-кнопка** — **solid emerald fill**. Это основной CTA приложения; outline потеряется. С Workspace-хедером конфликта нет: там emerald только иконка-плашка, не заливка.

## Итоговая структура

```text
┌─ Workspace header ─────────────┐  64px  (без изменений)
├─────────────────────────────────┤
│ [All Notes] [Folders]   🔍  [+] │  40–44px  ← единая nav-строка
│  (или breadcrumb внутри папки)  │
├─ Search input (когда открыт) ──┤  44px overlay/desktop-persistent
├─ NoteList ─────────────────────┤  flex-1
└─ Storage footer ───────────────┘  (без изменений)
```

**Три состояния nav-строки:**
- **All Notes:** `[All Notes | Folders]  🔍(sm) [ + ]`
- **Folders (список):** `[All Notes | Folders]  🔍(sm) [ + ▾]` — меню: New Note / New Folder
- **Folders (внутри папки):** `‹ Folders • ● My Folder · 3 · ⋯   🔍(sm) [ + ]` — весь breadcrumb на месте пилюли, ⋯ открывает Rename/Delete

## Что реализуем (файл `src/components/UnifiedSidebar.tsx`)

1. **Заменить блок Controls (1058–1178)** одним компонентом `SidebarNavBar`:
   - Слева: либо segmented `[All Notes | Folders]`, либо breadcrumb (когда `selectedFolderId` есть).
   - Справа: иконка 🔍 (только на мобиле, `sm:hidden`) + primary «+».
   - Search на десктопе (`hidden sm:block`) остаётся постоянным input под nav-строкой.
   - Search на мобиле — overlay поверх nav-строки при клике на 🔍, автофокус, Esc/X сворачивает.

2. **Primary «+» кнопка:**
   - Всегда одинаковый solid-emerald `w-9 h-9 rounded-xl` с `<Plus/>`.
   - В режиме Folders (без открытой папки) — открывает поповер (тот же портал-паттерн, что в `FolderDetailHeader`) с пунктами:
     - `📄 New Note` → `onCreateNote()` + разворот UNFILED + `setSelectedFolderId(NO_FOLDER_ID)` (сохраняем текущее поведение).
     - `📁 New Folder` → `onCreateFolder('New Folder', null)`.
   - В остальных режимах — прямой клик:
     - All Notes → `onCreateNote()`.
     - Внутри папки → `handleCreateNoteInFolder(selectedFolderId)` (или `onCreateNote()` для NO_FOLDER).

3. **Breadcrumb внутри папки (заменяет segmented control):**
   - `‹ Folders` — кликабельно, возвращает к списку папок (`setSelectedFolderId(null)`).
   - `●` — точка-акцент цвета варианта (emerald / amber `is_new` / slate `NO_FOLDER`).
   - Имя папки + `· N` (count).
   - `⋯` — тот же поповер Rename/Delete из старого `FolderDetailHeader` (скрыт для NO_FOLDER).
   - Всё в одну строку 40px, `truncate` для длинных имён.

4. **Удалить `FolderDetailHeader` из места вызова (~1262)** — его функции полностью переехали в `SidebarNavBar`. Сам компонент можно удалить или оставить как dead code для истории (удалим).

5. **Унифицировать стили:**
   - Все интерактивные элементы nav-строки — `h-10 rounded-xl`.
   - Segmented control — тот же `bg-slate-900/50` контейнер, но компактнее (`h-10` вместо текущего `py-2.5`).
   - Иконка 🔍 и primary «+» — по `w-10 h-10`, чтобы попадали в 44px tap-target.

## Экономия по вертикали

Было: mode toggle (44) + search (44) + action row (48) + folder header (56) = **192px** сверх Workspace/Storage.
Стало (мобиль, всё свернуто): nav-bar (44) = **44px**.
Стало (мобиль, search открыт): 44 + 44 = **88px**.
Стало (десктоп): 44 + 44 (постоянный search) = **88px**.

На мобиле выигрываем **~150px** — примерно 3 дополнительные карточки заметок в первом экране.

## Что НЕ трогаем

- Все обработчики: `onCreateNote`, `onCreateFolder`, `handleCreateNoteInFolder`, `handleRenameFolder`, `handleDeleteFolder`, `handleMoveNote` — без изменений.
- Workspace-хедер (1041–1056) и Storage-футер (1355–1356).
- `NoteList`, `FolderRowFlat`, `NoteCard` и всё, что рендерится ниже nav-строки.
- Локальное сохранение `MODE_STORAGE_KEY`, `EXPANDED_STORAGE_KEY`.

## Технические детали

- Новый локальный state в `UnifiedSidebar`: `const [searchOpen, setSearchOpen] = useState(false)` — только для мобильного overlay.
- Overlay search: `absolute inset-x-0 top-0 h-11 bg-slate-800 z-10` внутри контейнера nav-строки; при `searchQuery !== ''` считать `searchOpen = true` автоматически, чтобы не терять контекст при повторном открытии сайдбара.
- Поповер «+ New» — переиспользовать паттерн `createPortal` + `menuPos` из `FolderDetailHeader` (строки 622–651). Позиционировать под кнопкой `+`, ширина ~200px.
- Иконки: `Plus`, `Search`, `X`, `ChevronLeft`, `LayoutList`, `FolderTreeIcon`, `FileText`, `FolderPlus`, `MoreHorizontal` — уже импортированы, ничего добавлять не нужно.
- Breadcrumb-точка: `w-1.5 h-1.5 rounded-full` с классом `bg-emerald-400 | bg-amber-400 | bg-slate-500` в зависимости от `is_new` / `NO_FOLDER`.
