import { supabase } from './supabase';
export const columns = {
 person:'personid,firstname,lastname,address,city,state,zip,phone,email',
 client:'personid,foundout,remindermethod,referredby', counselor:'personid,degreesuffix',
 employee:'personid,datehired,supervisorid',family:'familyid,name,datefounded',
 family_member:'personid',member_in_family:'familyid,personid,datejoined',
 fills:'familyid,personid,roleid',role:'roleid,rolename',room:'roomnumber,roomname',
 appointment:'appointmentid,appointmenttime,duration,counselorid,employeeid,roomnumber',
 scheduledfor:'appointmentid,clientid,kept',
};
export function staffRole(session) {
 try {
  const payload=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  const role=session.user.app_metadata?.staff_role;
  return ['admin','scheduler','counselor'].includes(role) && payload.role===`raft_${role}` ? role : null;
 } catch { return null; }
}
export async function loadData(role) {
 if(!['admin','scheduler','counselor'].includes(role)) throw new Error('Staff access could not be verified.');
 const entries=await Promise.all(Object.entries(columns).map(async ([table, base])=>{
  let selected=base;
  if(table==='employee' && role==='admin') selected+=',wage';
  if(table==='appointment' && role!=='scheduler') selected+=',notes';
  if(table==='scheduledfor' && role!=='scheduler') selected+=',assignment';
  const rows=[];
  // Stable pagination avoids silently truncated statistics and lookup results.
  const keys={person:['personid'],client:['personid'],counselor:['personid'],employee:['personid'],family:['familyid'],family_member:['personid'],member_in_family:['familyid','personid'],fills:['familyid','personid','roleid'],role:['roleid'],room:['roomnumber'],appointment:['appointmentid'],scheduledfor:['appointmentid','clientid']}[table];
  for(let from=0;;from+=500){
   let query=supabase.from(table).select(selected);
   for(const key of keys) query=query.order(key);
   const {data,error}=await query.range(from,from+499);
   if(error) throw new Error(`${table}: ${error.message}`);
   rows.push(...data); if(data.length<500) break;
  }
  return [table,rows];
 }));
 return Object.fromEntries(entries);
}

// Home uses a separate, wage-free query, even when the signed-in user is Admin.
export async function loadStaffDirectory(role) {
 if(!['admin','scheduler','counselor'].includes(role)) throw new Error('Staff access could not be verified.');
 const employee=[];
 for(let from=0;;from+=500){
  const {data,error}=await supabase.from('employee').select('personid,supervisorid').order('personid').range(from,from+499);
  if(error)throw new Error('Staff directory access is unavailable.');
  employee.push(...data.map(e=>({personid:e.personid,supervisorid:e.supervisorid})));
  if(data.length<500)break;
 }
 const person=[];
 const ids=[...new Set(employee.map(e=>e.personid))];
 for(let start=0;start<ids.length;start+=100){
  const batch=ids.slice(start,start+100);
  for(let from=0;;from+=500){
   const {data,error}=await supabase.from('person').select('personid,firstname,lastname').in('personid',batch).order('personid').range(from,from+499);
   if(error)throw new Error('Staff directory names are unavailable.');
   person.push(...data.map(p=>({personid:p.personid,firstname:p.firstname,lastname:p.lastname})));
   if(data.length<500)break;
  }
 }
 return {employee,person};
}
