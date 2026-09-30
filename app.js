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

const $ = s =>
  document.querySelector(s);


const fmt = n =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(n);


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

    products =
      await api("/api/products");


    const meResponse =
      await api("/api/me");


    me =
      meResponse.user;


    render(products);

    updateCart();


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
            padding:40px 20px;
            text-align:center;
          "
        >

          <p
            style="
              font-size:18px;
              margin-bottom:10px;
            "
          >
            Koleksiyon şu anda yüklenemiyor.
          </p>


          <p
            style="
              color:#777;
              font-size:14px;
            "
          >
            Sayfayı yenileyip tekrar deneyin.
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
   ÜRÜNLER
========================= */

function render(list) {

  const grid =
    $("#productGrid");


  if (!grid) return;


  if (
    !Array.isArray(list) ||
    list.length === 0
  ) {

    grid.innerHTML = `

      <div
        style="
          grid-column:1/-1;
          padding:50px 20px;
          text-align:center;
        "
      >

        <p>
          Bu kategoride ürün bulunamadı.
        </p>

      </div>

    `;

    return;

  }


  /*
    PUBLIC KLASÖRÜNDEKİ ÜRÜN GÖRSELLERİ

    Dosyalar:

    public/premium-gomlek.jpg
    public/premium-kumas-pantolon.jpg
    public/basic-slim-fit-gomlek.jpg
    public/premium-triko.jpg
    public/premium-blazer-ceket.jpg
    public/klasik-gomlek.jpg
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

      const image =
        p.image ||
        imageMap[p.id] ||
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
          onclick="product(${p.id})"
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
                ${p.name}
              </div>


              <div class="meta">

                ${categoryName}

                ·

                ${p.stock}

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
      x => x.id === id
    );


  if (!p) return;


  const sizes =
    p.sizes && p.sizes.length

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
      ${p.name}
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


  if (!collection) return;


  collection.scrollIntoView({
    behavior: "smooth",
    block: "start"
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
        a + x.qty,
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


  if (!modal) return;


  modal.classList.add(
    "hidden"
  );

}


/* =========================
   HESAP / SEPET BUTONLARI
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const accountBtn =
      $("#accountBtn");


    if (accountBtn) {

      accountBtn.onclick =
        () => account();

    }


    const cartBtn =
      $("#cartBtn");


    if (cartBtn) {

      cartBtn.onclick =
        () => cartModal();

    }

  }
);


/* =========================
   HESAP
========================= */

function account() {

  openModal(

    me

      ? `

        <h2>
          Merhaba ${me.first_name}
        </h2>


        <p>
          ${me.email}
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

    alert(e.message);

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

    alert(e.message);

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

    alert(e.message);

  }

}


/* =========================
   ŞİFRE UNUTTUM
========================= */

function forgot() {

  openModal(`

    <h2>
      Şifre yenile
    </h2>


    <div class="form">

      <input
        id="fe"
        placeholder="E-posta"
      >


      <button
        onclick="sendReset()"
      >
        Bağlantı Gönder
      </button>

    </div>

  `);

}


async function sendReset() {

  try {

    const d =
      await api(
        "/api/forgot-password",
        {
          method: "POST",

          body:
            JSON.stringify({

              email:
                $("#fe").value

            })

        }
      );


    alert(
      d.message
    );


    closeModal();


  } catch (e) {

    alert(e.message);

  }

}


/* =========================
   SİPARİŞLER
========================= */

async function orders() {

  try {

    const os =
      await api(
        "/api/orders"
      );


    openModal(`

      <h2>
        Siparişlerim
      </h2>


      ${
        os.length

          ? os.map(o => `

              <div
                class="cartline"
              >

                <span>

                  ${o.order_no}

                  <br>

                  <small>
                    ${o.status}
                  </small>

                </span>


                <b>
                  ${fmt(o.total)}
                </b>

              </div>

            `).join("")

          : `

            <p>
              Henüz sipariş yok.
            </p>

          `
      }

    `);

  } catch (e) {

    alert(e.message);

  }

}


/* =========================
   SEPET
========================= */

function cartModal() {

  const rows =
    cart
      .map(i => {

        const p =
          products.find(
            x => x.id === i.id
          );


        return p

          ? `

            <div
              class="cartline"
            >

              <span>

                ${p.name}

                · Beden
                ${i.size || "M"}

                × ${i.qty}

              </span>


              <b>
                ${fmt(
                  p.price * i.qty
                )}
              </b>

            </div>

          `

          : "";

      })
      .join("");


  const total =
    cart.reduce(
      (sum, i) => {

        const p =
          products.find(
            x => x.id === i.id
          );


        return (
          sum +
          (p?.price || 0) *
          i.qty
        );

      },
      0
    );


  openModal(`

    <h2>
      Sepetim
    </h2>


    ${
      rows ||
      "<p>Sepet boş.</p>"
    }


    <hr>


    <p>

      <b>
        Toplam:
        ${fmt(total)}
      </b>

    </p>


    ${
      cart.length

        ? `

          <button
            class="btn"
            onclick="checkout()"
          >
            Satın Almaya Devam Et
          </button>

        `

        : ""

    }

  `);

}


/* =========================
   CHECKOUT
========================= */

function checkout() {

  if (!me) {

    account();

    return;

  }


  openModal(`

    <h2>
      Teslimat
    </h2>


    <div class="form">

      <input
        id="sn"
        value="${me.first_name} ${me.last_name}"
        placeholder="Ad Soyad"
      >


      <input
        id="sp"
        value="${me.phone || ""}"
        placeholder="Telefon"
      >


      <textarea
        id="sa"
        placeholder="Adres"
      ></textarea>


      <div class="row">

        <input
          id="sc"
          placeholder="Şehir"
        >


        <input
          id="sz"
          placeholder="Posta Kodu"
        >

      </div>


      <button
        onclick="pay()"
      >
        Ödemeye Geç
      </button>

    </div>

  `);

}


/* =========================
   ÖDEME
========================= */

async function pay() {

  try {

    const d =
      await api(
        "/api/checkout",
        {
          method: "POST",

          body:
            JSON.stringify({

              items: cart,

              shipping: {

                name:
                  $("#sn").value,

                phone:
                  $("#sp").value,

                address:
                  $("#sa").value,

                city:
                  $("#sc").value,

                zip:
                  $("#sz").value

              }

            })

        }
      );


    if (
      d.paymentConfigured
    ) {

      openModal(`

        <h2>
          Güvenli Ödeme
        </h2>


        <div
          id="iyzipay-checkout-form"
          class="responsive"
        ></div>


        ${d.checkoutFormContent}

      `);

    } else {

      cart = [];

      save();


      openModal(`

        <h2>
          Sipariş oluşturuldu
        </h2>


        <p>
          ${d.message}
        </p>


        <p>
          Sipariş no:

          <b>
            ${d.orderNo}
          </b>

        </p>

      `);

    }

  } catch (e) {

    alert(e.message);

  }

}


/* =========================
   SAYFA AÇILINCA
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupFilters();

    boot();

  }
);
