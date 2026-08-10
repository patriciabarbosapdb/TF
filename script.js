/* TF — Supabase version
   1) Put your Supabase Project URL and anon/publishable key below.
   2) Create two Auth users in Supabase Dashboard.
   3) Put their emails in LOGIN_EMAILS.
*/
const SUPABASE_URL = 'https://yyyxhrnessxvhtcjuvwh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PmwWN4Wcke2RxuKuRUf_6Q_9O3W3nxt';

const LOGIN_EMAILS = {
  LadyWhite: "EMAIL_DA_LADYWHITE",
  LadyBlack: "EMAIL_DA_LADYBLACK"
};

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let user=null, profile=null, activeTab="notes", bookStatus="to_read", audioTracks=[], audioIndex=0;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const url=s=>/^https?:\/\//i.test(s||"")?s:"";

function showError(msg){$("#loginError").textContent=msg}
async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(session){user=session.user; await loadProfile(); showApp()}
  sb.auth.onAuthStateChange(async(_event,session)=>{
    if(session){user=session.user; await loadProfile(); showApp()}
    else {user=null; profile=null; $("#app").classList.add("hidden");$("#login").classList.remove("hidden")}
  });
}
async function loadProfile(){
  let {data:p,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(error){showError(error.message);return}
  if(!p){
    const username=Object.keys(LOGIN_EMAILS).find(k=>LOGIN_EMAILS[k].toLowerCase()===user.email.toLowerCase());
    if(username){
      const r=await sb.from("profiles").insert({id:user.id,username}).select().single();
      if(!r.error)p=r.data;
    }
  }
  profile=p;
}
function showApp(){
  if(!profile){showError("Esta conta não está autorizada no TF.");return}
  $("#login").classList.add("hidden");$("#app").classList.remove("hidden");
  $("#homeName").textContent=profile.username;$("#drawerName").textContent=profile.username;$("#avatar").textContent=profile.username==="LadyWhite"?"W":"B";
  loadAll();subscribeRealtime();
}
$("#loginUser").onchange=e=>{$("#loginEmail").value=LOGIN_EMAILS[e.target.value]||""};
$("#loginEmail").value=LOGIN_EMAILS[$("#loginUser").value]||"";
$("#showPassword").onclick=()=>$("#loginPassword").type=$("#loginPassword").type==="password"?"text":"password";
$("#loginPassword").onkeydown=e=>{if(e.key==="Enter")login()};
$("#loginBtn").onclick=login;
async function login(){
  const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;
  if(!email||!password)return showError("Preenche o email e o passe.");
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error)showError("Email ou passe incorrecto.");
}
$("#logoutBtn").onclick=()=>sb.auth.signOut();

