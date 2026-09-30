/* =========================================================
   LÉVAREN — APP.JS
   Ürünler + Görseller + Filtreler + Sepet + Hesap
========================================================= */

let products = [];

let cart = JSON.parse(
  localStorage.getItem("levaren_cart") || "[]"
).map(item => ({
  ...item,
  size: item.size || "M"
}));

let me = null;


/* =========================================================
   YARDIMCI FONKSİYONLAR
========================================================= */

const $ = selector =>
  document.querySelector(selector);


const fmt = number =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(Number(number) || 0);


/* =========================================================
   API
========================================================= */

async function api(url, options = {}) {

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "İşlem başarısız."
    );
  }

  return data;
}


/* =========================================================
   ÜRÜN GÖRSELLERİ
========================================================= */

/*
  BU DOSYALAR public klasörünün içinde olacak:

  /premium-gomlek.jpg
  /premium-kumas-pantolon.jpg
  /basic-slim-fit-gomlek.jpg
  /premium-triko.jpg
  /premium-blazer-ceket.jpg
  /klasik-gomlek.jpg

  Daha sonra kendi gerçek ürün fotoğraflarımızı
  bu dosya isimleriyle değiştireceğiz.
*/

const imageMap = {

  1: "/premium-gomlek.jpg",

  2: "/premium-kumas-pantolon.jpg",

  3: "/basic-slim-fit-gomlek.jpg",

  4: "/premium-triko.jpg",

  5: "/premium-blazer-ceket.jpg",

  6: "/klasik-gomlek.jpg"

};


/* =========================================================
   SAYFAYI BAŞLAT
========================================================= */

async function boot() {

  try {

    /* -------------------------
       ÜRÜNLERİ AL
    ------------------------- */

    const productResponse =
      await api("/api/products");


    if (Array.isArray(productResponse)) {

      products = productResponse;

    }

    else if (
      Array.isArray(productResponse.products)
    ) {

      products =
        productResponse.products;

    }

    else if (
      Array.isArray(productResponse.data)
    ) {

      products =
        productResponse.data;

    }

    else {

      products = [];

    }


    console.log(
      "LÉVAREN ürünleri:",
      products
    );


    /* -------------------------
       KULLANICI
    ------------------------- */

    try {

      const meResponse =
        await api("/api/me");

      me =
        meResponse.user || null;

    }

    catch (error) {

      me = null;

    }


    /* -------------------------
       SAYFAYI ÇİZ
    ------------------------- */

    render(products);

    updateCart();

    setupFilters();

  }

  catch (error) {

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
            "
          >
            Sunucu bağlantısını kontrol edin.
          </p>

          <button
            class="btn"
            onclick="location.reload()"
          >
            Tekrar Dene
          </button>

        </div>

      `;

    }

  }

}


/* =========================================================
   ÜRÜNLERİ GÖSTER
========================================================= */

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

        <p>
          Bu kategoride ürün bulunamadı.
        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    list.map(productItem => {

      const id =
        Number(productItem.id);


      /*
        Önce veritabanındaki image değerini kullan.
        Yoksa imageMap içindeki dosyayı kullan.
      */

      const image =
        productItem.image ||
        imageMap[id] ||
        "/premium-gomlek.jpg";


      let categoryName =
        "Aksesuar";


      if (
        productItem.category === "ust"
      ) {

        categoryName =
          "Üst Giyim";

      }

      else if (
        productItem.category === "alt"
      ) {

        categoryName =
          "Alt Giyim";

      }


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
                ${
                  productItem.name ||
                  "LÉVAREN Ürün"
                }
              </div>

              <div class="meta">

                ${categoryName}

                ·

                ${
                  productItem.stock ?? 0
                }

                stok

              </div>

            </div>


            <b>
              ${fmt(productItem.price)}
            </b>

          </div>

        </article>

      `;

    }).join("");

}


/* =========================================================
   ÜRÜN DETAYI
========================================================= */

