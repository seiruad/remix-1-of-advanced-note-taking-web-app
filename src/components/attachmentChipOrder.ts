export type ChipMoveAction = 'swap' | 'before' | 'after';

export function moveAttachmentChip(ids: string[], source: string, target: string, action: ChipMoveAction): string[] {
  const from = ids.indexOf(source);
  const to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const result = [...ids];
  if (action === 'swap') {
    result[from] = target;
    result[to] = source;
    return result;
  }
  result.splice(from, 1);
  const destination = result.indexOf(target) + (action === 'after' ? 1 : 0);
  result.splice(destination, 0, source);
  return result;
}