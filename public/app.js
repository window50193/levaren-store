let products=[],cart=JSON.parse(localStorage.getItem("levaren_cart")||"[]").map(i=>({...i,size:i.size||"M"})),me=null;
const $=s=>document.querySelector(s),fmt=n=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n);
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"İşlem başarısız");return d}
async function boot(){products=await api("/api/products");me=(await api("/api/me")).user;render(products);updateCart()}
function render(list){
 const imageMap={1:"/assets/premium-gomlek.jpg",2:"/assets/premium-kumas-pantolon.jpg",3:"/assets/basic-slim-fit-gomlek.jpg",4:"/assets/premium-triko.jpg",5:"/assets/premium-blazer-ceket.jpg",6:"/assets/klasik-gomlek.jpg"};
 $("#productGrid").innerHTML=list.map(p=>`<article class="card" onclick="product(${p.id})"><div class="pic ai-pic" style="background-image:url('${imageMap[p.id]||"/assets/levaren-6-products-showcase.png"}')"></div><div class="info"><div><div>${p.name}</div><div class="meta">${p.category==="ust"?"Üst Giyim":p.category==="alt"?"Alt Giyim":"Aksesuar"} · ${p.stock} stok</div></div><b>${fmt(p.price)}</b></div></article>`).join("")
}
function product(id){
 const p=products.find(x=>x.id===id);
 if(!p)return;
 const sizes=p.sizes||["S","M","L","XL","XXL"].map(size=>({size,stock:0}));
 const firstAvailable=sizes.find(x=>x.stock>0)?.size;
 openModal(`<h2>${p.name}</h2><p>${p.description}</p><p><b>${fmt(p.price)}</b></p>
 <div class="form"><label>Beden</label><div class="sizes" id="sizes-${p.id}">
 ${sizes.map(x=>`<button type="button" data-size="${x.size}" class="size-btn ${x.size===firstAvailable?"selected":""}" ${x.stock<1?"disabled":""} onclick="pickSize(${p.id},'${x.size}')">${x.size}<small>${x.stock<1?" · Tükendi":""}</small></button>`).join("")}
 </div>
 <button class="btn" ${firstAvailable?"":"disabled"} onclick="add(${p.id},document.querySelector('#sizes-${p.id} .selected').dataset.size)">Sepete Ekle</button></div>`)
}
function pickSize(id,size){
 document.querySelectorAll(`#sizes-${id} .size-btn`).forEach(b=>b.classList.toggle("selected",b.dataset.size===size));
}

document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render(b.dataset.cat==="all"?products:products.filter(p=>p.category===b.dataset.cat))});
function add(id,size="M"){
 const normalized=String(size||"M").toUpperCase();
 const x=cart.find(i=>i.id===id&&i.size===normalized);
 if(x)x.qty++;else cart.push({id,qty:1,size:normalized});
 save();openCart()
}
function save(){localStorage.setItem("levaren_cart",JSON.stringify(cart));updateCart()}
function updateCart(){$("#cartCount").textContent=cart.reduce((a,x)=>a+x.qty,0)}
function openModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#accountBtn").onclick=()=>account();
$("#cartBtn").onclick=()=>cartModal();
function account(){openModal(me?`<h2>Merhaba ${me.first_name}</h2><p>${me.email}</p><button class="btn" onclick="orders()">Siparişlerim</button> <button class="btn" onclick="logout()">Çıkış Yap</button>`:`<h2>Hesabım</h2><div class="form"><input id="le" placeholder="E-posta"><input id="lp" type="password" placeholder="Şifre"><button onclick="login()">Giriş Yap</button><button onclick="registerForm()">Hesap Oluştur</button><button onclick="forgot()">Şifremi Unuttum</button></div>`)}
async function login(){try{await api("/api/login",{method:"POST",body:JSON.stringify({email:$("#le").value,password:$("#lp").value})});me=(await api("/api/me")).user;closeModal();alert("Giriş başarılı.");account()}catch(e){alert(e.message)}}
function registerForm(){openModal(`<h2>Hesap Oluştur</h2><div class="form"><div class="row"><input id="rf" placeholder="Ad"><input id="rl" placeholder="Soyad"></div><input id="re" placeholder="E-posta"><input id="rp" type="password" placeholder="Şifre (min. 8 karakter)"><input id="rphone" placeholder="Telefon"><button onclick="register()">Kayıt Ol</button></div>`)}
async function register(){try{await api("/api/register",{method:"POST",body:JSON.stringify({firstName:$("#rf").value,lastName:$("#rl").value,email:$("#re").value,password:$("#rp").value,phone:$("#rphone").value})});me=(await api("/api/me")).user;closeModal();alert("Hesabınız oluşturuldu.");account()}catch(e){alert(e.message)}}
async function logout(){await api("/api/logout",{method:"POST"});me=null;closeModal();account()}
function forgot(){openModal(`<h2>Şifre yenile</h2><div class="form"><input id="fe" placeholder="E-posta"><button onclick="sendReset()">Bağlantı Gönder</button></div>`)}
async function sendReset(){const d=await api("/api/forgot-password",{method:"POST",body:JSON.stringify({email:$("#fe").value})});alert(d.message);closeModal()}
async function orders(){try{const os=await api("/api/orders");openModal("<h2>Siparişlerim</h2>"+(os.length?os.map(o=>`<div class="cartline"><span>${o.order_no}<br><small>${o.status}</small></span><b>${fmt(o.total)}</b></div>`).join(""):"<p>Henüz sipariş yok.</p>"))}catch(e){alert(e.message)}}
function cartModal(){const rows=cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?`<div class="cartline"><span>${p.name} · Beden ${i.size||"M"} × ${i.qty}</span><b>${fmt(p.price*i.qty)}</b></div>`:""}).join("");const total=cart.reduce((s,i)=>s+(products.find(p=>p.id===i.id)?.price||0)*i.qty,0);openModal(`<h2>Sepetim</h2>${rows||"<p>Sepet boş.</p>"}<hr><p><b>Toplam: ${fmt(total)}</b></p>${cart.length?`<button class="btn" onclick="checkout()">Satın Almaya Devam Et</button>`:""}`)}
function checkout(){if(!me){account();return}openModal(`<h2>Teslimat</h2><div class="form"><input id="sn" value="${me.first_name+" "+me.last_name}" placeholder="Ad Soyad"><input id="sp" value="${me.phone||""}" placeholder="Telefon"><textarea id="sa" placeholder="Adres"></textarea><div class="row"><input id="sc" placeholder="Şehir"><input id="sz" placeholder="Posta Kodu"></div><button onclick="pay()">Ödemeye Geç</button></div>`)}
async function pay(){try{const d=await api("/api/checkout",{method:"POST",body:JSON.stringify({items:cart,shipping:{name:$("#sn").value,phone:$("#sp").value,address:$("#sa").value,city:$("#sc").value,zip:$("#sz").value}})});if(d.paymentConfigured){openModal(`<h2>Güvenli Ödeme</h2><div id="iyzipay-checkout-form" class="responsive"></div>${d.checkoutFormContent}`)}else{cart=[];save();openModal(`<h2>Sipariş oluşturuldu</h2><p>${d.message}</p><p>Sipariş no: <b>${d.orderNo}</b></p>`)} }catch(e){alert(e.message)}}
boot();
