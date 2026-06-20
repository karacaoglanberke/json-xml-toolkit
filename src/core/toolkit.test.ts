import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as J from './json';
import * as X from './xml';
import * as C from './convert';
import { detectFormat } from './detect';
import { validateJsonSchema } from './schema';

test('prettify and minify round-trip', () => {
  const min = '{"a":1,"b":[1,2]}';
  const pretty = J.prettifyJson(min, '2');
  assert.ok(pretty.includes('\n'));
  assert.equal(J.minifyJson(pretty), min);
});

test('sortKeys deep ascending', () => {
  const out = J.sortKeys('{"b":1,"a":{"d":1,"c":2}}', 'asc', '0' as any);
  assert.deepEqual(JSON.parse(out), { a: { c: 2, d: 1 }, b: 1 });
  assert.ok(out.indexOf('"a"') < out.indexOf('"b"'));
});

test('escape / unescape string', () => {
  const raw = 'line1\n"quoted"\tend';
  const escaped = J.escapeString(raw);
  assert.ok(!escaped.includes('\n'));
  assert.equal(J.unescapeString(escaped), raw);
});

test('repair JSON5 input', () => {
  const broken = "{a:1, b:'two', /* note */ c:[1,2,],}";
  const fixed = J.repairJson(broken, true, '0' as any);
  assert.deepEqual(JSON.parse(fixed), { a: 1, b: 'two', c: [1, 2] });
});

test('flatten then unflatten is stable', () => {
  const src = '{"a":{"b":[{"c":1}]},"d":2}';
  const flat = J.flatten(src, '0' as any);
  assert.deepEqual(JSON.parse(flat), { 'a.b[0].c': 1, d: 2 });
  const round = J.unflatten(flat, '0' as any);
  assert.deepEqual(JSON.parse(round), JSON.parse(src));
});

test('removeEmpty drops nulls and empties', () => {
  const out = J.removeEmpty('{"a":1,"b":null,"c":"","d":[],"e":{"f":""}}', '0' as any);
  assert.deepEqual(JSON.parse(out), { a: 1 });
});

test('unicode escape / decode', () => {
  const s = 'café — ☕';
  const esc = J.unicodeEscape(s);
  assert.ok(esc.includes('\\u'));
  assert.equal(J.unicodeUnescape(esc), s);
});

test('JSONPath query', () => {
  const r = J.queryJsonPath('{"store":{"book":[{"author":"A"},{"author":"B"}]}}', '$.store.book[*].author', '0' as any);
  assert.equal(r.count, 2);
  assert.deepEqual(JSON.parse(r.output), ['A', 'B']);
});

test('analyzeJson stats', () => {
  const s = J.analyzeJson('{"a":[1,2],"b":{"c":true}}');
  assert.equal(s.valid, true);
  assert.equal(s.arrayCount, 1);
  assert.equal(s.objectCount, 2);
});

test('XML prettify and minify', () => {
  const min = '<root><a x="1">hi</a></root>';
  const pretty = X.prettifyXml(min, '2');
  assert.ok(pretty.includes('\n'));
  assert.ok(X.minifyXml(pretty).replace(/\s+/g, '').includes('<a'));
});

test('XML escape / unescape', () => {
  const raw = '<a> & "b"';
  const esc = X.escapeXml(raw);
  assert.equal(esc, '&lt;a&gt; &amp; &quot;b&quot;');
  assert.equal(X.unescapeXml(esc), raw);
});

test('XPath query', () => {
  const xml = '<root><book id="1"><title>X</title></book><book id="2"><title>Y</title></book></root>';
  const r = X.queryXPath(xml, '//book/title/text()');
  assert.equal(r.count, 2);
});

test('JSON <-> YAML', () => {
  const y = C.jsonToYaml('{"a":1,"b":["x","y"]}');
  assert.ok(y.includes('a: 1'));
  assert.deepEqual(JSON.parse(C.yamlToJson(y, '0' as any)), { a: 1, b: ['x', 'y'] });
});

test('JSON -> CSV and back', () => {
  const csv = C.jsonToCsv('[{"a":1,"b":"x, y"},{"a":2,"b":"z"}]');
  assert.ok(csv.split('\n')[0] === 'a,b');
  assert.ok(csv.includes('"x, y"'));
  const back = C.csvToJson(csv, '0' as any);
  assert.deepEqual(JSON.parse(back), [{ a: 1, b: 'x, y' }, { a: 2, b: 'z' }]);
});

test('JSON -> TypeScript', () => {
  const ts = C.jsonToTypeScript('{"user":{"id":1,"name":"a","tags":["x"]}}', 'Root');
  assert.ok(ts.includes('export interface'));
  assert.ok(ts.includes('id: number'));
  assert.ok(ts.includes('tags: string[]'));
});

test('JSON -> Go', () => {
  const go = C.jsonToGo('{"id":1,"name":"a","active":true}', 'Root');
  assert.ok(go.includes('type Root struct'));
  assert.ok(go.includes('`json:"id"`'));
});

test('XML -> JSON', () => {
  const out = C.xmlToJson('<r><a>1</a></r>', '0' as any);
  assert.deepEqual(JSON.parse(out), { r: { a: 1 } });
});

test('JSON -> Protobuf', () => {
  const proto = C.jsonToProto('{"id":1,"name":"a","tags":["x"],"owner":{"age":2}}', 'Root');
  assert.ok(proto.startsWith('syntax = "proto3";'));
  assert.ok(proto.includes('int64 id = 1;'));
  assert.ok(proto.includes('repeated string tags'));
  assert.ok(proto.includes('message Owner'));
});

test('JSON -> Python dataclass', () => {
  const py = C.jsonToPythonDataclass('{"id":1,"name":"a","owner":{"age":2}}', 'Root');
  assert.ok(py.includes('@dataclass'));
  assert.ok(py.includes('class Root:'));
  assert.ok(py.includes('id: int'));
  assert.ok(py.includes('owner: Owner'));
});

test('schema validation valid + invalid', () => {
  const schema = JSON.stringify({
    type: 'object',
    required: ['id', 'name'],
    properties: { id: { type: 'number' }, name: { type: 'string' } }
  });
  const ok = validateJsonSchema('{"id":1,"name":"a"}', schema);
  assert.equal(ok.valid, true);
  const bad = validateJsonSchema('{"id":"oops"}', schema);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 1);
});

test('format detection', () => {
  assert.equal(detectFormat('{"a":1}'), 'json');
  assert.equal(detectFormat('<root/>'), 'xml');
  assert.equal(detectFormat('a: 1\nb: 2'), 'yaml');
  assert.equal(detectFormat('a,b\n1,2'), 'csv');
});
