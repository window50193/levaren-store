let products = [];

let cart = JSON.parse(
  localStorage.getItem("levaren_cart") || "[]"
).map(i => ({
  ...i,
  size: i.size || "M"
}));

let me = null;


/* =========================
   YARDIMCI
========================= */

const $ = s => document.querySelector(s);

const fmt = n =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);


/* =========================
   API
========================= */

async function api(url, opt = {}) {

  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {})
    },
    ...opt
  });

  const d =
    await r.json().catch(() => ({}));

  if (!r.ok) {
    throw Error(
      d.error || "İşlem başarısız"
    );
  }

  return d;
}


/* =========================
   SAYFAYI BAŞLAT
========================= */

async function boot() {

  try {

    const productResponse =
      await api("/api/products");


    /*
      API farklı şekillerde ürün
      döndürse bile yakala.
    */

    if (Array.isArray(productResponse)) {

      products = productResponse;

    } else if (
      Array.isArray(productResponse.products)
    ) {

      products =
        productResponse.products;

    } else if (
      Array.isArray(productResponse.data)
    ) {

      products =
        productResponse.data;

    } else {

      products = [];

    }


    console.log(
      "LÉVAREN ürünleri:",
      products
    );


    try {

      const meResponse =
        await api("/api/me");

      me =
        meResponse.user || null;

    } catch (e) {

      me = null;

      console.log(
        "Kullanıcı girişi yok."
      );

    }


    render(products);

    updateCart();

    setupFilters();


  } catch (error) {

    console.error(
      "LÉVAREN başlatma hatası:",
      error
    );


    const grid =
      $("#productGrid");


    if (grid) {

      grid.innerHTML = `

        <div
          style="
            grid-column:1/-1;
            padding:60px 20px;
            text-align:center;
          "
        >

          <p
            style="
              font-size:20px;
              margin-bottom:12px;
            "
          >
            Koleksiyon yüklenemedi.
          </p>


          <p
            style="
              color:#777;
              font-size:14px;
              line-height:1.6;
            "
          >
            Sunucu bağlantısı kontrol ediliyor.
          </p>


          <button
            class="btn"
            onclick="location.reload()"
            style="margin-top:20px;"
          >
            Tekrar Dene
          </button>

        </div>

      `;

    }

  }

}


/* =========================
   ÜRÜNLERİ GÖSTER
========================= */

function render(list) {

  const grid =
    $("#productGrid");


  if (!grid) {
    return;
  }


  if (
    !Array.isArray(list) ||
    list.length === 0
  ) {

    grid.innerHTML = `

      <div
        style="
          grid-column:1/-1;
          padding:70px 20px;
          text-align:center;
        "
      >

        <p
          style="
            font-size:18px;
          "
        >
          Bu kategoride ürün bulunamadı.
        </p>

      </div>

    `;

    return;

  }


  /*
    FOTOĞRAFLAR PUBLIC KLASÖRÜNDE.
    ASSETS KLASÖRÜ YOK.
  */

  const imageMap = {

    1:
      "/premium-gomlek.jpg",

    2:
      "/premium-kumas-pantolon.jpg",

    3:
      "/basic-slim-fit-gomlek.jpg",

    4:
      "/premium-triko.jpg",

    5:
      "/premium-blazer-ceket.jpg",

    6:
      "/klasik-gomlek.jpg"

  };


  grid.innerHTML =
    list.map(p => {

      const id =
        Number(p.id);


      const image =
        p.image ||
        imageMap[id] ||
        "/premium-gomlek.jpg";


      const categoryName =
        p.category === "ust"
          ? "Üst Giyim"
          : p.category === "alt"
            ? "Alt Giyim"
            : "Aksesuar";


      return `

        <article
          class="card"
          onclick="product(${id})"
        >

          <div
            class="pic ai-pic"
            style="
              background-image:url('${image}');
            "
          ></div>


          <div class="info">

            <div>

              <div>
                ${p.name || "LÉVAREN Ürün"}
              </div>


              <div class="meta">

                ${categoryName}

                ·

                ${p.stock ?? 0}

                stok

              </div>

            </div>


            <b>
              ${fmt(p.price)}
            </b>

          </div>

        </article>

      `;

    }).join("");

}


/* =========================
   ÜRÜN DETAY
========================= */

function product(id) {

  const p =
    products.find(
      x => Number(x.id) === Number(id)
    );


  if (!p) {
    return;
  }


  const sizes =
    Array.isArray(p.sizes) &&
    p.sizes.length

      ? p.sizes

      : [
          "S",
          "M",
          "L",
          "XL",
          "XXL"
        ].map(size => ({
          size,
          stock: 0
        }));


  const firstAvailable =
    sizes.find(
      x => Number(x.stock) > 0
    )?.size;


  openModal(`

    <h2>
      ${p.name || "Ürün"}
    </h2>


    <p>
      ${p.description || ""}
    </p>


    <p>
      <b>
        ${fmt(p.price)}
      </b>
    </p>


    <div class="form">

      <label>
        Beden
      </label>


      <div
        class="sizes"
        id="sizes-${p.id}"
      >

        ${sizes.map(x => `

          <button
            type="button"
            data-size="${x.size}"
            class="size-btn ${
              x.size === firstAvailable
                ? "selected"
                : ""
            }"

            ${
              Number(x.stock) < 1
                ? "disabled"
                : ""
            }

            onclick="
              pickSize(
                ${p.id},
                '${x.size}'
              )
            "
          >

            ${x.size}

            <small>

              ${
                Number(x.stock) < 1
                  ? " · Tükendi"
                  : ""
              }

            </small>

          </button>

        `).join("")}

      </div>


      <button
        class="btn"

        ${
          firstAvailable
            ? ""
            : "disabled"
        }

        onclick="
          add(
            ${p.id},
            document.querySelector(
              '#sizes-${p.id} .selected'
            )?.dataset.size
          )
        "
      >

        Sepete Ekle

      </button>

    </div>

  `);

}


