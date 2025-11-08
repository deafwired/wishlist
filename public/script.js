async function loadItems() {
  const res = await fetch("/api/items");
  const items = await res.json();
  const list = document.getElementById("wishlist");
  list.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "wish";

    // Build markup for a nicer card
    const imgSrc = item.image || '';
    const imgHtml = imgSrc ? `<img src="${imgSrc}" alt="${item.title}">` : `<div style="height:160px; background:#f3f4f6; border-radius:6px; display:flex;align-items:center;justify-content:center;color:#9ca3af">No image</div>`;

    const linkHtml = item.link ? `<a class="button" href="${item.link}" target="_blank" rel="noopener">View</a>` : '';

    const priceHtml = item.price ? `<div class="muted"><strong>$${item.price}</strong></div>` : '';

    const statusBadge = `<div style="margin-top:8px"><small class="muted">Status: ${item.status}</small></div>`;

    const actions = item.status === 'available' ? `
      <div class="actions">
        <button onclick="claimItem(${item.id})" class="secondary">Claim</button>
        <button onclick="purchaseItem(${item.id})">Mark Purchased</button>
      </div>
    ` : '';

    div.innerHTML = `
      ${imgHtml}
      <h2>${item.title}</h2>
      <p>${item.description || ''}</p>
      ${priceHtml}
      <div style="display:flex; gap:8px; align-items:center; margin-top:8px">${linkHtml}${statusBadge}</div>
      ${actions}
    `;

    list.appendChild(div);
  });
}

async function claimItem(id) {
  await fetch(`/api/claim/${id}`, { method: "POST" });
  loadItems();
}

async function purchaseItem(id) {
  await fetch(`/api/purchase/${id}`, { method: "POST" });
  loadItems();
}

loadItems();
