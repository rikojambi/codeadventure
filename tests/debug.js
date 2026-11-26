'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const sandbox={console,setTimeout,Math,Date,JSON,Object,Array,String,Number};sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);
['src/core/util.js','src/game/levels.js','src/game/world.js','src/core/scoring.js','src/engine/interpreter.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f}));
const CA=sandbox.CA;
function fake(type,fields,children){return {type,fields:fields||{},children:children||{},getFieldValue(n){return this.fields[n]},getInputTargetBlock(n){return this.children[n]||null},getSvgRoot(){return null},isEnabled(){return true}}}
const level=CA.getLevel(1), world=new CA.World(level);
const stack=[fake('ca_move_forward'),fake('ca_move_forward'),fake('ca_turn_right'),fake('ca_move_forward'),fake('ca_move_forward')];
stack.forEach((b,i)=>b.getNextBlock=()=>stack[i+1]||null);
const interp=new CA.Interpreter({world,workspace:{getTopBlocks(){return stack}},autoDelay:0,onLog:(m,t)=>console.log('LOG',t,m),onFinish:p=>console.log('FINISH',p.reason,p.status,p.stats)});
interp.runSync();
console.log('state',world.state,'stats',interp.stats,'ops',interp._ops,'queue',interp.queue.length);
