
const $ = (s) => document.querySelector(s);
const money = (n) => Number(n).toLocaleString("ru-RU") + " so'm";
const colors = ["#e0527f", "#f0a23b", "#8a5fd0", "#e8e24a", "#f4f0f0", "#e46a4c", "#4f9d78"];

const DELIVERY = ["Tayyorlanmoqda", "Yo'lda", "Yetkazildi"];
const PAYMENT = ["Kutilmoqda", "To'landi"];


let flowers = [
    { id: 1, name: "Atirgul", price: 160000, stock: 120 },
    { id: 2, name: "Lola", price: 180000, stock: 57 },
    { id: 5, name: "Romashka", price: 25000, stock: 150 },
];
let customers = [
    { id: 1, name: "Jaloladdin Nurmamatov", phone: "+998 12 345 67 89" },
];
let orders = [];
let deliveries = [];
let payments = [];
let ids = { flower: 6, customer: 3, order: 1 };

const customerName = (id) => (customers.find((c) => c.id === id) || {}).name || "—";

function clone(tplId, values = {}) {
    const node = $("#" + tplId).content.firstElementChild.cloneNode(true);
    node.querySelectorAll("[data-f]").forEach((el) => {
        const v = values[el.dataset.f];
        if (v === undefined) return;
        if (el.tagName === "INPUT" || el.tagName === "SELECT") el.value = v;
        else el.textContent = v;
    });
    return node;
}

function fillList(container, items, tplId, mapper, emptyText) {
    container.replaceChildren();
    if (!items.length && emptyText) {
        const row = clone("tpl-empty", { text: emptyText });
        row.firstElementChild.colSpan = 6;
        container.append(row);
        return;
    }
    items.forEach((item, i) => container.append(mapper(item, i)));
}

function fillSelect(select, items, valueOf, labelOf) {
    select.replaceChildren();
    items.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = valueOf(item);
        opt.textContent = labelOf(item);
        select.append(opt);
    });
}

function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("on"), 1800);
}


function render() {
    const paid = payments.filter((p) => p.status === "To'landi").reduce((a, p) => a + p.sum, 0);
    const stats = [
        [flowers.length, "gul turi"],
        [orders.length, "buyurtma"],
        [customers.length, "mijoz"],
        [deliveries.filter((d) => d.status !== "Yetkazildi").length, "yetkazilmadi"],
        [money(paid), "tushgan to'lov"],
    ];
    fillList($("#stats"), stats, "tpl-stat", ([n, l]) => clone("tpl-stat", { n, l }));

    fillList($("#catalog"), flowers, "tpl-flower", (f, i) => {
        const card = clone("tpl-flower", {
            name: f.name,
            price: money(f.price),
            stock: "Zaxira: " + f.stock + " dona" + (f.stock < 10 ? " — kam qoldi" : ""),
        });
        card.querySelector('[data-f="dot"]').style.background = colors[i % colors.length];
        if (f.stock < 10) card.querySelector('[data-f="stock"]').className = "low";
        return card;
    });

    fillList($("#prices"), flowers, "tpl-price-row", (f) => {
        const row = clone("tpl-price-row", { name: f.name, priceInput: f.price, stock: f.stock });
        row.dataset.id = f.id;
        return row;
    }, "Gul yo'q. Iltimos Katalogga gul qo'shing.");

    fillSelect($("#selCustomer"), customers, (c) => c.id, (c) => c.name);
    fillSelect($("#selFlower"), flowers, (f) => f.id, (f) => f.name + " — " + money(f.price));

    fillList($("#orders"), orders, "tpl-order-row", (o) => {
        const status = deliveries.find((d) => d.order === o.id).status;
        const row = clone("tpl-order-row", {
            no: "#" + o.id, customer: customerName(o.customer), flower: o.flower,
            qty: o.qty, sum: money(o.sum), status,
        });
        if (status === "Yetkazildi") row.querySelector(".tag").classList.add("ok");
        return row;
    }, "Hozircha buyurtma yo'q. Yuqoridagi shakldan birinchisini yarating.");

    fillList($("#customers"), customers, "tpl-customer-row", (c) => {
        const own = orders.filter((o) => o.customer === c.id);
        return clone("tpl-customer-row", {
            name: c.name, phone: c.phone, count: own.length,
            total: money(own.reduce((a, o) => a + o.sum, 0)),
        });
    });

    fillList($("#deliveries"), deliveries, "tpl-delivery-row", (d) => {
        const row = clone("tpl-delivery-row", {
            no: "#" + d.order, customer: customerName(d.customer), address: d.address, status: d.status,
        });
        row.dataset.id = d.order;
        return row;
    }, "Yetkazib berish yozuvlari buyurtmadan keyin paydo bo'ladi.");

    fillList($("#payments"), payments, "tpl-payment-row", (p) => {
        const row = clone("tpl-payment-row", {
            no: "#" + p.order, customer: customerName(p.customer), sum: money(p.sum),
            method: p.method, status: p.status,
        });
        row.dataset.id = p.order;
        return row;
    }, "To'lovlar buyurtmadan keyin paydo bo'ladi.");
}


$("#fFlower").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    flowers.push({ id: ids.flower++, name: f.name.trim(), price: +f.price, stock: +f.stock });
    e.target.reset();
    render();
    toast("Gul qo'shildi");
});

$("#fCustomer").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    customers.push({ id: ids.customer++, name: f.name.trim(), phone: f.phone.trim() });
    e.target.reset();
    render();
    toast("Mijoz Muvofaqayatli qo'shildi");
});

$("#fOrder").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const flower = flowers.find((x) => x.id === +f.flower);
    const qty = +f.qty;
    if (!flower) return;
    if (qty > flower.stock) {
        toast("Zaxirada " + flower.stock + " dona bor");
        return;
    }
    flower.stock -= qty;
    const id = ids.order++;
    const sum = flower.price * qty;
    orders.push({ id, customer: +f.customer, flower: flower.name, qty, sum });
    deliveries.push({ order: id, customer: +f.customer, address: f.address.trim(), status: DELIVERY[0] });
    payments.push({ order: id, customer: +f.customer, sum, method: f.method, status: PAYMENT[0] });
    e.target.reset();
    render();
    toast("Buyurtma #" + id + " yaratildi");
});


document.addEventListener("change", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    const id = +row.dataset.id;
    const table = row.parentElement.id;
    if (table === "prices") {
        flowers.find((x) => x.id === id).price = Math.max(0, +e.target.value || 0);
        render();
        toast("Narx yangilandi");
    } else if (table === "deliveries") {
        deliveries.find((x) => x.order === id).status = e.target.value;
        render();
    } else if (table === "payments") {
        payments.find((x) => x.order === id).status = e.target.value;
        render();
    }
});

document.addEventListener("click", (e) => {
    if (e.target.dataset.act !== "del") return;
    const id = +e.target.closest("tr").dataset.id;
    flowers = flowers.filter((f) => f.id !== id);
    render();
    toast("Gul o'chirildi");
});

render();