const STORAGE_KEY = 'bookshop_books_v2';
const USER_KEY = 'bookshop_user_v2';

let books = [];
let currentUser = null;
let editingId = null;

// DOM
const booksGrid = document.getElementById('booksGrid');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const bTitle = document.getElementById('bTitle');
const bAuthor = document.getElementById('bAuthor');
const bDesc = document.getElementById('bDesc');
const bImg = document.getElementById('bImg');
const bFile = document.getElementById('bFile');
const btnCancel = document.getElementById('btnCancel');
const btnSave = document.getElementById('btnSave');
const btnSign = document.getElementById('btnSign');
const currentUserDiv = document.getElementById('currentUser');
const btnAdd = document.getElementById('btnAdd');
const search = document.getElementById('search');
const filter = document.getElementById('filter');
const detailModal = document.getElementById('detailModal');
const detailPanel = document.getElementById('detailPanel');

// 🧩 Load saved data
function load() {
  try {
    books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    books = [];
  }
  currentUser = localStorage.getItem(USER_KEY) || null;
  currentUserDiv.textContent = currentUser
    ? `👤 User: ${currentUser}`
    : 'Not signed';
  renderBooks();
}

// 💾 Save to localStorage
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// 🔐 Sign-in popup
function openSign() {
  const name = prompt('Type your name or username:', currentUser || '');
  if (name && name.trim()) {
    currentUser = name.trim();
    localStorage.setItem(USER_KEY, currentUser);
    load();
  }
}
btnSign.onclick = openSign;

// ➕ Add new book
btnAdd.onclick = () => {
  if (!currentUser) {
    alert('Please sign in first!');
    return;
  }
  editingId = null;
  modalTitle.textContent = '📚 Add New Book';
  bTitle.value = '';
  bAuthor.value = '';
  bDesc.value = '';
  bImg.value = '';
  bFile.value = '';
  modal.style.display = 'flex';
};

// ❌ Cancel modal
btnCancel.onclick = () => (modal.style.display = 'none');

// 📸 Convert image to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 💾 Save book
btnSave.onclick = async () => {
  const title = bTitle.value.trim();
  if (!title) {
    alert('Please enter book title!');
    return;
  }

  let img = bImg.value.trim();
  if (!img && bFile.files.length) {
    img = await fileToBase64(bFile.files[0]);
  }

  const data = {
    id: editingId || Date.now().toString(36),
    title,
    author: bAuthor.value.trim(),
    desc: bDesc.value.trim(),
    img,
    owner: currentUser,
    likes: editingId
      ? books.find((b) => b.id === editingId)?.likes || []
      : [],
  };

  if (editingId) {
    const i = books.findIndex((b) => b.id === editingId);
    if (i !== -1) books[i] = { ...books[i], ...data };
  } else {
    books.unshift(data);
  }

  save();
  load();
  modal.style.display = 'none';
};

// 🖼 Render all books
function renderBooks() {
  booksGrid.innerHTML = '';
  const q = search.value.toLowerCase().trim();
  const f = filter.value;

  const list = books.filter((b) => {
    if (f === 'mine' && b.owner !== currentUser) return false;
    if (f === 'liked' && !b.likes.includes(currentUser)) return false;
    if (!q) return true;
    return (b.title + b.author + b.desc).toLowerCase().includes(q);
  });

  if (list.length === 0) {
    booksGrid.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:20px;
        border-radius:10px;
        text-align:center;
        color:#fff;
        background:rgba(30,30,35,0.6);
        backdrop-filter:blur(12px);
        box-shadow:0 0 20px rgba(0,0,0,0.3);
        border:1px solid rgba(255,255,255,0.1);
      ">No books found 📭</div>`;
    return;
  }

  list.forEach((b) => {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = b.img || 'https://via.placeholder.com/300x200?text=No+Image';
    card.appendChild(img);

    card.innerHTML += `
      <div class='title'>${escapeHTML(b.title)}</div>
      <div class='meta'>${escapeHTML(b.author || 'Unknown')}</div>
    `;

    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.justifyContent = 'space-between';
    info.innerHTML = `
      <span style="font-size:12px;color:var(--muted)">By ${escapeHTML(
        b.owner
      )}</span>
      <span class='fav-count'>❤ ${b.likes.length}</span>
    `;
    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btnView = makeBtn('👁 View', 'ghost', () => openDetail(b.id));
    const btnLike = makeBtn(
      b.likes.includes(currentUser) ? '💔 Unlike' : '❤️ Like',
      'small',
      () => toggleLike(b.id)
    );
    actions.append(btnView, btnLike);

    if (b.owner === currentUser) {
      actions.append(
        makeBtn('✏ Edit', 'ghost', () => editBook(b.id)),
        makeBtn('🗑 Delete', 'danger', () => deleteBook(b.id))
      );
    }

    card.append(actions);
    booksGrid.append(card);
  });
}

