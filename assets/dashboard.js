import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  ADMIN_EMAIL,
  STORAGE_BUCKET
} from "./config.js";

const configured =
  !SUPABASE_URL.startsWith("YOUR_") &&
  !SUPABASE_ANON_KEY.startsWith("YOUR_");

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const $ = (id) => document.getElementById(id);

let categories = [];
let books = [];

/* ================= TOAST ================= */

function toast(msg, type = "info") {
  const el = $("toast");

  if (!el) {
    alert(msg);
    return;
  }

  el.textContent = msg;
  el.className = `toast show ${type}`;

  setTimeout(() => {
    el.className = "toast";
  }, 3500);
}

/* ================= SECURITY ================= */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

/* ================= LOGIN ================= */

async function boot() {
  if (!configured) {
    showLogin();
    toast("assets/config.js configure करें।", "error");
    return;
  }

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      await showDashboard(session);
    } else {
      showLogin();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await showDashboard(session);
      } else {
        showLogin();
      }
    });

  } catch (error) {
    console.error(error);
    showLogin();
    toast("Authentication error.", "error");
  }
}

function showLogin() {
  const loginPanel = $("loginPanel");
  const dashboardPanel = $("dashboardPanel");

  if (loginPanel) {
    loginPanel.classList.remove("hidden");
  }

  if (dashboardPanel) {
    dashboardPanel.classList.add("hidden");
  }
}

async function showDashboard(session) {
  if (!session || !session.user) {
    showLogin();
    return;
  }

  const email = session.user.email || "";

  if (
    ADMIN_EMAIL &&
    !ADMIN_EMAIL.startsWith("YOUR_") &&
    email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  ) {
    await supabase.auth.signOut();
    toast("यह account admin नहीं है।", "error");
    return;
  }

  const loginPanel = $("loginPanel");
  const dashboardPanel = $("dashboardPanel");
  const adminEmail = $("adminEmail");

  if (loginPanel) {
    loginPanel.classList.add("hidden");
  }

  if (dashboardPanel) {
    dashboardPanel.classList.remove("hidden");
  }

  if (adminEmail) {
    adminEmail.textContent = email;
  }

  await loadAll();
}

/* ================= LOGIN FORM ================= */

const loginForm = $("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!configured) {
      toast("पहले config.js configure करें।", "error");
      return;
    }

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      toast("Email और password भरें।", "error");
      return;
    }

    const button = loginForm.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
      button.textContent = "Logging in...";
    }

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        console.error("LOGIN ERROR:", error);
        toast(error.message, "error");
        return;
      }

      toast("Login successful.", "success");

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      toast(error.message || "Login failed.", "error");

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Secure Login →";
      }
    }
  });
}

/* ================= LOGOUT ================= */

const logoutBtn = $("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
}

/* ================= LOAD ALL ================= */

async function loadAll() {
  if (!supabase) return;

  try {
    const [
      { data: c, error: ce },
      { data: b, error: be }
    ] = await Promise.all([
      supabase
        .from("exam_categories")
        .select("*")
        .order("name"),

      supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (ce || be) {
      const error = ce || be;
      console.error("LOAD ERROR:", error);
      toast(error.message, "error");
      return;
    }

    categories = c || [];
    books = b || [];

    renderCategories();
    renderBookExam();
    renderAdminBooks();

    const dashBooks = $("dashBooks");
    const dashCategories = $("dashCategories");

    if (dashBooks) {
      dashBooks.textContent = books.length;
    }

    if (dashCategories) {
      dashCategories.textContent = categories.length;
    }

  } catch (error) {
    console.error(error);
    toast(error.message || "Data load failed.", "error");
  }
}

/* ================= CATEGORY FORM ================= */

const categoryForm = $("categoryForm");

if (categoryForm) {
  categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const name = $("categoryName")?.value.trim();
      const icon =
        $("categoryIcon")?.value.trim() || "📚";
      const group_name =
        $("categoryGroup")?.value || "Other";

      if (!name) {
        toast("Category name भरें।", "error");
        return;
      }

      const { error } = await supabase
        .from("exam_categories")
        .insert({
          group_name,
          name,
          icon
        });

      if (error) throw error;

      categoryForm.reset();

      toast("Category added.", "success");

      await loadAll();

    } catch (error) {
      console.error(error);
      toast(error.message || "Category add नहीं हुई।", "error");
    }
  });
}

/* ================= BOOK CATEGORY ================= */

