/*
 * S.u.G WALK R7 durable cost reservations — internal SERVER ONLY module.
 * No HTTP handler imports this until authentication, DB and upstream
 * provider hard caps are configured and the owner authorizes activation.
 *
 * db.transaction(fn): run fn(tx) inside one ACID PostgreSQL transaction.
 * tx.query(sql, params): parametrized query returning {rows:[]}.
 * Requires server-only credentials, never exposed to browser.
 */
const CATEGORIES=Object.freeze({
 ai_text:{cap:2000,held:'ai_text_held',spent:'ai_text_spent'},
 ai_voice:{cap:2000,held:'ai_voice_held',spent:'ai_voice_spent'},
 live:{cap:5000,held:'live_held',spent:'live_spent'}
});
const TOTAL_SPENDABLE=9000; // 1000-yen reserve remains unavailable.
const TOTAL_LIMIT=10000;
const TOTAL_COLUMNS=Object.values(CATEGORIES).flatMap(c=>[c.held,c.spent]).join('+');
function ensure(v,message){if(!v)throw Error(message);}
function requireOperationId(value){
 ensure(typeof value==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(value),'INVALID_OPERATION_ID');
}
function requireCategory(value){
 ensure(Object.prototype.hasOwnProperty.call(CATEGORIES,value),'INVALID_CATEGORY');
}
function requireAmount(value){
 ensure(Number.isSafeInteger(value)&&value>0&&value<=TOTAL_SPENDABLE,'INVALID_AMOUNT');
}
async function monthNow(tx){
 const r=await tx.query("SELECT to_char(now() AT TIME ZONE 'Asia/Tokyo','YYYY-MM') AS month_key");
 const key=r?.rows?.[0]?.month_key;
 ensure(typeof key==='string'&&/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(key),'CLOCK_UNAVAILABLE');
 return key;
}
async function lockPeriod(tx,key){
 await tx.query('INSERT INTO r7_private.r7_budget_month(month_key) VALUES ($1) ON CONFLICT (month_key) DO NOTHING',[key]);
 const r=await tx.query('SELECT * FROM r7_private.r7_budget_month WHERE month_key=$1 FOR UPDATE',[key]);
 ensure(r?.rows?.length===1,'LEDGER_UNAVAILABLE');
 return r.rows[0];
}
function rowSum(row){
 return Object.values(CATEGORIES).reduce((sum,c)=>sum+Number(row[c.held])+Number(row[c.spent]),0);
}
function validRow(row){
 return Object.values(CATEGORIES).every(c=>Number.isSafeInteger(Number(row[c.held]))&&Number.isSafeInteger(Number(row[c.spent]))&&Number(row[c.held])>=0&&Number(row[c.spent])>=0)&&Number.isSafeInteger(rowSum(row));
}
export function ledgerSettings(){return {totalLimitYen:TOTAL_LIMIT,spendableYen:TOTAL_SPENDABLE,categoryCapsYen:{ai_text:2000,ai_voice:2000,live:5000}};}
export async function reserveCost(db,{operationId,category,maxYen}){
 requireOperationId(operationId);requireCategory(category);requireAmount(maxYen);
 ensure(maxYen<=CATEGORIES[category].cap,'CATEGORY_LIMIT');
 ensure(typeof db?.transaction==='function','TRANSACTIONAL_DB_REQUIRED');
 return db.transaction(async tx=>{
  const key=await monthNow(tx);
  const row=await lockPeriod(tx,key); // locks ALL categories for this month
  ensure(validRow(row),'INVALID_LEDGER_ROW');
  const found=await tx.query('SELECT * FROM r7_private.r7_budget_operation WHERE operation_id=$1',[operationId]);
  if(found.rows?.length){
   const prev=found.rows[0];
   ensure(prev.category===category&&Number(prev.reserved_yen)===maxYen&&prev.month_key===key,'IDEMPOTENCY_CONFLICT');
   return {accepted:prev.status==='reserved',duplicate:true,month:key};
  }
  const c=CATEGORIES[category];
  ensure(rowSum(row)+maxYen<=TOTAL_SPENDABLE,'MONTHLY_LIMIT_REACHED');
  ensure(Number(row[c.held])+Number(row[c.spent])+maxYen<=c.cap,'CATEGORY_LIMIT_REACHED');
  const updated=await tx.query(
   'UPDATE r7_private.r7_budget_month SET '+c.held+'='+c.held+'+$2,updated_at=now() WHERE month_key=$1 AND '+TOTAL_COLUMNS+'+$2 <= $3 RETURNING month_key',
   [key,maxYen,TOTAL_SPENDABLE]
  );
  ensure(updated.rows?.length===1,'BUDGET_UPDATE_REJECTED');
  await tx.query(
   "INSERT INTO r7_private.r7_budget_operation(operation_id,month_key,category,reserved_yen,status) VALUES ($1,$2,$3,$4,'reserved')",
   [operationId,key,category,maxYen]
  );
  return {accepted:true,duplicate:false,month:key};
 });
}
export async function finishCost(db,{operationId,actualYen,cancel=false}){
 requireOperationId(operationId);
 ensure(Number.isSafeInteger(actualYen)&&actualYen>=0&&actualYen<=TOTAL_SPENDABLE,'INVALID_ACTUAL');
 ensure(!cancel||actualYen===0,'CANCEL_MUST_BE_ZERO');
 ensure(typeof db?.transaction==='function','TRANSACTIONAL_DB_REQUIRED');
 return db.transaction(async tx=>{
  // Read only month key initially, then lock MONTH first like reserveCost.
  const initial=await tx.query('SELECT month_key FROM r7_private.r7_budget_operation WHERE operation_id=$1',[operationId]);
  ensure(initial.rows?.length===1,'RESERVATION_MISSING');
  const key=initial.rows[0].month_key;
  const row=await lockPeriod(tx,key);
  ensure(validRow(row),'INVALID_LEDGER_ROW');
  const r=await tx.query('SELECT * FROM r7_private.r7_budget_operation WHERE operation_id=$1 FOR UPDATE',[operationId]);
  ensure(r.rows?.length===1&&r.rows[0].month_key===key,'RESERVATION_CHANGED');
  const prev=r.rows[0];
  requireCategory(prev.category);
  if(prev.status!=='reserved'){
   ensure(Number(prev.actual_yen)===actualYen&&prev.status===(cancel?'cancelled':'settled'),'ALREADY_FINALIZED');
   return {accepted:true,duplicate:true,month:key};
  }
  const reserve=Number(prev.reserved_yen),c=CATEGORIES[prev.category];
  ensure(actualYen<=reserve,'ACTUAL_EXCEEDS_RESERVATION');
  ensure(Number(row[c.held])>=reserve,'LEDGER_INCONSISTENT');
  const update=await tx.query(
   'UPDATE r7_private.r7_budget_month SET '+c.held+'='+c.held+'-$2,'+c.spent+'='+c.spent+'+$3,updated_at=now() WHERE month_key=$1 AND '+c.held+'>=$2 RETURNING month_key',
   [key,reserve,actualYen]
  );
  ensure(update.rows?.length===1,'BUDGET_UPDATE_REJECTED');
  await tx.query("UPDATE r7_private.r7_budget_operation SET actual_yen=$2,status=$3,updated_at=now() WHERE operation_id=$1",
   [operationId,actualYen,cancel?'cancelled':'settled']);
  return {accepted:true,duplicate:false,month:key};
 });
}
/* Overrun handling: if a provider charges more than its reserved maximum,
 * do NOT mark the operation as settled. Lock paid services, raise an alert,
 * and reconcile off-line. Never silently charge past the cap.
 */
