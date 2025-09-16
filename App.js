const PRODUCTS_URL = "./products.json";
const productsContainer = document.getElementById("products-container");
const cartCountEl = document.getElementById("cart-count");
const viewCartBtn = document.getElementById("view-cart-btn");
const checkoutSection = document.getElementById("checkout-section");
const checkoutForm = document.getElementById("checkout-form");
const cancelCheckoutBtn = document.getElementById("cancel-checkout");

const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

let products = [];
let cart = loadCartFromStorage();

function saveCartToStorage() {
  localStorage.setItem("pf_cart", JSON.stringify(cart));
}

function loadCartFromStorage() {
  const raw = localStorage.getItem("pf_cart");
  return raw ? JSON.parse(raw) : [];
}

function findProductById(id) {
  return products.find((p) => p.id === id);
}

function updateCartCount() {
  const total = cart.reduce((s, item) => s + item.qty, 0);
  cartCountEl.textContent = total;
}

async function fetchProducts() {
  try {
    const resp = await fetch(PRODUCTS_URL);
    if (!resp.ok) throw new Error("No se pudo cargar productos");
    products = await resp.json();
    renderFilteredProducts(products);
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar productos.",
    });
  }
}

function updateDisplay() {
  let filtered = products.filter((p) =>
    p.title.toLowerCase().includes(searchInput.value.toLowerCase())
  );

  if (sortSelect.value === "asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortSelect.value === "desc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  renderFilteredProducts(filtered);
}

function renderFilteredProducts(filteredProducts) {
  productsContainer.innerHTML = "";
  filteredProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}" loading="lazy" />
      <h3>${product.title}</h3>
      <p class="muted">${product.description}</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="price">$${product.price.toFixed(2)}</div>
        <div>
          <button class="btn add-btn" data-id="${product.id}">Agregar</button>
        </div>
      </div>
    `;
    const btn = card.querySelector(".add-btn");
    btn.addEventListener("click", () => addToCart(product.id));
    productsContainer.appendChild(card);
  });
}

function addToCart(productId, qty = 1) {
  const product = findProductById(productId);
  if (!product) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Producto no encontrado",
    });
    return;
  }
  const inCart = cart.find((i) => i.id === productId);
  const newQty = (inCart ? inCart.qty : 0) + qty;
  if (newQty > product.stock) {
    Swal.fire({
      icon: "warning",
      title: "Stock insuficiente",
      text: `Solo quedan ${product.stock} unidades.`,
    });
    return;
  }
  if (inCart) inCart.qty = newQty;
  else
    cart.push({
      id: productId,
      qty,
      snapshot: { title: product.title, price: product.price },
    });
  saveCartToStorage();
  updateCartCount();
  Swal.fire({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1200,
    title: "Añadido al carrito",
  });
}

function clearCart() {
  cart = [];
  saveCartToStorage();
  updateCartCount();
}

async function showCartModal() {
  if (cart.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Carrito vacío",
      text: "Agrega productos antes de ver el carrito.",
    });
    return;
  }
  const fragment = document.createElement("div");
  fragment.style.minWidth = "320px";
  cart.forEach((item) => {
    const p = document.createElement("div");
    p.style.display = "flex";
    p.style.justifyContent = "space-between";
    p.style.alignItems = "center";
    p.style.padding = "6px 0";
    p.innerHTML = `
      <div>
        <strong>${item.snapshot.title}</strong><br/>
        <small>$${item.snapshot.price.toFixed(2)} c/u</small>
      </div>
      <div>
        <button class="btn minus" data-id="${item.id}">-</button>
        <span style="padding:0 8px">${item.qty}</span>
        <button class="btn add" data-id="${item.id}">+</button>
        <button class="btn secondary remove" data-id="${
          item.id
        }">Eliminar</button>
      </div>
    `;
    fragment.appendChild(p);
  });

  const { value: action } = await Swal.fire({
    title: "Tu carrito",
    html: fragment,
    showCancelButton: true,
    showConfirmButton: true,
    confirmButtonText: "Pagar",
    cancelButtonText: "Seguir comprando",
    didOpen: () => {
      fragment.querySelectorAll(".add").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.id;
          addToCart(id, 1);
          Swal.close();
          showCartModal();
        })
      );
      fragment.querySelectorAll(".minus").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.id;
          decreaseItem(id);
          Swal.close();
          showCartModal();
        })
      );
      fragment.querySelectorAll(".remove").forEach((b) =>
        b.addEventListener("click", () => {
          const id = b.dataset.id;
          removeItemFromCart(id);
          Swal.close();
          showCartModal();
        })
      );
    },
  });

  if (action) showCheckoutSection();
}

function decreaseItem(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty - 1);
  if (item.qty === 0) cart = cart.filter((i) => i.id !== id);
  saveCartToStorage();
  updateCartCount();
}

function removeItemFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCartToStorage();
  updateCartCount();
}

function showCheckoutSection() {
  checkoutSection.hidden = false;
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const addressInput = document.getElementById("customer-address");
  nameInput.value = "";
  emailInput.value = "";
  addressInput.value = "";
  checkoutSection.scrollIntoView({ behavior: "smooth" });
}

async function handleCheckoutSubmit(ev) {
  ev.preventDefault();
  if (cart.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Carrito vacío",
      text: "Agrega productos antes de pagar.",
    });
    return;
  }

  const form = new FormData(checkoutForm);
  const customer = {
    name: form.get("name").trim(),
    email: form.get("email").trim(),
    address: form.get("address").trim(),
  };

  if (!customer.name || !customer.email) {
    await Swal.fire({
      icon: "warning",
      title: "Faltan datos",
      text: "Debe completar nombre y email.",
    });
    return;
  }

  const insufficient = cart.find((item) => {
    const p = findProductById(item.id);
    return !p || item.qty > p.stock;
  });
  if (insufficient) {
    await Swal.fire({
      icon: "error",
      title: "Stock insuficiente",
      text: "Revisá el carrito.",
    });
    return;
  }

  cart.forEach((item) => {
    const p = findProductById(item.id);
    p.stock -= item.qty;
  });

  const receipt = createReceipt(customer, cart);

  const sales = JSON.parse(localStorage.getItem("pf_sales") || "[]");
  sales.push(receipt);
  localStorage.setItem("pf_sales", JSON.stringify(sales));

  clearCart();
  renderFilteredProducts(products);
  checkoutSection.hidden = true;

  const { isConfirmed } = await Swal.fire({
    title: "Compra realizada",
    html: `<strong>Gracias, ${
      customer.name
    }.</strong><br/>Transacción ID: <code>${
      receipt.transactionId
    }</code><br/>Total: $${receipt.total.toFixed(2)}`,
    showDenyButton: true,
    confirmButtonText: "Descargar recibo",
    denyButtonText: "Cerrar",
  });

  if (isConfirmed) downloadJSON(receipt, `recibo_${receipt.transactionId}.pdf`);
}

function createReceipt(customer, cartItems) {
  const itemsDetailed = cartItems.map((it) => {
    const p = findProductById(it.id) || {
      price: it.snapshot.price,
      title: it.snapshot.title,
    };
    return {
      id: it.id,
      title: p.title,
      qty: it.qty,
      price: p.price,
      subtotal: p.price * it.qty,
    };
  });
  const total = itemsDetailed.reduce((s, i) => s + i.subtotal, 0);
  const transactionId = `TX${Date.now().toString().slice(-8)}`;
  return {
    transactionId,
    date: new Date().toISOString(),
    customer,
    items: itemsDetailed,
    total,
  };
}

function downloadJSON(obj, filename = "data.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

viewCartBtn.addEventListener("click", showCartModal);
checkoutForm.addEventListener("submit", handleCheckoutSubmit);
cancelCheckoutBtn.addEventListener("click", () => {
  checkoutSection.hidden = true;
});
searchInput.addEventListener("input", updateDisplay);
sortSelect.addEventListener("change", updateDisplay);

updateCartCount();
fetchProducts();
