# Вынести список папок в UnifiedFolderList

Да, стоит. Половина работы уже сделана: список заметок живёт в `UnifiedNoteList`, а список папок всё ещё встроен в `UnifiedSidebar` (сейчас 957 строк, включая мёртвый код).

## Что сейчас в UnifiedSidebar

- `FolderRowFlat` — строка папки (иконка, имя, счётчик, inline-переименование, меню Rename/Delete)
- Инлайновый блок рендера списка папок с фильтрацией по поиску, строкой «No Folder» и заглушкой «No folders match»
- `FolderSection`, `handleToggleFolder`, `handleToggleUnfiled` — устаревший код от старого дерева папок, помечен `void ...` и нигде не используется

## Что делаем

1. Создать `src/components/UnifiedFolderList.tsx`:
   - перенести туда `FolderRowFlat` и весь блок рендера списка папок без изменений разметки и классов (визуал остаётся прежним)
   - внутри держать сортировку папок, фильтрацию по `searchQuery`, строку «No Folder», пустое состояние и «Search all notes instead →»
2. В `UnifiedSidebar` заменить инлайновый блок на:
   ```text
   mode === 'all' || selectedFolderId  →  <UnifiedNoteList ... />
   иначе                                →  <UnifiedFolderList ... />
   ```
3. Удалить мёртвый код (`FolderSection`, `handleToggleFolder`, `handleToggleUnfiled`, связанные `void`-заглушки и ставшие ненужными импорты/утилиты expanded-состояния, если они больше нигде не используются).
4. Состояние `mode`, `selectedFolderId`, диалоги удаления, FAB, поиск и Storage остаются в `UnifiedSidebar` — он остаётся «оркестратором».

## Технические детали

Props `UnifiedFolderList`:
```ts
folders: Folder[];          // уже отсортированные или сортируем внутри
notes: NoteWithDetails[];   // для подсчёта заметок в папке
searchQuery: string;
onSelectFolder: (folderId: string) => void;   // включая NO_FOLDER_ID
onRenameFolder: (folderId: string, name: string) => void;
onDeleteFolder: (folder: Folder) => void;     // открывает UnifiedWarningWindow в сайдбаре
onSwitchToAllNotes: () => void;
```
Константу `NO_FOLDER_ID` экспортировать из одного места (`UnifiedNoteList` уже её объявляет локально) и переиспользовать, чтобы не расходилась.

## Проверка

TypeScript-компиляция + прогон в браузере: список папок, вход в папку, переименование (включая пробел в имени), удаление, поиск по папкам, «No Folder» — на мобильном и десктопном вьюпорте, вид без изменений.
