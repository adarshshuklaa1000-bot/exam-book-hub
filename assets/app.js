import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORAGE_BUCKET
} from "./config.js";

const configured =
  !SUPABASE_URL.startsWith("YOUR_") &&
  !SUPABASE_ANON_KEY.startsWith("YOUR_");

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);

let allBooks = [];
let allCategories = [];
let visibleCount = 12;

function toast(msg, type = "info") {
  const el = $("toast");
  if (!el) return;

  el.textContent = msg;
  el.className = `toast show ${type}`;

  setTimeout(() => {
    el.className = "toast";
  }, 3500);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function fileUrl(path) {
  if (!path || !configured) return "";

  return supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path).data.publicUrl;
}

function updateV3Stats() {
  const set = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val;
  };

  set("bookCount", allBooks.length);
  set("categoryCount", allCategories.length);
  set(
    "groupCount",
    new Set(allCategories.map(c => c.group_name || "Other")).size
  );
}

function renderStats() {
  const statBooks = $("statBooks");
  const statExams = $("statExams");

  if (statBooks) statBooks.textContent = allBooks.length;
  if (statExams) statExams.textContent = allCategories.length;
}

/* -----------------------------
   LOAD BOOKS
----------------------------- */

async function loadBooks() {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("BOOKS ERROR:", error);
    toast("Books load नहीं हो पाईं।", "error");
    return;
  }

  allBooks = data || [];

  renderStats();
  updateV3Stats();
  renderBooks();
}

/* -----------------------------
   LOAD CATEGORIES
----------------------------- */

async function loadCategories() {
  const { data, error } = await supabase
    .from("exam_categories")
    .select("*")
    .order("name");

  if (error) {
    console.error("CATEGORY ERROR:", error);

    // Categories fail होने पर भी books दिखाई जाएंगी
    allCategories = [];

    renderStats();
    updateV3Stats();
    renderCategories();
    renderFilter();

    return;
  }

  allCategories = data || [];

  renderStats();
  updateV3Stats();
  renderCategories();
  renderFilter();
  renderBooks();
}

/* -----------------------------
   MAIN LOAD
----------------------------- */

async function loadData() {
  if (!configured) {
    renderDemo();

    toast(
      "पहले assets/config.js में Supabase credentials डालें।",
      "error"
    );

    return;
  }

  // Books और categories को अलग-अलग load करेंगे
  await Promise.all([
    loadBooks(),
    loadCategories()
  ]);
}

/* -----------------------------
   CATEGORIES
----------------------------- */

function renderCategories() {
  const grid = $("categoryGrid");

  if (!grid) return;

  if (!allCategories.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>No categories yet</h3>
        <p>Admin dashboard से exam categories add करें.</p>
      </div>
    `;

    return;
  }

  const groups = [
    ...new Set(
      allCategories.map(c => c.group_name || "Other")
    )
  ];

  grid.innerHTML = groups.map(group => {
    const cats = allCategories.filter(
      c => (c.group_name || "Other") === group
    );

    return `
      <div class="category-group">
        <div class="category-group-title">
          <span>${escapeHTML(group)}</span>
          <b>${cats.length} Exams</b>
        </div>

        <div class="category-group-grid">

          ${cats.map(c => {

            const count = allBooks.filter(
              b => b.exam_category_id === c.id
            ).length;

            return `
              <button
                class="category-card"
                data-cat="${escapeHTML(c.id)}"
              >
                <span class="cat-icon">
                  ${escapeHTML(c.icon || "📚")}
                </span>

                <span>
                  <strong>${escapeHTML(c.name)}</strong>
                  <small>
                    ${count} ${count === 1 ? "Book" : "Books"}
                  </small>
                </span>

                <b>→</b>
              </button>
            `;

          }).join("")}

        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".category-card").forEach(btn => {

    btn.onclick = () => {

      const filter = $("examFilter");

      if (filter) {
        filter.value = btn.dataset.cat;
      }

      const books = $("books");

      if (books) {
        books.scrollIntoView({
          behavior: "smooth"
        });
      }

      renderBooks();
    };

  });
}

/* -----------------------------
   EXAM FILTER
----------------------------- */

function renderFilter() {
  const filter = $("examFilter");

  if (!filter) return;

  const groups = [
    ...new Set(
      allCategories.map(c => c.group_name || "Other")
    )
  ];

  filter.innerHTML = `
    <option value="">All Exams</option>
  `;

  groups.forEach(group => {

    const optgroup = document.createElement("optgroup");

    optgroup.label = group;

    allCategories
      .filter(
        c => (c.group_name || "Other") === group
      )
      .forEach(c => {

        const option = document.createElement("option");

        option.value = c.id;
        option.textContent = c.name;

        optgroup.appendChild(option);

      });

    filter.appendChild(optgroup);

  });
}

