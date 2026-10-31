import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction, set, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig, MANAGER_UID, PIX_KEY, RAFFLE_PRICE } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const grid = $("number-grid");
const formMessage = $("form-message");
const managerMessage = $("manager-message");
const selected = new Set();
let numberData = {};
let managerUser = null;
let initialized = false;
let app, db, auth;

function setMessage(el, text, error=false) {
  el.textContent = text;
  el.style.color = error ? "#b91c1c" : "#166534";
}
function configured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("COLOQUE") &&
    firebaseConfig.projectId && !firebaseConfig.projectId.includes("SEU-PROJETO") &&
    firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes("SEU-PROJETO");
}
function statusLabel(item) {
  if (item?.status === "paid") return "Confirmado";
  if (item?.status === "reserved") return "Reservado";
  return "Disponível";
}
function drawNumbers() {
  const query = $("search-number").value.trim();
  grid.replaceChildren();
  for (let n=1; n<=500; n++) {
    const key=String(n), item=numberData[key], btn=document.createElement("button");
    btn.type="button"; btn.className="number"; btn.textContent=String(n).padStart(3,"0");
    btn.title=`Número ${n}: ${statusLabel(item)}`;
    if (item?.status==="reserved") btn.classList.add("reserved");
    if (item?.status==="paid") btn.classList.add("paid");
    if (selected.has(n)) btn.classList.add("selected");
    if (item?.status) btn.disabled=true;
    if (query && !String(n).includes(query.replace(/^0+/, ""))) btn.classList.add("hidden");
    btn.addEventListener("click",()=>{
      if (selected.has(n)) selected.delete(n); else selected.add(n);
      updateSelection(); drawNumbers();
    });
    grid.append(btn);
  }
  const values=Object.values(numberData);
  $("available-count").textContent=500-values.length;
  $("reserved-count").textContent=values.filter(x=>x?.status==="reserved").length;
  $("paid-count").textContent=values.filter(x=>x?.status==="paid").length;
  $("loading-message").textContent=initialized ? "Lista atualizada em tempo real." : "Conectando à lista de números…";
  renderManagerTable();
}
function updateSelection() {
  $("selected-list").textContent=selected.size ? [...selected].sort((a,b)=>a-b).map(n=>String(n).padStart(3,"0")).join(", ") : "Nenhum";
}
function renderManagerTable() {
  const tbody=$("manager-table"); tbody.replaceChildren();
  const entries=Object.entries(numberData).sort((a,b)=>Number(a[0])-Number(b[0]));
  if (!entries.length) { const tr=document.createElement("tr"),td=document.createElement("td"); td.colSpan=5;td.textContent="Nenhuma reserva.";tr.append(td);tbody.append(tr);return; }
  for (const [key,item] of entries) {
    const tr=document.createElement("tr");
    for (const value of [String(key).padStart(3,"0"),item.name||"—",item.phone||"—",statusLabel(item)]) {
      const td=document.createElement("td"); td.textContent=value; tr.append(td);
    }
    const actions=document.createElement("td"),wrap=document.createElement("div");wrap.className="action-buttons";
    if(item.status!=="paid") { const paid=document.createElement("button");paid.className="button button-primary";paid.textContent="Confirmar Pix";paid.onclick=()=>managerSetStatus(key,{...item,status:"paid",paidAt:Date.now()});wrap.append(paid); }
    const release=document.createElement("button");release.className="button button-outline";release.textContent="Liberar";release.onclick=async()=>{if(confirm(`Liberar o número ${key}?`)){try{await remove(ref(db,`numbers/${key}`));selected.delete(Number(key));setMessage(managerMessage,`Número ${key} liberado.`)}catch(e){setMessage(managerMessage,e.message,true)}}};wrap.append(release);
    actions.append(wrap);tr.append(actions);tbody.append(tr);
  }
}
async function managerSetStatus(key, value) {
  try { await set(ref(db,`numbers/${key}`),value); setMessage(managerMessage,`Pagamento do número ${key} confirmado.`); }
  catch(e) { setMessage(managerMessage,`Não foi possível atualizar: ${e.message}`,true); }
}
function ensureManager() {
  if (!managerUser || managerUser.uid !== MANAGER_UID || MANAGER_UID.includes("COLOQUE")) throw new Error("Acesso restrito ao gerente autorizado.");
}
async function reservePublicNumber(n, participant) {
  const result = await runTransaction(ref(db,`numbers/${n}`), current => {
    if (current !== null) return;
    return {number:n,status:"reserved",name:participant.name,phone:participant.phone,message:participant.message||"",createdAt:Date.now()};
  }, {applyLocally:false});
  return result.committed;
}
async function boot() {
  if (!configured()) {
    $("loading-message").textContent="Falta configurar o Firebase. Veja o README.md antes de divulgar o site.";
    setMessage(formMessage,"O site ainda não está conectado ao banco de dados. Configure firebase-config.js e as regras do Firebase.",true);
    drawNumbers();
    return;
  }
  try {
    app=initializeApp(firebaseConfig);db=getDatabase(app);auth=getAuth(app);
    onValue(ref(db,"numbers"),snap=>{numberData=snap.val()||{};initialized=true;for(const n of [...selected])if(numberData[String(n)])selected.delete(n);updateSelection();drawNumbers();},e=>setMessage(formMessage,`Erro ao carregar números: ${e.message}`,true));
    onAuthStateChanged(auth,user=>{
      managerUser=user;
      const allowed=!!user && user.uid===MANAGER_UID && !MANAGER_UID.includes("COLOQUE");
      $("manager-tools").classList.toggle("hidden",!allowed);
      $("logout-button").classList.toggle("hidden",!user);
      if(user&&!allowed) setMessage(managerMessage,"Esta conta não está autorizada como gerente.",true);
      else if(allowed) setMessage(managerMessage,"Acesso de gerente autorizado.");
    });
  } catch(e) {
    setMessage(formMessage,`Erro de configuração do Firebase: ${e.message}`,true);
  }
}
$("search-number").addEventListener("input",drawNumbers);
$("clear-selection").addEventListener("click",()=>{selected.clear();updateSelection();drawNumbers();});
$("reservation-form").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!db){setMessage(formMessage,"O sistema ainda não foi configurado. Avise o responsável pela rifa.",true);return;}
  if(!selected.size){setMessage(formMessage,"Selecione pelo menos um número disponível.",true);return;}
  const participant={name:$("participant-name").value.trim(),phone:$("participant-phone").value.trim(),message:$("participant-message").value.trim()};
  if(!participant.name||!participant.phone){setMessage(formMessage,"Informe seu nome e WhatsApp.",true);return;}
  const numbers=[...selected].sort((a,b)=>a-b);
  $("submit-reservation").disabled=true;
  const reserved=[],failed=[];
  try {
    for(const n of numbers) {
      if(await reservePublicNumber(n,participant)) reserved.push(n); else failed.push(n);
    }
    selected.clear();updateSelection();drawNumbers();
    let msg=reserved.length?`Solicitação enviada para: ${reserved.map(n=>String(n).padStart(3,"0")).join(", ")}. Aguarde o gerente confirmar o Pix.`:"Nenhum número foi reservado.";
    if(failed.length)msg+=` Já estavam ocupados: ${failed.join(", ")}.`;
    if(PIX_KEY&&!PIX_KEY.includes("COLOQUE"))msg+=` Chave Pix informada pelo responsável: ${PIX_KEY}. Valor por número: ${RAFFLE_PRICE}.`;
    setMessage(formMessage,msg,failed.length===numbers.length);
    if(reserved.length)e.target.reset();
  } catch(err){setMessage(formMessage,`Erro ao solicitar reserva: ${err.message}`,true);}
  finally{$("submit-reservation").disabled=false;}
});
$("login-form").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!auth){setMessage(managerMessage,"Configure o Firebase primeiro.",true);return;}
  try{await signInWithEmailAndPassword(auth,$("manager-email").value.trim(),$("manager-password").value);setMessage(managerMessage,"Login realizado.");}
  catch(err){setMessage(managerMessage,"Não foi possível entrar. Confira o e-mail, a senha e se a conta foi criada no Firebase Authentication.",true);}
});
$("logout-button").addEventListener("click",async()=>{if(auth)await signOut(auth);});
$("manual-reserve-button").addEventListener("click",async()=>{
  try{
    ensureManager();
    const n=Number($("manual-number").value);
    if(!Number.isInteger(n)||n<1||n>500)throw new Error("Informe um número de 1 a 500.");
    const name=$("manual-name").value.trim()||"Reserva manual do gerente";
    const result=await runTransaction(ref(db,`numbers/${n}`),current=>{
      if(current!==null)return;
      return {number:n,status:"reserved",name,phone:"",message:"Reserva feita pelo gerente",createdAt:Date.now(),manual:true};
    },{applyLocally:false});
    if(!result.committed)throw new Error(`O número ${n} já está reservado ou confirmado.`);
    $("manual-number").value="";$("manual-name").value="";
    setMessage(managerMessage,`Número ${n} reservado manualmente.`);
  }catch(e){setMessage(managerMessage,e.message,true);}
});
boot();
