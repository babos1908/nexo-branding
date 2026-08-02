// Shared SVG helpers for the symbol pipeline (import-symbols.mjs, verify-symbols.mjs).
//
// Why a hand-rolled scanner instead of a regex: the original exporter stripped the
// hidden alignment grid with `/<g[^>]*id="grid"[^>]*>[\s\S]*?<\/g>/` — a non-greedy
// match that stops at the FIRST `</g>`. Two shapes in the ABB source defeat it:
//
//   <g id="grid" display="none" />          self-closing: the regex still matched the
//                                           tag, then ate forward to the first `</g>`
//                                           it could find — i.e. the pictogram's own
//                                           content. Result: an empty 108-byte shell.
//
//   <g id="grid" ...><g display="inline">   nested: the match ends at the INNER `</g>`,
//     …lines… </g></g>                      leaving the grid's outer `</g>` orphaned.
//                                           Result: a stray closing tag.
//
// Both produce SVG that is not well-formed XML. HTML parsers forgive it (both products
// inject the markup via [innerHTML], which is why it stayed invisible), but anything
// parsing it as XML — <img src>, CSS mask, sprite builds, design tools — renders nothing.
//
// A second trap sits underneath: in 10 of the 660 source files the two groups are
// MISLABELLED — the artwork lives in `<g id="grid">` and `<g id="pictogram"/>` is empty.
// Stripping by id alone deletes the symbol. So the grid is identified by what it IS
// (hidden, or a subtree of nothing but hairlines), never by its id alone.
//
// This module tokenises tags properly (quoted attributes, comments, CDATA, PIs) so the
// strip is depth-aware and the result can be structurally validated before it is written.

const NAME = /[^\s/>]+/y;
const DRAW_EL = /^(path|line|rect|circle|ellipse|polygon|polyline|text|tspan|use|image)$/i;

/**
 * Tokenise the element tags of an XML/SVG string.
 * Skips comments, CDATA, processing instructions and doctype declarations, and
 * honours quoted attribute values (so `<g data-x="a>b">` does not end early).
 * @returns {Array<{kind:'open'|'close'|'self', name:string, start:number, end:number}>}
 */
export function scanTags(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) break;

    if (s.startsWith('<!--', lt)) {
      const e = s.indexOf('-->', lt + 4);
      i = e < 0 ? s.length : e + 3;
      continue;
    }
    if (s.startsWith('<![CDATA[', lt)) {
      const e = s.indexOf(']]>', lt + 9);
      i = e < 0 ? s.length : e + 3;
      continue;
    }
    if (s.startsWith('<?', lt)) {
      const e = s.indexOf('?>', lt + 2);
      i = e < 0 ? s.length : e + 2;
      continue;
    }
    if (s.startsWith('<!', lt)) {
      // doctype / other declaration — scan to the matching '>' at nesting depth 0
      let j = lt + 2, depth = 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '<') depth++;
        else if (s[j] === '>') depth--;
        j++;
      }
      i = j;
      continue;
    }

    // element tag — find the terminating '>' without stopping inside a quoted value
    let j = lt + 1;
    let quote = null;
    while (j < s.length) {
      const c = s[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    if (j >= s.length) break; // unterminated tag; validator reports it

    const isClose = s[lt + 1] === '/';
    NAME.lastIndex = lt + (isClose ? 2 : 1);
    const nm = NAME.exec(s);
    const name = nm ? nm[0] : '';
    const selfClosing = !isClose && s[j - 1] === '/';

    out.push({
      kind: isClose ? 'close' : selfClosing ? 'self' : 'open',
      name,
      start: lt,
      end: j + 1,
    });
    i = j + 1;
  }
  return out;
}

/**
 * Every element of `tagName`, as full spans. `start`/`end` bound the whole element
 * (opening tag through closing tag); `openTag` is the opening tag text; `body` is the
 * inner markup ('' when self-closing). Ordered by document position, outermost first.
 */
export function elementSpans(s, tagName) {
  const tag = tagName.toLowerCase();
  const tags = scanTags(s);
  const spans = [];
  const stack = [];
  for (const t of tags) {
    if (t.name.toLowerCase() !== tag) continue;
    if (t.kind === 'self') {
      spans.push({ start: t.start, end: t.end, openTag: s.slice(t.start, t.end), body: '' });
    } else if (t.kind === 'open') {
      stack.push(t);
    } else {
      const open = stack.pop();
      if (!open) continue; // stray closer; validator reports it
      spans.push({
        start: open.start,
        end: t.end,
        openTag: s.slice(open.start, open.end),
        body: s.slice(open.end, t.start),
      });
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return spans;
}

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? (m[2] ?? m[3]) : null;
};

/** Class names that an embedded <style> block resolves to `display:none`. */
export function hiddenClassNames(svg) {
  const set = new Set();
  for (const block of svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const rule of block[1].matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/display\s*:\s*none/i.test(rule[2])) continue;
      for (const sel of rule[1].split(',')) {
        const t = sel.trim();
        if (/^\.[A-Za-z_][\w-]*$/.test(t)) set.add(t.slice(1));
      }
    }
  }
  return set;
}

