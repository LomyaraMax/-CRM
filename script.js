// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCizim1hAzBu6FuI9XyFCoI8m0QzNxcARY",
  authDomain: "artem-6f042.firebaseapp.com",
  projectId: "artem-6f042",
  storageBucket: "artem-6f042.appspot.com",
  messagingSenderId: "102489199704",
  appId: "1:102489199704:web:018b3568e35cac0981e62d"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM
const addClientBtn = document.getElementById("addClientBtn");
const clientsContainer = document.getElementById("clientsContainer");
const tabButtons = document.querySelectorAll(".tabBtn");
let currentTab = "clients";

// Helper
const asArray = val => Array.isArray(val) ? val : [];

// Додати клієнта
async function addClient(carBrand = "Без назви") {
  await addDoc(collection(db, "clients"), {
    carBrand,
    notes: [],
    purchases: [],
    deadline: null
  });
  renderCurrentTab();
}

// Архівувати клієнта
async function archiveClient(id, data) {
  if (!confirm("Перемістити авто в архів?")) return;
  await setDoc(doc(db, "archive", id), data);
  await deleteDoc(doc(db, "clients", id));
  renderCurrentTab();
}

// Видалити клієнта → кошик
async function deleteClient(id, data) {
  if (!confirm("Видалити авто? Воно потрапить у кошик на 7 днів.")) return;
  data.deletedAt = new Date().toISOString();
  await setDoc(doc(db, "trash", id), data);
  await deleteDoc(doc(db, "clients", id));
  renderCurrentTab();
}

// Відновити клієнта
async function restoreClient(id, fromCollection, data) {
  delete data.deletedAt;
  await setDoc(doc(db, "clients", id), data);
  await deleteDoc(doc(db, fromCollection, id));
  renderCurrentTab();
}

// Авто-очистка кошика
async function cleanTrash() {
  const snapshot = await getDocs(collection(db, "trash"));
  const now = new Date();
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const deletedAt = data.deletedAt ? new Date(data.deletedAt) : null;
    if (deletedAt && (now - deletedAt)/(1000*60*60*24) > 7) {
      await deleteDoc(doc(db, "trash", docSnap.id));
    }
  }
}

// Додати нотатку
async function addNote(id, notes, val) {
  await updateDoc(doc(db, "clients", id), { notes: [...notes, val] });
  renderCurrentTab();
}

// ❌ Видалити нотатку
async function deleteNote(clientId, index) {
  const docRef = doc(db, "clients", clientId);
  const snapshot = await getDocs(collection(db, "clients"));
  const clientDoc = snapshot.docs.find(d => d.id === clientId);
  if (!clientDoc) return;
  const notes = asArray(clientDoc.data().notes);
  notes.splice(index, 1);
  await updateDoc(docRef, { notes });
  renderCurrentTab();
}

// Додати покупку
async function addPurchase(id, purchases, val) {
  await updateDoc(doc(db, "clients", id), { purchases: [...purchases, val] });
  renderCurrentTab();
}

// ❌ Видалити покупку
async function deletePurchase(clientId, index) {
  const docRef = doc(db, "clients", clientId);
  const snapshot = await getDocs(collection(db, "clients"));
  const clientDoc = snapshot.docs.find(d => d.id === clientId);
  if (!clientDoc) return;
  const purchases = asArray(clientDoc.data().purchases);
  purchases.splice(index, 1);
  await updateDoc(docRef, { purchases });
  renderCurrentTab();
}

// Оновити дедлайн
async function updateDeadline(id, val) {
  await updateDoc(doc(db, "clients", id), { deadline: val });
  renderCurrentTab();
}