function go(page){$$(".page").forEach(p=>p.classList.remove("active"));$("#"+page).classList.add("active");closeDrawer();if(page==="chat")loadChat();if(page==="references")loadRefs();if(page==="personal")loadPersonal();window.scrollTo(0,0)}
$$("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
$("#menuBtn").onclick=()=>{$("#drawer").classList.add("open");$("#backdrop").classList.remove("hidden")};
$("#closeDrawer").onclick=closeDrawer;$("#backdrop").onclick=closeDrawer;
function closeDrawer(){$("#drawer").classList.remove("open");$("#backdrop").classList.add("hidden")}
$("#quickBtn").onclick=$("#homeQuick").onclick=()=>go("quick");

async function loadChat(){
 const {data,error}=await sb.from("messages").select("id,body,created_at,user_id").order("created_at",{ascending:true}).limit(300);
 if(error)return;
 const ids=[...new Set(data.map(x=>x.user_id))];let names={};if(ids.length){const r=await sb.from("profiles").select("id,username").in("id",ids);(r.data||[]).forEach(x=>names[x.id]=x.username)}
 $("#messages").innerHTML=data.map(m=>`<div class="message ${m.user_id===user.id?"me":""}"><small>${esc(names[m.user_id]||"TF")} · ${new Date(m.created_at).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})}</small><div class="bubble">${esc(m.body).replace(/\n/g,"<br>")}</div></div>`).join("");
 $("#chatBadge").textContent="";
}
$("#chatForm").onsubmit=async e=>{e.preventDefault();const input=$("#messageInput"),body=input.value.trim();if(!body)return;input.disabled=true;const {error}=await sb.from("messages").insert({user_id:user.id,body});input.disabled=false;if(!error)input.value=""};

async function loadRefs(){
 const {data}=await sb.from("references").select("*").order("created_at",{ascending:false});
 $("#referenceGrid").innerHTML=(data||[]).map((r,i)=>`<article class="reference"><div class="ref-image" ${r.image_url?`style="background-image:url('${esc(url(r.image_url))}')"`:""}>${r.image_url?"":"✦"}</div><div class="ref-body"><span class="micro">REF ${String(i+1).padStart(2,"0")}</span><h3>${esc(r.title)}</h3><p>${esc(r.note||"")}</p>${r.link_url?`<a target="_blank" rel="noopener" href="${esc(url(r.link_url))}">Abrir ↗</a>`:""}</div></article>`).join("")||"<p style='padding:16px;color:#888;font-size:11px'>Ainda não existem referências.</p>";
}
$("#newReference").onclick=()=>$("#refModal").classList.remove("hidden");
$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
$("#refForm").onsubmit=async e=>{e.preventDefault();const payload={user_id:user.id,title:$("#refTitle").value.trim(),image_url:$("#refImage").value.trim()||null,link_url:$("#refLink").value.trim()||null,note:$("#refNote").value.trim()||null};const {error}=await sb.from("references").insert(payload);if(error)return alert("Não foi possível guardar.");e.target.reset();$("#refModal").classList.add("hidden");loadRefs()};

$$("[data-tab]").forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;$$("[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab===activeTab));$$(".panel").forEach(x=>x.classList.remove("active"));$("#tab-"+activeTab).classList.add("active");if(activeTab==="books"||activeTab==="tasks")loadPersonal()});
$("#notes").oninput=()=>saveNotesDebounced();
let noteTimer;
function saveNotesDebounced(){clearTimeout(noteTimer);noteTimer=setTimeout(async()=>{await sb.from("notes").upsert({user_id:user.id,body:$("#notes").value,updated_at:new Date().toISOString()});},500)}
$("#saveQuick").onclick=async()=>{await sb.from("notes").upsert({user_id:user.id,quick:$("#quickText").value,updated_at:new Date().toISOString()});$("#saveQuick").textContent="Guardado ✓";setTimeout(()=>$("#saveQuick").textContent="Guardar",1000)};
async function loadPersonal(){
 const n=await sb.from("notes").select("*").eq("user_id",user.id).maybeSingle();if(n.data){$("#notes").value=n.data.body||"";$("#quickText").value=n.data.quick||""}
 const b=await sb.from("books").select("*").eq("user_id",user.id).eq("status",bookStatus).order("created_at",{ascending:false});
 $("#bookList").innerHTML=(b.data||[]).map(x=>`<div class="list-item"><span>${esc(x.title)}</span><button onclick="deleteBook('${x.id}')">×</button></div>`).join("")||"<p style='font-size:11px;color:#999'>Ainda não tens livros nesta lista.</p>";
 const t=await sb.from("tasks").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
 $("#taskList").innerHTML=(t.data||[]).map(x=>`<div class="list-item ${x.done?"done":""}"><input class="check" type="checkbox" ${x.done?"checked":""} onchange="toggleTask('${x.id}',${!x.done})"><span>${esc(x.title)}</span><button onclick="deleteTask('${x.id}')">×</button></div>`).join("")||"<p style='font-size:11px;color:#999'>Ainda não tens tarefas.</p>";
}
$$("[data-list]").forEach(b=>b.onclick=()=>{$$(".book-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");bookStatus=b.dataset.list;loadPersonal()});
let inputMode="";
function openInput(title,placeholder,mode){inputMode=mode;$("#inputTitle").textContent=title;$("#inputValue").placeholder=placeholder;$("#inputValue").value="";$("#inputModal").classList.remove("hidden");setTimeout(()=>$("#inputValue").focus(),100)}
$("#addBook").onclick=()=>openInput("Adicionar livro","Nome do livro","book");
$("#addTask").onclick=()=>openInput("Nova tarefa","O que tens de fazer?","task");
$("#inputSave").onclick=async()=>{const v=$("#inputValue").value.trim();if(!v)return;if(inputMode==="book")await sb.from("books").insert({user_id:user.id,title:v,status:bookStatus});else await sb.from("tasks").insert({user_id:user.id,title:v});$("#inputModal").classList.add("hidden");loadPersonal()};
window.deleteBook=async id=>{await sb.from("books").delete().eq("id",id).eq("user_id",user.id);loadPersonal()};
window.toggleTask=async(id,done)=>{await sb.from("tasks").update({done}).eq("id",id).eq("user_id",user.id);loadPersonal()};
window.deleteTask=async id=>{await sb.from("tasks").delete().eq("id",id).eq("user_id",user.id);loadPersonal()};

let tracks=[];
$("#addMusic").onclick=()=>$("#audioFiles").click();
$("#audioFiles").onchange=e=>{tracks=[...e.target.files].map(f=>({name:f.name,url:URL.createObjectURL(f)}));audioIndex=0;if(tracks.length)loadTrack()};
function loadTrack(){const t=tracks[audioIndex];$("#audio").src=t.url;$("#trackTitle").textContent=t.name;$("#trackArtist").textContent="TF / música local";$("#musicName").textContent=t.name;$("#audio").play();$("#play").textContent="Ⅱ"}
$("#play").onclick=()=>{if(!$("#audio").src)return;$("#audio").paused?($("#audio").play(),$("#play").textContent="Ⅱ"):($("#audio").pause(),$("#play").textContent="▶")};
$("#prev").onclick=()=>{if(tracks.length){audioIndex=(audioIndex-1+tracks.length)%tracks.length;loadTrack()}};
$("#next").onclick=()=>{if(tracks.length){audioIndex=(audioIndex+1)%tracks.length;loadTrack()}};
$("#audio").onended=()=>$("#next").click();$("#audio").ontimeupdate=()=>$("#progress").style.width=$("#audio").duration?($("#audio").currentTime/$("#audio").duration*100)+"%":"0%";

async function loadAll(){await loadChat();await loadRefs();await loadPersonal()}
let realtimeStarted=false;
function subscribeRealtime(){if(realtimeStarted)return;realtimeStarted=true;sb.channel("tf-live").on("postgres_changes",{event:"*",schema:"public",table:"messages"},loadChat).on("postgres_changes",{event:"*",schema:"public",table:"references"},loadRefs).on("postgres_changes",{event:"*",schema:"public",table:"notes"},loadPersonal).on("postgres_changes",{event:"*",schema:"public",table:"books"},loadPersonal).on("postgres_changes",{event:"*",schema:"public",table:"tasks"},loadPersonal).subscribe()}

boot();
