let products = [],
    cart = JSON.parse(localStorage.getItem("levaren_cart") || "[]")
        .map(i => ({ ...i, size: i.size || "M" })),
    me = null;

const $ = s => document.querySelector(s);

const fmt = n =>
    new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0
    }).format(n);


// API
async function api(url, opt = {}) {
    const r = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(opt.headers || {})
        },
        ...opt
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw Error(d.error || "İşlem başarısız");
    }

    return d;
}


// SITEYI BASLAT
async function boot() {
    try {
        products = await api("/api/products");
        me = (await api("/api/me")).user;

        render(products);
        updateCart();

    } catch (e) {
        console.error(e);
        alert("Ürünler yüklenirken bir hata oluştu.");
    }
}


// ÜRÜNLER
function render(list) {

    // RESİMLER PUBLIC KLASÖRÜNDE OLDUĞU İÇİN /assets YOK
    const imageMap = {
        1: "/premium-gomlek.jpg",
        2: "/premium-kumas-pantolon.jpg",
        3: "/basic-slim-fit-gomlek.jpg",
        4: "/premium-triko.jpg",
        5: "/premium-blazer-ceket.jpg",
        6: "/klasik-gomlek.jpg"
    };

    $("#productGrid").innerHTML = list.map(p => {

        const image =
            imageMap[p.id] ||
            "/premium-gomlek.jpg";

        return `
            <article class="card" onclick="product(${p.id})">

                <div
                    class="pic"
                    style="
                        background-image:url('${image}');
                        background-size:cover;
                        background-position:center;
                        background-repeat:no-repeat;
                    "
                ></div>

                <div class="info">

                    <div>
                        <div>${p.name}</div>

                        <div class="meta">
                            ${
                                p.category === "ust"
                                    ? "Üst Giyim"
                                    : p.category === "alt"
                                    ? "Alt Giyim"
                                    : "Aksesuar"
                            }
                            · ${p.stock} stok
                        </div>
                    </div>

                    <b>${fmt(p.price)}</b>

                </div>

            </article>
        `;

    }).join("");
}


// ÜRÜN DETAYI
function product(id) {

    const p = products.find(x => x.id === id);

    if (!p) return;

    const sizes =
        p.sizes ||
        ["S", "M", "L", "XL", "XXL"].map(size => ({
            size,
            stock: 0
        }));

    const firstAvailable =
        sizes.find(x => x.stock > 0)?.size;

    openModal(`
        <h2>${p.name}</h2>

        <p>${p.description || ""}</p>

        <p>
            <b>${fmt(p.price)}</b>
        </p>

        <div class="form">

            <label>Beden</label>

            <div class="sizes" id="sizes-${p.id}">

                ${sizes.map(x => `
                    <button
                        type="button"
                        data-size="${x.size}"
                        class="size-btn ${
                            x.size === firstAvailable
                                ? "selected"
                                : ""
                        }"
                        ${x.stock < 1 ? "disabled" : ""}
                        onclick="pickSize(${p.id}, '${x.size}')"
                    >
                        ${x.size}

                        <small>
                            ${
                                x.stock < 1
                                    ? " · Tükendi"
                                    : ""
                            }
                        </small>

                    </button>
                `).join("")}

            </div>

            <button
                class="btn"
                ${firstAvailable ? "" : "disabled"}
                onclick="
                    add(
                        ${p.id},
                        document.querySelector(
                            '#sizes-${p.id} .selected'
                        ).dataset.size
                    )
                "
            >
                Sepete Ekle
            </button>

        </div>
    `);
}


// BEDEN SEÇ
function pickSize(id, size) {

    document
        .querySelectorAll(`#sizes-${id} .size-btn`)
        .forEach(b => {

            b.classList.toggle(
                "selected",
                b.dataset.size === size
            );

        });
}


// FİLTRELER
document
    .querySelectorAll(".filters button")
    .forEach(b => {

        b.onclick = () => {

            document
                .querySelectorAll(".filters button")
                .forEach(x =>
                    x.classList.remove("active")
                );

            b.classList.add("active");

            render(
                b.dataset.cat === "all"
                    ? products
                    : products.filter(
                        p => p.category === b.dataset.cat
                    )
            );
        };

    });