function renderBookExam() {
  const bookExam = $("bookExam");

  if (!bookExam) return;

  if (!categories.length) {
    bookExam.innerHTML =
      `<option value="">Add a category first</option>`;
    return;
  }

  bookExam.innerHTML = categories
    .map(
      (c) =>
        `<option value="${escapeHTML(c.id)}">${escapeHTML(
          c.name
        )}</option>`
    )
    .join("");
}

/* ================= CATEGORIES ================= */

function renderCategories() {
  const container = $("adminCategories");

  if (!container) return;

  container.innerHTML =
    categories
      .map(
        (c) => `
          <div class="admin-list-row">

            <span class="cat-mini">
              ${escapeHTML(c.icon || "📚")}
            </span>

            <div>
              <strong>${escapeHTML(c.name)}</strong>
              <small>
                ${
                  books.filter(
                    (b) =>
                      b.exam_category_id === c.id
                  ).length
                } books
              </small>
            </div>

            <button
              class="danger-text"
              data-delete-cat="${escapeHTML(c.id)}"
            >
              Delete
            </button>

          </div>
        `
      )
      .join("") ||
    `<div class="empty-mini">No categories yet.</div>`;

  container
    .querySelectorAll("[data-delete-cat]")
    .forEach((btn) => {
      btn.onclick = () =>
        deleteCategory(btn.dataset.deleteCat);
    });
}

