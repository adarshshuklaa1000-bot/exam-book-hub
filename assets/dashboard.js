import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAIL, STORAGE_BUCKET } from "./config.js";

const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
let categories = [], books = [];

function toast(msg, type="info") {
  const el=$("toast"); el.textContent=msg; el.className=`toast show ${type}`;
  setTimeout(()=>el.className="toast",3500);
}
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function boot(){
  if(!configured){toast("assets/config.js configure करें।","error");return;}
  const {data:{session}} = await supabase.auth.getSession();
  if(session) showDashboard(session); else showLogin();
  supabase.auth.onAuthStateChange((_event, session)=>session ? showDashboard(session) : showLogin());
}
function showLogin(){ $("loginPanel").classList.remove("hidden"); $("dashboardPanel").classList.add("hidden"); }
async function showDashboard(session){
  if(ADMIN_EMAIL && !ADMIN_EMAIL.startsWith("YOUR_") && session.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()){
    await supabase.auth.signOut(); toast("यह account admin नहीं है।","error"); return;
  }
  $("loginPanel").classList.add("hidden"); $("dashboardPanel").classList.remove("hidden"); $("adminEmail").textContent=session.user.email;
  await loadAll();
}
$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!configured){toast("पहले config.js configure करें।","error");return;}
  const {error}=await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error) toast(error.message,"error");
});
$("logoutBtn").addEventListener("click",()=>supabase.auth.signOut());
$("categoryForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const name=$("categoryName").value.trim(), icon=$("categoryIcon").value.trim()||"📚", group_name=$("categoryGroup").value;
  const {error}=await supabase.from("exam_categories").insert({group_name,name,icon});
  if(error) toast(error.message,"error"); else {e.target.reset();toast("Category added.","success");loadAll();}
});
$("bookForm").addEventListener("submit", saveBook);
$("cancelEdit").addEventListener("click", resetBookForm);
$("adminSearch").addEventListener("input", renderAdminBooks);
// ================= ANNOUNCEMENT =================

$("announcementForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = $("announcementTitle").value.trim();
  const message = $("announcementMessage").value.trim();

  if (!title || !message) {
    toast("Announcement title और message भरें।", "error");
    return;
  }

  try {

    // पहले पुराने announcements बंद करें
    const { error: deactivateError } = await supabase
      .from("announcements")
      .update({ active: false })
      .eq("active", true);

    if (deactivateError) throw deactivateError;

    // नया announcement publish करें
    const { error } = await supabase
      .from("announcements")
      .insert({
        title,
        message,
        active: true
      });

    if (error) throw error;

    toast("Announcement published successfully.", "success");

    $("announcementForm").reset();

  } catch (error) {

    console.error(error);

    toast(
      error.message || "Announcement publish नहीं हुआ।",
      "error"
    );
  }
});


// Remove announcement

$("removeAnnouncement").addEventListener("click", async () => {

  if (!confirm("Current announcement हटाना है?")) {
    return;
  }

  try {

    const { error } = await supabase
      .from("announcements")
      .update({ active: false })
      .eq("active", true);

    if (error) throw error;

    toast("Announcement removed.", "success");

  } catch (error) {

    console.error(error);

    toast(
      error.message || "Announcement remove नहीं हुआ।",
      "error"
    );
  }

});

