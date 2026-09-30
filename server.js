require("dotenv").config();
const express=require("express");
const path=require("path");
const crypto=require("crypto");
const fs=require("fs");
const bcrypt=require("bcryptjs");
const Database=require("better-sqlite3");
const cookieParser=require("cookie-parser");
const Iyzipay=require("iyzipay");
const nodemailer=require("nodemailer");

const app=express();
const PORT=process.env.PORT||3000;
const dataDir=process.env.DB_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname,"data");
fs.mkdirSync(dataDir,{recursive:true});
const db=new Database(path.join(dataDir,"levaren.db"));
db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,
 first_name TEXT NOT NULL,last_name TEXT NOT NULL,phone TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions(
 token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,description TEXT,
 price INTEGER NOT NULL,category TEXT NOT NULL,stock INTEGER DEFAULT 0,image TEXT,active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,order_no TEXT UNIQUE NOT NULL,status TEXT DEFAULT 'pending',
 total INTEGER NOT NULL,shipping_name TEXT,shipping_phone TEXT,shipping_address TEXT,city TEXT,zip TEXT,
 payment_token TEXT,payment_id TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items(
 id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,product_id INTEGER NOT NULL,
 name TEXT NOT NULL,unit_price INTEGER NOT NULL,qty INTEGER NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS password_resets(
 token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);
try {
  const cols = db.prepare("PRAGMA table_info(order_items)").all();
  if (!cols.some(c => c.name === "size")) db.exec("ALTER TABLE order_items ADD COLUMN size TEXT DEFAULT 'M'");
} catch(e) { console.error("order_items migration:", e.message); }

db.exec(`
CREATE TABLE IF NOT EXISTS product_size_stock(
 product_id INTEGER NOT NULL,
 size TEXT NOT NULL,
 stock INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(product_id,size),
 FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
`);
const seed=[
["Premium Gömlek","premium-gomlek","LÉVAREN Premium Gömlek; modern kesimi ve yüksek kaliteli pamuk karışımlı kumaşıyla gün boyu konfor sunar.",2499,"ust",20,"/assets/premium-gomlek.jpg"],
["Premium Kumaş Pantolon","premium-kumas-pantolon","LÉVAREN Premium Kumaş Pantolon; modern kesimi ve esnek yapısıyla hareket özgürlüğü sunar.",2999,"alt",20,"/assets/premium-kumas-pantolon.jpg"],
["Basic Slim Fit Gömlek","basic-slim-fit-gomlek","Vücuda oturan modern kesimi ve minimalist tasarımıyla günlük kullanıma uygun zamansız siyah gömlek.",2299,"ust",20,"/assets/basic-slim-fit-gomlek.jpg"],
["Premium Triko","premium-triko","Yumuşak dokusu ve modern kesimiyle soğuk havalarda sıcak tutan, zamansız siyah triko.",2699,"ust",20,"/assets/premium-triko.jpg"],
["Premium Blazer Ceket","premium-blazer-ceket","Kaliteli kumaşı ve kusursuz kesimiyle özel davetlerden günlük şehir stiline kadar kullanılabilen modern blazer ceket.",4499,"ust",20,"/assets/premium-blazer-ceket.jpg"],
["Klasik Gömlek","klasik-gomlek","Sade ve zarif tasarımıyla her ortamda şıklığını koruyan, zamansız siyah klasik gömlek.",2199,"ust",20,"/assets/klasik-gomlek.jpg"]
];
const count=db.prepare("SELECT COUNT(*) c FROM products").get().c;
if(!count){const ins=db.prepare("INSERT INTO products(name,slug,description,price,category,stock,image) VALUES(?,?,?,?,?,?,?)");const tx=db.transaction(()=>seed.forEach(p=>ins.run(...p)));tx();}
// Keep the catalog in sync after redeploys, including an already-existing Railway database.
const syncProduct=db.prepare("UPDATE products SET name=?, description=?, price=?, category=?, stock=?, image=?, active=1 WHERE id=?");
seed.forEach((p,i)=>syncProduct.run(p[0],p[2],p[3],p[4],p[5],p[6],i+1));
if(db.prepare("SELECT id FROM products WHERE id=7").get()) db.prepare("UPDATE products SET active=0 WHERE id>=7").run();
const sizeSeed=db.prepare("INSERT OR IGNORE INTO product_size_stock(product_id,size,stock) VALUES(?,?,?)");
const allProducts=db.prepare("SELECT id,stock FROM products WHERE id<=6").all();
const seedSizes=db.transaction(()=>allProducts.forEach(p=>["S","M","L","XL","XXL"].forEach(sz=>seedSizesForProduct(p.id,sz,p.stock))));
function seedSizesForProduct(id,sz,total){ const existing=db.prepare("SELECT stock FROM product_size_stock WHERE product_id=? AND size=?").get(id,sz); if(!existing) { const each=Math.floor(total/5), extra=total%5; const n=each+(sz==="M"?extra:0); sizeSeed.run(id,sz,n); } }
seedSizes();

const adminEmail=(process.env.ADMIN_EMAIL||"admin@levaren.com").toLowerCase();
if(process.env.ADMIN_PASSWORD && !db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail)){
  const hash=bcrypt.hashSync(process.env.ADMIN_PASSWORD,12);
  db.prepare("INSERT INTO users(email,password_hash,first_name,last_name) VALUES(?,?,?,?)").run(adminEmail,hash,"LÉVAREN","Admin");
}

app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));