async function deleteCategory(id) {
  const count = books.filter(
    (b) => b.exam_category_id === id
  ).length;

  if (
    count &&
    !confirm(
      `इस category में ${count} books हैं। पहले books हटाएँ या edit करें। Delete करें?`
    )
  ) {
    return;
  }

  try {
    const { error } = await supabase
      .from("exam_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    toast("Category deleted.", "success");

    await loadAll();

  } catch (error) {
    console.error(error);
    toast(error.message || "Delete failed.", "error");
  }
}

/* ================= ADMIN SEARCH ================= */

const adminSearch = $("adminSearch");

if (adminSearch) {
  adminSearch.addEventListener(
    "input",
    renderAdminBooks
  );
}

/* ================= ADMIN BOOKS ================= */

function renderAdminBooks() {
  const container = $("adminBooks");

  if (!container) return;

  const q =
    $("adminSearch")?.value
      .trim()
      .toLowerCase() || "";

  const list = books.filter((b) =>
    `${b.title} ${b.author || ""}`
      .toLowerCase()
      .includes(q)
  );

  container.innerHTML =
    list
      .map((b) => {
        const cat = categories.find(
          (c) =>
            c.id === b.exam_category_id
        );

        return `
          <tr>

            <td>
              <strong>
                ${escapeHTML(b.title)}
              </strong>

              <small>
                ${escapeHTML(b.author || "")}
              </small>
            </td>

            <td>
              ${escapeHTML(cat?.name || "—")}
            </td>

            <td>
              ${b.year ? escapeHTML(b.year) : "—"}
            </td>

            <td>

              <button
                class="table-btn"
                data-edit="${escapeHTML(b.id)}"
              >
                Edit
              </button>

              <button
                class="table-btn danger"
                data-del="${escapeHTML(b.id)}"
              >
                Delete
              </button>

            </td>

          </tr>
        `;
      })
      .join("") ||
    `
      <tr>
        <td colspan="4" class="empty-mini">
          No books found.
        </td>
      </tr>
    `;

  container
    .querySelectorAll("[data-edit]")
    .forEach((btn) => {
      btn.onclick = () =>
        editBook(btn.dataset.edit);
    });

  container
    .querySelectorAll("[data-del]")
    .forEach((btn) => {
      btn.onclick = () =>
        deleteBook(btn.dataset.del);
    });
}

/* ================= EDIT BOOK ================= */

function editBook(id) {
  const b = books.find(
    (x) => x.id === id
  );

  if (!b) return;

  $("bookId").value = b.id;
  $("bookTitle").value = b.title;
  $("bookExam").value = b.exam_category_id;
  $("bookAuthor").value = b.author || "";
  $("bookYear").value = b.year || "";
  $("bookDescription").value =
    b.description || "";
  $("bookTags").value = b.tags || "";

  $("bookFormTitle").textContent =
    "Edit Book";

  $("saveBookBtn").textContent =
    "Update Book →";

  $("cancelEdit").classList.remove(
    "hidden"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ================= RESET BOOK ================= */

function resetBookForm() {
  const form = $("bookForm");

  if (form) {
    form.reset();
  }

  $("bookId").value = "";

  $("bookFormTitle").textContent =
    "Add New Book";

  $("saveBookBtn").textContent =
    "Publish Book →";

  $("cancelEdit").classList.add("hidden");
}

const cancelEdit = $("cancelEdit");

if (cancelEdit) {
  cancelEdit.addEventListener(
    "click",
    resetBookForm
  );
}

/* ================= STORAGE ================= */

async function uploadFile(file, folder) {
  const safe = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");

  const path =
    `${folder}/${crypto.randomUUID()}-${safe}`;

  const { error } =
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        upsert: false
      });

  if (error) throw error;

  return path;
}

/* ================= SAVE BOOK ================= */

async function saveBook(e) {
  e.preventDefault();

  const id = $("bookId").value;

  const cover =
    $("coverFile").files[0];

  const pdf =
    $("pdfFile").files[0];

  if (!id && (!cover || !pdf)) {
    toast(
      "New book के लिए cover image और PDF दोनों जरूरी हैं।",
      "error"
    );
    return;
  }

  try {
    $("progressWrap").classList.remove(
      "hidden"
    );

    $("progressText").textContent =
      "Uploading files...";

    let coverPath;
    let pdfPath;

    if (cover) {
      coverPath =
        await uploadFile(
          cover,
          "covers"
        );
    }

    if (pdf) {
      pdfPath =
        await uploadFile(
          pdf,
          "pdfs"
        );
    }

    const payload = {
      title:
        $("bookTitle").value.trim(),

      exam_category_id:
        $("bookExam").value,

      author:
        $("bookAuthor").value.trim(),

      year:
        $("bookYear").value.trim(),

      description:
        $("bookDescription").value.trim(),

      tags:
        $("bookTags").value.trim()
    };

    if (coverPath) {
      payload.cover_path =
        coverPath;
    }

    if (pdfPath) {
      payload.pdf_path =
        pdfPath;
    }

    let result;

    if (id) {
      result =
        await supabase
          .from("books")
          .update(payload)
          .eq("id", id);
    } else {
      result =
        await supabase
          .from("books")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    toast(
      id
        ? "Book updated successfully."
        : "Book published successfully.",
      "success"
    );

    resetBookForm();

    await loadAll();

  } catch (error) {
    console.error(error);

    toast(
      error.message || "Upload failed.",
      "error"
    );

  } finally {
    $("progressWrap").classList.add(
      "hidden"
    );
  }
}

const bookForm = $("bookForm");

if (bookForm) {
  bookForm.addEventListener(
    "submit",
    saveBook
  );
}

/* ================= DELETE BOOK ================= */

async function deleteBook(id) {
  const b = books.find(
    (x) => x.id === id
  );

  if (
    !b ||
    !confirm(
      `"${b.title}" को delete करना है?`
    )
  ) {
    return;
  }

  try {
    const { error } =
      await supabase
        .from("books")
        .delete()
        .eq("id", id);

    if (error) throw error;

    toast(
      "Book deleted.",
      "success"
    );

    await loadAll();

  } catch (error) {
    console.error(error);

    toast(
      error.message || "Delete failed.",
      "error"
    );
  }
}

// ================= ANNOUNCEMENT =================

const announcementForm = $("announcementForm");
const announcementInput = $("announcementInput");
const removeAnnouncement = $("removeAnnouncement");

if (announcementForm) {
  announcementForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = announcementInput
      ? announcementInput.value.trim()
      : "";

    if (!message) {
      toast("Announcement message भरें।", "error");
      return;
    }

    try {
      // पहले सभी पुराने announcements inactive करें
      const { error: deactivateError } = await supabase
        .from("announcements")
        .update({ active: false })
        .eq("active", true);

      if (deactivateError) {
        throw deactivateError;
      }

      // नया announcement active करें
      const { error } = await supabase
        .from("announcements")
        .insert({
          message: message,
          active: true
        });

      if (error) {
        throw error;
      }

      toast("Announcement published successfully.", "success");

      announcementInput.value = "";

    } catch (error) {
      console.error("ANNOUNCEMENT ERROR:", error);

      toast(
        error.message || "Announcement publish नहीं हुआ।",
        "error"
      );
    }
  });
}


// ================= REMOVE ANNOUNCEMENT =================

if (removeAnnouncement) {
  removeAnnouncement.addEventListener("click", async () => {

    if (!confirm("Current announcement हटाना है?")) {
      return;
    }

    try {

      const { error } = await supabase
        .from("announcements")
        .update({ active: false })
        .eq("active", true);

      if (error) {
        throw error;
      }

      toast("Announcement removed.", "success");

    } catch (error) {
      console.error("REMOVE ANNOUNCEMENT ERROR:", error);

      toast(
        error.message || "Announcement remove नहीं हुआ।",
        "error"
      );
    }

  });
}

boot();
