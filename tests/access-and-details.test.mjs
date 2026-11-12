import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'esbuild';

const dataSource=fs.readFileSync(new URL('../src/data.js',import.meta.url),'utf8').replace("import { supabase } from './supabase';",'const supabase=globalThis.raftTestClient;');
const calls=[];
let queryError=null;
let queryRows=()=>[];
globalThis.raftTestClient={from(table){const q={select(columns){calls.push({table,columns});return q},in(){return q},order(){return q},range(){return Promise.resolve({data:queryRows(table),error:queryError})}};return q}};
const data=await import('data:text/javascript;base64,'+Buffer.from(dataSource).toString('base64'));

test('queries exclude restricted fields for each role and reject unknown roles',async()=>{
 for(const role of ['admin','scheduler','counselor']){
  calls.length=0;await data.loadData(role);
  assert.ok(calls.length>0);
  assert.ok(calls.every(c=>!c.columns.includes('*')));
  assert.equal(calls.some(c=>c.columns.split(',').includes('wage')),role==='admin');
  for(const field of ['notes','assignment'])assert.equal(calls.some(c=>c.columns.split(',').includes(field)),role!=='scheduler');
 }
 calls.length=0;await assert.rejects(data.loadData('unknown'),/access could not be verified/);assert.equal(calls.length,0);
});
test('database failures propagate instead of becoming empty results',async()=>{
 queryError={message:'permission denied'};
 try{await assert.rejects(data.loadData('admin'),/permission denied/)}finally{queryError=null}
});

let source=fs.readFileSync(new URL('../src/Workspace.jsx',import.meta.url),'utf8')
 .replace("from 'react'",`from '${import.meta.resolve('react')}'`)
 .replace("import {loadData,loadStaffDirectory} from './data';",'const loadData=()=>{};const loadStaffDirectory=()=>{};')
 .replace("import {supabase} from './supabase';",'const supabase=null;');
const compiled=await transform(source,{loader:'jsx',format:'esm'});
const ui=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
const fixture={person:[{personid:1,firstname:'Test',lastname:'One'},{personid:2,firstname:'Test',lastname:'Two'},{personid:3,firstname:'Test',lastname:'Counselor'},{personid:4,firstname:'Test',lastname:'Employee'}],scheduledfor:[{appointmentid:10,clientid:1},{appointmentid:10,clientid:2},{appointmentid:20,clientid:3}],room:[{roomnumber:5,roomname:'Test Room'}],employee:[{personid:4,wage:42}]};
test('appointments show every linked client and resolved staff and room labels',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.AppointmentInformation,{data:fixture,appointments:[{appointmentid:10,counselorid:3,employeeid:4,roomnumber:5}]}));
 for(const value of ['Test One (#1)','Test Two (#2)','Test Counselor (#3)','Test Employee (#4)','Test Room (#5)','Scheduled by'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('Test Counselor (#3),'));
});
test('employee wages render only for Admin',()=>{
 for(const role of ['scheduler','counselor'])assert.equal(renderToStaticMarkup(React.createElement(ui.EmployeeInformation,{data:fixture,role})), '');
 const html=renderToStaticMarkup(React.createElement(ui.EmployeeInformation,{data:fixture,role:'admin'}));
 for(const value of ['Employee Information','Test Employee','42'])assert.ok(html.includes(value));
});

test('wages use US currency, two decimals, and unavailable values are not zero',()=>{
 for(const [value,expected] of [[24,'$24.00'],['1234.5','$1,234.50'],[0,'$0.00'],[null,'Not available'],['','Not available'],['bad','Not available']])assert.equal(ui.formatWage(value),expected);
 const html=renderToStaticMarkup(React.createElement(ui.EmployeeInformation,{data:fixture,role:'admin'}));
 assert.ok(html.includes('Wage ($)'));assert.ok(html.includes('$42.00'));
});
test('directory resolves supervisor relationships, handles missing names, and never renders wages',()=>{
 const staff={...fixture,employee:[{personid:1,supervisorid:4,wage:98765},{personid:4,supervisorid:null,wage:98765},{personid:2,supervisorid:99,wage:98765}]};
 const html=renderToStaticMarkup(React.createElement(ui.StaffDirectoryView,{data:staff}));
 for(const text of ['Test One (#1)','Test Employee (#4)','None','Not available (#99)'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('98765'));assert.ok(!html.includes('Wage'));
 const admin=renderToStaticMarkup(React.createElement(ui.EmployeeInformation,{data:staff,role:'admin'}));
 assert.ok(admin.includes('Supervisor'));assert.ok(admin.includes('Test Employee (#4)'));assert.ok(admin.includes('None'));
 const empty=renderToStaticMarkup(React.createElement(ui.StaffDirectoryView,{data:{employee:[],person:[]}}));
 assert.ok(empty.includes('current access'));
});
test('Home directory uses only staff relationship and name columns for every role',async()=>{
 queryRows=table=>table==='employee'?[{personid:4,supervisorid:null,wage:98765}]:[{personid:4,firstname:'Test',lastname:'Employee',email:'not-for-directory'}];
 try{
  for(const role of ['admin','scheduler','counselor']){
   calls.length=0;const directory=await data.loadStaffDirectory(role);
   assert.deepEqual(calls,[{table:'employee',columns:'personid,supervisorid'},{table:'person',columns:'personid,firstname,lastname'}]);
   assert.deepEqual(directory,{employee:[{personid:4,supervisorid:null}],person:[{personid:4,firstname:'Test',lastname:'Employee'}]});
  }
  queryError={message:'permission denied'};
  await assert.rejects(data.loadStaffDirectory('scheduler'),/access is unavailable/);
 }finally{queryRows=()=>[];queryError=null}
 calls.length=0;await assert.rejects(data.loadStaffDirectory('unknown'),/access could not be verified/);assert.equal(calls.length,0);
});
