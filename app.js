// Базові змінні
let apiUrl = "http://localhost:5000/postings";
let allParcels = [];
let pendingDeleteId = null;

// Тестові дані для демонстрації без сервера
const demoData = [
    { id: 1, from: "Суми", to: "Харків", content: "Навчальні підручники", deliveryType: 0, weight: 3.2, depth: 30, width: 22, height: 8, value: 500, price: 95 },
    { id: 2, from: "Полтава", to: "Київ", content: "Спортивне спорядження", deliveryType: 1, weight: 1.5, depth: 40, width: 20, height: 15, value: 1800, price: 140 },
    { id: 3, from: "Чернігів", to: "Одеса", content: "Електронні компоненти", deliveryType: 1, weight: 0.8, depth: 15, width: 10, height: 5, value: 3000, price: 180 },
    { id: 4, from: "Вінниця", to: "Запоріжжя", content: "Одяг та аксесуари", deliveryType: 0, weight: 2.0, depth: 35, width: 25, height: 12, value: 700, price: 110 }
];

// Локальне сховище
function getStored() {
    const raw = localStorage.getItem("max_parcels");
    if (!raw) {
        localStorage.setItem("max_parcels", JSON.stringify(demoData));
        return [...demoData];
    }
    try {
        return JSON.parse(raw);
    } catch {
        return [...demoData];
    }
}

function setStored(items) {
    localStorage.setItem("max_parcels", JSON.stringify(items));
}

// Навігація між сторінками
function showPage(pageId) {
    ["home-page", "list-page", "form-page", "about-page"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === pageId) ? "block" : "none";
    });

    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const map = {
        "home-page": "nav-home",
        "list-page": "nav-list",
        "form-page": "nav-form",
        "about-page": "nav-about"
    };
    const navId = map[pageId];
    if (navId) document.getElementById(navId)?.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (pageId === "list-page") loadData();
}

// Оновлення адреси сервера
function applyServerUrl() {
    const val = document.getElementById("server-url").value.trim();
    if (val) {
        apiUrl = val;
        alert("Адресу сервера оновлено: " + apiUrl);
        checkServer();
    }
}

// Перевірка доступності сервера
async function checkServer() {
    const badge = document.getElementById("server-badge");
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(apiUrl, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
            if (badge) { badge.textContent = "Сервер доступний"; badge.className = "badge-status online"; }
            return;
        }
    } catch { }
    if (badge) { badge.textContent = "Локальний режим (сервер недоступний)"; badge.className = "badge-status offline"; }
}

// Завантаження даних (GET)
async function loadData() {
    const status = document.getElementById("list-status");
    const count = document.getElementById("record-count");

    if (status) { status.textContent = "Завантаження..."; status.style.color = "#555"; }

    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(apiUrl, { signal: ctrl.signal });
        clearTimeout(t);

        if (res.ok) {
            allParcels = await res.json();
            if (status) { status.textContent = "Дані отримано з API"; status.style.color = "#27ae60"; }
        } else {
            throw new Error("Сервер повернув помилку");
        }
    } catch {
        allParcels = getStored();
        if (status) { status.textContent = "Сервер недоступний (локальний режим)"; status.style.color = "#c0392b"; }
    }

    renderTable();
    if (count) count.textContent = `Записів: ${allParcels.length}`;
}