function product(id) {

  const selectedProduct =
    products.find(
      item =>
        Number(item.id) === Number(id)
    );


  if (!selectedProduct) {
    return;
  }


  const sizes =
    Array.isArray(selectedProduct.sizes) &&
    selectedProduct.sizes.length

      ? selectedProduct.sizes

      : [
          {
            size: "S",
            stock: 0
          },
          {
            size: "M",
            stock: 0
          },
          {
            size: "L",
            stock: 0
          },
          {
            size: "XL",
            stock: 0
          },
          {
            size: "XXL",
            stock: 0
          }
        ];


  const firstAvailable =
    sizes.find(
      item =>
        Number(item.stock) > 0
    )?.size;


  const image =
    selectedProduct.image ||
    imageMap[Number(selectedProduct.id)] ||
    "/premium-gomlek.jpg";


  openModal(`

    <img
      src="${image}"
      class="product-modal-img"
      alt="${selectedProduct.name || "LÉVAREN Ürün"}"
    >


    <h2>
      ${
        selectedProduct.name ||
        "LÉVAREN Ürün"
      }
    </h2>


    <p>
      ${
        selectedProduct.description ||
        "LÉVAREN koleksiyonundan özel parça."
      }
    </p>


    <p>
      <b>
        ${fmt(selectedProduct.price)}
      </b>
    </p>


    <div class="form">

      <label>
        Beden
      </label>


      <div
        class="sizes"
        id="sizes-${selectedProduct.id}"
      >

        ${sizes.map(item => `

          <button
            type="button"
            class="
              size-btn
              ${
                item.size === firstAvailable
                  ? "selected"
                  : ""
              }
            "
            data-size="${item.size}"

            ${
              Number(item.stock) < 1
                ? "disabled"
                : ""
            }

            onclick="
              pickSize(
                ${selectedProduct.id},
                '${item.size}'
              )
            "
          >

            ${item.size}

            ${
              Number(item.stock) < 1
                ? "<small> · Tükendi</small>"
                : ""
            }

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
            ${selectedProduct.id},
            document.querySelector(
              '#sizes-${selectedProduct.id} .selected'
            )?.dataset.size
          )
        "
      >

        Sepete Ekle

      </button>

    </div>

  `);

}


/* =========================================================
   BEDEN SEÇ
========================================================= */

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


/* =========================================================
   FİLTRELER
========================================================= */

function setupFilters() {

  document
    .querySelectorAll(".filters button")
    .forEach(button => {

      button.onclick = () => {

        document
          .querySelectorAll(
            ".filters button"
          )
          .forEach(item => {

            item.classList.remove(
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

        }

        else {

          render(
            products.filter(
              item =>
                item.category === category
            )
          );

        }

      };

    });

}


/* =========================================================
   KOLEKSİYONA GİT
========================================================= */

function goToCollection() {

  const collection =
    document.getElementById(
      "products"
    );


  if (!collection) {
    return;
  }


  const header =
    document.querySelector(
      "header"
    );


  const announcement =
    document.querySelector(
      ".announcement"
    );


  const headerHeight =
    header
      ? header.offsetHeight
      : 0;


  const announcementHeight =
    announcement
      ? announcement.offsetHeight
      : 0;


  const offset =
    headerHeight +
    announcementHeight +
    10;


  const top =
    collection.getBoundingClientRect().top +
    window.pageYOffset -
    offset;


  window.scrollTo({

    top: Math.max(0, top),

    behavior: "smooth"

  });

}


/* =========================================================
   SEPETE EKLE
========================================================= */

function add(id, size = "M") {

  const normalizedSize =
    String(size || "M")
      .toUpperCase();


  const existing =
    cart.find(
      item =>
        Number(item.id) === Number(id) &&
        item.size === normalizedSize
    );


  if (existing) {

    existing.qty++;

  }

  else {

    cart.push({

      id: Number(id),

      qty: 1,

      size: normalizedSize

    });

  }


  save();

  openCart();

}


/* =========================================================
   SEPETİ KAYDET
========================================================= */

function save() {

  localStorage.setItem(
    "levaren_cart",
    JSON.stringify(cart)
  );


  updateCart();

}


/* =========================================================
   SEPET SAYISI
========================================================= */

function updateCart() {

  const count =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.qty || 0),
      0
    );


  const element =
    $("#cartCount");


  if (element) {

    element.textContent =
      count;

  }

}


/* =========================================================
   SEPETİ AÇ
========================================================= */

function openCart() {

  cartModal();

}


/* =========================================================
   MODAL
========================================================= */

function openModal(html) {

  const body =
    $("#modalBody");


  const modal =
    $("#modal");


  if (!body || !modal) {
    return;
  }


  body.innerHTML =
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


/* =========================================================
   HESABIM
========================================================= */

function account() {

  if (me) {

    openModal(`

      <h2>
        Merhaba
        ${me.first_name || ""}
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

    `);

  }

  else {

    openModal(`

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

    `);

  }

}


/* =========================================================
   GİRİŞ
========================================================= */

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


    const response =
      await api("/api/me");


    me =
      response.user;


    closeModal();


    alert(
      "Giriş başarılı."
    );


    account();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   KAYIT FORMU
========================================================= */

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


/* =========================================================
   KAYIT OL
========================================================= */

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


    const response =
      await api("/api/me");


    me =
      response.user;


    closeModal();


    alert(
      "Hesabınız oluşturuldu."
    );


    account();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   ÇIKIŞ
========================================================= */

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

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   ŞİFREMİ UNUTTUM
========================================================= */

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

    const response =
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
      response.message
    );


    closeModal();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   SİPARİŞLER
========================================================= */

async function orders() {

  try {

    const response =
      await api(
        "/api/orders"
      );


    const orders =
      Array.isArray(response)
        ? response
        : response.orders || [];


    openModal(`

      <h2>
        Siparişlerim
      </h2>


      ${
        orders.length

          ? orders.map(order => `

              <div class="cartline">

                <span>

                  ${order.order_no}

                  <br>

                  <small>
                    ${order.status}
                  </small>

                </span>


                <b>
                  ${fmt(order.total)}
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

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================================================
   SEPET MODALI
========================================================= */

function cartModal() {

  const rows =
    cart
      .map(item => {

        const selectedProduct =
          products.find(
            productItem =>
              Number(productItem.id) ===
              Number(item.id)
          );


        if (!selectedProduct) {
          return "";
        }


        return `

          <div class="cartline">

            <span>

              ${selectedProduct.name}

              · Beden
              ${item.size || "M"}

              ×
              ${item.qty}

            </span>


            <b>

              ${fmt(
                Number(
                  selectedProduct.price || 0
                ) *
                Number(item.qty || 0)
              )}

            </b>

          </div>

        `;

      })
      .join("");


  const total =
    cart.reduce(
      (sum, item) => {

        const selectedProduct =
          products.find(
            productItem =>
              Number(productItem.id) ===
              Number(item.id)
          );


        return (
          sum +
          (
            Number(
              selectedProduct?.price
            ) || 0
          ) *
          Number(item.qty || 0)
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

          
