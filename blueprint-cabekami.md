# Blueprint Sistem Cabe Kami (E-Commerce)
> Kerangka lengkap: Website E-Commerce Penjualan Cabe Segar
> Role: Admin (Seller) & User (Pembeli)
> Teknologi Website: HTML5, CSS3, Vanilla JS | Backend: Supabase (PostgREST + Auth)

---

## Daftar Isi
1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Halaman Publik Website (Tanpa Login)](#2-halaman-publik-website-tanpa-login)
3. [Website — Panel Admin](#3-website--panel-admin)
4. [Website — Portal User / Pembeli](#4-website--portal-user--pembeli)
5. [Fitur Utama Sistem](#5-fitur-utama-sistem)
6. [Perbedaan Role Admin vs User](#6-perbedaan-role-admin-vs-user)
7. [Alur Utama Sistem](#7-alur-utama-sistem)
8. [Komponen UI & Layout](#8-komponen-ui--layout)
9. [Integrasi Backend & API](#9-integrasi-backend--api)
10. [Tema & Customization](#10-tema--customization)
11. [Data Persistence & LocalStorage](#11-data-persistence--localstorage)
12. [Catatan Pengembangan](#12-catatan-pengembangan)

---

## 1. Gambaran Umum Sistem

```
SISTEM CABE KAMI (E-COMMERCE)
│
└── WEBSITE (HTML5 + CSS3 + Vanilla JS)
    ├── Halaman Publik ─────────── Siapa saja (tanpa login)
    │   ├── Beranda (Hero Section + Katalog Preview)
    │   ├── Katalog Lengkap (dengan filter & sort)
    │   ├── Panduan Menanam Cabe
    │   ├── Cara Pesan / FAQ
    │   └── Kontak & Informasi
    │
    ├── Portal User / Pembeli ───── Login / Register
    │   ├── Profil Pembeli
    │   ├── Wishlist (favorit)
    │   ├── Riwayat Pesanan
    │   └── Setting Akun
    │
    └── Panel Admin / Seller ────── Login khusus Admin
        ├── Dashboard (ringkasan penjualan)
        ├── Manajemen Produk (tambah, edit, hapus)
        ├── Manajemen Pesanan
        ├── Chat dengan Pembeli
        ├── Laporan & Analitik
        └── Setting Toko

Backend: **Supabase** (Cloud Database)
- Tabel: produk, pesanan, user, chat, panduan
- Authentication: Email & Password
- Real-time Updates: Socket connection untuk notifikasi pesanan
```

Seluruh data produk, pesanan, dan chat tersimpan di **Supabase**, sehingga data selalu sinkron antara website, aplikasi Android, dan semua perangkat. 

---

## 2. Halaman Publik Website (Tanpa Login)

### 2.1 Beranda (Landing Page / Hero Section)

**Header Kompak:**
- Brand logo "Cabe Kami" + ikon pepper
- Navigation bar dengan Tab: Beranda, Katalog, Cara Pesan, Panduan Menanam, Konfigurasi
- Search bar (cari produk)
- Wishlist icon (dengan badge count)
- Chat icon (dengan notification badge)
- Settings / Konfigurasi Sistem

**Hero Section:**
- Hero badge: "Langsung dari Greenhouse Fayseri"
- Judul besar: "Cabe Segar & Presisi"
- Deskripsi panjang tentang teknologi IoT dan kualitas produk
- 2 tombol CTA:
  - "Jelajahi Katalog" (primary, berwarna biru)
  - "Tanya Penjual" (secondary, outline)
- Statistik singkat (diambil dari Supabase):
  - Total Produk
  - Total Terjual
  - Rating Rata-rata

**Content Sections (Scrollable):**
1. **Kenapa Pilih Cabe Kami?** (3-4 highlight points)
   - Teknologi IoT presisi
   - Langsung dari greenhouse
   - Jaminan kesegaran
   - Harga terjangkau

2. **Produk Populer** (grid 4-6 kartu produk terpilih)
   - Gambar, nama, harga, rating bintang
   - Tombol "Lihat Detail" / "Pesan Sekarang"

3. **Testimoni Pelanggan** (carousel/slider)
   - Foto, nama, rating, komentar

4. **Promo/Flash Sale** (jika ada)
   - Banner dengan countdown
   - Diskon persen
   - Kode voucher

5. **Footer**
   - Informasi kontak (WA, Email, Alamat)
   - Jam operasional
   - Social media links
   - Copyright

---

### 2.2 Katalog Lengkap

**Layout: Full-width product grid**

**Top Filter Bar:**
- Pencarian real-time (autocomplete)
- Filter kategori: Semua, Cabe Merah, Cabe Rawit, Cabe Hijau, dll.
- Sort: Default, Harga Terendah, Harga Tertinggi, Rating Tertinggi, Terbaru
- View toggle: Grid / List

**Product Card (per produk):**
- Gambar produk (high-quality)
- Nama produk
- Harga (format IDR)
- Rating bintang (misal 4.8 ⭐ dari 120 ulasan)
- Status stok (In Stock / Low Stock / Out of Stock)
- 2 tombol aksi:
  - Wishlist (heart icon)
  - Chat/Tanya (message icon)

**Pagination:**
- 12 produk per halaman (configurable)
- Tombol: Previous, numbered pages, Next
- Atau: infinite scroll (auto-load saat scroll ke bawah)

**Sidebar kanan (opsional):**
- Filter lanjutan (price range slider)
- Best sellers (3-5 produk terpopuler)
- Newly added products

---

### 2.3 Detail Produk (Modal/Page)

Saat user klik salah satu produk:

**Modal atau halaman detail:**
- Slide gambar (zoom, gallery view)
- Info produk:
  - Nama, harga, stok, kategori
  - Deskripsi panjang
  - Spesifikasi (berat, ukuran, tingkat kepedasan, dll.)
  - Rating & ulasan (1-5 bintang)
  - Tombol: Tambah ke Wishlist, Chat Penjual

**Ulasan Produk:**
- Rating breakdown (5⭐ 60%, 4⭐ 30%, etc.)
- List ulasan (dengan foto dari pembeli)
- Saring ulasan berdasarkan rating

**Tombol Aksi:**
- "Chat dengan Penjual" → buka modal chat
- "Tambah ke Wishlist" → save ke localStorage + Supabase
- "Pesan Sekarang" → link WhatsApp dengan template pesan

---

### 2.4 Panduan Menanam Cabe

**Halaman informasi (artikel format):**
- Hero: "Panduan Lengkap Menanam Cabe di Rumah"
- Daftar isi / table of contents
- Sections:
  1. Persiapan & Media Tanam
  2. Proses Penyemaian
  3. Pemindahan ke Pot/Lahan
  4. Pemeliharaan Rutin (penyiraman, pemupukan)
  5. Pengendalian Hama & Penyakit
  6. Pemanenan
  7. Penyimpanan Hasil Panen

- Setiap section dilengkapi:
  - Teks deskriptif
  - Gambar/video (jika tersedia)
  - Tips & trik
  - Common mistakes

**Widget Interaktif (opsional):**
- Form: Input kondisi tanah, cuaca → rekomendasi perawatan
- Kalkulator: Input luas lahan → saran jumlah benih

---

### 2.5 Cara Pesan

**Step-by-step guide:**
1. **Jelajahi Katalog** – Lihat produk yang tersedia
2. **Pilih Produk** – Klik detail produk yang diminati
3. **Chat/Tanya** – Klarifikasi jumlah, harga, pengiriman (opsional)
4. **Klik "Pesan Sekarang"** – Akan redirect ke WhatsApp dengan template
5. **Konfirmasi di WA** – Admin akan merespons dan confirm pesanan
6. **Pembayaran** – Transfer via rekening bank / e-wallet
7. **Pengiriman** – Admin kirim foto barang + nomor resi
8. **Terima & Ulasan** – Pembeli terima paket, berikan rating

---

### 2.6 Chat dengan Penjual

**Chat Widget (floating button):**
- Icon chat di sudut kanan bawah
- Klik → buka chat panel

**Chat Panel:**
- Header: "Chat dengan Admin Cabe Kami"
- Message list (scrollable)
- Input field dengan tombol send
- Auto-save ke localStorage
- Integrasi dengan Supabase untuk sync antar device

**Auto-reply:**
- Jam operasional (e.g., 08:00-20:00 WIB)
- Auto greeting message saat user pertama kali chat
- Pre-defined quick replies (e.g., "Stok tersedia?", "Berapa ongkos pengiriman?")

---

### 2.7 FAQ & Informasi

**Accordion sections:**
- Bagaimana cara memesan?
- Berapa biaya pengiriman?
- Berapa lama pengiriman?
- Apakah produk dijamin segar?
- Bagaimana kebijakan retur?
- Metode pembayaran apa saja?
- Bisakah pre-order?
- Bagaimana hubungi customer service?

---

## 3. Website — Panel Admin

**Layout:** Sidebar kiri (fixed) + Navbar atas (fixed) + Area konten (scrollable)
**Tema:** Dark sidebar profesional + Konten putih / terang

### 3.1 Autentikasi Admin

**Login Gate:**
- Redirect ke halaman login jika belum login
- Form: Email + Password
- Tombol: "Masuk" / "Lupa Password"
- Error handling: Invalid credentials, account suspended, dll.
- Remember me (checkbox)
- Integasi Supabase Auth

---

### 3.2 Dashboard Admin

**KPI Cards (overview harian/bulanan):**
- Total Penjualan (IDR)
- Total Pesanan (count)
- Total Pelanggan (count)
- Rating Rata-rata
- Stok Habis (count)

**Chart Sections:**
- Grafik penjualan per hari (chart.js line chart, 7 hari terakhir)
- Grafik produk terjual terbanyak (bar chart, top 5)
- Status pesanan (pie chart: pending, approved, shipped, completed)

**Recent Activity:**
- List pesanan terbaru (5-10 terakhir)
- List chat baru dari pelanggan
- Notifikasi (stok habis, pesanan baru, review baru)

---

### 3.3 Manajemen Produk

**Halaman List Produk:**

**Top bar:**
- Tombol "+ Tambah Produk"
- Search box (cari produk)
- Filter: Status (active, inactive, low stock)
- Sort: Nama, Harga, Stok, Terjual, Terbaru

**Tabel Produk:**
- Kolom: Gambar, Nama, Kategori, Harga, Stok, Terjual, Rating, Action
- Row action buttons:
  - Edit (icon pensil) → buka form edit
  - Hapus (icon trash) → confirm delete
  - View (icon mata) → lihat preview

**Form Tambah/Edit Produk:**
- Nama produk (text input)
- Kategori (select dropdown)
- Deskripsi panjang (textarea WYSIWYG editor)
- Harga (number input)
- Stok (number input)
- Gambar produk (upload single / multiple)
- Spesifikasi (fields: berat, ukuran, tingkat kepedasan, dll.)
- Status (active / inactive toggle)
- SEO (meta title, meta description, slug)
- Tombol: Simpan, Preview, Batal

---

### 3.4 Manajemen Pesanan

**Halaman List Pesanan:**

**Filter & Sort:**
- Status: Semua, Pending, Approved, Shipped, Completed, Cancelled
- Date range picker
- Search: Nomor pesanan atau nama pembeli

**Tabel Pesanan:**
- Kolom: ID Pesanan, Nama Pembeli, Produk, Jumlah, Total, Status, Tgl Pesan, Action
- Badge status color-coded (pending=yellow, approved=blue, shipped=green, completed=success, cancelled=red)
- Click row → buka detail pesanan

**Detail Pesanan Modal:**
- Info pembeli (nama, nomor WA, alamat)
- List barang dipesan (nama, qty, harga satuan, subtotal)
- Total harga
- Status progress (timeline: pending → approved → shipped → completed)
- Aksi: Update status, kirim notifikasi ke pembeli, print label pengiriman
- Chat dengan pembeli (terintegrasi)

---

### 3.5 Chat Management

**Halaman Chat:**
- Sidebar kiri: List chat thread (dengan avatar pembeli, nama, preview pesan terakhir, unread badge)
- Main area: Chat transcript dengan pembeli
- Input field untuk balas
- Fitur:
  - Pencarian chat history
  - Mark as resolved / close chat
  - Auto-reply template selector

---

### 3.6 Laporan & Analitik

**Dashboard Laporan:**
- **Summary Cards:** Total penjualan, rata-rata order value, repeat customer rate
- **Charts:**
  - Revenue trend (7 hari, 30 hari, custom range)
  - Product performance (produk paling laris, paling sedikit)
  - Customer acquisition (new vs repeat customers)
  - Payment method breakdown
- **Export:** Tombol download CSV / PDF

---

### 3.7 Setting Admin

**Pengaturan Toko:**
- Nama toko, logo, deskripsi
- Jam operasional (per hari)
- Nomor WhatsApp (untuk chat & order link)
- Alamat fisik
- Informasi pembayaran (rekening bank, e-wallet, dll.)
- Foto hero section
- Promo/voucher management (CRUD)

**Pengaturan Sistem:**
- Theme selection (Faesa, Light, Dark)
- Jumlah produk per halaman (pagination)
- Aktivasi/nonaktifkan fitur (chat, wishlist, rating, etc.)
- Backup & restore data

**Account Admin:**
- Change password
- Two-factor authentication (opsional)
- Logout

---

## 4. Website — Portal User / Pembeli

Layout serupa dengan halaman publik, tapi dengan fitur tambahan.

### 4.1 Profil Pembeli

**Tab: Informasi Akun**
- Nama lengkap, email, nomor HP
- Alamat (multiple saved address)
- Foto profil
- Tombol: Edit, Change Password

**Tab: Riwayat Pesanan**
- List semua pesanan (filter: semua, pending, completed, cancelled)
- Per pesanan: ID, produk, tanggal, total, status
- Klik → lihat detail + rating

**Tab: Wishlist**
- Grid produk favorit yang disimpan
- Tombol: Lihat detail, Pesan, Hapus dari wishlist

**Tab: Chat History**
- List semua chat dengan admin
- Resume setiap percakapan

---

### 4.2 Checkout (dari Wishlist / Katalog)

**Simple Checkout Flow (via WhatsApp):**
1. Pilih produk + qty
2. Klik "Pesan Sekarang"
3. Auto-generate pesan WhatsApp dengan detail produk
4. User approve & kirim ke admin
5. Admin confirm via chat

**Alternative: Full E-Commerce Checkout (future)**
- Shopping cart
- Shipping address selection
- Shipping method choice
- Payment gateway (Midtrans, Xendit, dll.)
- Order confirmation email

---

## 5. Fitur Utama Sistem

### 5.1 Search & Filter
- Real-time search dengan autocomplete
- Filter kategori produk
- Filter harga range (slider)
- Sort: Default, Harga Terendah, Tertinggi, Rating, Terbaru, Terjual
- Advanced filter (batch filter)

### 5.2 Wishlist
- Simpan produk favorit (heart icon toggle)
- Persisted ke localStorage + Supabase
- Badge counter pada navbar
- Halaman wishlist dengan grid view
- Bulk action: Checkout, remove all

### 5.3 Rating & Review
- 5-star rating system
- Textual review (optional)
- Photo upload (customer dapat upload foto produk)
- Verified purchase badge
- Helpful/unhelpful voting

### 5.4 Chat Widget
- Floating button (sticky di sudut kanan bawah)
- Minimal mode (collapsed) → Full mode (expanded)
- Auto-save message history (localStorage)
- Sync dengan Supabase real-time
- Notification badge untuk unread messages
- Quick reply templates

### 5.5 Multi-Theme System
- 3 tema built-in: Faesa (default), Light, Dark
- User dapat pilih tema dari settings
- Persistent theme choice (localStorage)
- Smooth transition saat switch theme
- CSS variable-based theming (easy to customize)

### 5.6 Responsive Design
- Mobile-first approach
- Breakpoints: 320px, 768px, 1024px, 1280px
- Touch-friendly buttons & inputs
- Hamburger menu untuk mobile navbar
- Adaptive layouts

### 5.7 Panduan Interaktif
- Markdown-based content
- Step-by-step guides
- Embeded images/videos
- SEO-friendly URLs

---

## 6. Perbedaan Role Admin vs User

| Feature | Admin | User (Pembeli) |
|---------|-------|-----------------|
| **Halaman Akses** | Public + Admin Panel | Public + User Portal |
| **Manajemen Produk** | CRUD (Create, Read, Update, Delete) | Read only |
| **Lihat Pesanan** | Semua pesanan | Hanya pesanan sendiri |
| **Update Status Pesanan** | Ya | Tidak (bisa lihat status saja) |
| **Analitik & Laporan** | Ya (dashboard lengkap) | Tidak |
| **Chat** | Terima chat dari pembeli | Chat dengan admin |
| **Manage Promo** | Ya | Tidak (bisa lihat & pakai) |
| **Backup Data** | Ya | Tidak |
| **Account Settings** | Admin-specific settings | Profil user saja |

---

## 7. Alur Utama Sistem

### 7.1 Alur Penjualan (User Perspective)

```
User Berselancar
    ↓
Lihat Katalog Produk (filter/sort)
    ↓
Klik Produk → Buka Detail
    ↓
Tambah ke Wishlist / Chat Tanya / Pesan Sekarang
    ↓
[Jika Chat] Tanya info detail ke admin via chat
    ↓
[Jika Pesan] Klik "Pesan Sekarang" → Auto-generate WhatsApp
    ↓
Kirim pesan WhatsApp ke admin
    ↓
Admin confirm + user transfer pembayaran
    ↓
Admin kirim foto barang + nomor resi
    ↓
User terima paket
    ↓
User rating & review produk ⭐
```

### 7.2 Alur Admin (Seller Perspective)

```
Admin Login
    ↓
Lihat Dashboard (KPI, recent orders, chat notifications)
    ↓
[Jika ada pesanan baru] Lihat detail → Approve/Reject
    ↓
[Jika approved] Update status: Pending → Shipped
    ↓
Kirim notifikasi + resi ke pembeli
    ↓
[Saat status Completed] Update di sistem
    ↓
Lihat laporan penjualan & analytics
    ↓
Manage produk (update stok, harga, informasi)
    ↓
Respond chat dari pelanggan
```

---

## 8. Komponen UI & Layout

### 8.1 Header / Navbar (Kompak & Modern)

**Desktop (1024px+):**
```
┌─────────────────────────────────────────────────────────┐
│ Cabe Kami 🌶️ │ Beranda │ Katalog │ Cara Pesan │ Panduan │ Konfigurasi │ 🔍 │ ❤️(5) │ 💬 │
└─────────────────────────────────────────────────────────┘
```

**Mobile (< 768px):**
```
┌──────────────────────────────────┐
│ ☰ │ Cabe Kami 🌶️ │ 🔍 │ ❤️(5) │ 💬 │
└──────────────────────────────────┘
```

- Sticky / fixed position
- Compact height (~72px total: 40px topbar + 32px sub-navbar)
- High contrast (topbar background: primary blue)
- Drop shadow untuk elevation

### 8.2 Product Card (Standar)

```
┌─────────────────────┐
│   [Gambar Produk]   │
│                     │
├─────────────────────┤
│ Nama Produk         │
│ Rp 45.000 per kg    │
│ ⭐⭐⭐⭐⭐ (120)       │
│ ✅ In Stock          │
├─────────────────────┤
│ [❤️] [💬 Tanya]      │
└─────────────────────┘
```

- Rounded corners (10px)
- Box shadow (elevated feel)
- Hover effect (scale 1.05, shadow increase)
- Responsive: 4 columns (desktop), 2 columns (tablet), 1 column (mobile)

### 8.3 Modal Chat

```
┌─────────────────────────────────┐
│ Chat dengan Admin Cabe Kami [✕] │
├─────────────────────────────────┤
│                                 │
│ [Previous messages scroll up]    │
│                                 │
│ Admin: Halo, ada yang bisa...   │
│                                 │
│ You: Berapa harga untuk 5kg?    │
│                                 │
├─────────────────────────────────┤
│ [📎] Pesan Anda... [Kirim ➤]    │
└─────────────────────────────────┘
```

- Fixed width modal (400-500px desktop, full width mobile)
- Overlay backdrop
- Smooth animations (fade in/out)
- Auto-scroll to bottom saat ada pesan baru

### 8.4 Admin Dashboard Layout

```
┌────────────────────────────────────────────────┐
│ Admin Navbar (fixed top)                        │
├────────┬──────────────────────────────────────┤
│        │ Dashboard                             │
│Sidebar │                                       │
│(fixed  │ [KPI Cards]                          │
│left)   │ Total Penjualan | Pesanan | Pelanggan│
│        │                                       │
│  - Beranda                                     │
│  - Produk  [📊Charts]                         │
│  - Pesanan │ Revenue Trend                    │
│  - Chat    │ Product Performance              │
│  - Laporan │                                  │
│  - Setting │ [Recent Orders Table]            │
│            │                                  │
└────────┴──────────────────────────────────────┘
```

- Sidebar: 280px width (collapsible pada mobile)
- Navbar: 56px height
- Content area: full remaining space (scrollable)
- Responsive: Sidebar collapse → hamburger menu pada mobile

---

## 9. Integrasi Backend & API

### 9.1 Supabase Configuration

```javascript
SUPABASE_URL = 'https://oqufttiwgmgcxlncoguj.supabase.co'
SUPABASE_KEY = 'eyJhbGci...' // (public anon key)
```

**Tabel Database:**

1. **produk** — Daftar produk
   - id (PK), nama, kategori, deskripsi, harga, stok, gambar_url, created_at, updated_at, rating_avg

2. **pesanan** — Order/transaksi
   - id (PK), user_id (FK), produk_id (FK), qty, total_harga, status, created_at, updated_at

3. **users** — Pengguna
   - id (PK), email, nama, nomor_wa, alamat, created_at, role (admin/user)

4. **chat** — Pesan chat
   - id (PK), user_id (FK), admin_id (FK), pesan, tipe (text/image), created_at

5. **wishlist** — Favorit produk
   - id (PK), user_id (FK), produk_id (FK), created_at

6. **rating** — Rating & review produk
   - id (PK), user_id (FK), produk_id (FK), rating (1-5), review, foto_url, created_at

### 9.2 API Endpoints (REST)

```
GET  /rest/v1/produk                    # Ambil semua produk
GET  /rest/v1/produk?select=*&limit=12  # Ambil 12 produk (pagination)
GET  /rest/v1/produk/{id}               # Detail produk
POST /rest/v1/produk                    # Tambah produk (admin only)
PATCH /rest/v1/produk/{id}              # Edit produk (admin only)
DELETE /rest/v1/produk/{id}             # Hapus produk (admin only)

GET  /rest/v1/pesanan                   # Ambil pesanan (semua/filter)
GET  /rest/v1/pesanan/{id}              # Detail pesanan
POST /rest/v1/pesanan                   # Buat pesanan
PATCH /rest/v1/pesanan/{id}             # Update status pesanan

GET  /rest/v1/chat                      # Ambil chat history
POST /rest/v1/chat                      # Kirim pesan chat

GET  /rest/v1/wishlist                  # Ambil wishlist user
POST /rest/v1/wishlist                  # Tambah ke wishlist
DELETE /rest/v1/wishlist/{id}           # Hapus dari wishlist

GET  /rest/v1/rating                    # Ambil rating/review produk
POST /rest/v1/rating                    # Buat review
```

### 9.3 Authentication

```javascript
// Login
await supabaseClient.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Register
await supabaseClient.auth.signUp({
  email: 'new@example.com',
  password: 'password123'
});

// Logout
await supabaseClient.auth.signOut();

// Get current user
const { data: { user } } = await supabaseClient.auth.getUser();
```

### 9.4 Real-Time Subscriptions

```javascript
// Subscribe to order status changes
supabaseClient
  .channel('pesanan')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'pesanan' },
    (payload) => {
      console.log('Pesanan updated:', payload);
      // Refresh UI
    }
  )
  .subscribe();

// Subscribe to new chat messages
supabaseClient
  .channel('chat')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat' },
    (payload) => {
      console.log('New message:', payload);
      // Add message to chat UI
    }
  )
  .subscribe();
```

---

## 10. Tema & Customization

### 10.1 Tema Built-in

**1. Faesa (Default)**
- Primary: Biru Terang (#0d6efd)
- Success: Hijau (#22c55e)
- Topbar: Biru Terang
- Background: Putih + Hijau Terang (refreshing)

**2. Light**
- Primary: Biru (#0d6efd)
- Background: Terang (#f3f4f6)
- Text: Gelap (#212529)
- Suitable untuk bright/daylight usage

**3. Dark**
- Primary: Biru Cerah
- Background: Gelap (#1e293b)
- Text: Putih
- Suitable untuk malam atau eye comfort

### 10.2 CSS Variables (Theming)

```css
:root,
[data-theme="faesa"] {
  --primary: #0d6efd;
  --primary-dark: #0b5ed7;
  --primary-light: #e9f1fe;
  --success: #22c55e;
  --topbar-bg: #0d6efd;
  --topbar-text: #ffffff;
  --bg-body: #ffffff;
  --bg-card: #ffffff;
  --text-main: #1e293b;
  --text-sub: #475569;
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
}

[data-theme="light"] {
  /* override variables */
}

[data-theme="dark"] {
  /* override variables */
}
```

### 10.3 Theme Switching

```javascript
// Get stored theme (default: 'faesa')
const theme = localStorage.getItem('fayseri_theme') || 'faesa';
document.documentElement.setAttribute('data-theme', theme);

// Switch theme
function switchTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('fayseri_theme', themeName);
}
```

---

## 11. Data Persistence & LocalStorage

### 11.1 LocalStorage Keys

```javascript
'fayseri_produk_siap_jual'      // Cached product list
'fayseri_buku_panduan'          // Cached panduan content
'fayseri_theme'                 // Selected theme
'cabekami_wishlist'             // Wishlist (local backup)
'fayseri_chat_messages'         // Chat history (local backup)
```

### 11.2 Caching Strategy

- **Product List:** Cache di local storage untuk load cepat
- **Wishlist:** Sync ke Supabase (real-time) + local backup
- **Chat:** Sync ke Supabase + local cache (offline support)
- **Theme:** Local storage saja
- **Panduan:** Cache di local storage, fetch update saat perlu

### 11.3 Data Sync Flow

```
┌─────────────────┐
│  User Action    │
│  (e.g., add to  │
│   wishlist)     │
└────────┬────────┘
         │
         ↓
┌─────────────────────┐
│ Update LocalStorage │ (instant)
└────────┬────────────┘
         │
         ↓
┌──────────────────────┐
│ Send to Supabase API │ (async)
└────────┬─────────────┘
         │
         ↓
┌─────────────────────┐
│ Sync across devices │
│ via real-time sub   │
└─────────────────────┘
```

---

## 12. Catatan Pengembangan

### 12.1 File Structure

```
FayseriProject/
├─ index.html          # Main HTML
├─ app.js              # Main application logic
├─ style.css           # Stylesheet
├─ blueprint-cabekami.md  # Blueprint ini
├─ Fayseri/            # Smart dashboard folder
├─ CabeKamiAndroid/    # Android app folder
├─ FayseriAndroid/     # Android dashboard app
└─ README.md
```

### 12.2 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | HTML5, CSS3, ES6+ JavaScript | Rendering & interactivity |
| Backend | Supabase (PostgreSQL + PostgREST + Auth) | Database & API |
| Real-time | Supabase Realtime (WebSocket) | Live updates |
| Charts | Chart.js (opsional untuk future) | Visualisasi data |
| Icons | FontAwesome v6.4.0 | UI icons |
| Fonts | Google Fonts (Inter, Poppins) | Typography |

### 12.3 Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (Chrome, Safari iOS, Samsung Internet)

### 12.4 Performance Optimization

- **Lazy Loading:** Product images diload saat di-scroll
- **Pagination:** 12 produk per halaman (bukan infinite scroll)
- **Caching:** LocalStorage untuk product list, panduan, theme
- **Minification:** CSS & JS minified di production
- **CDN:** External libs (FontAwesome, Google Fonts) dari CDN
- **Compression:** Enable gzip compression on server

### 12.5 Security Notes

- **CORS:** Set proper CORS headers di Supabase
- **Auth:** Email/password auth via Supabase Auth
- **RLS (Row Level Security):** Implement RLS policies untuk Supabase tables
  - User hanya bisa baca/edit data mereka sendiri
  - Admin punya akses penuh
- **API Key:** Keep supabase key aman (use anon key, bukan service role key)
- **HTTPS:** Selalu gunakan HTTPS di production
- **Rate Limiting:** Implementasi rate limiting untuk API calls

### 12.6 Future Enhancements

1. **Payment Gateway Integration**
   - Midtrans, Xendit, Stripe untuk online payment
   - Invoice generation & email

2. **Analytics & Reporting**
   - Advanced charts (revenue trend, customer segmentation)
   - Export ke Excel/PDF

3. **Inventory Management**
   - Low stock alerts
   - Auto-reorder reminders

4. **Email Notifications**
   - Order confirmation
   - Status update
   - Promo announcement

5. **Admin App (Mobile)**
   - Manage orders on-the-go
   - Receive notifications
   - Chat dengan pelanggan

6. **Customer Reviews with Photos**
   - Verified purchase badge
   - Photo/video from customers
   - Helpful voting system

7. **Multi-Language Support**
   - Indonesian + English + regional languages
   - i18n framework

8. **SEO Optimization**
   - Meta tags per halaman
   - Structured data (Schema.org)
   - Sitemap & robots.txt

9. **Promo & Loyalty Program**
   - Discount codes
   - Loyalty points
   - Referral rewards

10. **Integration dengan Platform Lain**
    - Listing di marketplace (Tokopedia, Shopee)
    - Sync inventory real-time

---

## Referensi & Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/)
- [FontAwesome Icons](https://fontawesome.com/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS Tricks](https://css-tricks.com/)

---

**Versi:** 1.0  
**Last Updated:** 2026-05-29  
**Author:** Fayseri Development Team