// Відображення таблиці
function renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (allParcels.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#888;padding:20px;">Список порожній</td></tr>`;
        return;
    }

    allParcels.forEach(p => {
        const tr = document.createElement("tr");
        const delivBadge = p.deliveryType === 1
            ? `<span class="badge-type badge-courier">Кур'єр</span>`
            : `<span class="badge-type badge-office">Відділення</span>`;
        const dims = `${p.depth || 0}x${p.width || 0}x${p.height || 0}`;

        tr.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td>${esc(p.content)}</td>
            <td>${esc(p.from)}</td>
            <td>${esc(p.to)}</td>
            <td>${delivBadge}</td>
            <td>${p.weight} кг</td>
            <td>${dims}</td>
            <td>${p.value} грн</td>
            <td>${p.price} грн</td>
            <td class="actions-td">
                <button class="btn btn-sm btn-primary" onclick="openEditForm(${p.id})">Редагувати</button>
                <button class="btn btn-sm btn-danger" onclick="askDelete(${p.id})">Видалити</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function esc(text) {
    const d = document.createElement("div");
    d.textContent = text || "";
    return d.innerHTML;
}

// Відкрити форму для нового запису
function openNewForm() {
    document.getElementById("form-heading").textContent = "Нова посилка";
    document.getElementById("edit-id").value = "";
    document.getElementById("parcel-form").reset();

    document.getElementById("f-type").value = "0";
    document.getElementById("f-weight").value = "1.0";
    document.getElementById("f-depth").value = "15";
    document.getElementById("f-width").value = "20";
    document.getElementById("f-height").value = "10";
    document.getElementById("f-value").value = "100";
    document.getElementById("f-price").value = "65";

    clearErrors();
    showPage("form-page");
}

// Відкрити форму для редагування
function openEditForm(id) {
    const item = allParcels.find(p => p.id === id);
    if (!item) { alert("Запис не знайдено!"); return; }

    document.getElementById("form-heading").textContent = `Редагування відправлення #${item.id}`;
    document.getElementById("edit-id").value = item.id;
    document.getElementById("f-from").value = item.from || "";
    document.getElementById("f-to").value = item.to || "";
    document.getElementById("f-content").value = item.content || "";
    document.getElementById("f-type").value = item.deliveryType || 0;
    document.getElementById("f-weight").value = item.weight || 1;
    document.getElementById("f-depth").value = item.depth || 15;
    document.getElementById("f-width").value = item.width || 20;
    document.getElementById("f-height").value = item.height || 10;
    document.getElementById("f-value").value = item.value || 0;
    document.getElementById("f-price").value = item.price || 65;

    clearErrors();
    showPage("form-page");
}

// Очищення помилок
function clearErrors() {
    document.querySelectorAll(".err").forEach(el => el.textContent = "");
    document.querySelectorAll(".input-err").forEach(el => el.classList.remove("input-err"));
}

function showErr(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    const span = document.getElementById(errId);
    if (inp) inp.classList.add("input-err");
    if (span) span.textContent = msg;
}

// Валідація форми
function validateInputs() {
    let ok = true;
    clearErrors();

    const from = document.getElementById("f-from").value.trim();
    const to = document.getElementById("f-to").value.trim();
    const content = document.getElementById("f-content").value.trim();
    const weight = parseFloat(document.getElementById("f-weight").value);
    const depth = parseFloat(document.getElementById("f-depth").value);
    const width = parseFloat(document.getElementById("f-width").value);
    const height = parseFloat(document.getElementById("f-height").value);
    const value = parseFloat(document.getElementById("f-value").value);
    const price = parseFloat(document.getElementById("f-price").value);

    if (!from || from.length < 2) {
        showErr("f-from", "e-from", from ? "Занадто коротко (мінімум 2 символи)" : "Поле обов'язкове");
        ok = false;
    }
    if (!to || to.length < 2) {
        showErr("f-to", "e-to", to ? "Занадто коротко (мінімум 2 символи)" : "Поле обов'язкове");
        ok = false;
    }
    if (!content || content.length < 2) {
        showErr("f-content", "e-content", content ? "Занадто коротко" : "Поле обов'язкове");
        ok = false;
    }
    if (isNaN(weight) || weight <= 0) {
        showErr("f-weight", "e-weight", "Вага має бути більшою за 0");
        ok = false;
    }
    if (isNaN(depth) || depth <= 0) {
        showErr("f-depth", "e-depth", "Довжина має бути більшою за 0");
        ok = false;
    }
    if (isNaN(width) || width <= 0) {
        showErr("f-width", "e-width", "Ширина має бути більшою за 0");
        ok = false;
    }
    if (isNaN(height) || height <= 0) {
        showErr("f-height", "e-height", "Висота має бути більшою за 0");
        ok = false;
    }
    if (isNaN(value) || value < 0) {
        showErr("f-value", "e-value", "Значення не може бути від'ємним");
        ok = false;
    }
    if (isNaN(price) || price < 0) {
        showErr("f-price", "e-price", "Ціна не може бути від'ємною");
        ok = false;
    }

    return ok;
}

// Відправка форми (POST / PUT)
async function submitForm(e) {
    e.preventDefault();
    if (!validateInputs()) {
        alert("Перевірте правильність введених даних!");
        return;
    }

    const editIdStr = document.getElementById("edit-id").value;
    const isEdit = Boolean(editIdStr);

    const data = {
        from: document.getElementById("f-from").value.trim(),
        to: document.getElementById("f-to").value.trim(),
        content: document.getElementById("f-content").value.trim(),
        deliveryType: parseInt(document.getElementById("f-type").value, 10),
        weight: parseFloat(document.getElementById("f-weight").value),
        depth: parseFloat(document.getElementById("f-depth").value),
        width: parseFloat(document.getElementById("f-width").value),
        height: parseFloat(document.getElementById("f-height").value),
        value: parseFloat(document.getElementById("f-value").value),
        price: parseFloat(document.getElementById("f-price").value)
    };

    const btn = document.getElementById("btn-submit");
    btn.disabled = true;
    btn.textContent = "Збереження...";

    try {
        if (isEdit) {
            const id = parseInt(editIdStr, 10);
            data.id = id;
            try {
                await fetch(`${apiUrl}/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
            } catch { }

            const stored = getStored();
            const idx = stored.findIndex(p => p.id === id);
            if (idx !== -1) { stored[idx] = { ...stored[idx], ...data }; setStored(stored); }

            alert(`Відправлення #${id} оновлено!`);
        } else {
            let created = null;
            try {
                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                if (res.ok) created = await res.json();
            } catch { }

            const stored = getStored();
            if (!created) {
                const newId = stored.length > 0 ? Math.max(...stored.map(p => p.id)) + 1 : 1;
                created = { id: newId, ...data };
                stored.push(created);
                setStored(stored);
            }

            alert("Нове відправлення зареєстровано!");
        }

        showPage("list-page");
    } catch (err) {
        alert("Помилка збереження: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Зберегти";
    }
}

// Запит на видалення
function askDelete(id) {
    pendingDeleteId = id;
    const item = allParcels.find(p => p.id === id);
    const label = document.getElementById("del-label");
    if (label) label.textContent = item ? `#${item.id} (${item.content})` : `#${id}`;
    const modal = document.getElementById("del-modal");
    if (modal) modal.style.display = "flex";
}

function closeModal() {
    pendingDeleteId = null;
    const modal = document.getElementById("del-modal");
    if (modal) modal.style.display = "none";
}

// Виконання видалення (DELETE)
async function doDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeModal();

    try {
        try {
            await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
        } catch { }

        const stored = getStored().filter(p => p.id !== id);
        setStored(stored);

        alert(`Запис #${id} видалено.`);
        await loadData();
    } catch (err) {
        alert("Не вдалося видалити: " + err.message);
    }
}

// Ініціалізація при завантаженні
document.addEventListener("DOMContentLoaded", () => {
    checkServer();
    showPage("home-page");
});