function user(req,res,next){
  const token=req.cookies.levaren_session;
  if(!token)return next();
  const s=db.prepare("SELECT * FROM sessions WHERE token=? AND expires_at>?").get(token,Date.now());
  if(s){req.user=db.prepare("SELECT id,email,first_name,last_name,phone FROM users WHERE id=?").get(s.user_id);}
  next();
}
app.use(user);
function auth(req,res,next){if(!req.user)return res.status(401).json({error:"Giriş yapmanız gerekiyor."});next();}
function admin(req,res,next){if(!req.user || req.user.email!==adminEmail)return res.status(403).json({error:"Yetkisiz erişim"});next();}
function clean(s){return String(s||"").trim();}
function money(n){return Number(n).toFixed(2);}

app.get("/api/me",(req,res)=>res.json({user:req.user||null}));
app.post("/api/register",async(req,res)=>{
  const first=clean(req.body.firstName), last=clean(req.body.lastName), email=clean(req.body.email).toLowerCase(), pass=String(req.body.password||""), phone=clean(req.body.phone);
  if(!first||!last||!email||pass.length<8)return res.status(400).json({error:"Ad, soyad, e-posta ve en az 8 karakterli şifre gerekli."});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Geçerli bir e-posta girin."});
  if(db.prepare("SELECT id FROM users WHERE email=?").get(email))return res.status(409).json({error:"Bu e-posta zaten kayıtlı."});
  const hash=await bcrypt.hash(pass,12);
  const info=db.prepare("INSERT INTO users(email,password_hash,first_name,last_name,phone) VALUES(?,?,?,?,?)").run(email,hash,first,last,phone);
  createSession(info.lastInsertRowid,res);
  res.json({ok:true});
});
app.post("/api/login",async(req,res)=>{
  const email=clean(req.body.email).toLowerCase(),pass=String(req.body.password||"");
  const u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if(!u || !(await bcrypt.compare(pass,u.password_hash)))return res.status(401).json({error:"E-posta veya şifre hatalı."});
  createSession(u.id,res);res.json({ok:true});
});
function createSession(userId,res){
  const token=crypto.randomBytes(32).toString("hex"),days=Number(process.env.SESSION_DAYS||14),exp=Date.now()+days*864e5;
  db.prepare("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)").run(token,userId,exp);
  res.cookie("levaren_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:days*864e5});
}
app.post("/api/logout",(req,res)=>{if(req.cookies.levaren_session)db.prepare("DELETE FROM sessions WHERE token=?").run(req.cookies.levaren_session);res.clearCookie("levaren_session");res.json({ok:true});});

app.post("/api/forgot-password",async(req,res)=>{
  const email=clean(req.body.email).toLowerCase(),u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
  // Always return the same message to avoid account enumeration.
  if(u){
    const token=crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO password_resets(token,user_id,expires_at) VALUES(?,?,?)").run(token,u.id,Date.now()+3600000);
    const link=`${process.env.BASE_URL||"http://localhost:3000"}/reset.html?token=${token}`;
    if(process.env.SMTP_HOST){
      const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT||587)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
      await transporter.sendMail({from:process.env.MAIL_FROM,to:u.email,subject:"LÉVAREN şifre yenileme",text:`Şifrenizi yenilemek için: ${link}`});
    } else console.log("PASSWORD RESET LINK:",link);
  }
  res.json({ok:true,message:"E-posta adresiniz kayıtlıysa şifre yenileme bağlantısı gönderildi."});
});
app.post("/api/reset-password",async(req,res)=>{
  const token=clean(req.body.token),pass=String(req.body.password||"");
  const r=db.prepare("SELECT * FROM password_resets WHERE token=? AND expires_at>?").get(token,Date.now());
  if(!r||pass.length<8)return res.status(400).json({error:"Geçersiz/expired token veya yetersiz şifre."});
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(await bcrypt.hash(pass,12),r.user_id);
  db.prepare("DELETE FROM password_resets WHERE token=?").run(token);
  res.json({ok:true});
});

