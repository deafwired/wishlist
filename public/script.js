// Ensure a persistent claimer cookie exists for this browser
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function setCookie(name, value, maxAgeSeconds) {
  let s = `${name}=${encodeURIComponent(value)}; path=/;`;
  if (maxAgeSeconds) s += ` max-age=${maxAgeSeconds};`;
  document.cookie = s;
}

let claimerToken = getCookie('claimer');
if (!claimerToken) {
  claimerToken = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  // 10 years
  setCookie('claimer', claimerToken, 60 * 60 * 24 * 365 * 10);
}

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
    const imgHtml = imgSrc ? `<img src="${imgSrc}" alt="${item.title}">` : `<div class="no-image">No image</div>`;

    const linkHtml = item.link ? `href="${item.link}" target="_blank" rel="noopener"` : '';

    const priceHtml = item.price ? `<div class="muted"><strong>$${item.price}</strong></div>` : '';

    let statusBadgeText = item.status;
    if (item.status === 'claimed') {
      if (item.claimer === claimerToken) statusBadgeText = 'Claimed by you';
      else statusBadgeText = 'Claimed';
    }
    const statusBadge = `<div style="margin-top:8px"><small class="muted">${statusBadgeText}</small></div>`;

    let actions = '';
    if (item.status === 'available') {
      actions = `
        <div class="actions">
          <button onclick="claimItem(${item.id})" class="secondary">Claim</button>
        </div>
      `;
    } else if (item.status === 'claimed' && item.claimer === claimerToken) {
      actions = `
        <div class="actions">
          <button onclick="claimItem(${item.id})" class="secondary">Unclaim</button>
        </div>
      `;
    }

    div.innerHTML = `
      <a ${linkHtml}></a>
      ${imgHtml}
      <h2>${item.title}</h2>
      <p>${item.description || ''}</p>
      ${priceHtml}
      <div style="display:flex; gap:8px; align-items:center; margin-top:8px">${actions}${statusBadge}</div>
    `;

    list.appendChild(div);
  });
}

async function claimItem(id) {
  const res = await fetch(`/api/claim/${id}`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Failed to claim item');
  }
  loadItems();
}

loadItems();