/* =========================
   BEDEN SEÇ
========================= */

function pickSize(id, size) {

  document
    .querySelectorAll(
      `#sizes-${id} .size-btn`
    )
    .forEach(button => {

      button.classList.toggle(
        "selected",
        button.dataset.size === size
      );

    });

}


/* =========================
   FİLTRELER
========================= */

function setupFilters() {

  document
    .querySelectorAll(
      ".filters button"
    )
    .forEach(button => {

      button.onclick = () => {

        document
          .querySelectorAll(
            ".filters button"
          )
          .forEach(x => {

            x.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        const category =
          button.dataset.cat;


        if (
          category === "all"
        ) {

          render(products);

        } else {

          render(
            products.filter(
              p =>
                p.category === category
            )
          );

        }

      };

    });

}


/* =========================
   KOLEKSİYONA GİT
========================= */

function goToCollection() {

  const collection =
    document.getElementById(
      "products"
    );


  if (!collection) {
    return;
  }


  const header =
    document.querySelector("header");


  const headerHeight =
    header
      ? header.offsetHeight
      : 0;


  const announcement =
    document.querySelector(
      ".announcement"
    );


  const announcementHeight =
    announcement
      ? announcement.offsetHeight
      : 0;


  const extraOffset =
    headerHeight +
    announcementHeight +
    10;


  const top =
    collection.getBoundingClientRect().top +
    window.pageYOffset -
    extraOffset;


  window.scrollTo({

    top: Math.max(0, top),

    behavior: "smooth"

  });

}


/* =========================
   SEPETE EKLE
========================= */

function add(
  id,
  size = "M"
) {

  const normalized =
    String(size || "M")
      .toUpperCase();


  const x =
    cart.find(
      i =>
        Number(i.id) === Number(id) &&
        i.size === normalized
    );


  if (x) {

    x.qty++;

  } else {

    cart.push({

      id: Number(id),

      qty: 1,

      size: normalized

    });

  }


  save();

  openCart();

}


/* =========================
   SEPETİ KAYDET
========================= */

function save() {

  localStorage.setItem(
    "levaren_cart",
    JSON.stringify(cart)
  );


  updateCart();

}


/* =========================
   SEPET SAYISI
========================= */

function updateCart() {

  const count =
    cart.reduce(
      (a, x) =>
        a + Number(x.qty || 0),
      0
    );


  const el =
    $("#cartCount");


  if (el) {

    el.textContent =
      count;

  }

}


/* =========================
   SEPETİ AÇ
========================= */

function openCart() {

  cartModal();

}


/* =========================
   MODAL
========================= */

function openModal(html) {

  const modalBody =
    $("#modalBody");

  const modal =
    $("#modal");


  if (
    !modalBody ||
    !modal
  ) {

    return;

  }


  modalBody.innerHTML =
    html;


  modal.classList.remove(
    "hidden"
  );

}


function closeModal() {

  const modal =
    $("#modal");


  if (!modal) {
    return;
  }


  modal.classList.add(
    "hidden"
  );

}


/* =========================
   HESAP
========================= */

function account() {

  openModal(

    me

      ? `

        <h2>
          Merhaba ${me.first_name || ""}
        </h2>


        <p>
          ${me.email || ""}
        </p>


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

        <h2>
          Hesabım
        </h2>


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


          <button
            onclick="login()"
          >
            Giriş Yap
          </button>


          <button
            onclick="registerForm()"
          >
            Hesap Oluştur
          </button>


          <button
            onclick="forgot()"
          >
            Şifremi Unuttum
          </button>

        </div>

      `

  );

}


/* =========================
   GİRİŞ
========================= */

async function login() {

  try {

    await api(
      "/api/login",
      {

        method: "POST",

        body:
          JSON.stringify({

            email:
              $("#le").value,

            password:
              $("#lp").value

          })

      }
    );


    me =
      (
        await api(
          "/api/me"
        )
      ).user;


    closeModal();


    alert(
      "Giriş başarılı."
    );


    account();


  } catch (e) {

    alert(
      e.message
    );

  }

}


/* =========================
   KAYIT FORMU
========================= */

function registerForm() {

  openModal(`

    <h2>
      Hesap Oluştur
    </h2>


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


      <button
        onclick="register()"
      >
        Kayıt Ol
      </button>

    </div>

  `);

}


/* =========================
   KAYIT
========================= */

async function register() {

  try {

    await api(
      "/api/register",
      {

        method: "POST",

        body:
          JSON.stringify({

            firstName:
              $("#rf").value,

            lastName:
              $("#rl").value,

            email:
              $("#re").value,

            password:
              $("#rp").value,

            phone:
              $("#rphone").value

          })

      }
    );


    me =
      (
        await api(
          "/api/me"
        )
      ).user;


    closeModal();


    alert(
      "Hesabınız oluşturuldu."
    );


    account();


  } catch (e) {

    alert(
      e.message
    );

  }

}


/* =========================
   ÇIKIŞ
========================= */

async function logout() {

  try {

    await api(
      "/api/logout",
      {
        method: "POST"
      }
    );


    me = null;


    closeModal();


    account();


  } catch (e) {

    alert(
      e.message
    );

  }

}


/* =================