app.get("/api/products",(req,res)=>{
  const rows=db.prepare("SELECT id,name,slug,description,price,category,stock,image FROM products WHERE active=1 ORDER BY id").all();
  const getSizes=db.prepare("SELECT size,stock FROM product_size_stock WHERE product_id=? ORDER BY CASE size WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 WHEN 'XL' THEN 4 WHEN 'XXL' THEN 5 END");
  res.json(rows.map(p=>({...p,sizes:getSizes.all(p.id)})));
});
app.get("/api/orders",auth,(req,res)=>{
  res.json(db.prepare("SELECT id,order_no,status,total,created_at FROM orders WHERE user_id=? ORDER BY id DESC").all(req.user.id));
});
app.get("/api/orders/:id",auth,(req,res)=>{
  const o=db.prepare("SELECT * FROM orders WHERE id=? AND user_id=?").get(req.params.id,req.user.id);
  if(!o)return res.status(404).json({error:"Sipariş bulunamadı."});
  o.items=db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);res.json(o);
});

app.post("/api/checkout",auth,async(req,res)=>{
  const items=Array.isArray(req.body.items)?req.body.items:[], ship=req.body.shipping||{};
  if(!items.length)return res.status(400).json({error:"Sepet boş."});
  const ids=items.map(x=>Number(x.id)).filter(Boolean);
  const products=db.prepare(`SELECT * FROM products WHERE id IN (${ids.map(()=>"?").join(",")}) AND active=1`).all(...ids);
  let total=0, normalized=[];
  for(const it of items){
    const p=products.find(x=>x.id===Number(it.id)),qty=Math.max(1,Math.min(20,Number(it.qty)||1));
    if(!p)return res.status(400).json({error:`Ürün bulunamadı.`});
    const selectedSize=clean(it.size).toUpperCase();
    if(!["S","M","L","XL","XXL"].includes(selectedSize))return res.status(400).json({error:`Beden seçin: ${p.name}`});
    const sizeRow=db.prepare("SELECT stock FROM product_size_stock WHERE product_id=? AND size=?").get(p.id,selectedSize);
    if(!sizeRow || sizeRow.stock<qty)return res.status(400).json({error:`${p.name} için ${selectedSize} bedeninde yeterli stok yok.`});
    total+=p.price*qty;normalized.push({p,qty,size:clean(it.size).toUpperCase()});
  }
  if(!ship.name||!ship.phone||!ship.address||!ship.city||!ship.zip)return res.status(400).json({error:"Teslimat bilgilerini doldurun."});
  const orderNo="LV"+Date.now().toString(36).toUpperCase()+crypto.randomBytes(2).toString("hex").toUpperCase();
  const tx=db.transaction(()=>{
    const o=db.prepare(`INSERT INTO orders(user_id,order_no,total,shipping_name,shipping_phone,shipping_address,city,zip) VALUES(?,?,?,?,?,?,?,?)`).run(req.user.id,orderNo,total,ship.name,ship.phone,ship.address,ship.city,ship.zip);
    const ins=db.prepare("INSERT INTO order_items(order_id,product_id,name,unit_price,qty,size) VALUES(?,?,?,?,?,?)");
    normalized.forEach(x=>ins.run(o.lastInsertRowid,x.p.id,x.p.name,x.p.price,x.qty,x.size));
    return Number(o.lastInsertRowid);
  });
  const orderId=tx();
  if(!process.env.IYZIPAY_API_KEY || !process.env.IYZIPAY_SECRET_KEY){
    return res.json({ok:true,orderId,orderNo,paymentConfigured:false,message:"Sipariş oluşturuldu. Ödeme sağlayıcısı henüz yapılandırılmadı."});
  }
  const iyzico=new Iyzipay({apiKey:process.env.IYZIPAY_API_KEY,secretKey:process.env.IYZIPAY_SECRET_KEY,uri:process.env.IYZIPAY_URI||"https://sandbox-api.iyzipay.com"});
  const addr={contactName:ship.name,city:ship.city,country:"Turkey",address:ship.address,zipCode:ship.zip};
  const request={
    locale:Iyzipay.LOCALE.TR,conversationId:orderNo,price:money(total),paidPrice:money(total),currency:Iyzipay.CURRENCY.TRY,basketId:orderNo,
    paymentGroup:Iyzipay.PAYMENT_GROUP.PRODUCT,callbackUrl:`${process.env.BASE_URL}/api/payment/callback`,
    enabledInstallments:["1","2","3","6","9"],
    buyer:{id:String(req.user.id),name:req.user.first_name,surname:req.user.last_name,gsmNumber:req.user.phone||ship.phone,email:req.user.email,
      identityNumber:"11111111111",registrationDate:"2026-01-01 00:00:00",registrationAddress:ship.address,ip:req.ip,city:ship.city,country:"Turkey",zipCode:ship.zip},
    shippingAddress:addr,billingAddress:addr,
    basketItems:normalized.map(x=>({id:String(x.p.id),name:x.p.name,category1:"Giyim",category2:x.p.category,itemType:Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,price:money(x.p.price*x.qty)}))
  };
  iyzico.checkoutFormInitialize.create(request,(err,result)=>{
    if(err||!result||result.status!=="success")return res.status(502).json({error:"Ödeme başlatılamadı.",detail:result?.errorMessage});
    db.prepare("UPDATE orders SET payment_token=? WHERE id=?").run(result.token,orderId);
    res.json({ok:true,orderId,orderNo,paymentConfigured:true,checkoutFormContent:result.checkoutFormContent});
  });
});
app.post("/api/payment/callback",(req,res)=>{
  const token=clean(req.body.token); if(!token)return res.redirect("/odeme-sonuc.html?status=failure");
  const iyzico=new Iyzipay({apiKey:process.env.IYZIPAY_API_KEY,secretKey:process.env.IYZIPAY_SECRET_KEY,uri:process.env.IYZIPAY_URI||"https://sandbox-api.iyzipay.com"});
  iyzico.checkoutForm.retrieve({locale:Iyzipay.LOCALE.TR,conversationId:"",token},(err,result)=>{
    const order=db.prepare("SELECT * FROM orders WHERE payment_token=?").get(token);
    if(order && result?.paymentStatus==="SUCCESS" && result?.status==="success"){
      const tx=db.transaction(()=>{
        db.prepare("UPDATE orders SET status='paid',payment_id=? WHERE id=?").run(result.paymentId,order.id);
        const its=db.prepare("SELECT * FROM order_items WHERE order_id=?").all(order.id);
        its.forEach(i=>{
          db.prepare("UPDATE product_size_stock SET stock=MAX(0,stock-?) WHERE product_id=? AND size=?").run(i.qty,i.product_id,i.size);
          db.prepare("UPDATE products SET stock=MAX(0,stock-?) WHERE id=?").run(i.qty,i.product_id);
        });
      });tx();
      return res.redirect(`/odeme-sonuc.html?status=success&order=${order.order_no}`);
    }
    if(order)db.prepare("UPDATE orders SET status='payment_failed' WHERE id=?").run(order.id);
    res.redirect(`/odeme-sonuc.html?status=failure`);
  });
});

