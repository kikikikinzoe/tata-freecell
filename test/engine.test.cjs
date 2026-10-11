const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../public/engine.js');
const source = (i, at) => ({zone:'tableau',index:i,at});
const target = (i) => ({zone:'tableau',index:i});
test('52 distinct cards, 8 columns (7x4,6x4), deterministic deal', () => {
  const a = E.create(12345), b = E.create(12345);
  assert.deepEqual(a,b);
  assert.deepEqual(a.tableau.map(c => c.length), [7,7,7,7,6,6,6,6]);
  const cards = a.tableau.flat().map(c=>`${c.suit}-${c.rank}`);
  assert.equal(new Set(cards).size, 52);
  assert.notDeepEqual(a,E.create(12346));
});
test('alternating descending runs must be valid', () => {
  const good = [{suit:0,rank:9},{suit:1,rank:8},{suit:2,rank:7}];
  assert.equal(E.runValid(good,0),true);
  assert.equal(E.runValid([{suit:0,rank:9},{suit:2,rank:8}],0),false);
  assert.equal(E.runValid(good,3),false);
});
test('moving ace to foundation then another suit card disallowed',()=>{
  const s=E.create(2);s.tableau=Array.from({length:8},()=>[]);
  s.tableau[0]=[{suit:0,rank:1}];
  let n=E.move(s,source(0,0),{zone:'foundations',index:0});
  assert.equal(n.foundations[0],1);assert.equal(n.tableau[0].length,0);
  assert.equal(s.foundations[0],0);
  assert.equal(E.move(n,source(0,0),{zone:'foundations',index:0}),null);
});
test('supermove capacity recognizes empty destination reduction',()=>{
  const s=E.create(1);
  s.tableau=Array.from({length:8},()=>[]);
  s.cells=Array.from({length:4},(_,i)=>({suit:i,rank:12}));
  s.tableau[0]=[{suit:0,rank:9},{suit:1,rank:8}];
  s.tableau[1]=[{suit:1,rank:10}];
  for(let j=2;j<8;j++)s.tableau[j]=[{suit:j%4,rank:13}];
  assert.equal(E.canMove(s,source(0,0),target(1)),false);
  s.cells[0]=null;
  assert.equal(E.canMove(s,source(0,0),target(1)),true);
  s.cells[1]=null;
  assert.equal(E.canMove(s,source(0,0),target(1)),true);
});
test('four free cells and foundations obey restrictions',()=>{
  const s=E.create(1);s.tableau=Array.from({length:8},()=>[]);
  s.tableau[0]=[{suit:1,rank:5}];
  const n=E.move(s,source(0,0),{zone:'cells',index:0});
  assert.deepEqual(n.cells[0],{suit:1,rank:5});
  assert.equal(E.move(n,{zone:'cells',index:0},{zone:'cells',index:1})!==null,true);
  assert.equal(E.move(n,{zone:'cells',index:0},{zone:'foundations',index:1}),null);
});
test('auto-collect only safe cards, detect win',()=>{
  const s=E.create(1);s.tableau=Array.from({length:8},()=>[]);
  s.tableau[0]=[{suit:0,rank:1}];
  s.tableau[1]=[{suit:1,rank:1}];
  const r=E.autoFoundations(s);
  assert.equal(r.count,2);assert.deepEqual(r.state.foundations,[1,1,0,0]);
  assert.equal(E.won(r.state),false);
  r.state.foundations=[13,13,13,13]; assert.equal(E.won(r.state),true);
});
test('single-file MCP view has no external resource dependencies',()=>{
  const { buildWidgetHTML }=require('../lib/bundle.cjs');
  const html=buildWidgetHTML();
  assert.match(html,/<style>[\s\S]+<\/style>/);
  assert.match(html,/const SUITS/);
  assert.match(html,/function interact/);
  assert.match(html,/ui\/initialize/);
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.doesNotMatch(html,/<link[^>]+href=/);
  assert.ok(Buffer.byteLength(html)<125000,'UI must remain lightweight');
});
