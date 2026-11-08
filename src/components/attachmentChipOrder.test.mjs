import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveAttachmentChip } from './attachmentChipOrder.ts';

test('swap exchanges source and target positions', () => {
  assert.deepEqual(moveAttachmentChip(['a', 'b', 'c', 'd'], 'a', 'c', 'swap'), ['c', 'b', 'a', 'd']);
});
test('place before moves the chosen chip immediately before the target', () => {
  assert.deepEqual(moveAttachmentChip(['a', 'b', 'c', 'd'], 'd', 'b', 'before'), ['a', 'd', 'b', 'c']);
  assert.deepEqual(moveAttachmentChip(['a', 'b', 'c', 'd'], 'a', 'd', 'before'), ['b', 'c', 'a', 'd']);
});
test('place after moves the chosen chip immediately after the target', () => {
  assert.deepEqual(moveAttachmentChip(['a', 'b', 'c', 'd'], 'a', 'c', 'after'), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveAttachmentChip(['a', 'b', 'c', 'd'], 'd', 'a', 'after'), ['a', 'd', 'b', 'c']);
});
test('same-chip and missing-chip choices leave the order unchanged', () => {
  assert.deepEqual(moveAttachmentChip(['a', 'b'], 'a', 'a', 'swap'), ['a', 'b']);
  assert.deepEqual(moveAttachmentChip(['a', 'b'], 'x', 'b', 'after'), ['a', 'b']);
});