async function loadAll(){
  const [{data:c,error:ce},{data:b,error:be}]=await Promise.all([
    supabase.from("exam_categories").select("*").order("name"),
    supabase.from("books").select("*").order("created_at",{ascending:false})
  ]);
  if(ce||be){toast((ce||be).message,"error");return;}
  categories=c||[];books=b||[];
  renderCategories();renderBookExam();renderAdminBooks();
  $("dashBooks").textContent=books.length;$("dashCategories").textContent=categories.length;
}
function renderBookExam(){
  $("bookExam").innerHTML=categories.length?categories.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join(""):`<option value="">Add a category first</option>`;
}
function renderCategories(){
  $("adminCategories").innerHTML=categories.map(c=>`<div class="admin-list-row"><span class="cat-mini">${escapeHTML(c.icon||"📚")}</span><div><strong>${escapeHTML(c.name)}</strong><small>${books.filter(b=>b.exam_category_id===c.id).length} books</small></div><button class="danger-text" data-delete-cat="${c.id}">Delete</button></div>`).join("") || `<div class="empty-mini">No categories yet.</div>`;
  document.querySelectorAll("[data-delete-cat]").forEach(btn=>btn.onclick=()=>deleteCategory(btn.dataset.deleteCat));
}
async function deleteCategory(id){
  const count=books.filter(b=>b.exam_category_id===id).length;
  if(count && !confirm(`इस category में ${count} books हैं। पहले books हटाएँ या edit करें। Delete करें?`)) return;
  const {error}=await supabase.from("exam_categories").delete().eq("id",id);
  if(error) toast(error.message,"error"); else {toast("Category deleted.","success");loadAll();}
}
function renderAdminBooks(){
  const q=$("adminSearch").value.trim().toLowerCase();
  const list=books.filter(b=>`${b.title} ${b.author||""}`.toLowerCase().includes(q));
  $("adminBooks").innerHTML=list.map(b=>{
    const cat=categories.find(c=>c.id===b.exam_category_id);
    return `<tr><td><strong>${escapeHTML(b.title)}</strong><small>${escapeHTML(b.author||"")}</small></td><td>${escapeHTML(cat?.name||"—")}</td><td>${b.year?escapeHTML(b.year):"—"}</td><td><button class="table-btn" data-edit="${b.id}">Edit</button><button class="table-btn danger" data-del="${b.id}">Delete</button></td></tr>`;
  }).join("") || `<tr><td colspan="4" class="empty-mini">No books found.</td></tr>`;
  document.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=()=>editBook(btn.dataset.edit));
  document.querySelectorAll("[data-del]").forEach(btn=>btn.onclick=()=>deleteBook(btn.dataset.del));
}
function editBook(id){
  const b=books.find(x=>x.id===id); if(!b)return;
  $("bookId").value=b.id;$("bookTitle").value=b.title;$("bookExam").value=b.exam_category_id;$("bookAuthor").value=b.author||"";$("bookYear").value=b.year||"";$("bookDescription").value=b.description||"";$("bookTags").value=b.tags||"";
  $("bookFormTitle").textContent="Edit Book";$("saveBookBtn").textContent="Update Book →";$("cancelEdit").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function resetBookForm(){
  $("bookForm").reset();$("bookId").value="";$("bookFormTitle").textContent="Add New Book";$("saveBookBtn").textContent="Publish Book →";$("cancelEdit").classList.add("hidden");
}
async function uploadFile(file, folder){
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
  const path=`${folder}/${crypto.randomUUID()}-${safe}`;
  const {error}=await supabase.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:false});
  if(error) throw error;
  return path;
}
async function saveBook(e){
  e.preventDefault();
  const id=$("bookId").value, cover=$("coverFile").files[0], pdf=$("pdfFile").files[0];
  if(!id && (!cover || !pdf)){toast("New book के लिए cover image और PDF दोनों जरूरी हैं.","error");return;}
  try{
    $("progressWrap").classList.remove("hidden");$("progressText").textContent="Uploading files...";
    let coverPath, pdfPath;
    if(cover) coverPath=await uploadFile(cover,"covers");
    if(pdf) pdfPath=await uploadFile(pdf,"pdfs");
    const payload={title:$("bookTitle").value.trim(),exam_category_id:$("bookExam").value,author:$("bookAuthor").value.trim(),year:$("bookYear").value.trim(),description:$("bookDescription").value.trim(),tags:$("bookTags").value.trim()};
    if(coverPath)payload.cover_path=coverPath;if(pdfPath)payload.pdf_path=pdfPath;
    let result;
    if(id) result=await supabase.from("books").update(payload).eq("id",id); else result=await supabase.from("books").insert(payload);
    if(result.error)throw result.error;
    toast(id?"Book updated successfully.":"Book published successfully.","success");resetBookForm();await loadAll();
  }catch(err){console.error(err);toast(err.message||"Upload failed.","error");}
  finally{$("progressWrap").classList.add("hidden");}
}
async function deleteBook(id){
  const b=books.find(x=>x.id===id); if(!b||!confirm(`"${b.title}" को delete करना है?`))return;
  const {error}=await supabase.from("books").delete().eq("id",id);
  if(error)toast(error.message,"error");else{toast("Book deleted.","success");loadAll();}
}
boot();
                                                                                                                             
