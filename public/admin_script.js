const loginForm = document.getElementById('loginForm');
const addForm = document.getElementById('addForm');
const resultEl = document.getElementById('result');

function showAddForm() {
    loginForm.style.display = 'none';
    addForm.style.display = '';
}

function showLoginForm() {
    loginForm.style.display = '';
    addForm.style.display = 'none';
}

// On load, check if password is stored in sessionStorage
let ownerPassword = sessionStorage.getItem('ownerPassword') || null;
if (ownerPassword) {
    showAddForm();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value.trim();
    if (!pw) return;

    // Verify password with the server
    const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
    });

    if (res.ok) {
        ownerPassword = pw;
        sessionStorage.setItem('ownerPassword', pw);
        resultEl.textContent = 'Logged in.';
        showAddForm();
    } else {
        const data = await res.json().catch(() => ({}));
        resultEl.textContent = data.error || 'Login failed';
    }
});

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ownerPassword) {
        resultEl.textContent = 'Not authenticated.';
        showLoginForm();
        return;
    }

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const link = document.getElementById('link').value.trim();
    const image = document.getElementById('image').value.trim();
    const price = document.getElementById('price').value.trim();

    const res = await fetch('/api/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ownerPassword, title, description, link, image, price })
    });

    if (res.ok) {
        resultEl.textContent = 'Item added successfully.';
        e.target.reset();
    } else {
        const data = await res.json().catch(() => ({}));
        resultEl.textContent = data.error || 'Failed to add item';
        if (res.status === 401) {
            // password invalidated
            sessionStorage.removeItem('ownerPassword');
            ownerPassword = null;
            showLoginForm();
        }
    }
});

document.getElementById('logout').addEventListener('click', () => {
    sessionStorage.removeItem('ownerPassword');
    ownerPassword = null;
    resultEl.textContent = 'Logged out.';
    showLoginForm();
});

// Image upload helpers: drag/drop, paste, choose file
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const chooseBtn = document.getElementById('chooseFile');
const preview = document.getElementById('preview');

async function uploadImageFile(file) {
    if (!ownerPassword) {
        resultEl.textContent = 'Please log in before uploading images.';
        showLoginForm();
        return null;
    }

    const form = new FormData();
    form.append('image', file);
    form.append('password', ownerPassword);

    resultEl.textContent = 'Uploading image...';
    const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        resultEl.textContent = data.error || 'Image upload failed';
        if (res.status === 401) {
            sessionStorage.removeItem('ownerPassword'); ownerPassword = null; showLoginForm();
        }
        return null;
    }
    const data = await res.json();
    resultEl.textContent = 'Image uploaded.';
    // set image input value to an absolute public URL and show preview
    const imageInput = document.getElementById('image');
    const absUrl = window.location.origin + data.url;
    imageInput.value = absUrl;
    preview.innerHTML = `<img src="${absUrl}" alt="preview" style="max-width:200px; max-height:200px;">`;
    return data.url;
}

// Drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => e.preventDefault());
});

dropzone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    const file = dt.files[0];
    await uploadImageFile(file);
});

// Choose file button
chooseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) await uploadImageFile(file);
});

// Paste handler (clipboard image)
window.addEventListener('paste', async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) await uploadImageFile(file);
            break;
        }
    }
});
