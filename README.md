# LÉVAREN — gerçek e-ticaret altyapısı

Bu sürüm frontend demosundan full-stack Node.js + SQLite altyapısına yükseltilmiştir.

## Özellikler
- Kayıt / giriş / çıkış
- Şifre hashleme
- Şifre sıfırlama altyapısı (SMTP bağlanınca e-posta gönderir)
- Kullanıcı hesabı ve siparişlerim
- Ürün / stok veritabanı
- Sipariş oluşturma
- iyzico Checkout Form + callback altyapısı
- Admin sipariş ekranı
- Responsive LÉVAREN tasarımı

## Kurulum
1. Node.js 20+ kur.
2. Terminalde klasörde `npm install`
3. `.env.example` dosyasını `.env` olarak kopyala.
4. Admin şifresini değiştir.
5. `npm start`
6. `http://localhost:3000`

## Gerçek ödeme
iyzico hesabından API Key ve Secret Key alıp `.env` içine gir. Önce sandbox ile test et; canlıya geçerken canlı API anahtarlarını ve `https://api.iyzipay.com` adresini kullan. Canlı domain/HTTPS ve iyzico işyeri onayı gerekir.

## Yayına alma
Bu uygulama Node.js çalıştırabilen bir sunucuda yayınlanmalıdır. Domain + HTTPS + veritabanı yedekleme + e-posta SMTP ayarları yapılmalıdır.


## AI ürün görselleri
`public/assets/levaren-collection-ai.png` LÉVAREN koleksiyon görselidir. Ürün kartları bu görselin ilgili bölümlerini kırparak kullanır. Canlı satış öncesinde her ürün için ayrı yüksek çözünürlüklü ürün görselleri üretmek önerilir.


## AI ürün görselleri
6 ürün için ayrı görseller `public/assets/` içine eklenmiştir ve ürün kartları ile detay ekranlarına bağlanmıştır.


## Beden sistemi
Ürün detayında S / M / L / XL / XXL seçilebilir. Seçilen beden sepete kaydedilir ve sipariş kalemine aktarılır. Mevcut veritabanı kullanılıyorsa `order_items` tablosuna `size` alanı otomatik olarak eklenir.

\n## Canlı satışa geçmeden önce
1. `.env` içine canlı iyzico API Key/Secret Key gir.
2. `IYZIPAY_URI=https://api.iyzipay.com` yap.
3. `BASE_URL` değerini HTTPS kullanan gerçek domain yap.
4. SMTP bilgilerini gir.
5. `ADMIN_PASSWORD` için güçlü benzersiz şifre belirle.
6. Sandbox testlerini tamamla, sonra canlı ödeme aç.
7. Admin panelinden her ürünün S/M/L/XL/XXL stoklarını ayarla.


## Railway ile yayınlama
Bu proje SQLite kullandığı için Railway'de `/data` mount path'li bir Volume bağlayın ve `DB_DIR=/data` değişkenini ekleyin. Railway dokümantasyonunda Volume'ların deploy ve restart'lar arasında kalıcı veri tuttuğu belirtiliyor. Uygulama `/health` endpoint'i ile health check verir.
