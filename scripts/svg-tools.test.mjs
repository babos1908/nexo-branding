// Tests for the SVG cleaning primitives. Run: node --test scripts/
//
// These exist because the bug they guard against was invisible for months: the
// exporter emitted 360 malformed files and every consumer rendered them fine,
// because both inject the markup through [innerHTML] and HTML parsing forgives a
// stray closing tag. The cases below are the exact source shapes that broke it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanTags, elementSpans, stripAlignmentGrid, pruneDeadClassRules,
  checkWellFormed, findDanglingRefs, countDrawing, hiddenClassNames,
} from './svg-tools.mjs';

const strip = (s) => stripAlignmentGrid(s).svg;

test('self-closing grid: keeps the pictogram (the 108-byte-shell bug)', () => {
  const src = '<svg><g id="grid" display="none" /><g id="pictogram"><g><path d="M0 0"/></g></g></svg>';
  assert.equal(strip(src), '<svg><g id="pictogram"><g><path d="M0 0"/></g></g></svg>');
  assert.equal(checkWellFormed(strip(src)), null);
});

test('nested grid: removes the whole block, no orphaned </g> (the stray-tag bug)', () => {
  const src = '<svg><g id="pictogram"><rect/></g><g id="grid" display="none"><g display="inline"><line/><line/></g></g></svg>';
  assert.equal(strip(src), '<svg><g id="pictogram"><rect/></g></svg>');
  assert.equal(checkWellFormed(strip(src)), null);
});

test('grid hidden by a CSS class is recognised', () => {
  const src = '<svg><style>.st0{display:none;}</style><g id="grid" class="st0"><g><line/></g></g><g id="pictogram"><path/></g></svg>';
  assert.ok(!strip(src).includes('id="grid"'));
  assert.equal(countDrawing(strip(src)), 1);
});

test('grid hidden by inline style is recognised', () => {
  const src = '<svg><g id="grid" style="display:none"><line/></g><path/></svg>';
  assert.equal(strip(src), '<svg><path/></svg>');
});

test('visible grid of bare hairlines is still stripped', () => {
  const src = '<svg><g id="grid"><line/><line/></g><g id="pictogram"><path/></g></svg>';
  assert.equal(countDrawing(strip(src)), 1);
});

test('MISLABELLED source: artwork inside <g id="grid"> is never stripped', () => {
  // 10 of the 660 ABB files ship this way, with an empty <g id="pictogram"/>
  const src = '<svg><g id="grid"><g><path d="M1 1"/><rect/></g></g><g id="pictogram" /></svg>';
  const out = stripAlignmentGrid(src);
  assert.equal(out.svg, src, 'must be left untouched');
  assert.equal(out.keptMislabelled, true);
  assert.equal(countDrawing(out.svg), 2);
});

test('id="gridlines" is not mistaken for the grid', () => {
  const src = '<svg><g id="gridlines"><line/></g></svg>';
  assert.equal(strip(src), src);
});

test('scanner survives > inside a quoted attribute', () => {
  const src = '<svg><g id="grid" data-x="a>b" display="none"><line/></g><path/></svg>';
  assert.equal(strip(src), '<svg><path/></svg>');
});

test('scanner skips comments and CDATA containing tag-like text', () => {
  const src = '<svg><g id="grid" display="none"><!-- </g> --><line/></g><path/></svg>';
  assert.equal(strip(src), '<svg><path/></svg>');
});

test('multiple grid blocks are all removed', () => {
  const src = '<svg><g id="grid" display="none"><line/></g><path/><g id="grid" display="none"><line/></g></svg>';
  assert.equal(strip(src), '<svg><path/></svg>');
});

test('checkWellFormed accepts valid documents', () => {
  assert.equal(checkWellFormed('<svg><g><path/></g></svg>'), null);
  assert.equal(checkWellFormed('<?xml version="1.0"?><svg><path/></svg>'), null);
  assert.equal(checkWellFormed('<svg/>'), null);
});

test('checkWellFormed rejects the shapes that shipped', () => {
  // the literal content of the old automation-control/04_drive_motor.svg
  assert.notEqual(checkWellFormed('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"></g></svg>'), null);
  assert.notEqual(checkWellFormed('<svg><g><path/></svg>'), null);
  assert.notEqual(checkWellFormed('<svg/><svg/>'), null);
  assert.ok(checkWellFormed('</g><svg/>').startsWith('stray closing'));
});

test('dangling references are reported, satisfied ones are not', () => {
  assert.deepEqual(findDanglingRefs('<svg><clipPath id="a"/><g clip-path="url(#a)"/></svg>'), []);
  assert.deepEqual(findDanglingRefs('<svg><g clip-path="url(#gone)"/></svg>'), ['gone']);
  assert.deepEqual(findDanglingRefs('<svg><use href="#nope"/></svg>'), ['nope']);
});

test('dead class rules are pruned, live ones kept', () => {
  const src = '<svg><style>.a{fill:red}.b{clip-path:url(#gone)}</style><path class="a"/></svg>';
  const out = pruneDeadClassRules(src);
  assert.ok(out.includes('.a{fill:red}'));
  assert.ok(!out.includes('.b'));
  assert.deepEqual(findDanglingRefs(out), []);
});

test('pruning drops the <style> element once nothing survives', () => {
  const out = pruneDeadClassRules('<svg><style>.b{clip-path:url(#gone)}</style><path/></svg>');
  assert.equal(out, '<svg><path/></svg>');
});

test('pruning leaves stylesheets with at-rules alone', () => {
  const src = '<svg><style>@media print{.b{fill:red}}</style><path/></svg>';
  assert.equal(pruneDeadClassRules(src), src);
});

test('helpers report what they are asked', () => {
  assert.equal(scanTags('<g id="grid" display="none" />')[0].kind, 'self');
  assert.equal(scanTags('<g>')[0].kind, 'open');
  assert.equal(scanTags('</g>')[0].kind, 'close');
  assert.deepEqual([...hiddenClassNames('<style>.x,.y{display:none}</style>')].sort(), ['x', 'y']);
  assert.equal(countDrawing('<svg><path/><line/><g><rect/></g></svg>'), 3);
  assert.equal(countDrawing('<svg><g><defs/></g></svg>'), 0);
  assert.equal(elementSpans('<svg><g><g/></g></svg>', 'g').length, 2);
});
