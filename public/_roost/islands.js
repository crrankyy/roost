// Roost islands: mounts the Lynx Radix controls over their server-rendered closed state (PLAN 2.2).
// Plain script, no build: window.React, window.ReactDOM and window.Lynx come from /_ds/lynx-reports/v1/.
(function () {
  'use strict';
  var R = window.React, RD = window.ReactDOM, L = window.Lynx;
  var h = R && R.createElement;
  var KIND_LABEL = function (k) { return k.charAt(0).toUpperCase() + k.slice(1); };

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  function toast(msg, opts) { if (L && L.sonnerToast) L.sonnerToast(msg, opts); }
  window.Roost = { post: post, toast: toast };

  // ---------- filters: the same rules as src/pages/data.ts ----------

  function query(f) {
    var q = new URLSearchParams();
    if (f.project) q.set('project', f.project);
    if (f.kinds.length) q.set('kind', f.kinds.join(','));
    if (f.range && f.range !== 'custom') q.set('range', f.range);
    if (f.range === 'custom') { if (f.from) q.set('from', f.from); if (f.to) q.set('to', f.to); }
    if (f.archived) q.set('archived', '1');
    var s = q.toString();
    return s ? '?' + s : '';
  }
  function matches(items, f, withProject) {
    var now = Date.now();
    var since = f.range && f.range !== 'custom' ? new Date(now - Number(f.range) * 864e5).toISOString() : f.from ? f.from + 'T00:00:00' : '';
    var until = f.range === 'custom' && f.to ? f.to + 'T23:59:59.999' : '';
    return items.filter(function (r) {
      return (f.archived || !r.archived) && (!withProject || !f.project || r.project === f.project)
        && (!f.kinds.length || f.kinds.indexOf(r.kind) >= 0) && (!since || r.published >= since) && (!until || r.published <= until);
    }).length;
  }
  function count(f, withProject) { return (withProject && f.project ? 1 : 0) + (f.kinds.length ? 1 : 0) + (f.range ? 1 : 0) + (f.archived ? 1 : 0); }
  function ymd(d) { return d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : ''; }
  function parseYmd(s) { if (!s) return undefined; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function rangeLabel(f) {
    return { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' }[f.range] || (f.range === 'custom' ? (f.from || '…') + ' – ' + (f.to || '…') : 'Any time');
  }
  function go(path, f) { location.href = path + query(f); }

  var Chevron = function () { return h(L.Icons.ChevronDown, { size: 16, 'aria-hidden': 'true' }); };

  function Badge(k) { return h('span', { className: 'lr-badge', 'data-kind': k }, KIND_LABEL(k)); }

  function ProjectSelect(p, f, set, style, id) {
    return h(L.Select, { value: f.project || 'all', onValueChange: function (v) { set({ project: v === 'all' ? '' : v }); } },
      h(L.SelectTrigger, { 'aria-label': 'Project', id: id, style: style }, h(L.SelectValue, { placeholder: 'All projects' })),
      h(L.SelectContent, null, [h(L.SelectItem, { key: 'all', value: 'all' }, 'All projects')].concat(
        p.projects.map(function (x) { return h(L.SelectItem, { key: x.id, value: x.id }, x.title); }))));
  }

  // Desktop filter row.
  function Filters(p) {
    var f = p.f;
    var kinds = R.useState(f.kinds), setKinds = kinds[1]; kinds = kinds[0];
    var custom = R.useState(false), setCustom = custom[1]; custom = custom[0];
    var range = R.useState({ from: parseYmd(f.from), to: parseYmd(f.to) }), setRange = range[1]; range = range[0];
    var nav = function (over) { go(p.path, Object.assign({}, f, over)); };
    var kindsChanged = kinds.join() !== f.kinds.join();
    var dateValue = f.range || 'any';
    return h('div', { className: 'hub-filters hub-desk', role: 'group', 'aria-label': 'Filter reports', style: { flex: 1 } },
      p.withProject ? ProjectSelect(p, f, nav, { width: 168 }) : null,
      h(L.DropdownMenu, { modal: false, onOpenChange: function (open) { if (!open && kindsChanged) nav({ kinds: kinds }); } },
        h(L.DropdownMenuTrigger, { asChild: true },
          h(L.Button, { variant: 'outline', 'aria-label': 'Kind' + (kinds.length ? ', ' + kinds.length + ' selected' : '') },
            kinds.length ? ['Kind', h('span', { key: 'c', className: 'hub-filter-count' }, kinds.length)] : 'All kinds', h(Chevron))),
        h(L.DropdownMenuContent, { align: 'start', style: { width: 220 } },
          h(L.DropdownMenuLabel, null, 'Kind'),
          p.kinds.map(function (k) {
            return h(L.DropdownMenuCheckboxItem, {
              key: k, checked: kinds.indexOf(k) >= 0, onSelect: function (e) { e.preventDefault(); },
              onCheckedChange: function (on) { setKinds(function (cur) { return on ? cur.concat([k]) : cur.filter(function (x) { return x !== k; }); }); },
            }, Badge(k));
          }),
          kinds.length ? [h(L.DropdownMenuSeparator, { key: 's' }), h(L.DropdownMenuItem, { key: 'c', onSelect: function () { setKinds([]); } }, 'Clear kinds')] : null)),
      h(L.Popover, { open: custom, onOpenChange: setCustom },
        h(L.PopoverAnchor || 'span', { asChild: !!L.PopoverAnchor },
          h('span', { style: { display: 'inline-flex' } },
            h(L.Select, { value: dateValue, onValueChange: function (v) { if (v === 'custom') setCustom(true); else nav({ range: v === 'any' ? '' : v, from: '', to: '' }); } },
              h(L.SelectTrigger, { 'aria-label': 'Date range', style: { width: 156 } }, h(L.SelectValue, null, rangeLabel(f))),
              h(L.SelectContent, null,
                h(L.SelectItem, { value: 'any' }, 'Any time'), h(L.SelectItem, { value: '7' }, 'Last 7 days'),
                h(L.SelectItem, { value: '30' }, 'Last 30 days'), h(L.SelectItem, { value: '90' }, 'Last 90 days'),
                h(L.SelectSeparator), h(L.SelectItem, { value: 'custom' }, 'Custom range…'))))),
        h(L.PopoverContent, { align: 'start', style: { width: 'auto' } },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h(L.Calendar, { mode: 'range', selected: range, onSelect: function (r) { setRange(r || {}); }, numberOfMonths: 1 }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
              h(L.Button, { variant: 'ghost', size: 'sm', onClick: function () { setCustom(false); } }, 'Cancel'),
              h(L.Button, { variant: 'outline', size: 'sm', disabled: !range.from, onClick: function () { nav({ range: 'custom', from: ymd(range.from), to: ymd(range.to || range.from) }); } }, 'Apply'))))),
      h('label', { className: 'hub-choice', style: { marginLeft: 8, gap: 8, color: 'var(--muted-foreground)' } },
        h(L.Switch, { checked: f.archived, 'aria-label': 'Include archived', onCheckedChange: function (v) { nav({ archived: v }); } }), 'Include archived'),
      count(f, p.withProject) ? [h('span', { key: 'sp', style: { flex: 1 } }),
        h(L.Button, { key: 'r', variant: 'ghost', size: 'sm', onClick: function () { location.href = p.path; } }, h(L.Icons.RotateCcw, { size: 16, 'aria-hidden': 'true' }), 'Reset')] : null);
  }

  // Phone filter sheet.
  function FilterSheet(p) {
    var open = R.useState(false), setOpen = open[1]; open = open[0];
    var d = R.useState(p.f), setD = d[1]; d = d[0];
    var set = function (over) { setD(function (cur) { return Object.assign({}, cur, over); }); };
    var n = count(d, p.withProject);
    var total = p.items.filter(function (r) { return d.archived || !r.archived; }).length;
    var hits = matches(p.items, d, p.withProject);
    var applied = count(p.f, p.withProject);
    var rangeFrom = parseYmd(d.from), rangeTo = parseYmd(d.to);
    return h('div', { className: 'hub-phone' },
      h(L.Button, { variant: 'outline', size: 'sm', 'aria-label': 'Open filters', onClick: function () { setD(p.f); setOpen(true); } },
        h('svg', { className: 'i', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
          h('path', { d: 'M3 6h18' }), h('path', { d: 'M7 12h10' }), h('path', { d: 'M10 18h4' })),
        'Filter', applied ? h('span', { className: 'hub-filter-count' }, applied) : null),
      h(L.Drawer, { open: open, onOpenChange: setOpen, shouldScaleBackground: false },
        h(L.DrawerContent, null,
          h('div', { className: 'hub', style: { background: 'none', maxWidth: 420, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' } },
            h(L.DrawerHeader, null,
              h(L.DrawerTitle, null, p.sheetTitle),
              h(L.DrawerDescription, null, (n ? n + (n === 1 ? ' filter on · ' : ' filters on · ') : '') + hits + ' of ' + total + ' reports match')),
            h('div', { style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 } },
              p.withProject ? h('div', { className: 'hub-field' }, h('label', { className: 'hub-label', htmlFor: 'f-project' }, 'Project'), ProjectSelect(p, d, set, { width: '100%' }, 'f-project')) : null,
              h('div', { className: 'hub-field', role: 'group', 'aria-labelledby': 'f-kind-l' },
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
                  h('span', { className: 'hub-label', id: 'f-kind-l' }, 'Kind'), h('span', { className: 'hub-caption' }, (d.kinds.length || 'All') + ' of ' + p.kinds.length)),
                h('div', { className: 'hub-kinds' }, p.kinds.map(function (k) {
                  return h('label', { key: k, className: 'hub-choice', htmlFor: 'k-' + k },
                    h(L.Checkbox, { id: 'k-' + k, checked: d.kinds.indexOf(k) >= 0, onCheckedChange: function (on) { set({ kinds: on ? d.kinds.concat([k]) : d.kinds.filter(function (x) { return x !== k; }) }); } }),
                    Badge(k));
                }))),
              h('div', { className: 'hub-field' },
                h('span', { className: 'hub-label', id: 'f-range-l' }, 'Date range'),
                h(L.ToggleGroup, { type: 'single', variant: 'outline', size: 'sm', value: d.range, 'aria-labelledby': 'f-range-l', onValueChange: function (v) { set({ range: v || '', from: v === 'custom' ? d.from : '', to: v === 'custom' ? d.to : '' }); } },
                  h(L.ToggleGroupItem, { value: '7' }, '7 days'), h(L.ToggleGroupItem, { value: '30' }, '30 days'),
                  h(L.ToggleGroupItem, { value: '90' }, '90 days'), h(L.ToggleGroupItem, { value: 'custom' }, 'Custom')),
                d.range === 'custom' ? h('div', { className: 'lr-inset', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
                  h(L.Calendar, { mode: 'range', selected: { from: rangeFrom, to: rangeTo }, onSelect: function (r) { set({ from: ymd(r && r.from), to: ymd(r && (r.to || r.from)) }); } }),
                  h('span', { className: 'hub-caption' }, d.from ? (d.from + ' – ' + (d.to || d.from)) : 'Pick the first and last day')) : null),
              h('div', { className: 'hub-setting' },
                h('label', { htmlFor: 'f-archived', style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                  h('span', { className: 'hub-label' }, 'Include archived'), h('span', { className: 'hub-caption' }, 'Archived reports show with an Archived badge.')),
                h(L.Switch, { id: 'f-archived', 'aria-label': 'Include archived', checked: d.archived, onCheckedChange: function (v) { set({ archived: v }); } }))),
            h(L.DrawerFooter, null,
              h(L.Button, { onClick: function () { go(p.path, d); } }, 'Show ' + hits + (hits === 1 ? ' report' : ' reports')),
              h(L.Button, { variant: 'ghost', onClick: function () { setD({ project: '', kinds: [], range: '', from: '', to: '', archived: false }); } }, 'Reset filters'))))));
  }

  // ---------- header: palette and theme ----------

  function applyPalette(id) {
    document.documentElement.setAttribute('data-palette', id);
    post('/api/prefs', { palette: id }).catch(function () { toast('Couldn’t save the palette'); });
  }

  function Palette(p) {
    var v = R.useState(p.palette), setV = v[1]; v = v[0];
    var pick = function (id) { setV(id); applyPalette(id); };
    var groups = ['Expressive', 'Minimal'];
    if (p.variant === 'menu') {
      return h(L.DropdownMenu, null,
        h(L.DropdownMenuTrigger, { asChild: true },
          h(L.Button, { variant: 'outline', size: 'icon', 'aria-label': 'Choose palette' },
            h('svg', { className: 'i', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
              h('circle', { cx: 13.5, cy: 6.5, r: 0.5, fill: 'currentColor' }), h('circle', { cx: 17.5, cy: 10.5, r: 0.5, fill: 'currentColor' }),
              h('circle', { cx: 8.5, cy: 7.5, r: 0.5, fill: 'currentColor' }), h('circle', { cx: 6.5, cy: 12.5, r: 0.5, fill: 'currentColor' }),
              h('path', { d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' })))),
        h(L.DropdownMenuContent, { align: 'end', style: { width: 200, maxHeight: '70vh', overflowY: 'auto' } },
          h(L.DropdownMenuRadioGroup, { value: v, onValueChange: pick },
            groups.map(function (g, i) {
              return [i ? h(L.DropdownMenuSeparator, { key: 's' + g }) : null, h(L.DropdownMenuLabel, { key: 'l' + g }, g)].concat(
                p.palettes[g].map(function (x) { return h(L.DropdownMenuRadioItem, { key: x[0], value: x[0] }, x[1]); }));
            }))));
    }
    return h(L.Select, { value: v, onValueChange: pick },
      h(L.SelectTrigger, { 'aria-label': 'Palette', style: { width: 168 } }, h(L.SelectValue, { placeholder: 'Palette' })),
      h(L.SelectContent, null, groups.map(function (g, i) {
        return [i ? h(L.SelectSeparator, { key: 's' + g }) : null, h(L.SelectGroup, { key: g }, h(L.SelectLabel, null, g),
          p.palettes[g].map(function (x) { return h(L.SelectItem, { key: x[0], value: x[0] }, x[1]); }))];
      })));
  }

  function Theme() {
    R.useEffect(function () {
      var root = document.documentElement, last = root.getAttribute('data-theme');
      var mo = new MutationObserver(function () {
        var t = root.getAttribute('data-theme');
        if (t === last) return;
        last = t;
        root.setAttribute('data-hub-theme', t);
        post('/api/prefs', { theme: t }).catch(function () { toast('Couldn’t save the theme'); });
      });
      mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      return function () { mo.disconnect(); };
    }, []);
    return h(L.ThemeToggle);
  }

  // ---------- triage ----------

  function agoShort(iso) {
    if (!iso) return 'no reports yet';
    var d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    return d < 1 ? 'latest today' : d === 1 ? 'latest yesterday' : 'latest ' + d + ' days ago';
  }
  function triage(refStr, body) {
    var p = refStr.split('/');
    return post('/api/triage/' + p[0] + '/' + p[1], body);
  }
  function confirmWithUndo(refStr, title, after) {
    return triage(refStr, { action: 'confirm' }).then(function () {
      toast('Confirmed ' + title, { action: { label: 'Undo', onClick: function () { triage(refStr, { action: 'undo' }).then(function () { location.reload(); }); } } });
      if (after) after();
    }).catch(function () { toast('Couldn’t confirm. Try again.'); });
  }

  function Reclassify(p) {
    var mode = R.useState('idle'), setMode = mode[1]; mode = mode[0];
    var project = R.useState(p.project), setProject = project[1]; project = project[0];
    var proj = p.projects.filter(function (x) { return x.id === project; })[0] || { streams: [], title: project };
    var initialStream = p.proposed ? 'new' : (p.stream || 'none');
    var stream = R.useState(initialStream), setStream = stream[1]; stream = stream[0];
    var newName = R.useState(p.proposed ? p.proposed.id : ''), setNewName = newName[1]; newName = newName[0];
    var kind = R.useState(p.kind), setKind = kind[1]; kind = kind[0];
    var busy = R.useState(false), setBusy = busy[1]; busy = busy[0];
    var filed = R.useState(''), setFiled = filed[1]; filed = filed[0];
    var title = (document.getElementById('tri-title') || {}).textContent || 'report';
    var validNew = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(newName);

    function done(text) { setFiled(text); setMode('done'); }
    function confirm() {
      setBusy(true);
      var cur = p.projects.filter(function (x) { return x.id === p.project; })[0];
      confirmWithUndo(p.target, title, function () { done((cur ? cur.title : p.project) + (p.stream ? ' › ' + p.stream : '') + ' as ' + KIND_LABEL(p.kind)); }).then(function () { setBusy(false); });
    }
    function save() {
      setBusy(true);
      var body = { action: 'reclassify', kind: kind, project: project };
      if (stream === 'new') body.new_stream = { id: newName, title: newName };
      else body.stream = stream === 'none' ? null : stream;
      triage(p.target, body).then(function () {
        toast('Filed ' + title, { action: { label: 'Undo', onClick: function () { location.reload(); } } });
        done(proj.title + (stream === 'none' ? '' : ' › ' + (stream === 'new' ? newName : stream)) + ' as ' + KIND_LABEL(kind));
      }).catch(function (e) { toast('Couldn’t save: ' + e.message); }).then(function () { setBusy(false); });
    }

    if (mode === 'done') {
      return h('div', { className: 'lr-callout', 'data-tone': 'success' },
        h('svg', { className: 'lr-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M20 6 9 17l-5-5' })),
        h('p', { style: { margin: 0 } }, 'Filed under ' + filed + '. ', h('a', { href: p.next }, p.next === '/' ? 'Back home' : 'Next report')));
    }
    if (mode === 'idle') {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', { className: 'hub-actions' },
          h(L.Button, { onClick: confirm, disabled: busy }, h(L.Icons.Check, { size: 16, 'aria-hidden': 'true' }), 'Confirm'),
          h(L.Button, { variant: 'outline', onClick: function () { setMode('form'); } }, 'Reclassify')),
        h('p', { className: 'hub-caption' }, 'Classification is metadata, so the report’s link stays the same either way.'));
    }
    var choices = [{ value: 'none', label: 'No stream', hint: 'File under General' }].concat(
      proj.streams.map(function (s) { return { value: s.id, label: s.id, hint: agoShort(s.last) }; }),
      [{ value: 'new', label: 'Propose a new stream', hint: p.proposed ? 'Claude suggested ' + p.proposed.id : '' }]);
    var muted = { fontWeight: 400, color: 'var(--muted-foreground)' };
    return h('section', { className: 'lr-inset', style: { display: 'flex', flexDirection: 'column', gap: 20 }, 'aria-labelledby': 'rc-h' },
      h('h3', { id: 'rc-h', className: 'hub-label', style: { margin: 0 } }, 'Reclassify'),
      h('div', { className: 'hub-field' },
        h('label', { className: 'hub-label', htmlFor: 'rc-project', style: muted }, 'Project'),
        h(L.Select, { value: project, onValueChange: function (v) { setProject(v); setStream('none'); } },
          h(L.SelectTrigger, { id: 'rc-project', style: { width: '100%', maxWidth: 320 } }, h(L.SelectValue, { placeholder: 'Choose a project' })),
          h(L.SelectContent, null, p.projects.map(function (x) { return h(L.SelectItem, { key: x.id, value: x.id }, x.title); })))),
      h('div', { className: 'hub-field', role: 'group', 'aria-labelledby': 'rc-stream-l' },
        h('span', { id: 'rc-stream-l', className: 'hub-label', style: muted }, 'Stream'),
        h(L.RadioGroup, { value: stream, onValueChange: setStream, 'aria-labelledby': 'rc-stream-l' },
          choices.map(function (c) {
            return h('label', { key: c.value, className: 'hub-choice', htmlFor: 'rc-s-' + c.value },
              h(L.RadioGroupItem, { value: c.value, id: 'rc-s-' + c.value }), h('span', null, c.label), c.hint ? h('span', { className: 'hub-caption' }, c.hint) : null);
          })),
        stream === 'new' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 26, maxWidth: 346 } },
          h('label', { className: 'hub-caption', htmlFor: 'rc-new' }, 'New stream name'),
          h(L.Input, { id: 'rc-new', value: newName, onChange: function (e) { setNewName(e.target.value.toLowerCase()); }, 'aria-invalid': newName && !validNew ? 'true' : undefined }),
          h('span', { className: 'hub-caption' }, 'Created when you save. Lowercase words joined by hyphens.')) : null),
      h('div', { className: 'hub-field' },
        h('label', { className: 'hub-label', htmlFor: 'rc-kind', style: muted }, 'Kind'),
        h(L.Select, { value: kind, onValueChange: setKind },
          h(L.SelectTrigger, { id: 'rc-kind', style: { width: '100%', maxWidth: 320 } }, h(L.SelectValue, { placeholder: 'Choose a kind' })),
          h(L.SelectContent, null, KINDS.map(function (k) { return h(L.SelectItem, { key: k, value: k }, Badge(k)); })))),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', { className: 'hub-actions' },
          h(L.Button, { onClick: save, disabled: busy || (stream === 'new' && !validNew) }, 'Save and confirm'),
          h(L.Button, { variant: 'ghost', onClick: function () { setMode('idle'); } }, 'Cancel')),
        h('p', { className: 'hub-caption' }, 'The link stays the same: project, stream and kind are metadata.')));
  }
  var KINDS = ['investigation', 'incident', 'review', 'audit', 'architecture', 'plan', 'analysis', 'benchmark', 'experiment', 'research', 'explainer', 'runbook', 'summary'];

  var ISLANDS = { palette: Palette, theme: Theme, filters: Filters, 'filter-sheet': FilterSheet, reclassify: Reclassify };
  window.Roost.islands = ISLANDS;

  function mountAll() {
    if (!R || !RD || !L) return;
    document.querySelectorAll('[data-island]').forEach(function (el) {
      var C = ISLANDS[el.getAttribute('data-island')];
      if (!C) return;
      RD.createRoot(el).render(h(C, JSON.parse(el.getAttribute('data-props') || '{}')));
    });
    if (L.SonnerToaster) {
      var t = document.createElement('div');
      document.body.appendChild(t);
      RD.createRoot(t).render(h(L.SonnerToaster, { position: 'bottom-center' }));
    }
  }

  // ---------- plain behaviour (no React needed) ----------

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-confirm]');
    if (c) {
      c.disabled = true;
      var item = c.closest('.hub-titem');
      var t = item && item.querySelector('.hub-titem-title');
      confirmWithUndo(c.getAttribute('data-confirm'), t ? t.textContent : 'report', function () { if (item) item.style.opacity = '.45'; c.textContent = 'Confirmed'; });
      return;
    }
    var act = e.target.closest('[data-triage]');
    if (act) {
      var which = act.getAttribute('data-triage');
      act.disabled = true;
      triage(act.getAttribute('data-ref'), { action: which }).then(function () {
        toast(which === 'publish' ? 'Published. The report is live.' : 'Rejected. It stays archived, unpublished.');
        setTimeout(function () { location.href = '/triage'; }, 900);
      }).catch(function () { act.disabled = false; toast('That didn’t work. Try again.'); });
      return;
    }
    var nav = e.target.closest('[data-href]');
    if (nav) { location.href = nav.getAttribute('data-href'); return; }
    var more = e.target.closest('[data-show-more]');
    if (more) {
      var list = more.closest('.hub-list');
      list.querySelectorAll('.hub-more').forEach(function (r) { r.classList.remove('hub-more'); });
      more.parentElement.remove();
    }
  });
  document.querySelectorAll('details[data-disclosure]').forEach(function (d) {
    d.addEventListener('toggle', function () { d.querySelector('summary').setAttribute('data-state', d.open ? 'open' : 'closed'); });
  });

  mountAll();
})();