// SEPETE EKLE
function add(id, size = "M") {

    const normalized =
        String(size || "M").toUpperCase();

    const x = cart.find(
        i =>
            i.id === id &&
            i.size === normalized
    );

    if (x) {
        x.qty++;
    } else {
        cart.push({
            id,
            qty: 1,
            size: normalized
        });
    }

    save();
    openCart();
}


// SEPETİ KAYDET
function save() {

    localStorage.setItem(
        "levaren_cart",
        JSON.stringify(cart)
    );

    updateCart();
}


// SEPET SAYISI
function updateCart() {

    $("#cartCount").textContent =
        cart.reduce(
            (a, x) => a + x.qty,
            0
        );
}


// MODAL
function openModal(html) {

    $("#modalBody").innerHTML = html;

    $("#modal").classList.remove("hidden");
}


function closeModal() {

    $("#modal").classList.add("hidden");
}


// HESAP
$("#accountBtn").onclick = () => account();


// SEPET
$("#cartBtn").onclick = () => cartModal();


// HESAP MODALI
function account() {

    openModal(
        me
            ? `
                <h2>Merhaba ${me.first_name}</h2>

                <p>${me.email}</p>

                <button
                    class="btn"
                    onclick="orders()"
                >
                    Siparişlerim
                </button>

                <button
                    class="btn"
                    onclick="logout()"
                >
                    Çıkış Yap
                </button>
            `
            : `
                <h2>Hesabım</h2>

                <div class="form">

                    <input
                        id="le"
                        placeholder="E-posta"
                    >

                    <input
                        id="lp"
                        type="password"
                        placeholder="Şifre"
                    >

                    <button onclick="login()">
                        Giriş Yap
                    </button>

                    <button onclick="registerForm()">
                        Hesap Oluştur
                    </button>

                    <button onclick="forgot()">
                        Şifremi Unuttum
                    </button>

                </div>
            `
    );
}


// GİRİŞ
async function login() {

    try {

        await api("/api/login", {
            method: "POST",

            body: JSON.stringify({
                email: $("#le").value,
                password: $("#lp").value
            })
        });

        me = (await api("/api/me")).user;

        closeModal();

        alert("Giriş başarılı.");

        account();

    } catch (e) {

        alert(e.message);

    }
}


// KAYIT FORMU
function registerForm() {

    openModal(`
        <h2>Hesap Oluştur</h2>

        <div class="form">

            <div class="row">

                <input
                    id="rf"
                    placeholder="Ad"
                >

                <input
                    id="rl"
                    placeholder="Soyad"
                >

            </div>

            <input
                id="re"
                placeholder="E-posta"
            >

            <input
                id="rp"
                type="password"
                placeholder="Şifre (min. 8 karakter)"
            >

            <input
                id="rphone"
                placeholder="Telefon"
            >

            <button onclick="register()">
                Kayıt Ol
            </button>

        </div>
    `);
}


// KAYIT
async function register() {

    try {

        await api("/api/register", {
            method: "POST",

            body: JSON.stringify({
                firstName: $("#rf").value,
                lastName: $("#rl").value,
                email: $("#re").value,
                password: $("#rp").value,
                phone: $("#rphone").value
            })
        });

        me = (await api("/api/me")).user;

        closeModal();

        alert("Hesabınız oluşturuldu.");

        account();

    } catch (e) {

        alert(e.message);

    }
}


// ÇIKIŞ
async function logout() {

    await api("/api/logout", {
        method: "POST"
    });

    me = null;

    closeModal();

    account();
}


// ŞİFRE UNUTTUM
function forgot() {

    openModal(`
        <h2>Şifre yenile</h2>

        <div class="form">

            <input
                id="fe"
                placeholder="E-posta"
            >

            <button onclick="sendReset()">
                Bağlantı Gönder
            </button>

        </div>
    `);
}


// ŞİFRE SIFIRLAMA
async function sendReset() {

    const d = await api(
        "/api/forgot-password",
        {
            method: "POST",

            body: JSON.stringify({
                email: $("#fe").value
            })
        }
    );

    alert(d.message);

    closeModal();
}


// SİPARİŞLER
async function orders() {

    try {

        const os = await api("/api/orders");

        openModal(
            "<h2>Siparişlerim</h2>" +

            (
                os.length

                    ? os.map(o => `
                        <
