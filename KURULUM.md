# 🔄 RetroBoard — Kurulum & Deploy Rehberi

## Genel Bakış
Bu proje **React + Firebase Realtime Database + Vercel** üzerine kurulu.
Firebase gerçek zamanlı sync sağlar (polling yok), Vercel ücretsiz hosting verir.

---

## 1. Firebase Projesi Oluştur (5 dakika)

### 1.1 Firebase Console'a git
1. [console.firebase.google.com](https://console.firebase.google.com) adresine git
2. **"Create a project"** tıkla
3. Proje adı gir (örn: `retroboard-hakan`), devam et
4. Google Analytics → isteğe bağlı, kapatabilirsin → **Create project**

### 1.2 Realtime Database oluştur
1. Sol menüde **Build → Realtime Database** tıkla
2. **"Create database"** tıkla
3. Lokasyon seç (örn: `europe-west1` — Avrupa'ya yakın)
4. Security rules: **"Start in test mode"** seç (30 gün açık, sonra güvenlik ekleyeceğiz)
5. **Enable** tıkla

### 1.3 Firebase Config bilgilerini al
1. Sol üstte ⚙️ **Project Settings** tıkla
2. Aşağı kaydır → **"Your apps"** bölümü → **"</>"** (Web) tıkla
3. App nickname gir (örn: `retroboard-web`) → **Register app**
4. Çıkan `firebaseConfig` nesnesini kopyala — bir sonraki adımda kullanacaksın

---

## 2. Kodu Yapılandır

### 2.1 Projeyi klonla / indir
```bash
# Bu klasörü bilgisayarına kopyala
cd RetroBoard
```

### 2.2 Firebase Config'i yapıştır
`src/App.jsx` dosyasını aç, en üstteki `firebaseConfig` nesnesini kendi bilgilerinle doldur:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",           // ← Firebase'den kopyala
  authDomain:        "retroboard-hakan.firebaseapp.com",
  databaseURL:       "https://retroboard-hakan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "retroboard-hakan",
  storageBucket:     "retroboard-hakan.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

> ⚠️ `databaseURL` mutlaka doğru olmalı — Firebase Console → Realtime Database sayfasından kopyala

### 2.3 Bağımlılıkları yükle
```bash
npm install
```

### 2.4 Lokal test et
```bash
npm run dev
```
Tarayıcıda `http://localhost:5173` aç — uygulama çalışıyor olmalı.

---

## 3. Güvenlik Kuralları (Önemli!)

Firebase Console → Realtime Database → **Rules** sekmesine git, şu kuralları yapıştır:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> 💡 Bu kurallar herkesin oda okuyup yazmasına izin verir — küçük ekipler için yeterli.
> Daha güvenli hale getirmek istersen Firebase Authentication ekleyebilirsin (ileride).

---

## 4. Vercel'e Deploy Et (5 dakika)

### 4.1 GitHub'a yükle
```bash
git init
git add .
git commit -m "Initial RetroBoard"
# GitHub'da yeni repo aç, sonra:
git remote add origin https://github.com/KULLANICIN/retroboard.git
git push -u origin main
```

### 4.2 Vercel'e bağla
1. [vercel.com](https://vercel.com) → GitHub ile giriş yap
2. **"New Project"** → GitHub reposunu seç
3. Framework: **Vite** (otomatik algılar)
4. **Deploy** tıkla → ~1 dakikada canlıya alır

### 4.3 Canlı URL
Deploy sonrası Vercel sana bir URL verir:
```
https://retroboard-hakan.vercel.app
```

Bu URL'yi takımınla paylaş. Artık herkes kullanabilir! 🎉

---

## 5. Özel Domain (Opsiyonel)

Vercel ücretsiz planıyla `retroboard-hakan.vercel.app` URL'si kullanabilirsin.
Kendi domainini bağlamak istersen: Vercel → Project → Settings → Domains.

---

## Proje Yapısı

```
RetroBoard/
├── index.html          ← jsPDF CDN dahil
├── package.json        ← bağımlılıklar
├── vite.config.js      ← Vite ayarları
└── src/
    ├── main.jsx        ← React entry point
    └── App.jsx         ← Tüm uygulama kodu (Firebase dahil)
```

---

## Özellikler

| Özellik | Detay |
|---------|-------|
| 🔥 Realtime sync | Firebase Realtime DB — polling yok, anlık güncelleme |
| 🔢 Puan sistemi | Default: 1,2,4,5 (3 yok) — host isterse 3'ü açabilir |
| 🔗 Link paylaşımı | URL hash ile oda ID'si — link = davet |
| 👁️ Gizli girişler | Host "Reveal" diyene kadar kimse kimseyi göremez |
| 🃏 Drag & drop | Kartları Stop/Start/Continue arasında sürükle |
| ⚡ Actions | Her kolona aksiyon ekle |
| 📥 PDF export | Tüm retro tek PDF'e |
| 🏗️ Built by Hakan | Footer'da gözüküyor 😄 |

---

## Sorun Giderme

**"Room not found" hatası:**
→ `databaseURL` yanlış olabilir. Firebase Console → Realtime Database'den kontrol et.

**Veriler kaydedilmiyor:**
→ Firebase Security Rules'u kontrol et. "test mode" aktif mi?

**PDF inmiyor:**
→ `index.html`'de jsPDF CDN yüklü olmalı. Adblocker engelliyor olabilir.

---

## Maliyet

| Servis | Plan | Maliyet |
|--------|------|---------|
| Firebase Realtime DB | Spark (ücretsiz) | 1GB depo, 10GB/ay transfer — yeterli |
| Vercel | Hobby (ücretsiz) | Unlimited deploys, 100GB bandwidth |
| **Toplam** | | **$0 / ay** ✅ |