// 🧱 Button creator
function makeBtn(txt, cls, fn) {
  const b = document.createElement('button');
  b.textContent = txt;
  b.className = 'small ' + cls;
  b.onclick = fn;
  return b;
}

// 📖 Detail view
function openDetail(id) {
  const b = books.find((x) => x.id === id);
  if (!b) return;
  detailPanel.innerHTML = `
    <h2>${escapeHTML(b.title)}</h2>
    <div style='color:var(--muted)'>${escapeHTML(b.author || 'Unknown')}</div>
    <img src='${b.img}' style='width:100%;border-radius:10px;margin:10px 0'>
    <p>${escapeHTML(b.desc)}</p>
    <button id='closeD' class='small ghost'>Close</button>
  `;
  detailModal.style.display = 'flex';
  document.getElementById('closeD').onclick = () =>
    (detailModal.style.display = 'none');
}

// ❤️ Like / Unlike
function toggleLike(id) {
  if (!currentUser) {
    alert('Please sign in first!');
    return;
  }
  const b = books.find((x) => x.id === id);
  if (!b) return;
  const i = b.likes.indexOf(currentUser);
  if (i === -1) b.likes.push(currentUser);
  else b.likes.splice(i, 1);
  save();
  load();
}

// ✏ Edit book
function editBook(id) {
  const b = books.find((x) => x.id === id);
  if (!b) return;
  if (b.owner !== currentUser) {
    alert('Only the owner can edit this!');
    return;
  }
  editingId = id;
  modalTitle.textContent = '✏ Modify Book';
  bTitle.value = b.title;
  bAuthor.value = b.author;
  bDesc.value = b.desc;
  bImg.value = b.img;
  modal.style.display = 'flex';
}

// 🗑 Delete book
function deleteBook(id) {
  const b = books.find((x) => x.id === id);
  if (!b) return;
  if (b.owner !== currentUser) {
    alert('Only the owner can delete this!');
    return;
  }
  if (confirm('Are you sure you want to delete this book?')) {
    books = books.filter((x) => x.id !== id);
    save();
    load();
  }
}

// 🧼 Escape HTML
function escapeHTML(s) {
  return (s || '').replace(/[&<>"']/g, (m) => {
    return (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] ||
      m
    );
  });
}

// 🪟 Close modals when clicking outside
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = 'none';
  if (e.target === detailModal) detailModal.style.display = 'none';
};

// 🔍 Search & Filter
search.oninput = () => renderBooks();
filter.onchange = () => renderBooks();

// 🚀 Load initial data
load();







// ============ menu open and back 😌
const openBtn = document.getElementById("openMenu");
    const closeBtn = document.getElementById("closeMenu");
    const menu = document.getElementById("menu");
    const overlay = document.getElementById("overlay");

    openBtn.addEventListener("click", () => {
      menu.classList.add("show");
      overlay.classList.add("show");
    });
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    function closeMenu() {
      menu.classList.remove("show");
      overlay.classList.remove("show");
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    
    
    
