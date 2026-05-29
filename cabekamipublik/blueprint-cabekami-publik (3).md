# Blueprint CabeKami Publik
> Kerangka Website Publik — Company Profile & Portofolio Bisnis
> Single Page Application (SPA) | HTML5 + CSS3 + Vanilla JS
> Versi: 1.0 | Last Updated: 2026-05-29

---

## Daftar Isi
1. [Gambaran Umum](#1-gambaran-umum)
2. [Konsep & Tujuan Website](#2-konsep--tujuan-website)
3. [Arsitektur SPA](#3-arsitektur-spa)
4. [Struktur Halaman & Sections](#4-struktur-halaman--sections)
5. [Desain & UI Components](#5-desain--ui-components)
6. [Konten & Copywriting](#6-konten--copywriting)
7. [Fitur Interaktif](#7-fitur-interaktif)
8. [Tech Stack & File Structure](#8-tech-stack--file-structure)
9. [Tema & Branding](#9-tema--branding)
10. [SEO & Performance](#10-seo--performance)
11. [Catatan Pengembangan](#11-catatan-pengembangan)

---

## 1. Gambaran Umum

```
CABEKAMI PUBLIK — COMPANY PROFILE / PORTFOLIO SPA
│
└── Single Page Application (1 file HTML)
    │
    ├── #hero          → Identitas & tagline utama
    ├── #tentang        → Tentang perusahaan / cerita kami
    ├── #keunggulan     → Kelebihan & differentiator
    ├── #produk         → Showcase produk unggulan
    ├── #teknologi      → Teknologi yang digunakan (IoT, Greenhouse)
    ├── #proses         → Alur dari kebun ke tangan pelanggan
    ├── #testimoni      → Ulasan & kepercayaan pelanggan
    ├── #portofolio     → Pencapaian & angka bisnis
    └── #kontak         → CTA & informasi kontak
```

**Target Audience:**
- Calon pembeli yang ingin mengenal CabeKami lebih dalam
- Investor / mitra bisnis yang mencari profil perusahaan
- Media / pers yang membutuhkan informasi bisnis
- Siapa pun yang diarahkan via link / QR code / brosur

**Tujuan Utama:**
- Membangun kepercayaan (trust building)
- Menampilkan kelebihan kompetitif
- Mendorong kontak / pembelian pertama
- Menampilkan identitas brand yang profesional

---

## 2. Konsep & Tujuan Website

### 2.1 Positioning Brand

```
CabeKami bukan sekadar penjual cabe.
CabeKami adalah produsen cabe segar berbasis teknologi greenhouse
yang mengutamakan kualitas, kebersihan, dan konsistensi hasil panen.
```

### 2.2 Tone & Voice
- **Profesional namun hangat** — seperti petani modern yang melek teknologi
- **Percaya diri** — angka dan data nyata, bukan klaim kosong
- **Lokal & autentik** — bangga produk dalam negeri, Bahasa Indonesia yang rapi

### 2.3 Pembeda dari Website E-Commerce (Fayseri)

| Aspek | CabeKami Publik (ini) | Fayseri E-Commerce |
|---|---|---|
| **Fungsi** | Company profile, portofolio | Jualan & manajemen toko |
| **Audience** | Semua orang, mitra, media | Calon pembeli aktif |
| **Aksi Utama** | Hubungi kami, kenal kami | Beli sekarang |
| **Konten** | Cerita brand, teknologi, prestasi | Produk, harga, stok |
| **Login** | Tidak ada | Ada (user & admin) |
| **Database** | Statis / CMS ringan | Supabase real-time |

---

## 3. Arsitektur SPA

### 3.1 Pola Navigasi Single Page Application

```
index.html (satu file)
│
├── <head>        → Meta, CSS, Fonts, Icons
│
└── <body>
    ├── <nav>     → Fixed navbar (smooth scroll anchor)
    │
    ├── <main>
    │   ├── <section id="hero">
    │   ├── <section id="tentang">
    │   ├── <section id="keunggulan">
    │   ├── <section id="produk">
    │   ├── <section id="teknologi">
    │   ├── <section id="proses">
    │   ├── <section id="testimoni">
    │   ├── <section id="portofolio">
    │   └── <section id="kontak">
    │
    └── <footer>
```

### 3.2 Navigasi SPA

- **Anchor links** (`href="#section-id"`) — navigasi scroll antar section
- **Smooth scrolling** via CSS `scroll-behavior: smooth`
- **Active nav highlight** — JS IntersectionObserver deteksi section aktif
- **Back to top button** — muncul setelah scroll 300px
- **URL hash update** — update `#section` di browser saat scroll
- **Mobile hamburger menu** — collapse/expand pada layar < 768px

### 3.3 Scroll Behavior

```javascript
// Contoh IntersectionObserver untuk active nav
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.remove('active'));
      const activeLink = document.querySelector(
        `.nav-link[href="#${entry.target.id}"]`
      );
      if (activeLink) activeLink.classList.add('active');
    }
  });
}, { threshold: 0.5 });

sections.forEach(section => observer.observe(section));
```

---

## 4. Struktur Halaman & Sections

### 4.1 Navbar (Fixed Top)

```
┌────────────────────────────────────────────────────────────┐
│  🌶️ CabeKami  │ Tentang │ Keunggulan │ Produk │ Teknologi  │
│               │ Proses  │ Testimoni  │ Kontak │  [Pesan]   │
└────────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Logo: "🌶️ CabeKami" + tagline kecil (opsional)
- Nav links: anchor scroll ke masing-masing section
- CTA Button: "Pesan Sekarang" → link ke WhatsApp atau Fayseri E-Commerce
- Background: transparan saat di hero, solid saat scroll ke bawah
- Sticky / `position: fixed`
- Mobile: hamburger menu (slide-down dropdown)

---

### 4.2 Section 1: Hero

**Tujuan:** Kesan pertama yang kuat, identitas brand langsung tersampaikan.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [BADGE: "Greenhouse Teknologi IoT"]                        │
│                                                              │
│   Cabe Segar, Bersih,                                        │
│   Langsung dari Kebun Kami                                   │
│                                                              │
│   Dari greenhouse presisi milik Fayseri,                     │
│   setiap cabe yang kami jual tumbuh dalam                    │
│   kondisi terkontrol — bebas pestisida berlebih,             │
│   konsisten rasanya, terjamin kesegarannya.                  │
│                                                              │
│   [Kenali Kami ↓]    [Lihat Produk]                         │
│                                                              │
│   ─── 500+ pelanggan  │  4.9 ⭐ rating  │  3 Tahun berdiri ─ │
└──────────────────────────────────────────────────────────────┘
```

**Elemen:**
- Hero badge (pill): e.g. `"✅ Langsung dari Greenhouse Fayseri"`
- Headline (H1): Bold, besar, 2–3 baris
- Subheadline: Deskripsi singkat nilai produk, maks 3 kalimat
- CTA Primary: `"Kenali Kami"` → smooth scroll ke #tentang
- CTA Secondary: `"Lihat Produk"` → smooth scroll ke #produk
- Stats strip: 3 angka kunci (pelanggan, rating, tahun berdiri)
- Background: Foto / ilustrasi greenhouse / cabe segar (high-quality)
- Overlay gelap transparan untuk readability teks

---

### 4.3 Section 2: Tentang Kami

**Tujuan:** Membangun koneksi emosional, menceritakan asal-usul dan misi.

**Konten:**
- Judul: `"Dari Tanah Fayseri, untuk Dapur Indonesia"`
- Narasi singkat: Siapa kami, kapan berdiri, apa yang kami percayai
- Foto pendiri / tim / kebun (1–2 foto)
- Visi & Misi (2 kolom atau card):
  - **Visi:** Menjadi produsen cabe segar terpercaya berbasis teknologi di Indonesia
  - **Misi:** 3–4 poin singkat (kualitas, teknologi, kepercayaan, keberlanjutan)

**Layout:**
```
[Foto Kebun / Tim]    |    Tentang Kami
                      |    Teks narasi...
                      |    
                      |    [Visi]    [Misi]
```

---

### 4.4 Section 3: Keunggulan Kami

**Tujuan:** Menampilkan differentiator kompetitif secara visual dan ringkas.

**Format:** Grid 3 atau 4 kartu (icon + judul + deskripsi)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  🏭         │  │  🌿         │  │  📊         │  │  🚚         │
│ Greenhouse  │  │ Bebas       │  │ Teknologi   │  │ Pengiriman  │
│ Terkontrol  │  │ Pestisida   │  │ IoT Presisi │  │ Hari Ini    │
│             │  │ Berlebih    │  │             │  │             │
│ Tumbuh di   │  │ Proses      │  │ Sensor suhu,│  │ Order pagi, │
│ lingkungan  │  │ bersih dari │  │ kelembaban, │  │ sampai sore.│
│ steril...   │  │ benih...    │  │ nutrisi...  │  │ Garansi...  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

**6 Keunggulan yang Bisa Ditonjolkan:**

| # | Judul | Ikon | Poin Utama |
|---|-------|------|------------|
| 1 | Greenhouse Steril | 🏭 | Lingkungan terkontrol, bebas hama luar |
| 2 | Bebas Residu Berlebih | 🌿 | Proses tanam bersih, aman dikonsumsi |
| 3 | Teknologi IoT | 📡 | Sensor real-time: suhu, kelembaban, nutrisi |
| 4 | Panen Konsisten | 📅 | Jadwal panen teratur, stok selalu ada |
| 5 | Pengiriman Cepat | 🚚 | Kirim hari yang sama (area tertentu) |
| 6 | Harga Transparan | 💰 | Tidak ada biaya tersembunyi |

---

### 4.5 Section 4: Produk Unggulan

**Tujuan:** Showcase produk terbaik (bukan katalog lengkap — itu di Fayseri).

**Format:** Grid 3–4 kartu produk showcase

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   [Foto Produk]     │  │   [Foto Produk]     │  │   [Foto Produk]     │
│                     │  │                     │  │                     │
│ Cabe Merah Keriting │  │   Cabe Rawit Hijau  │  │  Cabe Hijau Besar   │
│ Rp 45.000 / kg      │  │   Rp 60.000 / kg   │  │  Rp 35.000 / kg    │
│ ⭐ 4.9 | Bestseller │  │   ⭐ 4.8 | Favorit  │  │  ⭐ 4.7 | Segar    │
│ [Lihat Detail]      │  │   [Lihat Detail]    │  │  [Lihat Detail]    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

              [ Lihat Semua Produk → ] (link ke Fayseri E-Commerce)
```

**Spesifikasi Kartu Produk:**
- Gambar produk (rasio 1:1 atau 4:3)
- Nama produk
- Harga per kg (format IDR)
- Rating bintang
- Badge: `"Bestseller"` / `"Favorit"` / `"New"`
- Tombol: `"Lihat Detail"` → link ke halaman produk di Fayseri
- Data produk: statis (hardcoded) atau fetch ringan dari Supabase

---

### 4.6 Section 5: Teknologi Kami

**Tujuan:** Memperkuat kepercayaan dengan bukti bahwa proses produksi berbasis sains.

**Format:** Layout split (teks kiri, visual kanan) + infografis proses

```
Teknologi yang Membuat Perbedaan

Greenhouse Fayseri menggunakan sistem IoT terpadu
yang memantau kondisi tanaman 24 jam sehari:

🌡️  Sensor Suhu & Kelembaban         → Akurasi ±0.1°C
💧  Irigasi Otomatis (Drip System)   → Hemat air 40%
🧪  Nutrisi Terkontrol (Hidroponik)  → Hasil optimal
📷  Kamera Pantau Tanaman            → Deteksi dini penyakit
📊  Dashboard Real-time              → Data setiap 5 menit

[Ilustrasi / Diagram Greenhouse]
```

**Elemen Visual:**
- Diagram atau ilustrasi greenhouse (SVG atau gambar)
- List fitur teknologi dengan ikon
- Angka spesifik (bukan klaim abstrak)
- Foto nyata greenhouse / peralatan IoT (jika ada)

---

### 4.7 Section 6: Alur Dari Kebun ke Tangan Anda

**Tujuan:** Transparansi proses — membangun kepercayaan pembeli.

**Format:** Timeline / steps horizontal (atau vertikal di mobile)

```
   🌱          🌶️          🔍          📦          🚚          🏠
Benih       Tanam &      Panen &     Sortir &    Kirim       Tiba di
Unggul      Rawat        Cek Mutu    Kemas       Hari Ini    Tangan Anda

[Langkah 1] [Langkah 2] [Langkah 3] [Langkah 4] [Langkah 5] [Langkah 6]
```

**6 Langkah Proses:**

| Step | Ikon | Judul | Deskripsi Singkat |
|------|------|-------|-------------------|
| 1 | 🌱 | Benih Unggul | Dipilih dari varietas terbaik, bersertifikat |
| 2 | 🏭 | Tanam di Greenhouse | Lingkungan steril, sensor IoT aktif 24 jam |
| 3 | 💧 | Rawat dengan Presisi | Irigasi & nutrisi otomatis, dipantau harian |
| 4 | 🌶️ | Panen Tepat Waktu | Dipanen pada tingkat kematangan optimal |
| 5 | 🔍 | Sortir & Kemas | Dicuci, disortir kualitas, dikemas higienis |
| 6 | 🚚 | Kirim ke Anda | Dikirim langsung, hari yang sama |

---

### 4.8 Section 7: Testimoni Pelanggan

**Tujuan:** Social proof — bukti nyata kepuasan pelanggan.

**Format:** Grid kartu testimoni (3 kolom desktop, 1 kolom mobile)

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ ⭐⭐⭐⭐⭐              │  │ ⭐⭐⭐⭐⭐              │  │ ⭐⭐⭐⭐⭐              │
│                        │  │                        │  │                        │
│ "Cabe rawit dari       │  │ "Kualitas konsisten,   │  │ "Sudah 6 bulan         │
│  CabeKami rasanya      │  │  tiap order selalu     │  │  langganan, belum      │
│  mantap, segar         │  │  dapat yang bagus.     │  │  pernah kecewa.        │
│  dan bersih!"          │  │  Recommended!"         │  │  Pengiriman cepat."    │
│                        │  │                        │  │                        │
│ — Ibu Sari, Jambi      │  │ — Pak Andi, Palembang  │  │ — Bu Dewi, Jambi       │
│   Ibu Rumah Tangga     │  │   Pemilik Warung       │  │   Chef Restoran        │
└────────────────────────┘  └─────────────────────── ┘  └────────────────────────┘
```

**Spesifikasi:**
- Minimal 3 testimoni, ideal 6 testimoni
- Rating bintang (1–5)
- Kutipan singkat (maks 3 kalimat)
- Nama + kota + profesi/peran
- Foto avatar (opsional, bisa inisial avatar)
- Sumber: Google Review / WhatsApp / langsung dari pelanggan

---

### 4.9 Section 8: Angka & Pencapaian (Portofolio)

**Tujuan:** Memperkuat kredibilitas dengan data nyata.

**Format:** Stats banner / counter section

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│    500+          4.9/5          3 Tahun         98%       │
│  Pelanggan      Rating        Berdiri         Puas        │
│   Aktif         Rata-rata     Sejak 2023     Pelanggan    │
│                                                           │
│    50+           12+           100%           24 Jam      │
│  Pesanan/       Varietas      Greenhouse     Pantau       │
│   Bulan         Produk         Steril         IoT         │
└───────────────────────────────────────────────────────────┘
```

**Animasi Counter:**
- Angka berjalan dari 0 → nilai target saat section masuk viewport
- Trigger via IntersectionObserver
- Duration: 1.5–2 detik per counter

```javascript
// Contoh counter animation
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    el.textContent = Math.floor(start);
    if (start >= target) {
      el.textContent = target;
      clearInterval(timer);
    }
  }, 16);
}
```

---

### 4.10 Section 9: Kontak & CTA

**Tujuan:** Mendorong aksi — hubungi atau beli.

**Format:** 2 kolom (info kontak + form sederhana atau CTA besar)

```
┌──────────────────────────────────────────────────────────┐
│              Siap Mencicipi Kualitas Kami?               │
│                                                          │
│    Hubungi kami sekarang atau langsung pesan via         │
│                 toko online kami.                        │
│                                                          │
│  [💬 Chat WhatsApp]    [🛒 Pesan Sekarang]              │
│                                                          │
│  ─────────────────────────────────────────────────       │
│  📍 Jambi, Indonesia                                     │
│  📱 +62 8xx-xxxx-xxxx                                   │
│  📧 hello@cabekami.id                                   │
│  ⏰ Senin–Sabtu, 08.00–20.00 WIB                        │
└──────────────────────────────────────────────────────────┘
```

**Elemen:**
- Headline CTA besar
- Dua tombol: WhatsApp + Toko Online (Fayseri)
- Info kontak lengkap (alamat, telepon, email, jam)
- Embed Google Maps (opsional)
- Social media icons (Instagram, TikTok, Facebook)

---

### 4.11 Footer

```
┌──────────────────────────────────────────────────────────┐
│  🌶️ CabeKami               Navigasi                      │
│  Cabe segar langsung        Tentang Kami                 │
│  dari greenhouse Fayseri    Produk Kami                  │
│  untuk dapur Indonesia.     Teknologi                    │
│                             Cara Pesan                   │
│  Ikuti Kami:                Kontak                       │
│  [IG] [TikTok] [FB]                                      │
│  ─────────────────────────────────────────────────────── │
│  © 2026 CabeKami by Fayseri. All rights reserved.       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Desain & UI Components

### 5.1 Layout System

```css
/* Grid system: 12 kolom, max-width 1200px */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Section spacing */
section {
  padding: 80px 0;           /* Desktop */
}
@media (max-width: 768px) {
  section { padding: 48px 0; }
}
```

### 5.2 Breakpoints

| Nama | Range | Layout |
|------|-------|--------|
| Mobile | < 480px | 1 kolom, stacked |
| Tablet | 480–768px | 2 kolom |
| Laptop | 768–1024px | 2–3 kolom |
| Desktop | > 1024px | 3–4 kolom |

### 5.3 Komponen Reusable

**Card Keunggulan:**
```html
<div class="card-feature">
  <div class="card-icon">🏭</div>
  <h3 class="card-title">Greenhouse Steril</h3>
  <p class="card-desc">Lingkungan terkontrol, bebas hama dari luar...</p>
</div>
```

**Badge / Pill:**
```html
<span class="badge badge-green">✅ Greenhouse Verified</span>
<span class="badge badge-blue">🔵 Teknologi IoT</span>
```

**Stats Counter:**
```html
<div class="stat-item">
  <span class="stat-number" data-target="500">0</span>
  <span class="stat-suffix">+</span>
  <p class="stat-label">Pelanggan Aktif</p>
</div>
```

**Tombol / Button:**
```html
<!-- Primary -->
<button class="btn btn-primary">Pesan Sekarang</button>

<!-- Secondary / Outline -->
<button class="btn btn-outline">Kenali Kami</button>

<!-- WhatsApp -->
<a href="https://wa.me/62xxx" class="btn btn-whatsapp">
  💬 Chat WhatsApp
</a>
```

### 5.4 Animasi & Transisi

**Scroll Reveal (Fade In):**
- Elemen masuk viewport → fade in dari bawah
- Delay berbeda tiap elemen dalam satu baris (stagger)
- Library: vanilla JS IntersectionObserver (no library needed)

```javascript
const revealElements = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.15 });
revealElements.forEach(el => revealObserver.observe(el));
```

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}
```

**Hover Effects:**
- Card: `transform: translateY(-4px)` + shadow increase
- Button: background darken + scale 1.02
- Nav link: underline slide animation

---

## 6. Konten & Copywriting

### 6.1 Headline Alternatif (pilih salah satu)

| # | Headline H1 | Tone |
|---|-------------|------|
| 1 | "Cabe Segar, Bersih, Langsung dari Kebun Kami" | Simpel & langsung |
| 2 | "Dari Greenhouse Fayseri untuk Dapur Indonesia" | Story & emosional |
| 3 | "Kualitas Bintang Lima, Harga Petani" | Value proposition |
| 4 | "Teknologi Greenhouse. Rasa Autentik." | Kontras modern vs tradisional |

### 6.2 Tagline Pilihan

- `"Segar. Bersih. Terpercaya."`
- `"Dari kebun kami, untuk masakan terbaik Anda."`
- `"Cabe presisi untuk selera tinggi."`

### 6.3 Meta Description (SEO)

```
CabeKami — Produsen cabe segar berbasis teknologi greenhouse IoT di Jambi.
Cabe merah, rawit, dan hijau segar langsung dari kebun, tanpa perantara.
Bebas pestisida berlebih, konsisten, dan dikirim hari ini.
```

---

## 7. Fitur Interaktif

### 7.1 Smooth Scroll Navigation

- Klik nav link → scroll smooth ke section
- Update URL hash (`#tentang`, `#produk`, dll.)
- Navbar highlight section aktif

### 7.2 Sticky Navbar dengan Glassmorphism Scroll

```css
nav {
  position: fixed;
  top: 0;
  transition: background 0.3s, backdrop-filter 0.3s, box-shadow 0.3s;
}
nav.scrolled {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 20px rgba(0,0,0,0.08);
}
```

### 7.3 Counter Animation

- Trigger saat section #portofolio masuk viewport
- Hitung dari 0 ke target dalam 1.5–2 detik
- Easing: ease-out (melambat di akhir)

### 7.4 Scroll Reveal

- Semua card dan elemen penting: fade-in dari bawah saat terlihat
- Stagger delay (50–100ms per elemen dalam baris)

### 7.5 Mobile Hamburger Menu

```javascript
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  hamburger.classList.toggle('active');
});

// Tutup menu saat klik nav link
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    hamburger.classList.remove('active');
  });
});
```

### 7.6 Back to Top Button

```javascript
const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 300);
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
```

### 7.7 WhatsApp CTA Button (Floating)

```html
<a href="https://wa.me/62xxx?text=Halo%20CabeKami%2C%20saya%20ingin%20tanya..."
   class="floating-wa" target="_blank" rel="noopener">
  💬
</a>
```

```css
.floating-wa {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  background: #25D366;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
  z-index: 999;
  transition: transform 0.2s;
}
.floating-wa:hover { transform: scale(1.1); }
```

---

## 8. Tech Stack & File Structure

### 8.1 Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Markup | HTML5 | Semantic HTML, aksesibilitas |
| Styling | CSS3 | CSS Variables, Flexbox, Grid |
| Script | Vanilla JS (ES6+) | No framework, no library |
| Ikon | FontAwesome 6 / Emoji | CDN |
| Font | Google Fonts (Inter + Poppins) | CDN |
| Gambar | WebP / JPEG optimized | Local / CDN |
| Hosting | GitHub Pages / Netlify / Vercel | Static hosting gratis |

### 8.2 File Structure

```
cabekami-publik/
│
├── index.html          ← Satu-satunya halaman HTML (SPA)
├── style.css           ← Semua styling (atau embedded di <style>)
├── app.js              ← Semua JS interaktif (atau embedded di <script>)
│
├── assets/
│   ├── images/
│   │   ├── hero-bg.webp
│   │   ├── greenhouse-foto.webp
│   │   ├── produk-cabe-merah.webp
│   │   ├── produk-cabe-rawit.webp
│   │   ├── produk-cabe-hijau.webp
│   │   └── logo.png
│   │
│   └── icons/
│       └── favicon.ico
│
└── blueprint-cabekami-publik.md  ← Dokumen ini
```

**Alternatif: All-in-One (Satu File)**
> Untuk kemudahan deployment dan maintainability sederhana,
> semua CSS dan JS bisa di-embed di dalam `index.html`.

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <!-- Meta, Fonts, Icons -->
  <style>/* Semua CSS */</style>
</head>
<body>
  <!-- Semua HTML sections -->
  <script>/* Semua JS */</script>
</body>
</html>
```

---

## 9. Tema & Branding

### 9.1 Palet Warna CabeKami

```css
:root {
  /* Primary — Hijau segar (mewakili kebun & kesegaran) */
  --color-primary:       #16a34a;   /* Green 600 */
  --color-primary-dark:  #15803d;   /* Green 700 */
  --color-primary-light: #dcfce7;   /* Green 100 */

  /* Accent — Merah cabe (mewakili produk) */
  --color-accent:        #dc2626;   /* Red 600 */
  --color-accent-light:  #fee2e2;   /* Red 100 */

  /* Neutral */
  --color-bg:            #ffffff;
  --color-bg-soft:       #f8fafc;
  --color-text-main:     #0f172a;
  --color-text-sub:      #475569;
  --color-border:        #e2e8f0;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.10);
}
```

### 9.2 Tipografi

```css
:root {
  --font-heading: 'Poppins', sans-serif;   /* Bold headings */
  --font-body:    'Inter', sans-serif;     /* Body text */

  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */
  --text-5xl:  3rem;      /* 48px */
}
```

### 9.3 Border Radius & Spacing

```css
:root {
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full: 9999px;  /* Pill */

  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

### 9.4 Logo & Brand Identity

- **Wordmark:** "Cabe**Kami**" — "Cabe" regular, "Kami" bold
- **Ikon:** 🌶️ atau ikon cabe custom (SVG)
- **Warna logo:** Merah cabe (#dc2626) + Hijau daun (#16a34a)
- **Tagline:** "Segar. Bersih. Terpercaya."

---

## 10. SEO & Performance

### 10.1 Meta Tags

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CabeKami — Cabe Segar Greenhouse IoT dari Jambi</title>
  <meta name="description" content="CabeKami adalah produsen cabe segar berbasis teknologi greenhouse IoT di Jambi. Cabe merah, rawit, dan hijau segar langsung dari kebun tanpa perantara.">
  <meta name="keywords" content="cabe segar, beli cabe, greenhouse, cabe merah, cabe rawit, Jambi, CabeKami, Fayseri">
  <meta name="author" content="Fayseri Development Team">

  <!-- Open Graph (Facebook, WhatsApp preview) -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="CabeKami — Cabe Segar Langsung dari Greenhouse">
  <meta property="og:description" content="Cabe segar bebas pestisida berlebih, dipanen dari greenhouse IoT milik Fayseri.">
  <meta property="og:image" content="https://cabekami.id/assets/images/og-image.jpg">
  <meta property="og:url" content="https://cabekami.id">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="CabeKami — Cabe Segar Greenhouse IoT">
  <meta name="twitter:description" content="Cabe segar dari greenhouse Fayseri, teknologi IoT, langsung ke tangan Anda.">
</head>
```

### 10.2 Structured Data (Schema.org)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CabeKami",
  "description": "Produsen cabe segar berbasis teknologi greenhouse IoT",
  "url": "https://cabekami.id",
  "telephone": "+62xxx",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Jambi",
    "addressCountry": "ID"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "500"
  }
}
</script>
```

### 10.3 Performance Checklist

- [ ] Gambar format WebP (lebih kecil dari JPEG)
- [ ] Lazy loading gambar: `<img loading="lazy">`
- [ ] Minifikasi CSS & JS (saat production)
- [ ] Google Fonts preconnect:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```
- [ ] Favicon & Apple touch icon
- [ ] Canonical URL: `<link rel="canonical" href="https://cabekami.id">`
- [ ] Robots.txt + Sitemap.xml (untuk hosting statis)

---

## 11. Catatan Pengembangan

### 11.1 Deployment Options

| Platform | Biaya | Domain | Catatan |
|----------|-------|--------|---------|
| GitHub Pages | Gratis | `username.github.io/cabekami` | Mudah, dari repo Git |
| Netlify | Gratis (starter) | `cabekami.netlify.app` | Auto-deploy, custom domain |
| Vercel | Gratis (hobby) | `cabekami.vercel.app` | Cepat, edge network |
| Custom Domain | ~Rp 150rb/tahun | `cabekami.id` | Profesional |

### 11.2 Relasi dengan Sistem Lain

```
CabeKami Publik (ini)
    │
    ├─── Link CTA ──────────→ Fayseri E-Commerce (Fayseri/index.html)
    │                         (untuk beli produk, login, dll.)
    │
    ├─── Link Chat ─────────→ WhatsApp Bisnis
    │                         (untuk tanya langsung)
    │
    └─── Brand same ────────→ Fayseri Admin Panel
                              (backend management, tidak diekspos ke publik)
```

### 11.3 Perbedaan Data: Statis vs Dinamis

| Data | Pendekatan | Keterangan |
|------|------------|------------|
| Konten halaman | **Statis** (hardcoded) | Teks, visi misi, keunggulan |
| Produk unggulan | **Semi-dinamis** | Bisa fetch dari Supabase atau hardcode |
| Stats / angka | **Semi-dinamis** | Bisa hardcode atau fetch summary |
| Testimoni | **Statis** (awal) | Bisa dikembangkan fetch dari DB |
| Kontak | **Statis** | Nomor WA, email, alamat |

### 11.4 Fase Pengembangan

**Fase 1 — MVP (1–2 minggu)**
- [x] Satu file HTML all-in-one
- [x] Semua 9 sections
- [x] Responsive mobile
- [x] Smooth scroll + active nav
- [x] Counter animation
- [x] Floating WhatsApp button

**Fase 2 — Polish (1 minggu)**
- [ ] Scroll reveal animations
- [ ] Real images (foto greenhouse, produk nyata)
- [ ] Google Fonts dioptimalkan
- [ ] SEO meta lengkap
- [ ] Custom domain

**Fase 3 — Enhancement (Opsional)**
- [ ] Fetch produk dari Supabase (3–4 produk unggulan)
- [ ] Dark mode toggle
- [ ] Translate bahasa (ID/EN)
- [ ] Blog / artikel singkat

### 11.5 Checklist Sebelum Launch

**Konten:**
- [ ] Semua teks sudah direview & bebas typo
- [ ] Semua nomor / angka sudah diverifikasi
- [ ] Foto sudah tersedia dan dioptimalkan
- [ ] Link WhatsApp sudah benar
- [ ] Link ke Fayseri E-Commerce sudah benar

**Teknis:**
- [ ] Mobile responsive di semua breakpoint
- [ ] Semua anchor link berfungsi
- [ ] Tombol CTA berfungsi
- [ ] Counter animation berjalan
- [ ] Scroll reveal berjalan
- [ ] Tidak ada console error

**SEO:**
- [ ] Meta title & description terisi
- [ ] OG image tersedia (1200x630px)
- [ ] Favicon tersedia
- [ ] Structured data valid

---

## Referensi

- [Google Fonts — Inter & Poppins](https://fonts.google.com)
- [FontAwesome Icons](https://fontawesome.com)
- [MDN Web Docs — IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Schema.org — LocalBusiness](https://schema.org/LocalBusiness)
- [Supabase Documentation](https://supabase.com/docs)
- [WebP Image Format](https://developers.google.com/speed/webp)

---

**Dokumen:** Blueprint CabeKami Publik  
**Versi:** 1.0  
**Dibuat:** 2026-05-29  
**Author:** Fayseri Development Team  
**Status:** Ready for Development
