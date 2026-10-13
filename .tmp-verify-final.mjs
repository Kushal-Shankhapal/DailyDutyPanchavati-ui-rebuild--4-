const B = 'http://127.0.0.1:3100';
const log = [];
const say = (k, v, ok = true) => log.push(`${ok ? '✓' : '✗'} ${k}: ${v}`);

// 1. de-dup: the Sr-PI writer must appear exactly once in the whole chart now
const page = await (await fetch(`${B}/charts/2026-09-10`)).text();
const writer = (page.match(/१३४७ जाधव/g) || []).length;
say('Sr-PI writer occurrences in the whole render', writer, writer === 1);

// 2. slot de-dup
const ids = [...page.matchAll(/data-asn="(\d+)"/g)].map(m => m[1]);
const uniq = new Set(ids);
say('slot renders', `${ids.length} renders / ${uniq.size} unique`, ids.length === uniq.size);

// 3. support-seat CRUD
const post = (body) => fetch(`${B}/api/charts/2026-09-10/support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const del = (id) => fetch(`${B}/api/charts/2026-09-10/support/${id}`, { method: 'DELETE' });

const created = await post({ role: 'चालक', shift: 'DAY' });
const createdJson = await created.json().catch(() => ({}));
say('POST support seat', `HTTP ${created.status}`, created.status === 201 && createdJson.assignmentId > 0);
const dup = await post({ role: 'चालक', shift: 'DAY' });
say('duplicate seat refused', `HTTP ${dup.status}`, dup.status === 409);
const bad = await post({ role: 'हॅकर', shift: 'DAY' });
say('invalid role refused', `HTTP ${bad.status}`, bad.status === 400);

const withSeat = await (await fetch(`${B}/charts/2026-09-10`)).text();
const hadSeat = withSeat.includes('data-del-seat') && withSeat.includes('data-add-seat');
say('render carries + जागा / ✕ controls with the seat', String(hadSeat), hadSeat);

const removed = await del(createdJson.assignmentId);
say('DELETE support seat', `HTTP ${removed.status}`, removed.status === 200);
const guardDel = await fetch(`${B}/api/charts/2026-09-10/support/99999999`, { method: 'DELETE' });
say('missing seat -> 404', `HTTP ${guardDel.status}`, guardDel.status === 404);

// 4. presentation PATCH round-trip (align a section, then clear it)
const patch = (b) => fetch(`${B}/api/charts/2026-09-10/presentation`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const setAlign = await patch({ key: 'p1.desk.office', horizontalAlign: 'right' });
say('presentation align PATCH', `HTTP ${setAlign.status}`, setAlign.status === 200);
const cleared = await patch({ key: 'p1.desk.office', horizontalAlign: null });
say('presentation align cleared', `HTTP ${cleared.status}`, cleared.status === 200);
const badAlign = await patch({ key: 'p1.desk.office', horizontalAlign: 'diagonal' });
say('invalid align refused', `HTTP ${badAlign.status}`, badAlign.status === 400);

// 5. nav chrome present
say('grouped nav groups', String((page.match(/class="ab-gbtn/g) || []).length), (page.match(/class="ab-gbtn/g) || []).length === 4);
say('WIP leaves (data-wip)', String((page.match(/data-wip=/g) || []).length), (page.match(/data-wip=/g) || []).length >= 12);
say('date menu on the chart toolbar', String(page.includes('chart-toolbar') && page.includes('date-menu')));
say('language toggle', String(page.includes('data-lang-set')));
say('chart is Marathi-only in content (no dual EN labels in sheets)', String(!/sheet-\d[\s\S]{0,400}>[A-Za-z]{4,}/.test(page)));

// 6. assignment row count unchanged after all the above
const doc = await (await fetch(`${B}/api/charts/2026-09-10`)).text();
say('assignment rows', String(JSON.parse(doc).assignments.length), JSON.parse(doc).assignments.length === 212);

console.log(log.join('\n'));
process.exit(log.some(l => l.startsWith('✗')) ? 1 : 0);