/* -----------------------------
   BOOKS
----------------------------- */

function renderBooks() {
  const bookGrid = $("bookGrid");

  if (!bookGrid) return;

  const searchInput = $("searchInput");
  const examFilter = $("examFilter");
  const sortFilter = $("sortFilter");

  const q = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const cat = examFilter
    ? examFilter.value
    : "";

  const sort = sortFilter
    ? sortFilter.value
    : "newest";

  let items = allBooks.filter(book => {

    const hay = `
      ${book.title}
      ${book.description}
      ${book.author || ""}
      ${book.tags || ""}
    `.toLowerCase();

    return (
      (!q || hay.includes(q)) &&
      (!cat || book.exam_category_id === cat)
    );

  });

  if (sort === "az") {

    items.sort((a, b) =>
      a.title.localeCompare(b.title)
    );

  } else if (sort === "oldest") {

    items.sort(
      (a, b) =>
        new Date(a.created_at) -
        new Date(b.created_at)
    );

  } else {

    items.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

  }

  const shown = items.slice(0, visibleCount);

  bookGrid.innerHTML = shown.length
    ? shown.map(bookCard).join("")
    : `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>कोई book नहीं मिली</h3>
        <p>Search या category filter बदलकर देखें.</p>
      </div>
    `;

  const loadMore = $("loadMore");

  if (loadMore) {
    loadMore.classList.toggle(
      "hidden",
      shown.length >= items.length
    );
  }

  updateV3Stats();
}

/* -----------------------------
   BOOK CARD
----------------------------- */

function bookCard(book) {

  const cat = allCategories.find(
    c => c.id === book.exam_category_id
  );

  const cover = fileUrl(book.cover_path);
  const pdf = fileUrl(book.pdf_path);

  return `
    <article class="book-card">

      <div class="cover-wrap">

        ${
          cover
            ? `
              <img
                src="${escapeHTML(cover)}"
                alt="${escapeHTML(book.title)}"
                loading="lazy"
              >
            `
            : `
              <div class="cover-fallback">
                📚
                <span>PDF</span>
              </div>
            `
        }

        <span class="exam-pill">
          ${escapeHTML(cat?.name || "Exam")}
        </span>

      </div>

      <div class="book-body">

        <div class="book-meta">
          ${escapeHTML(book.author || "Study Material")}
          ${book.year ? " • " + escapeHTML(book.year) : ""}
        </div>

        <h3>
          ${escapeHTML(book.title)}
        </h3>

        <p>
          ${escapeHTML(book.description)}
        </p>

        <div class="card-actions">

          ${
            pdf
              ? `
                <a
                  class="btn btn-small btn-primary"
                  href="${escapeHTML(pdf)}"
                  target="_blank"
                  rel="noopener"
                >
                  📖 Open PDF
                </a>

                <a
                  class="btn btn-small btn-ghost"
                  href="${escapeHTML(pdf)}"
                  download
                >
                  ↓ Download
                </a>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}

/* -----------------------------
   DEMO
----------------------------- */

function renderDemo() {

  allCategories = [
    {
      id: "demo1",
      name: "SSC CGL",
      icon: "🎯"
    },
    {
      id: "demo2",
      name: "SSC CHSL",
      icon: "📘"
    },
    {
      id: "demo3",
      name: "RRB NTPC",
      icon: "🚆"
    },
    {
      id: "demo4",
      name: "RRB Group D",
      icon: "⚡"
    }
  ];

  allBooks = [];

  renderStats();
  updateV3Stats();
  renderCategories();
  renderFilter();
  renderBooks();
}

/* -----------------------------
   EVENTS
----------------------------- */

const searchInput = $("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    visibleCount = 12;
    renderBooks();
  });
}

const examFilter = $("examFilter");

if (examFilter) {
  examFilter.addEventListener("change", () => {
    visibleCount = 12;
    renderBooks();
  });
}

const sortFilter = $("sortFilter");

if (sortFilter) {
  sortFilter.addEventListener(
    "change",
    renderBooks
  );
}

const loadMore = $("loadMore");

if (loadMore) {
  loadMore.addEventListener("click", () => {
    visibleCount += 12;
    renderBooks();
  });
}

const year = $("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

const menuBtn = $("menuBtn");

if (menuBtn) {
  menuBtn.addEventListener("click", () => {

    const mobileNav = $("mobileNav");

    if (mobileNav) {
      mobileNav.classList.toggle("open");
    }

  });
}

document
  .querySelectorAll(".mobile-nav a")
  .forEach(a => {

    a.addEventListener("click", () => {

      const mobileNav = $("mobileNav");

      if (mobileNav) {
        mobileNav.classList.remove("open");
      }

    });

  });

/* START */

loadData();