app.get("/api/admin/orders",admin,(req,res)=>res.json(db.prepare("SELECT o.*,u.email FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.id DESC").all()));
app.get("/api/admin/products",admin,(req,res)=>{
  const ps=db.prepare("SELECT * FROM products ORDER BY id").all();
  const gs=db.prepare("SELECT size,stock FROM product_size_stock WHERE product_id=? ORDER BY size");
  res.json(ps.map(p=>({...p,sizes:gs.all(p.id)})));
});
app.patch("/api/admin/products/:id",admin,(req,res)=>{
  const allowed=["name","price","stock","description","category","active"];
  if(req.body.sizes && typeof req.body.sizes==="object"){
    const up=db.prepare("INSERT INTO product_size_stock(product_id,size,stock) VALUES(?,?,?) ON CONFLICT(product_id,size) DO UPDATE SET stock=excluded.stock");
    const tx=db.transaction(()=>Object.entries(req.body.sizes).forEach(([size,stock])=>{
      if(["S","M","L","XL","XXL"].includes(size)) up.run(req.params.id,size,Math.max(0,Number(stock)||0));
    }));
    tx();
    const total=db.prepare("SELECT COALESCE(SUM(stock),0) total FROM product_size_stock WHERE product_id=?").get(req.params.id).total;
    db.prepare("UPDATE products SET stock=? WHERE id=?").run(total,req.params.id);
  }
  const fields=allowed.filter(k=>req.body[k]!==undefined);
  if(!fields.length)return res.status(400).json({error:"Değişiklik yok."});
  const sql="UPDATE products SET "+fields.map(k=>`${k}=?`).join(",")+" WHERE id=?";db.prepare(sql).run(...fields.map(k=>req.body[k]),req.params.id);res.json({ok:true});
});

app.use((req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.get("/health",(req,res)=>res.json({ok:true,service:"levaren"}));
app.listen(PORT,()=>console.log(`LÉVAREN running on http://localhost:${PORT}`));