// Рендер клієнтів
async function renderClients() {
  clientsContainer.innerHTML = "";
  const snapshot = await getDocs(collection(db, "clients"));
  let commonCart = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const notes = asArray(data.notes);
    const purchases = asArray(data.purchases);
    commonCart.push(...purchases.map((p, i) => ({ item: p, clientId: docSnap.id, index: i })));

    const card = document.createElement("div");
    card.className = "client-card";

    // Нотатки
    const notesHTML = notes.map((n,i) => `
      <li>
        ${n} 
        <button class="deleteNoteBtn" data-index="${i}" data-client="${docSnap.id}">✖</button>
      </li>`).join("");

    // Покупки
    const purchasesHTML = purchases.map((p,i) => `
      <li>
        ${i+1}. ${p} 
        <button class="deletePurchaseBtn" data-index="${i}" data-client="${docSnap.id}">✖</button>
      </li>`).join("");

    card.innerHTML = `
      <h3>${data.carBrand}</h3>
      <div>
        <h4>Нотатки</h4>
        <ul>${notesHTML}</ul>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <input type="text" class="noteInput" placeholder="Нова нотатка" style="flex:1;">
          <button class="addNoteBtn">Додати</button>
        </div>
      </div>
      <div>
        <h4>Покупки</h4>
        <ol>${purchasesHTML}</ol>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <input type="text" class="purchaseInput" placeholder="Нова покупка" style="flex:1;">
          <button class="addPurchaseBtn">Додати</button>
        </div>
      </div>
      <div>
        <h4>Термін до здачі</h4>
        <input type="datetime-local" class="deadlineInput" value="${data.deadline||''}">
      </div>
      <div class="card-buttons">
        <button class="archiveBtn">Архів</button>
        <button class="deleteBtn">Видалені</button>
      </div>
    `;

    // Видалення нотаток
    card.querySelectorAll(".deleteNoteBtn").forEach(btn => {
      btn.onclick = async () => {
        const index = parseInt(btn.dataset.index);
        const clientId = btn.dataset.client;
        await deleteNote(clientId, index);
      };
    });

    // Видалення покупок
    card.querySelectorAll(".deletePurchaseBtn").forEach(btn => {
      btn.onclick = async () => {
        const index = parseInt(btn.dataset.index);
        const clientId = btn.dataset.client;
        await deletePurchase(clientId, index);
      };
    });

    // Додавання нотатки
    card.querySelector(".addNoteBtn").onclick = () => {
      const val = card.querySelector(".noteInput").value.trim();
      if(val) addNote(docSnap.id, notes, val);
    };

    // Додавання покупки
    card.querySelector(".addPurchaseBtn").onclick = () => {
      const val = card.querySelector(".purchaseInput").value.trim();
      if(val) addPurchase(docSnap.id, purchases, val);
    };

    // Дедлайн
    card.querySelector(".deadlineInput").addEventListener("change", e => updateDeadline(docSnap.id, e.target.value));

    // Архів / Видалення клієнта
    card.querySelector(".archiveBtn").onclick = () => archiveClient(docSnap.id, data);
    card.querySelector(".deleteBtn").onclick = () => deleteClient(docSnap.id, data);

    clientsContainer.appendChild(card);
  }

  window.commonCart = commonCart;
}

// Рендер архіву
async function renderArchive() {
  clientsContainer.innerHTML = "<h2>Архів</h2>";
  const snapshot = await getDocs(collection(db, "archive"));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <h3>${data.carBrand}</h3>
      <p>Термін: ${data.deadline || "не призначено"}</p>
      <div class="card-buttons">
        <button class="restoreBtn">Відновити</button>
      </div>
    `;
    card.querySelector(".restoreBtn").onclick = () => restoreClient(docSnap.id, "archive", data);
    clientsContainer.appendChild(card);
  });
}

// Рендер кошика (видалені)
async function renderTrash() {
  clientsContainer.innerHTML = "<h2>Видалені (авто-очистка через 7 днів)</h2>";
  const snapshot = await getDocs(collection(db, "trash"));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <h3>${data.carBrand}</h3>
      <p>Видалено: ${data.deletedAt ? new Date(data.deletedAt).toLocaleString() : "—"}</p>
      <div class="card-buttons">
        <button class="restoreBtn">Відновити</button>
      </div>
    `;
    card.querySelector(".restoreBtn").onclick = () => restoreClient(docSnap.id, "trash", data);
    clientsContainer.appendChild(card);
  });
}

// Рендер спільного кошика
async function renderShopping() {
  clientsContainer.innerHTML = "<h2>Спільний кошик</h2>";
  const snapshot = await getDocs(collection(db, "clients"));
  let allPurchases = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const purchases = asArray(data.purchases);
    purchases.forEach((p, i) => allPurchases.push({ car: data.carBrand, item: p, clientId: docSnap.id, index: i }));
  });

  if (allPurchases.length === 0) {
    clientsContainer.innerHTML += "<p>Кошик порожній</p>";
    return;
  }

  const ul = document.createElement("ul");
  allPurchases.forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${entry.car}</b>: ${entry.item} <button class="deleteFromCartBtn">✖</button>`;
    li.querySelector(".deleteFromCartBtn").onclick = async () => {
      await deletePurchase(entry.clientId, entry.index);
    };
    ul.appendChild(li);
  });
  clientsContainer.appendChild(ul);
}

// Рендер активної вкладки
function renderCurrentTab() {
  if(currentTab === "clients") renderClients();
  else if(currentTab === "archive") renderArchive();
  else if(currentTab === "trash") renderTrash();
  else if(currentTab === "shopping") renderShopping();
}

// Event listeners
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.tab;
    renderCurrentTab();
  });
});

addClientBtn.addEventListener("click", async () => {
  const carBrand = prompt("Введіть марку авто:");
  if(carBrand) await addClient(carBrand);
});

// Bootstrap
cleanTrash();
renderCurrentTab();
