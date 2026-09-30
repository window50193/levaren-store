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

const $ = selector =>
  document.querySelector(selector);


const fmt = number =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(number);


/* =========================
   API
========================= */

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


/* =========================
   ÜRÜN GÖRSELLERİ
========================= */

const imageMap = {

  1: "/premium-gomlek.jpg",

  2: "/premium-kumas-pantolon.jpg",

  3: "/basic-slim-fit-gomlek.jpg",

  4: "/premium-triko.jpg",

  5: "/premium-blazer-ceket.jpg",

  6: "/klasik-gomlek.jpg"

};


/* =========================
   GÖRSEL YOLUNU DÜZELT
========================= */

function getProductImage(product) {

  if (!product) {
    return "/premium-gomlek.jpg";
  }


  let image =
    product.image ||
    imageMap[product.id];


  if (!image) {
    return "/premium-gomlek.jpg";
  }


  /*
    Eğer API yanlışlıkla /assets/
    gönderirse düzelt.
  */

  image = image.replace(
    /^\/assets\//,
    "/"
  );


  return image;
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
            padding:50px 20px;
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
   ÜRÜNLERİ GÖSTER
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


  grid.innerHTML =
    list.map(product => {

      const image =
        getProductImage(product);


      const categoryName =
        product.category === "ust"
          ? "Üst Giyim"
          : product.category === "alt"
            ? "Alt Giyim"
            : "Aksesuar";


      return `

        <article
          class="card"
          onclick="productDetail(${product.id})"
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
                ${product.name}
              </div>


              <div class="meta">

                ${categoryName}

                ·

                ${product.stock}

                stok

              </div>

            </div>


            <b>
              ${fmt(product.price)}
            </b>

          </div>

        </article>

      `;

    }).join("");

}


/* =========================
   ÜRÜN DETAYI
========================= */

function productDetail(id) {

  const product =
    products.find(
      item => Number(item.id) === Number(id)
    );


  if (!product) return;


  const sizes =
    product.sizes &&
    product.sizes.length

      ? product.sizes

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
      item =>
        Number(item.stock) > 0
    )?.size;


  openModal(`

    <h2>
      ${product.name}
    </h2>


    <p>
      ${product.description || ""}
    </p>


    <p>
      <b>
        ${fmt(product.price)}
      </b>
    </p>


    <div class="form">

      <label>
        Beden
      </label>


      <div
        class="sizes"
        id="sizes-${product.id}"
      >

        ${sizes.map(item => `

          <button
            type="button"
            data-size="${item.size}"
            class="size-btn ${
              item.size === firstAvailable
                ? "selected"
                : ""
            }"
            ${
              Number(item.stock) < 1
                ? "disabled"
                : ""
            }
            onclick="
              pickSize(
                ${product.id},
                '${item.size}'
              )
            "
          >

            ${item.size}

            <small>

              ${
                Number(item.stock) < 1
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
            ${product.id},
            document.querySelector(
              '#sizes-${product.id} .selected'
            )?.dataset.size
          )
        "
      >
        Sepete Ekle
      </button>

    </div>

  `);

}


/*
  Eski kodda product() çağrısı
  kullanılmış olabilir.
  Uyumluluk için bırakıyoruz.
*/

function product(id) {
  productDetail(id);
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


        if (category === "all") {

          render(products);

        } else {

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


  /*
    Header yüksekliği nedeniyle
    bölümün fazla yukarı kaçmasını
    engelliyoruz.
  */

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


  const offset =
    headerHeight +
    announcementHeight +
    10;


  const position =
    collection.getBoundingClientRect().top +
    window.pageYOffset -
    offset;


  window.scrollTo({

    top: Math.max(
      position,
      0
    ),

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


  const existing =
    cart.find(
      item =>
        Number(item.id) === Number(id) &&
        item.size === normalized
    );


  if (existing) {

    existing.qty++;

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
      (total, item) =>
        total + item.qty,
      0
    );


  const element =
    $("#cartCount");


  if (element) {

    element.textContent =
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

  const modal =
    $("#modal");


  const body =
    $("#modalBody");


  if (
    !modal ||
    !body
  ) {
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


  if (!modal) return;


  modal.classList.add(
    "hidden"
  );

}


/* =========================
   HESAP / SEPET BUTONLARI
========================= */

function setupButtons() {

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


  } catch (error) {

    alert(
      error.message
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


  } catch (error) {

    alert(
      error.message
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


  } catch (error) {

    alert(
      error.message
    );

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

    const data =
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
      data.message
    );


    closeModal();


  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================
   SİPARİŞLER
========================= */

async function orders() {

  try {

    const orderList =
      await api(
        "/api/orders"
      );


    openModal(`

      <h2>
        Siparişlerim
      </h2>


      ${
        orderList.length

          ? orderList.map(order => `

              <div
                class="cartline"
              >

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


  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================
   SEPET
========================= */

function cartModal() {

  const rows =
    cart
      .map(item => {

        const product =
          products.find(
            p =>
              Number(p.id) ===
              Number(item.id)
          );


        if (!product) {
          return "";
        }


        return `

          <div
            class="cartline"
          >

            <span>

              ${product.name}

              · Beden
              ${item.size || "M"}

              × ${item.qty}

            </span>


            <b>
              ${fmt(
                product.price *
                item.qty
              )}
            </b>

          </div>

        `;

      })
      .join("");


  const total =
    cart.reduce(
      (sum, item) => {

        const product =
          products.find(
            p =>
              Number(p.id) ===
              Number(item.id)
          );


        return (
          sum +
          (product?.price || 0) *
          item.qty
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
      Teslim
