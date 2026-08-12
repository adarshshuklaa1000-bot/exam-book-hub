function updateV3Stats(){
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set("bookCount", allBooks.length);
  set("categoryCount", allCategories.length);
  set("groupCount", new Set(allCategories.map(c=>c.group_name||"Other")).size);
}

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET } from "./config.js";

const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let allBooks = [];
let allCategories = [];
let visibleCount = 12;

function toast(msg, type="info") {
  const el = $("toast"); if (!el) return;
  el.textContent = msg; el.className = `toast show ${type}`;
  setTimeout(() => el.className = "toast", 3500);
}

function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function fileUrl(path) {
  if (!path || !configured) return "";
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {day:"2-digit", month:"short", year:"numeric"}).format(new Date(date));
}

async function loadData() {
  if (!configured) {
    renderDemo();
    toast("पहले assets/config.js में Supabase credentials डालें।", "error");
    return;
  }
  const [{data: books, error: be}, {data: cats, error: ce}] = await Promise.all([
    supabase.from("books").select("*").order("created_at", {ascending:false}),
    supabase.from("exam_categories").select("*").order("name")
  ]);
  if (be || ce) {
    console.error(be || ce);
    toast("Library data load नहीं हो पाया। Supabase setup check करें.", "error");
    return;
  }
  allBooks = books || []; allCategories = cats || [];
  renderStats(); updateV3Stats();
  renderCategories(); renderFilter();
  updateV3Stats(); renderBooks();
}

function renderStats() {
  $("statBooks").textContent = allBooks.length;
  $("statExams").textContent = allCategories.length;
}

function renderCategories() {
  const grid = $("categoryGrid");
  if (!allCategories.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><h3>No categories yet</h3><p>Admin dashboard से exam categories add करें.</p></div>`;
    return;
  }
  const groups = [...new Set(allCategories.map(c => c.group_name || "Other"))];
  grid.innerHTML = groups.map(group => {
    const cats = allCategories.filter(c => (c.group_name || "Other") === group);
    return `<div class="category-group"><div class="category-group-title"><span>${escapeHTML(group)}</span><b>${cats.length} Exams</b></div>
      <div class="category-group-grid">${cats.map(c => {
        const count = allBooks.filter(b => b.exam_category_id === c.id).length;
        return `<button class="category-card" data-cat="${c.id}">
          <span class="cat-icon">${escapeHTML(c.icon || "📚")}</span>
          <span><strong>${escapeHTML(c.name)}</strong><small>${count} ${count === 1 ? "Book" : "Books"}</small></span><b>→</b>
        </button>`;
      }).join("")}</div></div>`;
  }).join("");
  grid.querySelectorAll(".category-card").forEach(btn => btn.onclick = () => {
    $("examFilter").value = btn.dataset.cat;
    $("books").scrollIntoView({behavior:"smooth"});
    renderBooks();
  });
}

function renderFilter() {
  const groups = [...new Set(allCategories.map(c => c.group_name || "Other"))];
  $("examFilter").innerHTML = `<option value="">All Exams</option>` + groups.map(g =>
    `<optgroup label="${escapeHTML(g)}">${allCategories.filter(c => (c.group_name || "Other") === g).map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("")}</optgroup>`
  ).join("");
}

function renderBooks() {
  const q = $("searchInput").value.trim().toLowerCase();
  const cat = $("examFilter").value;
  const sort = $("sortFilter").value;
  let items = allBooks.filter(b => {
    const hay = `${b.title} ${b.description} ${b.author||""} ${b.tags||""}`.toLowerCase();
    return (!q || hay.includes(q)) && (!cat || b.exam_category_id === cat);
  });
  if (sort === "az") items.sort((a,b) => a.title.localeCompare(b.title));
  else if (sort === "oldest") items.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
  else items.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));

  const shown = items.slice(0, visibleCount);
  $("bookGrid").innerHTML = shown.length ? shown.map(bookCard).join("") : `<div class="empty-state"><div class="empty-icon">🔎</div><h3>कोई book नहीं मिली</h3><p>Search या category filter बदलकर देखें.</p></div>`;
  $("loadMore").classList.toggle("hidden", shown.length >= items.length);
}

function bookCard(b) {
  const cat = allCategories.find(c => c.id === b.exam_category_id);
  const cover = fileUrl(b.cover_path);
  const pdf = fileUrl(b.pdf_path);
  return `<article class="book-card">
    <div class="cover-wrap">${cover ? `<img src="${escapeHTML(cover)}" alt="${escapeHTML(b.title)}" loading="lazy">` : `<div class="cover-fallback">📚<span>PDF</span></div>`}<span class="exam-pill">${escapeHTML(cat?.name || "Exam")}</span></div>
    <div class="book-body"><div class="book-meta">${escapeHTML(b.author || "Study Material")} ${b.year ? "• "+escapeHTML(b.year) : ""}</div>
    <h3>${escapeHTML(b.title)}</h3><p>${escapeHTML(b.description)}</p>
    <div class="card-actions">${pdf ? `<a class="btn btn-small btn-primary" href="${escapeHTML(pdf)}" target="_blank" rel="noopener">📖 Open PDF</a><a class="btn btn-small btn-ghost" href="${escapeHTML(pdf)}" download>↓ Download</a>` : ""}</div></div>
  </article>`;
}

function renderDemo() {
  allCategories = [
    {id:"demo1",name:"SSC CGL",icon:"🎯"},{id:"demo2",name:"SSC CHSL",icon:"📘"},
    {id:"demo3",name:"RRB NTPC",icon:"🚆"},{id:"demo4",name:"RRB Group D",icon:"⚡"}
  ];
  allBooks = [];
  renderStats(); updateV3Stats();
  renderCategories(); renderFilter();
  updateV3Stats(); renderBooks();
}

$("searchInput").addEventListener("input", () => {visibleCount=12;renderBooks()});
$("examFilter").addEventListener("change", () => {visibleCount=12;renderBooks()});
$("sortFilter").addEventListener("change", renderBooks);
$("loadMore").addEventListener("click", () => {visibleCount += 12;renderBooks()});
$("year").textContent = new Date().getFullYear();

$("menuBtn").addEventListener("click", () => $("mobileNav").classList.toggle("open"));
document.querySelectorAll(".mobile-nav a").forEach(a => a.addEventListener("click", () => $("mobileNav").classList.remove("open")));

loadData();
                                               
