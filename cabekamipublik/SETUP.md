# Setup Guide - Cabe Kami SPA dengan Database Integration

## ✅ Fitur-Fitur yang Sudah Diimplementasikan (Sesuai Blueprint)

### 1. Database Integration
- ✅ Supabase integration untuk fetch data produk, artikel, testimoni
- ✅ Mock data fallback untuk development tanpa database
- ✅ Caching & state management di AppState

### 2. Halaman-Halaman (5 Halaman Utama)
- ✅ **Beranda**: Hero, keunggulan, produk unggulan, how it works, core values, testimoni, CTA
- ✅ **Tentang Kami**: Timeline, visi-misi, core values, fasilitas teknologi, tim, sertifikasi, galeri lengkap
- ✅ **Produk**: Filter kategori, search, product cards, detail modal, info pengiriman, jaminan kualitas
- ✅ **Panduan**: Filter kategori artikel, grid artikel, FAQ section, detail artikel dengan share buttons
- ✅ **Kontak**: Form kontak, informasi lengkap, social links

### 3. Komponen & Fitur
- ✅ Topbar dengan info kontak & jam operasional real-time
- ✅ Navbar sticky dengan mobile menu responsif
- ✅ Dark mode toggle (light/dark theme)
- ✅ Footer dengan link lengkap
- ✅ Back to top button
- ✅ Toast notifications
- ✅ Lightbox untuk galeri
- ✅ Product modal untuk detail produk
- ✅ Accordion untuk FAQ & info pengiriman
- ✅ Filter tabs untuk produk & artikel
- ✅ Search functionality
- ✅ Share buttons untuk artikel
- ✅ SEO meta tags per halaman
- ✅ Loading skeleton states
- ✅ Error handling