/** True when an opening tag is hidden via the display attribute, inline style, or a class. */
function isHidden(openTag, hiddenClasses) {
  if (/\bdisplay\s*=\s*(["'])\s*none\s*\1/i.test(openTag)) return true;
  const style = attr(openTag, 'style');
  if (style && /display\s*:\s*none/i.test(style)) return true;
  const cls = attr(openTag, 'class');
  if (cls && cls.split(/\s+/).some((c) => hiddenClasses.has(c))) return true;
  return false;
}

/**
 * Remove the hidden alignment grid — the ~96 cyan hairlines the ABB export ships in
 * every pictogram — leaving everything else untouched.
 *
 * A `<g id="grid">` is only treated as the grid when it actually is one:
 *   - it is hidden (display attribute, inline style, or a class resolving to
 *     display:none) — removing markup that never renders cannot change the image; or
 *   - its subtree holds nothing but <line> primitives — the classic bare hairline grid.
 * Otherwise the group is left alone: in 10 source files it is mislabelled and holds
 * the only artwork in the document.
 *
 * @returns {{svg: string, removed: number, keptMislabelled: boolean}}
 */
export function stripAlignmentGrid(svg) {
  const hiddenClasses = hiddenClassNames(svg);
  const candidates = elementSpans(svg, 'g').filter((sp) => {
    const id = attr(sp.openTag, 'id');
    return id != null && id.toLowerCase() === 'grid';
  });

  // outermost only (a grid is never nested inside another grid, but be explicit)
  const outer = candidates.filter(
    (sp, i) => !candidates.some((o, j) => j !== i && o.start <= sp.start && o.end >= sp.end && (o.start !== sp.start || o.end !== sp.end)),
  );

  const doomed = [];
  let keptMislabelled = false;
  for (const sp of outer) {
    const onlyLines = !scanTags(sp.body).some((t) => t.kind !== 'close' && DRAW_EL.test(t.name) && t.name.toLowerCase() !== 'line');
    if (isHidden(sp.openTag, hiddenClasses) || onlyLines) doomed.push(sp);
    else keptMislabelled = true;
  }

  let out = svg;
  let removed = 0;
  for (const sp of doomed.sort((a, b) => b.start - a.start)) {
    removed += countDrawing(sp.body);
    out = out.slice(0, sp.start) + out.slice(sp.end);
  }
  return { svg: out, removed, keptMislabelled };
}

/**
 * Drop `<style>` rules whose selectors no longer match anything, and the `<style>`
 * element itself once it is empty.
 *
 * Removing the grid group can orphan the Illustrator-generated rules that styled it
 * (`.st2{clip-path:url(#SVGID_…)}`), leaving a stylesheet pointing at clip paths that
 * no longer exist. Deliberately conservative: only simple class selectors are ever
 * pruned, and files using at-rules are left completely alone.
 */
export function pruneDeadClassRules(svg) {
  if (!/<style\b/i.test(svg)) return svg;

  const used = new Set();
  for (const m of svg.matchAll(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    for (const c of (m[2] ?? m[3]).split(/\s+/)) if (c) used.add(c);
  }

  return svg.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (whole, open, css, close) => {
    if (/@[a-z-]+[^;{]*\{/i.test(css)) return whole; // at-rule block — out of scope

    let touched = false;
    const kept = css.replace(/([^{}]+)\{([^}]*)\}/g, (rule, sel, decl) => {
      const survivors = sel
        .split(',')
        .map((x) => x.trim())
        .filter((x) => !(/^\.[A-Za-z_][\w-]*$/.test(x) && !used.has(x.slice(1))));
      if (survivors.length === sel.split(',').length) return rule;
      touched = true;
      return survivors.length ? `${survivors.join(',')}{${decl}}` : '';
    });

    if (!touched) return whole;
    return kept.trim() ? `${open}${kept}${close}` : '';
  });
}

/**
 * Structural well-formedness check: every element closed, properly nested, exactly
 * one root. Returns an error message, or null when the document is well-formed.
 */
export function checkWellFormed(s) {
  const tags = scanTags(s);
  const stack = [];
  let roots = 0;

  for (const t of tags) {
    if (t.kind === 'self') {
      if (stack.length === 0) roots++;
      continue;
    }
    if (t.kind === 'open') {
      if (stack.length === 0) roots++;
      stack.push(t);
      continue;
    }
    const top = stack.pop();
    if (!top) return `stray closing </${t.name}> at offset ${t.start}`;
    if (top.name !== t.name) {
      return `mismatched tags: <${top.name}> at ${top.start} closed by </${t.name}> at ${t.start}`;
    }
  }

  if (stack.length) {
    const u = stack[stack.length - 1];
    return `unclosed <${u.name}> at offset ${u.start}`;
  }
  if (roots !== 1) return `expected exactly 1 root element, found ${roots}`;
  return null;
}

/**
 * Fragment ids referenced by the document that nothing defines — `url(#x)` in an
 * attribute or stylesheet, or an `href`/`xlink:href="#x"`. A dangling clip-path or
 * <use> reference makes the referring element fail to render, silently.
 */
export function findDanglingRefs(s) {
  const defined = new Set();
  for (const m of s.matchAll(/\bid\s*=\s*("([^"]*)"|'([^']*)')/gi)) defined.add(m[2] ?? m[3]);

  const used = new Set();
  for (const m of s.matchAll(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/gi)) used.add(m[1]);
  for (const m of s.matchAll(/\b(?:xlink:)?href\s*=\s*("#([^"]*)"|'#([^']*)')/gi)) used.add(m[2] ?? m[3]);

  return [...used].filter((id) => !defined.has(id));
}

/** Count the drawing primitives in an SVG — used to assert cleaning never empties a symbol. */
export function countDrawing(s) {
  return scanTags(s).filter((t) => t.kind !== 'close' && DRAW_EL.test(t.name)).length;
}
