import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {composite,contrast,delta,lab} from './verify-alpha-recipes.mjs';

const black={r:0,g:0,b:0,a:1},white={r:1,g:1,b:1,a:1};
describe('Independent alpha acceptance math',()=>{
 it('measures translucent ink after sRGB compositing, rather than its opaque pigment',()=>{
  const ink={...black,a:.38};
  assert.equal(contrast(ink,white),21);
  const rendered=contrast(composite(ink,white),white);
  assert.ok(rendered>2.6);
  assert.ok(rendered<2.8);
  assert.deepEqual(composite({...white,a:.5},black),{r:.5,g:.5,b:.5,a:1});
 });
 it('keeps the actual midpoint polarity boundary on opposite sides of 4.5',()=>{
  const midpoint={r:119/255,g:119/255,b:119/255,a:1};
  assert.ok(contrast(white,midpoint)>4.47);
  assert.ok(contrast(white,midpoint)<4.5);
  assert.ok(contrast(black,midpoint)>4.68);
  assert.ok(contrast(black,midpoint)<4.70);
 });
 it('uses unscaled OKLab distance with known endpoint and red coordinates',()=>{
  assert.ok(Math.abs(delta(black,white)-1)<1e-7);
  const red=lab({r:1,g:0,b:0,a:1});
  assert.ok(Math.abs(red[0]-.6279553606)<1e-8);
  assert.ok(Math.abs(red[1]-.2248630611)<1e-8);
  assert.ok(Math.abs(red[2]-.1258462985)<1e-8);
  assert.equal(delta(black,black),0);
 });
});