### 4. Styling & Design
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ CSS variables untuk tema (light/dark)
- ✅ Warna sesuai blueprint (#dc2626 sebagai primary)
- ✅ Smooth animations & transitions
- ✅ Modern UI components

---

## 🔧 Setup Supabase (Opsional)

Jika ingin menggunakan database Supabase, ikuti langkah berikut:

### 1. Buat Project di Supabase
- Buka https://supabase.com dan login/register
- Buat project baru
- Catat **Project URL** dan **Public Anon Key**

### 2. Update Credentials di app.js

Cari bagian ini di `app.js`:
```javascript
const AppState = {
  ...
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-public-anon-key'
};
```

Ganti dengan credentials Anda.

### 3. Buat Tabel di Supabase

Buka SQL Editor di Supabase dan jalankan queries berikut:

```sql
-- Tabel Produk
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price INTEGER,
  rating DECIMAL,
  sold INTEGER,
  stock TEXT,
  description TEXT
);

-- Tabel Artikel
CREATE TABLE articles (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT,
  content TEXT,
  date DATE,
  read_time INTEGER
);

-- Tabel Testimoni
CREATE TABLE testimonials (
  id BIGINT PRIMARY KEY,
  name TEXT,
  city TEXT,
  rating DECIMAL,
  text TEXT,
  created_at TIMESTAMP
);
```

### 4. Insert Sample Data

```sql
-- Insert Produk
INSERT INTO products VALUES
(1, 'Cabe Merah Segar', 'merah', 45000, 4.9, 234, 'Tersedia', 'Cabe merah premium segar dari greenhouse'),
(2, 'Cabe Rawit', 'rawit', 60000, 4.8, 189, 'Tersedia', 'Cabe rawit pedes, cocok untuk sambal'),
(3, 'Cabe Keriting', 'merah', 50000, 4.7, 156, 'Tersedia', 'Cabe keriting dengan rasa yang mantap'),
(4, 'Cabe Hijau', 'hijau', 35000, 4.6, 198, 'Tersedia', 'Cabe hijau segar dengan cita rasa unik');

-- Insert Artikel
INSERT INTO articles VALUES
(1, 'Cara Menanam Cabe di Pot', 'cara-menanam-cabe-di-pot', 'pemula', 'Panduan lengkap menanam cabe...', '2025-05-15', 8),
(2, 'Tips Menjaga Kesegaran Cabe', 'tips-kesegaran-cabe', 'tips', 'Cara terbaik menyimpan cabe...', '2025-05-10', 6),
(3, 'Resep Sambal Cabe Homemade', 'resep-sambal-cabe', 'resep', 'Resep sambal tradisional...', '2025-05-01', 5);

-- Insert Testimoni
INSERT INTO testimonials VALUES
(1, 'Ibu Siti', 'Jakarta', 5, 'Cabe yang diterima benar-benar segar...', NOW()),
(2, 'Pak Budi', 'Bandung', 5, 'Sudah berlangganan 3 bulan...', NOW());
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan dengan Python Server (Recommended)

```bash
cd "e:\belajar coding\FayseriProject\cabekamipublik"
python -m http.server 8000
```

Atau gunakan Node.js:
```bash
npx http-server
```

### 2. Akses di Browser
```
http://localhost:8000
```

### 3. Testing
- Buka halaman beranda
- Klik menu navigasi untuk test semua halaman
- Test filter produk & artikel
- Klik detail produk untuk modal
- Test dark mode dengan button tema
- Klik galeri untuk lightbox
- Test form kontak

---

## 📁 Struktur File

```
cabekamipublik/
├── index.html          ← HTML tunggal (entry point)
├── app.js              ← Semua logic SPA (routing, pages, components, utils)
├── style.css           ← Semua styling
└── blueprint-cabekami-publik (1).md  ← Dokumentasi blueprint
```

---

## 🎨 Customization

### Mengubah Warna
Edit CSS variables di `style.css`:
```css
:root {
  --primary: #dc2626;        ← Ubah warna primer
  --primary-dark: #991b1b;
  /* ... warna lainnya */
}
```

### Mengubah Data (Tanpa Database)
Edit `DB.getMockProducts()` dan method mock lainnya di `app.js`

### Menambah Halaman Baru
1. Tambah fungsi di `Pages` object
2. Tambah route di `Router.routes`
3. Tambah styling di `style.css`

---

## ✨ Fitur Unggulan

1. **SPA (Single Page Application)** - No page reload, smooth navigation
2. **Responsive Design** - Mobile first approach
3. **Dark Mode** - Toggle light/dark theme
4. **Database Ready** - Supabase integration ready
5. **Filter & Search** - Untuk produk dan artikel
6. **Product Modal** - Detail produk dalam modal
7. **Accordion** - Untuk FAQ dan info pengiriman
8. **Share Buttons** - Untuk artikel
9. **SEO Optimized** - Meta tags per halaman
10. **Accessible** - WCAG compliant

---

## 🔗 WhatsApp Integration

Semua tombol "Pesan" dan "Hubungi" akan redirect ke WhatsApp dengan pesan pre-filled.

Update nomor WhatsApp di:
- `app.js` → Navbar.render() → `0811-XXXX-XXXX`
- Atau di section yang menggunakan `wa.me`

---

## 📝 Notes

- Semua data saat ini menggunakan mock data untuk development
- Jika Supabase tidak tersedia, aplikasi akan otomatis fallback ke mock data
- Rating & testimonial bersifat demo, dapat diganti dengan data real dari database
- Social media links dapat dikonfigurasi di Footer section

---

## 🐛 Troubleshooting

**Q: Supabase tidak connect?**
A: Aplikasi otomatis fallback ke mock data. Cek credentials atau gunakan mock data untuk development.

**Q: Filter tidak berfungsi?**
A: Pastikan class name `filter-tab` dan `data-category` sesuai. Check browser console untuk errors.

**Q: Modal tidak tampil?**
A: Pastikan `ProductModal.open()` dipanggil dan CSS untuk `.product-modal-overlay` loaded.

**Q: Dark mode tidak bersimpan?**
A: Pastikan localStorage diaktifkan di browser.

---

Generated: 29 Mei 2026
