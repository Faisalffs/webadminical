// ═══════════════════════════════════════════════════════════════════════════════
// CABE KAMI - Single Page Application (SPA) dengan Database Integration
// ═══════════════════════════════════════════════════════════════════════════════

// ─── APP STATE & CONFIG ─────────────────────────────────────────────────────
const THEME_KEY = 'fayseri_theme';

const AppState = {
  currentPage: 'beranda',
  theme: localStorage.getItem(THEME_KEY) || 'faesa',
  selectedProduct: null,
  products: [],
  articles: [],
  testimonials: [],
  stats: { totalProducts: 124, totalSold: 2400, avgRating: 4.9 },
  supabaseUrl: 'https://oqufttiwgmgcxlncoguj.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xdWZ0dGl3Z21nY3hsbmNvZ3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODMxMjAsImV4cCI6MjA5NTI1OTEyMH0.RQ2PwcEoSWWEt2fOItqmBFRgSdi4wFuIpKV7XamkmZ8',
  waNumber: '6289601572430'
};

let supabaseClient = null;

// Initialize Supabase jika tersedia
if (window.supabase && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(AppState.supabaseUrl, AppState.supabaseKey);
    console.log('✅ Supabase connected');
  } catch (err) {
    console.warn('⚠️ Supabase initialization failed, using mock data', err);
  }
}

// ─── DATABASE SERVICE ────────────────────────────────────────────────────────
const DB = {
  async getAllProducts() {
    if (!supabaseClient) return this.getMockProducts();
    try {
      const { data, error } = await supabaseClient
        .from('fayseri_storage')
        .select('value_data')
        .eq('key_name', 'fayseri_produk_siap_jual')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data?.length && Array.isArray(data[0].value_data)) {
        const products = data[0].value_data.filter(p => {
          const idStr = p.id ? String(p.id) : '';
          return idStr && !idStr.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(idStr);
        });
        return products.length > 0 ? products : this.getMockProducts();
      }
      return this.getMockProducts();
    } catch (err) {
      console.warn('DB error fetching products:', err);
      return this.getMockProducts();
    }
  },

  async getAllArticles() {
    if (!supabaseClient) return this.getMockArticles();
    try {
      const { data, error } = await supabaseClient
        .from('fayseri_storage')
        .select('value_data')
        .eq('key_name', 'fayseri_buku_panduan')
        .order('updated_at', { ascending: false })
        .limit(1);
        

      if (error) throw error;
      if (data?.length && Array.isArray(data[0].value_data)) {
        return data[0].value_data;
      }
      return this.getMockArticles();
    } catch (err) {
      console.warn('DB error fetching articles:', err);
      return this.getMockArticles();
    }
  },

  async getArticleBySlug(slug) {
    try {
      const articles = await this.getAllArticles();
      return articles.find(a => (a.slug === slug || a.id === slug || a.judul === slug)) || this.getMockArticles()[0];
    } catch (err) {
      return this.getMockArticles().find(a => a.slug === slug) || this.getMockArticles()[0];
    }
  },

  async getTestimonials(limit = 6) {
    if (!supabaseClient) return this.getMockTestimonials().slice(0, limit);
    try {
      const { data } = await supabaseClient.from('testimonials').select('*').limit(limit);
      return data || this.getMockTestimonials().slice(0, limit);
    } catch (err) {
      return this.getMockTestimonials().slice(0, limit);
    }
  },

  async getStats() {
    try {
      const products = await this.getAllProducts();
      const totalSold = products.reduce((sum, p) => sum + (parseInt(p.sold || p.terjual || 120)), 0) || 2400;
      return {
        totalProducts: products.length || 12,
        totalSold: totalSold,
        avgRating: 4.9
      };
    } catch (err) {
      return { totalProducts: 12, totalSold: 2400, avgRating: 4.9 };
    }
  },

  getMockProducts() {
    return [
      { id: 'mock-1', nama: 'Cabe Merah Keriting', category: 'merah', harga: 45000, foto: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80', rating: 4.9, sold: 234, stok: 'Tersedia', deskripsi: 'Cabe merah keriting segar dipetik langsung dari greenhouse presisi, tanpa perantara.' },
      { id: 'mock-2', nama: 'Cabe Rawit Hijau', category: 'rawit', harga: 60000, foto: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', rating: 4.8, sold: 189, stok: 'Tersedia', deskripsi: 'Cabe rawit hijau segar dengan tingkat kematangan optimal dan kepedasan yang tahan lama.' },
      { id: 'mock-3', nama: 'Cabe Merah Besar', category: 'merah', harga: 50000, foto: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80', rating: 4.7, sold: 156, stok: 'Tersedia', deskripsi: 'Cabe merah besar dengan warna yang cerah mengkilap, sangat cocok untuk dekorasi kuliner.' },
      { id: 'mock-4', nama: 'Cabe Hijau Besar', category: 'hijau', harga: 35000, foto: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80', rating: 4.6, sold: 198, stok: 'Tersedia', deskripsi: 'Cabe hijau besar renyah yang rendah residu pestisida, ditanam dengan pengairan sensor IoT.' }
    ];
  },

  getMockArticles() {
    return [
      { id: 'GP-001', judul: 'Cara Menanam Cabai yang Optimal', slug: 'cara-menanam-cabe-di-pot', category: 'pemula', konten: 'Langkah pertama adalah memilih benih cabai berkualitas. Rendam benih dalam air hangat selama 30 menit sebelum disemai di media tanam campuran tanah dan pupuk organik (1:1). Jaga kelembaban tanah sekitar 60-70% dan pastikan bibit mendapat sinar matahari pagi.', foto: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80', tanggal: '29 Mei 2026', readTime: 8 },
      { id: 'GP-002', judul: 'Cara Menyemprot Fungisida & Insektisida', slug: 'tips-kesegaran-cabe', category: 'tips', konten: 'Lakukan penyemprotan pada sore hari (pukul 15.30 - 17.00) untuk menghindari penguapan cepat oleh terik matahari. Campurkan 2ml fungisida per liter air bersih. Semprotkan secara merata terutama di permukaan bawah daun tempat bersarangnya spora jamur antraknosa.', foto: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', tanggal: '28 Mei 2026', readTime: 6 },
      { id: 'GP-003', judul: 'Penyebab Cabai Keriting & Penanganannya', slug: 'resep-sambal-cabe', category: 'resep', konten: 'Cabai keriting umumnya disebabkan oleh serangan kutu kebul (Aphids/Thrips) yang menghisap cairan daun, atau karena infeksi Gemini Virus. Penanganannya adalah dengan menjaga sanitasi greenhouse, menggunakan jaring serangga (insect net), dan menyemprotkan insektisida organik berbahan bawang putih.', foto: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80', tanggal: '27 Mei 2026', readTime: 5 }
    ];
  },

  getMockTestimonials() {
    return [
      { name: 'Ibu Sari', city: 'Jambi', rating: 5, text: 'Cabe rawit dari CabeKami rasanya mantap, segar dan bersih!' },
      { name: 'Pak Andi', city: 'Palembang', rating: 5, text: 'Kualitas konsisten, tiap order selalu dapat yang bagus. Recommended!' },
      { name: 'Bu Dewi', city: 'Jambi', rating: 4.8, text: 'Sudah 6 bulan langganan, belum pernah kecewa. Pengiriman cepat.' },
      { name: 'Pak Rudi', city: 'Jambi', rating: 5, text: 'Sangat puas dengan kualitas dan kesegaran cabe. Pelayanannya top!' },
      { name: 'Ibu Nur', city: 'Bungo', rating: 5, text: 'Terbaik! Cabe selalu fresh, packaging aman dengan pendingin.' },
      { name: 'Pak Heri', city: 'Muaro Jambi', rating: 4.7, text: 'Rekomendasi untuk semua pengusaha kuliner yang butuh cabe segar.' }
    ];
  }
};

// ─── ROUTER ───────────────────────────────────────────────────────────────────
const Router = {
  routes: {
    'beranda': () => Pages.beranda(),
    'tentang': () => Pages.tentang(),
    'produk': () => Pages.produk(),
    'panduan': () => Pages.panduan(),
    'kontak': () => Pages.kontak(),
  },

  getHash() {
    const hash = window.location.hash.replace('#', '').split('/');
    return { page: hash[0] || 'beranda', param: hash[1] || null };
  },

  async render() {
    const { page, param } = this.getHash();
    const app = document.getElementById('app');

    // Tampilkan skeleton loader HANYA jika data halaman tersebut belum ada di cache AppState
    let needsSkeleton = true;
    if (page === 'tentang' || page === 'kontak') {
      needsSkeleton = false;
    } else if (page === 'beranda' && AppState.products.length > 0 && AppState.stats) {
      needsSkeleton = false;
    } else if (page === 'produk' && AppState.products.length > 0) {
      needsSkeleton = false;
    } else if (page === 'panduan' && AppState.articles.length > 0) {
      needsSkeleton = false;
    }

    if (needsSkeleton) {
      app.innerHTML = Components.skeleton();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    SEO.update(page);
    Navbar.setActive(page);

    try {
      if (page === 'panduan' && param) {
        app.innerHTML = await Pages.panduanDetail(param);
      } else if (this.routes[page]) {
        app.innerHTML = await this.routes[page]();
      } else {
        window.location.hash = '#beranda';
        return;
      }
      Pages.afterRender(page);
    } catch (err) {
      app.innerHTML = Components.errorState('Gagal memuat halaman');
      console.error(err);
    }
  },

  init() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

// ─── PAGES ───────────────────────────────────────────────────────────────────
const Pages = {
  async beranda() {
    // Memuat data dari cache jika tersedia untuk mencegah delay pemuatan ulang
    if (!AppState.stats) {
      AppState.stats = await DB.getStats();
    }
    if (!AppState.products || !AppState.products.length) {
      AppState.products = await DB.getAllProducts();
    }
    if (!AppState.testimonials || !AppState.testimonials.length) {
      AppState.testimonials = await DB.getTestimonials(6);
    }

    return `
      ${Sections.hero(AppState.stats)}
      ${Sections.keunggulan()}
      ${Sections.produkUnggulan(AppState.products.slice(0, 4))}
      ${Sections.teknologi()}
      ${Sections.proses()}
      ${Sections.portofolio()}
      ${Sections.testimoni(AppState.testimonials)}
      ${Sections.ctaAkhir()}
    `;
  },

  async tentang() {
    return `
      ${Sections.pageHero('Mengenal Cabe Kami Lebih Dekat', 'tentang')}
      ${Sections.sejarahTimeline()}
      ${Sections.visiMisi()}
      ${Sections.fasilitasTeknologi()}
      ${Sections.timKami()}
      ${Sections.sertifikasiPenghargaan()}
      ${Sections.galeriLengkap()}
    `;
  },

  async produk() {
    if (!AppState.products || !AppState.products.length) {
      AppState.products = await DB.getAllProducts();
    }

    return `
      ${Sections.pageHero('Produk & Layanan Kami', 'produk')}
      ${Sections.filterBar()}
      <section class="section">
        <div class="container">
          <div class="product-grid" id="produk-grid">
            ${AppState.products.map(p => Components.productCard(p)).join('')}
          </div>
          ${Sections.caraPemesanan()}
          ${Sections.infoPengiriman()}
          ${Sections.jaminanKualitas()}
        </div>
      </section>
    `;
  },

  async panduan() {
    if (!AppState.articles || !AppState.articles.length) {
      AppState.articles = await DB.getAllArticles();
    }

    return `
      ${Sections.pageHero('Panduan & Edukasi', 'panduan')}
      <section class="section">
        <div class="container">
          ${Sections.filterKategoriArtikel()}
          <div class="panduan-grid" id="artikel-grid">
            ${AppState.articles.map(a => Components.articleCard(a)).join('')}
          </div>
          ${Sections.faqSection()}
        </div>
      </section>
    `;
  },

  async panduanDetail(slug) {
    const item = await DB.getArticleBySlug(slug);
    if (!item) return Components.errorState('Artikel tidak ditemukan');

    return `
      ${Sections.pageHero(item.title, 'panduan')}
      <section class="section">
        <div class="container container-narrow">
          <div class="article-content">
            <div class="article-meta">
              <span>📅 ${item.date || new Date().toLocaleDateString('id-ID')}</span>
              <span>⏱️ Baca: ${item.readTime || 5} menit</span>
            </div>
            <p>${item.content}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <h3>Langkah-langkah Praktis</h3>
            <ol>
              <li>Persiapkan bahan-bahan yang diperlukan</li>
              <li>Ikuti petunjuk dengan teliti dan sabar</li>
              <li>Sesuaikan dengan kondisi lokal Anda</li>
              <li>Pantau perkembangan secara berkala</li>
            </ol>
            <div class="article-share">
              <p><strong>Bagikan artikel ini:</strong></p>
              <div class="share-buttons">
                <a href="https://wa.me/?text=${encodeURIComponent(item.title)}" target="_blank" title="Share to WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <a href="https://www.facebook.com/sharer/sharer.php" target="_blank" title="Share to Facebook"><i class="fab fa-facebook"></i></a>
                <a href="https://twitter.com/intent/tweet" target="_blank" title="Share to Twitter"><i class="fab fa-twitter"></i></a>
              </div>
            </div>
            <a href="#panduan" class="btn btn-outline">← Kembali ke Panduan</a>
          </div>
        </div>
      </section>
    `;
  },

  async kontak() {
    return `
      ${Sections.pageHero('Hubungi Kami', 'kontak')}
      <section class="section">
        <div class="container">
          <div class="contact-wrapper">
            <div class="contact-info">
              <h3>Informasi Kontak</h3>
              <p><strong>🏢 Alamat:</strong><br>Greenhouse Fayseri, Jambi, Indonesia</p>
              <p><strong>📱 WhatsApp:</strong><br><a href="https://wa.me/${AppState.waNumber}" target="_blank">+${AppState.waNumber.substring(0, 2)} ${AppState.waNumber.substring(2)}</a></p>
              <p><strong>📧 Email:</strong><br>info@cabekami.id</p>
              <p><strong>🕐 Jam Operasional:</strong><br>Senin-Jumat: 08:00-17:00 WIB<br>Sabtu: 08:00-14:00 WIB<br>Minggu: Tutup</p>
              <div class="social-links">
                <a href="#" title="Instagram"><i class="fab fa-instagram"></i></a>
                <a href="#" title="Facebook"><i class="fab fa-facebook"></i></a>
                <a href="https://wa.me/${AppState.waNumber}" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
              </div>
            </div>
            <form id="contact-form" class="contact-form">
              <h3>Kirim Pesan</h3>
              <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" placeholder="Masukkan nama Anda" required>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" placeholder="email@example.com" required>
              </div>
              <div class="form-group">
                <label>Nomor Telepon</label>
                <input type="tel" placeholder="08xx-xxxx-xxxx" required>
              </div>
              <div class="form-group">
                <label>Subjek</label>
                <input type="text" placeholder="Topik pertanyaan Anda" required>
              </div>
              <div class="form-group">
                <label>Pesan</label>
                <textarea placeholder="Tuliskan pertanyaan atau pesanan Anda..." rows="5" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Kirim Pesan</button>
            </form>
          </div>
        </div>
      </section>
    `;
  },

  afterRender(page) {
    switch (page) {
      case 'kontak':
        const form = document.getElementById('contact-form');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            Toast.show('Terima kasih! Pesan Anda telah terkirim.', 'success');
            form.reset();
          });
        }
        break;
      case 'produk':
        ProductFilter.init();
        break;
      case 'panduan':
        ArticleFilter.init();
        break;
    }

    const lightboxImages = document.querySelectorAll('[data-lightbox]');
    lightboxImages.forEach(img => {
      img.addEventListener('click', () => Lightbox.open(img.dataset.lightboxImage));
    });

    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', function () {
        this.classList.toggle('open');
        const body = this.nextElementSibling;
        if (body) body.classList.toggle('open');
      });
    });

    const productCards = document.querySelectorAll('[data-product-id]');
    productCards.forEach(card => {
      const detailBtn = card.querySelector('.btn-detail');
      if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const productId = card.dataset.productId;
          const product = AppState.products.find(p => String(p.id) === String(productId));
          if (product) ProductModal.open(product);
        });
      }
    });

    // Initialize premium agrotech observers (Scroll Reveal and Counting numbers)
    this.initScrollReveal();
    this.initCounters();
  },

  initScrollReveal() {
    const revealElements = document.querySelectorAll('[data-reveal]');
    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    revealElements.forEach(el => observer.observe(el));
  },

  initCounters() {
    const counterElements = document.querySelectorAll('.stat-number');
    if (!counterElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target')) || 0;
          this.animateCounter(el, target);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    counterElements.forEach(el => observer.observe(el));
  },

  animateCounter(el, target, duration = 1500) {
    let start = 0;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad

      el.textContent = Math.floor(easeProgress * target);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    };

    requestAnimationFrame(update);
  }
};

// ─── COMPONENTS ─────────────────────────────────────────────────────────────
const Components = {
  skeleton() {
    return `<div class="skeleton-loader"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div></div>`;
  },

  errorState(msg) {
    return `<div class="error-state"><div class="error-icon">⚠️</div><h2>Oops!</h2><p>${msg}</p><a href="#beranda" class="btn btn-primary">Kembali ke Beranda</a></div>`;
  },

  productCard(p) {
    const name = p.nama || p.name || p.nama_produk || 'Produk';
    const price = p.harga || p.price || 0;
    const desc = p.deskripsi || p.desc || '';
    const rating = p.rating || 4.9;
    const sold = p.sold || p.terjual || 120;
    const status = p.stok || p.stok_tersedia || p.status || 'Tersedia';

    const isImg = (src) => src && typeof src === 'string' && /^(data:image\/|https?:\/\/|blob:|\/|assets\/)/i.test(src.trim());
    const fotoSrc = p.foto || p.image || '';
    const imgHTML = isImg(fotoSrc)
      ? `<img src="${fotoSrc.trim()}" alt="${name}" class="product-card-img" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius-md);" loading="lazy">`
      : `<div class="product-img-placeholder" style="display:flex;align-items:center;justify-content:center;height:200px;width:100%;background:rgba(13,110,253,0.06);font-size:2.5rem;border-radius:var(--radius-md);">🌶️</div>`;

    const waT = encodeURIComponent(`Halo Admin Cabe Kami 🌶️\n\nSaya melihat produk "${name}" di company profile.\n\nApakah stok segar saat ini tersedia? Terima kasih!`);

    return `
      <div class="product-card" data-product-id="${p.id}">
        <div class="product-image" style="height:200px;overflow:hidden;border-radius:var(--radius-md);margin-bottom:1rem;">${imgHTML}</div>
        <h3>${name}</h3>
        <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:0.75rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;height:2.7em;">${desc}</p>
        <div class="product-rating" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.875rem;">
          <span class="rating-num">⭐ ${rating}</span>
          <span class="product-sold">${sold}+ terjual</span>
        </div>
        <span class="price" style="font-size:1.15rem;font-weight:700;color:var(--primary);display:block;margin-bottom:1rem;">Rp ${price.toLocaleString('id-ID')}/kg</span>
        <div class="product-actions" style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-detail" style="flex:1;padding:8px 12px;font-size:0.9rem;">Detail</button>
          <button class="btn btn-primary" style="flex:1;padding:8px 12px;font-size:0.9rem;" onclick="window.open('https://wa.me/${AppState.waNumber}?text=${waT}')">Tanya WA</button>
        </div>
      </div>
    `;
  },

  articleCard(a) {
    const title = a.judul || a.title || 'Panduan';
    const content = a.konten || a.content || '';
    const date = a.tanggal || a.date || 'Mei 2026';
    const readTime = a.readTime || a.read_time || 5;
    const category = a.kategori || a.category || 'Edukasi';
    const slug = a.slug || a.id || 'cara-menanam-cabe';

    const isImg = (src) => src && typeof src === 'string' && /^(data:image\/|https?:\/\/|blob:|\/|assets\/)/i.test(src.trim());
    const fotoSrc = a.foto || a.image || '';
    const imgHTML = isImg(fotoSrc)
      ? `<img src="${fotoSrc.trim()}" alt="${title}" class="article-card-img" style="width:100%;height:180px;object-fit:cover;border-radius:var(--radius-md);" loading="lazy">`
      : `<div class="article-img-placeholder" style="display:flex;align-items:center;justify-content:center;height:180px;width:100%;background:rgba(34,197,94,0.06);font-size:2.5rem;border-radius:var(--radius-md);">🌱</div>`;

    return `
      <div class="panduan-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem;box-shadow:var(--shadow-sm);transition:var(--transition);">
        <div class="panduan-image" style="height:180px;overflow:hidden;border-radius:var(--radius-md);margin-bottom:1rem;">${imgHTML}</div>
        <span class="article-category" style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 8px;border-radius:var(--radius-full);font-size:0.75rem;font-weight:600;text-transform:uppercase;margin-bottom:0.75rem;display:inline-block;">${category}</span>
        <h3 style="font-size:1.15rem;margin-bottom:0.5rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;height:2.6em;color:var(--text-primary);">${title}</h3>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;height:4.2em;">${content}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-secondary);border-top:1px solid var(--border);padding-top:0.75rem;">
          <small>${date}</small>
          <small>⏱️ ${readTime} Menit</small>
        </div>
        <a href="#panduan/${slug}" class="btn btn-outline" style="width:100%;margin-top:1rem;padding:8px 16px;font-size:0.9rem;">Baca Panduan →</a>
      </div>
    `;
  }
};

// ─── SECTIONS ────────────────────────────────────────────────────────────────
const Sections = {
  hero(stats = {}) {
    const s = { totalProducts: 12, totalSold: 2400, avgRating: 4.9, ...stats };
    return `
      <section class="hero" style="position:relative;padding:120px 0 80px 0;background:linear-gradient(135deg, rgba(13,110,253,0.04) 0%, rgba(34,197,94,0.04) 100%);text-align:center;overflow:hidden;">
        <div class="container" style="position:relative;z-index:2;">
          <span class="badge" style="background:rgba(34,197,94,0.1);color:#16a34a;padding:6px 16px;border-radius:var(--radius-full);font-weight:600;font-size:0.875rem;margin-bottom:1.5rem;display:inline-flex;align-items:center;gap:8px;" data-reveal>
            <i class="fa-solid fa-leaf"></i> Greenhouse Teknologi IoT
          </span>
          <h1 style="font-size:3.5rem;font-weight:800;color:var(--text-primary);line-height:1.15;margin-bottom:1.5rem;font-family:'Poppins',sans-serif;" data-reveal>
            Cabe Segar, Bersih,<br><span style="color:#16a34a;">Langsung dari Kebun Kami</span>
          </h1>
          <p style="font-size:1.125rem;color:var(--text-secondary);max-width:650px;margin:0 auto 2.5rem auto;line-height:1.6;" data-reveal>
            Dari greenhouse presisi milik Fayseri, setiap cabe yang kami jual tumbuh dalam kondisi terkontrol — bebas pestisida berlebih, konsisten rasanya, terjamin kesegaran.
          </p>
          <div class="hero-buttons" style="display:flex;justify-content:center;gap:16px;margin-bottom:4rem;" data-reveal>
            <button class="btn btn-primary" onclick="navigate('#tentang')">Kenali Kami ↓</button>
            <button class="btn btn-outline" onclick="navigate('#produk')">Lihat Produk</button>
          </div>
          
          <div class="hero-stats" style="display:grid;grid-template-columns:repeat(3,1fr);max-width:600px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-md);" data-reveal>
            <div class="stat" style="text-align:center;">
              <strong style="font-size:2rem;color:var(--primary);display:block;font-family:'Poppins',sans-serif;">500+</strong>
              <small style="color:var(--text-secondary);font-size:0.875rem;">Pelanggan Aktif</small>
            </div>
            <div class="stat" style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);">
              <strong style="font-size:2rem;color:#16a34a;display:block;font-family:'Poppins',sans-serif;">4.9⭐</strong>
              <small style="color:var(--text-secondary);font-size:0.875rem;">Rating Rata-rata</small>
            </div>
            <div class="stat" style="text-align:center;">
              <strong style="font-size:2rem;color:var(--primary);display:block;font-family:'Poppins',sans-serif;">3 Tahun</strong>
              <small style="color:var(--text-secondary);font-size:0.875rem;">Berdiri Sejak 2023</small>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  pageHero(title, page = '') {
    return `
      <section class="page-hero" style="padding:60px 0;background:linear-gradient(135deg, rgba(13,110,253,0.08) 0%, rgba(34,197,94,0.08) 100%);text-align:center;border-bottom:1px solid var(--border);">
        <div class="container">
          <h1 style="font-size:2.5rem;color:var(--text-primary);margin-bottom:0.75rem;font-family:'Poppins',sans-serif;">${title}</h1>
          ${page ? `<p class="breadcrumb" style="font-size:0.9rem;color:var(--text-secondary);"><a href="#beranda" style="color:var(--primary);font-weight:500;">Beranda</a> &gt; <span style="color:var(--text-primary);">${title}</span></p>` : ''}
        </div>
      </section>
    `;
  },

  keunggulan() {
    const items = [
      { icon: '🏭', title: 'Greenhouse Steril', desc: 'Tumbuh di lingkungan terkontrol, bebas dari serangan hama eksternal.' },
      { icon: '🌿', title: 'Bebas Residu Berlebih', desc: 'Proses budidaya higienis menggunakan nutrisi bersih, aman dikonsumsi.' },
      { icon: '📡', title: 'Teknologi IoT Presisi', desc: 'Sensor nirkabel memantau kelembaban, pH, EC, dan suhu secara real-time.' },
      { icon: '📅', title: 'Panen Konsisten', desc: 'Fertigasi otomatis menjamin ketersediaan stok panen sepanjang tahun.' },
      { icon: '🚚', title: 'Pengiriman Cepat', desc: 'Dipetik segar di hari yang sama untuk menjaga rasa pedas dan kesegaran.' },
      { icon: '💰', title: 'Harga Transparan', desc: 'Koneksi langsung dari tangan petani tanpa perantara tengkulak luar.' }
    ];
    return `
      <section class="section" id="keunggulan-sec" style="background:var(--bg-primary);padding:80px 0;">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Keunggulan Utama Kami</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Mengapa cabe segar Greenhouse CabeKami adalah pilihan terbaik untuk dapur Anda</p>
          
          <div class="features-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
            ${items.map(item => `
              <div class="feature-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);transition:var(--transition);" data-reveal>
                <div class="feature-icon" style="font-size:2.5rem;margin-bottom:1.25rem;">${item.icon}</div>
                <h3 style="font-size:1.25rem;margin-bottom:0.75rem;color:var(--text-primary);">${item.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.925rem;line-height:1.5;">${item.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  produkUnggulan(products = []) {
    return `
      <section class="section bg-light" id="produk-unggulan-sec" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Produk Unggulan</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Daftar cabe segar kualitas premium langsung dari fasilitas greenhouse kami</p>
          
          <div class="product-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin-bottom:40px;">
            ${(products.slice(0, 4)).map(p => Components.productCard(p)).join('')}
          </div>
          <div class="section-center" style="text-align:center;">
            <a href="#produk" class="btn btn-primary" style="padding:12px 32px;">Lihat Semua Produk →</a>
          </div>
        </div>
      </section>
    `;
  },

  teknologi() {
    return `
      <section class="section" id="teknologi-sec" style="padding:80px 0;background:var(--bg-primary);">
        <div class="container">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:48px;align-items:center;">
            
            <div data-reveal>
              <span class="badge" style="background:rgba(13,110,253,0.1);color:var(--primary);padding:6px 12px;border-radius:var(--radius-full);font-weight:600;font-size:0.875rem;margin-bottom:1.5rem;display:inline-block;">Digital Agriculture</span>
              <h2 style="font-size:2.25rem;margin-bottom:1.5rem;font-family:'Poppins',sans-serif;line-height:1.2;">Teknologi Modern yang Membuat Perbedaan</h2>
              <p style="color:var(--text-secondary);line-height:1.6;margin-bottom:1.5rem;">Fasilitas Greenhouse Fayseri memanfaatkan integrasi sistem nirkabel Internet of Things (IoT) terpadu untuk memantau siklus pertumbuhan cabai selama 24 jam sehari penuh.</p>
              
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1rem;">
                <li style="display:flex;align-items:flex-start;gap:12px;">
                  <span style="background:var(--primary-light);color:var(--primary);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;">🌡️</span>
                  <div>
                    <strong style="color:var(--text-primary);display:block;">Sensor Suhu & Kelembaban Udara</strong>
                    <span style="color:var(--text-secondary);font-size:0.875rem;">Mengontrol sirkulasi kipas dan pengabutan demi temperatur stabil 28-30°C.</span>
                  </div>
                </li>
                <li style="display:flex;align-items:flex-start;gap:12px;">
                  <span style="background:rgba(34,197,94,0.1);color:#16a34a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;">💧</span>
                  <div>
                    <strong style="color:var(--text-primary);display:block;">Irigasi Otomatis (Drip Irrigation System)</strong>
                    <span style="color:var(--text-secondary);font-size:0.875rem;">Menyalurkan air langsung ke akar tanaman secara terjadwal, menghemat air hingga 40%.</span>
                  </div>
                </li>
                <li style="display:flex;align-items:flex-start;gap:12px;">
                  <span style="background:rgba(245,158,11,0.1);color:#f59e0b;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;">🧪</span>
                  <div>
                    <strong style="color:var(--text-primary);display:block;">Sistem Fertigasi Nutrisi Terkontrol</strong>
                    <span style="color:var(--text-secondary);font-size:0.875rem;">Pengaturan formula AB Mix dengan tingkat kepekatan kelistrikan (EC) presisi 2.4 mS/cm.</span>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Simulated Glassmorphic IoT Showcase Card matching Root Storefront -->
            <div data-reveal style="position:relative;">
              <div style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%);color:#f8fafc;padding:2.5rem;border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);border:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:1rem;">
                  <span style="display:flex;align-items:center;gap:8px;font-size:0.875rem;font-weight:600;letter-spacing:1px;color:#38bdf8;">
                    <span style="width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;animation:pulse 2s infinite;"></span>
                    LIVE MONITORING
                  </span>
                  <span style="font-size:0.75rem;opacity:0.6;"><i class="fa-solid fa-microchip"></i> Greenhouse 9 Jambi</span>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;">
                  <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);">
                    <small style="opacity:0.6;display:block;margin-bottom:4px;font-size:0.75rem;">SUHU UDARA</small>
                    <strong style="font-size:1.75rem;color:#f87171;font-family:'Poppins',sans-serif;">29.4°C</strong>
                  </div>
                  <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);">
                    <small style="opacity:0.6;display:block;margin-bottom:4px;font-size:0.75rem;">KELEMBABAN</small>
                    <strong style="font-size:1.75rem;color:#60a5fa;font-family:'Poppins',sans-serif;">68%</strong>
                  </div>
                  <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);">
                    <small style="opacity:0.6;display:block;margin-bottom:4px;font-size:0.75rem;">NUTRISI EC</small>
                    <strong style="font-size:1.75rem;color:#34d399;font-family:'Poppins',sans-serif;">2.4 EC</strong>
                  </div>
                  <div style="background:rgba(255,255,255,0.03);padding:1rem;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);">
                    <small style="opacity:0.6;display:block;margin-bottom:4px;font-size:0.75rem;">STATUS IKLIM</small>
                    <strong style="font-size:1.25rem;color:#fbbf24;font-family:'Poppins',sans-serif;display:flex;align-items:center;gap:4px;height:100%;">OPTIMAL ✓</strong>
                  </div>
                </div>
                
                <p style="margin-top:1.5rem;font-size:0.8rem;opacity:0.5;text-align:center;"><i class="fa-solid fa-clock-rotate-left"></i> Pembaruan terakhir: 5 menit yang lalu via Fayseri Cloud</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    `;
  },

  proses() {
    const steps = [
      { num: '🌱', title: 'Benih Unggul', desc: 'Dipilih secara selektif dari varietas cabe terbaik yang bersertifikasi resmi.' },
      { num: '🏭', title: 'Greenhouse Steril', desc: 'Benih disemai di lingkungan steril tertutup dengan pemantauan suhu IoT.' },
      { num: '💧', title: 'Rawat dengan Presisi', desc: 'Sistem fertigasi mikro menyalurkan tetesan nutrisi harian secara otomatis.' },
      { num: '🌶️', title: 'Panen Tepat Waktu', desc: 'Cabai dipanen secara manual saat tingkat warna merah mencapai tingkat optimal.' },
      { num: '🔍', title: 'Sortir Kualitas', desc: 'Disortir secara ketat untuk menyaring buah yang cacat atau berukuran kurang pas.' },
      { num: '🚚', title: 'Kirim Cepat', desc: 'Dikemas rapi dalam coldbox terisolasi dan dikirim hari ini langsung ke Anda.' }
    ];
    return `
      <section class="section bg-light" id="proses-sec" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Alur Dari Kebun Ke Piring Anda</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Transparansi proses produksi menjamin kesegaran cabai saat tiba di tangan Anda</p>
          
          <div class="timeline" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px;position:relative;">
            ${steps.map((s, i) => `
              <div class="timeline-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;text-align:center;box-shadow:var(--shadow-sm);position:relative;" data-reveal>
                <div class="timeline-dot" style="width:48px;height:48px;border-radius:50%;background:rgba(13,110,253,0.08);color:var(--primary);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem auto;font-size:1.5rem;font-weight:700;">${s.num}</div>
                <h3 style="font-size:1.15rem;margin-bottom:0.5rem;color:var(--text-primary);">${i + 1}. ${s.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  testimoni(items = []) {
    return `
      <section class="section" id="testimoni-sec" style="padding:80px 0;background:var(--bg-primary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Kepercayaan Pelanggan Kami</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Ulasan jujur langsung dari para mitra bisnis dan konsumen CabeKami</p>
          
          <div class="testimonial-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
            ${items.map(t => `
              <div class="testimonial-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);transition:var(--transition);" data-reveal>
                <div class="testimonial-rating" style="color:#fbbf24;margin-bottom:1rem;font-size:1.1rem;">${'★'.repeat(Math.floor(t.rating))}</div>
                <p class="testimonial-text" style="color:var(--text-primary);font-style:italic;line-height:1.6;margin-bottom:1.5rem;font-size:0.95rem;">"${t.text}"</p>
                <div style="border-top:1px solid var(--border);padding-top:1rem;">
                  <strong style="color:var(--text-primary);display:block;font-size:0.95rem;">${t.name}</strong>
                  <small style="color:var(--text-secondary);font-size:0.8rem;">Mitra di ${t.city}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  portofolio() {
    const list = [
      { target: 500, suffix: '+', label: 'Pelanggan Aktif' },
      { target: 98, suffix: '%', label: 'Tingkat Kepuasan' },
      { target: 12, suffix: '+', label: 'Varietas Produk' },
      { target: 100, suffix: '%', label: 'Greenhouse Steril' }
    ];
    return `
      <section class="section bg-light" id="counter-sec" style="padding:60px 0;background:var(--bg-secondary);">
        <div class="container">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;text-align:center;">
            ${list.map(c => `
              <div style="padding:1rem;" data-reveal>
                <span class="stat-number" data-target="${c.target}" style="font-size:3rem;font-weight:800;color:var(--primary);font-family:'Poppins',sans-serif;">0</span><span style="font-size:3rem;font-weight:800;color:var(--primary);font-family:'Poppins',sans-serif;">${c.suffix}</span>
                <p style="color:var(--text-secondary);font-weight:600;margin-top:4px;font-size:1rem;">${c.label}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  ctaAkhir() {
    const waT = encodeURIComponent("Halo CabeKami, saya melihat profil perusahaan Anda dan ingin bertanya mengenai kemitraan cabe segar.");
    return `
      <section class="section cta-section" style="padding:80px 0;background:linear-gradient(135deg, #16a34a 0%, #15803d 100%);color:#ffffff;text-align:center;">
        <div class="container container-narrow" data-reveal>
          <h2 style="font-size:2.25rem;color:#ffffff;margin-bottom:1rem;font-family:'Poppins',sans-serif;">Siap Menikmati Pedasnya Kualitas Kami?</h2>
          <p style="color:rgba(255,255,255,0.9);font-size:1.1rem;margin-bottom:2rem;line-height:1.6;">Diskusikan kebutuhan pasokan cabe segar bisnis restoran, katering, maupun grosir Anda sekarang dengan tim kami.</p>
          <div class="cta-buttons" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
            <a href="https://wa.me/${AppState.waNumber}?text=${waT}" target="_blank" class="btn btn-light" style="padding:12px 28px;font-weight:600;">💬 Hubungi WhatsApp</a>
            <a href="../index.html" class="btn btn-outline-light" style="padding:12px 28px;border:2px solid #ffffff;color:#ffffff;font-weight:600;">🛒 Buka Toko Online</a>
          </div>
        </div>
      </section>
    `;
  },

  sejarahTimeline() {
    const timeline = [
      { year: '2023', title: 'Peletakan Batu Pertama', desc: 'Greenhouse Fayseri Jambi didirikan di Kebon 9 Sungai Gelam dengan kapasitas 1 unit fertigasi pintar.' },
      { year: '2024', title: 'Integrasi IoT Pertama', desc: 'Penerapan modul sensor mikrokontroler nirkabel untuk mengatur EC nutrisi secara otomatis.' },
      { year: '2025', title: 'Ekspansi Unit Greenhouse', desc: 'Membangun tambahan 3 unit greenhouse steril modern demi melayani mitra retail perkotaan.' },
      { year: '2026', title: 'Penyediaan Distribusi Digital', desc: 'Peluncuran ekosistem digital untuk menjamin ketertelusuran produk dari petani ke tangan pembeli.' }
    ];
    return `
      <section class="section" style="padding:80px 0;background:var(--bg-primary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Sejarah Perjalanan Kami</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Tonggak sejarah inovasi ketahanan pangan presisi CabeKami</p>
          
          <div class="timeline-vertical" style="max-width:800px;margin:0 auto;position:relative;padding-left:30px;border-left:2px solid var(--border);">
            ${timeline.map(t => `
              <div class="timeline-item-vertical" style="position:relative;margin-bottom:40px;" data-reveal>
                <div class="timeline-year" style="position:absolute;left:-52px;top:4px;width:40px;height:40px;border-radius:50%;background:var(--primary);color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;box-shadow:var(--shadow-sm);">${t.year}</div>
                <div class="timeline-body" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-sm);">
                  <h4 style="font-size:1.15rem;margin-bottom:0.5rem;color:var(--text-primary);">${t.title}</h4>
                  <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">${t.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  visiMisi() {
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Visi & Misi</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Prinsip panduan kami dalam mempercepat adopsi agroteknologi modern</p>
          
          <div class="two-column" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:32px;">
            <div class="column" data-reveal>
              <div class="card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2.5rem;box-shadow:var(--shadow-md);height:100%;">
                <h3 style="font-size:1.5rem;color:var(--text-primary);margin-bottom:1rem;display:flex;align-items:center;gap:8px;"><span style="font-size:2rem;">🎯</span> VISI PERUSAHAAN</h3>
                <p style="color:var(--text-secondary);line-height:1.7;font-size:1rem;">Menjadi pelopor produsen pertanian komoditas cabai hortikultura modern berbasis digital yang ramah lingkungan, unggul dalam kebersihan, kelestarian, serta jaminan konsistensi suplai bagi seluruh rakyat Indonesia.</p>
              </div>
            </div>
            <div class="column" data-reveal>
              <div class="card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2.5rem;box-shadow:var(--shadow-md);height:100%;">
                <h3 style="font-size:1.5rem;color:var(--text-primary);margin-bottom:1rem;display:flex;align-items:center;gap:8px;"><span style="font-size:2rem;">🚀</span> MISI STRATEGIS</h3>
                <ul style="padding-left:1.25rem;color:var(--text-secondary);line-height:1.6;display:flex;flex-direction:column;gap:0.75rem;font-size:0.95rem;">
                  <li>Mengintegrasikan modul sensor Internet of Things (IoT) untuk kontrol nutrisi tanaman secara mutlak demi panen melimpah.</li>
                  <li>Menerapkan prinsip budidaya tanpa residu pestisida kimia berbahaya demi menjamin kesehatan setiap sajian masakan.</li>
                  <li>Memberikan akses perdagangan yang adil, transparan, dan memotong rantai distribusi yang merugikan petani lokal.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  fasilitasTeknologi() {
    return `
      <section class="section" style="padding:80px 0;background:var(--bg-primary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Fasilitas Greenhouse</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Investasi sistem agrikultura modern pendukung kelestarian alam</p>
          
          <div class="features-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;">
            <div class="feature-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);" data-reveal>
              <div class="feature-icon" style="font-size:2.5rem;margin-bottom:1rem;">🏠</div>
              <h3 style="font-size:1.2rem;margin-bottom:0.5rem;color:var(--text-primary);">Greenhouse Terintegrasi</h3>
              <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">Rangka baja galvanis dengan dinding anti serangga rapat untuk mencegah kontaminasi luar.</p>
            </div>
            <div class="feature-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);" data-reveal>
              <div class="feature-icon" style="font-size:2.5rem;margin-bottom:1rem;">⚡</div>
              <h3 style="font-size:1.2rem;margin-bottom:0.5rem;color:var(--text-primary);">Panel Listrik Cadangan</h3>
              <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">Menjamin kontinuitas pasokan pompa irigasi nirkabel meskipun terjadi pemadaman listrik PLN.</p>
            </div>
            <div class="feature-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);" data-reveal>
              <div class="feature-icon" style="font-size:2.5rem;margin-bottom:1rem;">🔬</div>
              <h3 style="font-size:1.2rem;margin-bottom:0.5rem;color:var(--text-primary);">Laboratorium Uji Kualitas</h3>
              <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">Setiap varietas dipantau secara organoleptik demi mengukur konsistensi tingkat pedas SHU.</p>
            </div>
            <div class="feature-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);" data-reveal>
              <div class="feature-icon" style="font-size:2.5rem;margin-bottom:1rem;">❄️</div>
              <h3 style="font-size:1.2rem;margin-bottom:0.5rem;color:var(--text-primary);">Cold Box Storage</h3>
              <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">Tempat penyimpanan steril pasca-panen berpendingin stabil agar buah cabai tidak cepat busuk.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  timKami() {
    const team = [
      { emoji: '👨‍💼', name: 'Ahmad Faisal Assaudi', role: 'Chief Executive Officer' },
      { emoji: '👩‍🌾', name: 'Siti Hartati', role: 'Head of Crop Production' },
      { emoji: '👨‍💻', name: 'Rasyid Haji', role: 'Hardware & IoT Architecture' }
    ];
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Pilar Kepemimpinan Kami</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Para inovator di balik operasional presisi Greenhouse CabeKami</p>
          
          <div class="team-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px;max-width:900px;margin:0 auto;">
            ${team.map(member => `
              <div class="team-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2.5rem;text-align:center;box-shadow:var(--shadow-sm);transition:var(--transition);" data-reveal>
                <div class="team-avatar" style="width:80px;height:80px;border-radius:50%;background:rgba(13,110,253,0.06);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem auto;font-size:2.5rem;">${member.emoji}</div>
                <h4 style="font-size:1.15rem;margin-bottom:0.25rem;color:var(--text-primary);">${member.name}</h4>
                <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem;">${member.role}</p>
                <div style="display:flex;justify-content:center;gap:12px;color:var(--text-secondary);">
                  <a href="#" title="LinkedIn" style="color:var(--text-secondary);font-size:1.1rem;"><i class="fab fa-linkedin"></i></a>
                  <a href="#" title="Email" style="color:var(--text-secondary);font-size:1.1rem;"><i class="fas fa-envelope"></i></a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  sertifikasiPenghargaan() {
    return `
      <section class="section" style="padding:60px 0;background:var(--bg-primary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:48px;font-family:'Poppins',sans-serif;">Sertifikasi & Kredibilitas</h2>
          <div class="certifications" style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;">
            <div class="cert-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-full);padding:10px 24px;font-weight:600;color:var(--text-primary);box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:8px;"><span style="color:#16a34a;">✓</span> Cara Tanam Baik (GAP Certified)</div>
            <div class="cert-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-full);padding:10px 24px;font-weight:600;color:var(--text-primary);box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:8px;"><span style="color:#16a34a;">✓</span> Bebas Logam Berat & Residu</div>
            <div class="cert-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-full);padding:10px 24px;font-weight:600;color:var(--text-primary);box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:8px;"><span style="color:#16a34a;">✓</span> Inovasi Agroteknologi Jambi 2025</div>
          </div>
        </div>
      </section>
    `;
  },

  galeriLengkap() {
    const images = [
      { src: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80', alt: 'Greenhouse Tanaman Cabe' },
      { src: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', alt: 'Penyiraman Otomatis' },
      { src: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80', alt: 'Hasil Panen Segar' },
      { src: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=600&q=80', alt: 'Penyortiran Buah' },
      { src: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80', alt: 'Dashboard Pantauan IoT' },
      { src: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80', alt: 'Pintu Gerbang Steril' }
    ];
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Dokumentasi Galeri</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Potret nyata aktivitas harian di fasilitas agrowisata Greenhouse CabeKami</p>
          
          <div class="gallery-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
            ${images.map((img, i) => `
              <div class="gallery-item" data-lightbox data-lightbox-image="${img.src}" style="position:relative;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);cursor:pointer;height:220px;" data-reveal>
                <img src="${img.src}" alt="${img.alt}" style="width:100%;height:100%;object-fit:cover;transition:var(--transition);" class="gallery-image">
                <div class="gallery-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(13,110,253,0.8);opacity:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:1.5rem;transition:var(--transition);"><i class="fas fa-search-plus"></i></div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  filterBar() {
    return `
      <section class="section" style="padding:40px 0 20px 0;background:var(--bg-primary);">
        <div class="container">
          <div class="filter-bar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;background:var(--surface);border:1px solid var(--border);padding:1rem;border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);">
            <div class="filter-tabs" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="filter-tab active" data-category="semua" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Semua</button>
              <button class="filter-tab" data-category="merah" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Cabe Merah</button>
              <button class="filter-tab" data-category="rawit" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Cabe Rawit</button>
              <button class="filter-tab" data-category="hijau" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Cabe Hijau</button>
            </div>
            <div class="filter-search" style="position:relative;min-width:250px;flex:1;max-width:350px;">
              <input type="text" id="search-product" placeholder="🔍 Cari produk..." class="search-input" style="width:100%;padding:10px 16px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:0.9rem;">
            </div>
          </div>
        </div>
      </section>
    `;
  },

  caraPemesanan() {
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Panduan Pembelian</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">4 langkah mudah memesan cabe segar premium langsung dari petani</p>
          
          <div class="timeline" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;">
            ${[
        { num: '1', title: 'Pilih Varietas', desc: 'Telusuri varietas cabe segar di atas lalu klik detail untuk spesifikasi lengkap.' },
        { num: '2', title: 'Tanya Admin WA', desc: 'Klik "Tanya WA" untuk memicu pesan WhatsApp yang terisi otomatis ke admin.' },
        { num: '3', title: 'Konfirmasi Jumlah', desc: 'Sebutkan jumlah kilogram pesanan dan alamat tujuan pengiriman Anda.' },
        { num: '4', title: 'Pengiriman Segar', desc: 'Cabe dipetik segar hari ini, dikemas rapi, dan dikirim langsung ke rumah Anda.' }
      ].map((s, i) => `
              <div class="timeline-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;box-shadow:var(--shadow-sm);text-align:center;position:relative;" data-reveal>
                <div class="timeline-dot" style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 1.25rem auto;">${s.num}</div>
                <h3 style="font-size:1.1rem;margin-bottom:0.5rem;color:var(--text-primary);">${s.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.5;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  },

  infoPengiriman() {
    return `
      <section class="section" style="padding:80px 0;background:var(--bg-primary);">
        <div class="container container-narrow">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Ketentuan Pengiriman & Logistik</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Kebijakan pengemasan rantai dingin CabeKami demi menjaga kesegaran</p>
          
          <div class="accordion" style="display:flex;flex-direction:column;gap:16px;">
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>📍 Area Layanan Distribusi</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Kami melayani pengiriman langsung (same-day delivery) untuk area Kota Jambi, Muaro Jambi, dan sekitarnya menggunakan armada kurir berpendingin internal. Untuk luar daerah, pengiriman dilakukan via ekspedisi khusus ekspres satu hari sampai.</p>
              </div>
            </div>
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>⏱️ Kebijakan Batas Waktu Order</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Pemesanan yang terverifikasi sebelum pukul 09.00 WIB akan dipanen dan dikirim langsung pada siang hari yang sama. Order di atas jam tersebut akan dimasukkan dalam antrean panen pagi keesokan harinya.</p>
              </div>
            </div>
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>📦 Teknologi Pengemasan Higienis</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Setiap cabe segar ditata rapi dalam kardus berpori udara mikro khusus yang dilengkapi ice gel dingin ramah lingkungan. Ini meminimalkan pembusukan akibat kelembaban yang mengembun selama di perjalanan.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  jaminanKualitas() {
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Metrik Garansi Kualitas</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Komitmen mutlak CabeKami untuk memberikan kepuasan maksimal</p>
          
          <div class="guarantee-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
            <div class="guarantee-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;text-align:center;" data-reveal>
              <div class="guarantee-icon" style="font-size:2.5rem;margin-bottom:1rem;">✓</div>
              <h3 style="color:var(--text-primary);margin-bottom:0.5rem;font-size:1.2rem;">Sortir Ketat 100%</h3>
              <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">Tidak ada cabe yang pecah, keriput, atau busuk yang lolos ke dalam kemasan logistik Anda.</p>
            </div>
            <div class="guarantee-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;text-align:center;" data-reveal>
              <div class="guarantee-icon" style="font-size:2.5rem;margin-bottom:1rem;">❄️</div>
              <h3 style="color:var(--text-primary);margin-bottom:0.5rem;font-size:1.2rem;">Rantai Dingin Stabil</h3>
              <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">Buah cabe dipelihara dalam suhu dingin dari stasiun sortir hingga tiba di depan pintu rumah.</p>
            </div>
            <div class="guarantee-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2rem;text-align:center;" data-reveal>
              <div class="guarantee-icon" style="font-size:2.5rem;margin-bottom:1rem;">🔄</div>
              <h3 style="color:var(--text-primary);margin-bottom:0.5rem;font-size:1.2rem;">Garansi Kesegaran</h3>
              <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">Jika cabe yang diterima tidak segar atau busuk, kami ganti 100% tanpa ribet dalam 24 jam.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  filterKategoriArtikel() {
    return `
      <section style="padding:20px 0;background:var(--bg-primary);">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;background:var(--surface);border:1px solid var(--border);padding:1rem;border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);">
            <div class="filter-tabs article-filters" style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="filter-tab active" data-category="semua" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Semua Kategori</button>
              <button class="filter-tab" data-category="pemula" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Pemula</button>
              <button class="filter-tab" data-category="tips" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Tips</button>
              <button class="filter-tab" data-category="resep" style="padding:8px 16px;border-radius:var(--radius-md);font-weight:600;font-size:0.9rem;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:var(--transition);">Resep</button>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  faqSection() {
    return `
      <section class="section bg-light" style="padding:80px 0;background:var(--bg-secondary);">
        <div class="container container-narrow">
          <h2 class="section-title" style="text-align:center;margin-bottom:12px;font-family:'Poppins',sans-serif;">Pertanyaan Sering Diajukan</h2>
          <p class="section-subtitle" style="text-align:center;margin-bottom:48px;color:var(--text-secondary);">Temukan jawaban instan mengenai kualitas budidaya greenhouse CabeKami</p>
          
          <div class="accordion" style="display:flex;flex-direction:column;gap:16px;">
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>❓ Apa perbedaan utama cabai greenhouse dibanding cabai lahan terbuka?</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Cabai greenhouse tumbuh di lingkungan steril yang terlindung dari paparan spora jamur dan serangga perusak secara fisik. Hasilnya, tanaman tidak memerlukan semprotan pestisida kimia yang berlebihan, memiliki warna buah yang sangat merata, rasanya konsisten pedas, dan memiliki daya simpan alami yang lebih tahan lama.</p>
              </div>
            </div>
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>❓ Apakah produk CabeKami dipanen setiap hari?</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Ya! Rotasi blok tanaman di greenhouse Fayseri diatur secara presisi dengan bantuan jadwal komputer fertigasi IoT. Ini memastikan bahwa kami memiliki blok tanaman yang siap panen setiap pagi, menjamin kontinuitas suplai segar harian tanpa terpengaruh cuaca ekstrem di luar.</p>
              </div>
            </div>
            <div class="accordion-item" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm);">
              <button class="accordion-header" style="width:100%;padding:1.25rem;text-align:left;font-weight:600;font-size:1.05rem;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;background:none;border:none;cursor:pointer;">
                <span>❓ Bagaimana cara mengajukan kemitraan suplai restoran?</span>
                <i class="fas fa-chevron-down" style="font-size:0.8rem;transition:var(--transition);"></i>
              </button>
              <div class="accordion-body" style="padding:0 1.25rem 1.25rem 1.25rem;color:var(--text-secondary);font-size:0.925rem;line-height:1.6;display:none;">
                <p>Anda bisa langsung menghubungi admin kami via tombol WhatsApp di halaman Kontak untuk mendapatkan penawaran harga grosir khusus kemitraan (B2B). Kami menyediakan opsi kontrak suplai tahunan dengan harga yang diikat stabil meskipun harga pasar cabai nasional bergejolak naik turun.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
};

// ─── FILTERS ────────────────────────────────────────────────────────────────
const ProductFilter = {
  init() {
    const tabs = document.querySelectorAll('.filter-tabs:not(.article-filters) .filter-tab');
    const search = document.getElementById('search-product');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.filterProducts(tab.dataset.category);
      });
    });

    if (search) {
      search.addEventListener('input', (e) => {
        this.searchProducts(e.target.value);
      });
    }
  },

  filterProducts(category) {
    let filtered = AppState.products;
    if (category !== 'semua') {
      filtered = filtered.filter(p => p.category === category);
    }
    this.renderGrid(filtered);
  },

  searchProducts(query) {
    const q = query.toLowerCase();
    const filtered = AppState.products.filter(p => {
      const name = (p.nama || p.name || p.nama_produk || '').toLowerCase();
      const desc = (p.deskripsi || p.desc || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
    this.renderGrid(filtered);
  },

  renderGrid(products) {
    const grid = document.getElementById('produk-grid');
    if (grid) {
      grid.innerHTML = products.length ?
        products.map(p => Components.productCard(p)).join('') :
        '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Produk tidak ditemukan</p>';
    }
  }
};

const ArticleFilter = {
  init() {
    const tabs = document.querySelectorAll('.article-filters .filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.filterArticles(tab.dataset.category);
      });
    });
  },

  filterArticles(category) {
    let filtered = AppState.articles;
    if (category !== 'semua') {
      filtered = filtered.filter(a => a.category === category);
    }
    this.renderGrid(filtered);
  },

  renderGrid(articles) {
    const grid = document.getElementById('artikel-grid');
    if (grid) {
      grid.innerHTML = articles.length ?
        articles.map(a => Components.articleCard(a)).join('') :
        '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Artikel tidak ditemukan</p>';
    }
  }
};

// ─── PRODUCT MODAL ──────────────────────────────────────────────────────────
const ProductModal = {
  open(product) {
    const name = product.nama || product.name || product.nama_produk || 'Produk';
    const price = product.harga || product.price || 0;
    const desc = product.deskripsi || product.desc || '';
    const category = product.kategori || product.category || 'Cabe';
    const stock = product.stok || product.stok_tersedia || product.status || 'Tersedia';
    const rating = product.rating || 4.9;
    const sold = product.sold || product.terjual || 120;

    const isImg = (src) => src && typeof src === 'string' && /^(data:image\/|https?:\/\/|blob:|\/|assets\/)/i.test(src.trim());
    const fotoSrc = product.foto || product.image || '';
    const imgHTML = isImg(fotoSrc)
      ? `<img src="${fotoSrc.trim()}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);" loading="lazy">`
      : `<div class="product-img-placeholder" style="display:flex;align-items:center;justify-content:center;height:100%;width:100%;background:rgba(13,110,253,0.06);font-size:4rem;border-radius:var(--radius-lg);">🌶️</div>`;

    const waT = encodeURIComponent(`Halo Admin Cabe Kami 🌶️\n\nSaya tertarik dengan produk "${name}" seharga Rp ${price.toLocaleString('id-ID')}/kg yang saya lihat di company profile.\n\nApakah masih tersedia untuk dipesan? Terima kasih!`);

    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close" onclick="this.closest('.product-modal-overlay').remove()">✕</button>
        <div class="modal-content">
          <div class="modal-image" style="height:300px;overflow:hidden;border-radius:var(--radius-lg);">${imgHTML}</div>
          <div class="modal-body">
            <h2>${name}</h2>
            <p class="modal-category">Kategori: <strong>${category}</strong></p>
            <p class="modal-price">Harga: <strong>Rp ${price.toLocaleString('id-ID')}/kg</strong></p>
            <p class="modal-stock">Stok: <strong>${stock}</strong></p>
            <p class="modal-rating">Rating: <strong>⭐ ${rating} (${sold}+ terjual)</strong></p>
            <p class="modal-desc" style="margin-top:1rem;color:var(--text-secondary);">${desc}</p>
            <h4 style="margin-top:1.5rem;">Spesifikasi:</h4>
            <ul>
              <li>Berat: per kg</li>
              <li>Kepedasan: Bervariasi</li>
              <li>Asal: Greenhouse Fayseri, Kebon 9 Jambi</li>
            </ul>
            <button class="btn btn-primary btn-block" style="width:100%;margin-top:1.5rem;" onclick="window.open('https://wa.me/' + AppState.waNumber + '?text=${waT}'); this.closest('.product-modal-overlay').remove();">
              💬 Pesan via WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
};

// ─── NAVBAR ─────────────────────────────────────────────────────────────────
const Navbar = {
  render() {
    document.getElementById('topbar').innerHTML = '';

    document.getElementById('navbar').innerHTML = `
      <div class="navbar-main">
        <a href="#beranda" class="brand">
          <svg class="brand-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" style="width:38px;height:38px;">
            <defs>
              <linearGradient id="chiliGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF3366" />
                <stop offset="50%" stop-color="#E50914" />
                <stop offset="100%" stop-color="#B20710" />
              </linearGradient>
              <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10B981" />
                <stop offset="100%" stop-color="#047857" />
              </linearGradient>
              <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M45,25 C58,15 75,20 80,32 C85,45 68,78 58,95 C46,112 24,106 24,84 C24,62 38,38 45,25 Z" fill="url(#chiliGrad)" filter="url(#logoGlow)" />
            <path d="M55,20 C64,8 82,12 76,28 C70,44 58,32 55,20 Z" fill="url(#leafGrad)" />
            <path d="M38,70 L52,70 L58,82" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.6" />
            <circle cx="38" cy="70" r="3" fill="#FFFFFF" />
            <circle cx="52" cy="70" r="3" fill="#FFFFFF" />
            <circle cx="58" cy="82" r="3.5" fill="#FFFFFF" />
          </svg>
          <span class="brand-text">Cabe<span class="highlight">Kami</span></span>
        </a>
        <ul class="nav-links" id="nav-links">
          <li><a href="#beranda" data-page="beranda">Beranda</a></li>
          <li><a href="#tentang" data-page="tentang">Tentang</a></li>
          <li><a href="#produk" data-page="produk">Produk</a></li>
          <li><a href="#panduan" data-page="panduan">Panduan</a></li>
          <li><a href="#kontak" data-page="kontak">Kontak</a></li>
        </ul>
        <div class="nav-actions">
          <a href="#kontak" class="btn-cta">Hubungi Kami</a>
          <button class="hamburger" id="hamburger" onclick="Navbar.toggleMobile()"><i class="fas fa-bars"></i></button>
        </div>
      </div>
    `;

    this.updateJamStatus();
    this.setupMobileMenu();
  },

  setActive(page) {
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
  },

  toggleMobile() {
    document.getElementById('nav-links')?.classList.toggle('open');
  },

  setupMobileMenu() {
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById('nav-links')?.classList.remove('open');
      });
    });
  },

  updateJamStatus() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    let buka = (day >= 1 && day <= 5 && hour >= 8 && hour < 17) || (day === 6 && hour >= 8 && hour < 14);
    const el = document.getElementById('jam-status-footer');
    if (el) el.innerHTML = buka ? '<span class="badge-open">● Buka Sekarang</span>' : '<span class="badge-closed">● Sedang Tutup</span>';
  }
};

// ─── FOOTER ─────────────────────────────────────────────────────────────────
const Footer = {
  render() {
    document.getElementById('footer').innerHTML = `
      <div class="footer-content">
        <div class="footer-section">
          <h4>Tentang Kami</h4>
          <p>Greenhouse Fayseri menyediakan cabe segar berkualitas dengan teknologi IoT terdepan.</p>
          <div class="footer-social">
            <a href="#" title="Instagram"><i class="fab fa-instagram"></i></a>
            <a href="#" title="Facebook"><i class="fab fa-facebook"></i></a>
            <a href="https://wa.me/${AppState.waNumber}" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
          </div>
        </div>
        <div class="footer-section">
          <h4>Menu</h4>
          <ul>
            <li><a href="#beranda">Beranda</a></li>
            <li><a href="#tentang">Tentang Kami</a></li>
            <li><a href="#produk">Produk</a></li>
            <li><a href="#panduan">Panduan</a></li>
            <li><a href="#kontak">Kontak</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Hubungi Kami</h4>
          <p><strong>Alamat:</strong><br>Greenhouse Fayseri, Jambi, Indonesia</p>
          <p><strong>Telepon:</strong><br><a href="https://wa.me/${AppState.waNumber}" style="color:var(--text-secondary);">+62 896-0157-2430</a></p>
          <p><strong>Email:</strong><br>info@cabekami.id</p>
        </div>
        <div class="footer-section">
          <h4>Jam Operasional</h4>
          <p>Senin-Jumat: 08:00-17:00 WIB<br>Sabtu: 08:00-14:00 WIB<br>Minggu: Tutup</p>
        </div>
      </div>
      <div class="footer-bottom" style="text-align:center;">
        <div class="footer-info-strip" style="display:flex; justify-content:center; gap:24px; flex-wrap:wrap; margin-bottom:16px; font-size:0.95rem; font-weight:600; color:var(--text-secondary);">
          <span style="display:flex; align-items:center; gap:6px;"><i class="fas fa-map-marker-alt" style="color:var(--primary);"></i> Jambi, Indonesia</span>
          <span style="display:flex; align-items:center; gap:6px;"><i class="fas fa-phone" style="color:#22c55e;"></i> +6289601572430</span>
          <span style="display:flex; align-items:center; gap:6px;"><i class="fas fa-clock" style="color:#fbbf24;"></i> <span id="jam-status-footer">● Sedang Tutup</span></span>
        </div>
        <div class="theme-toggle-container" style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:16px;">
          <button class="btn-theme" onclick="Theme.toggle()" aria-label="Ubah Tema" style="width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); background-color:var(--bg-primary); color:var(--text-primary); transition:var(--transition); cursor:pointer;">
            <i class="fas fa-palette" id="theme-icon"></i>
          </button>
          <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">Mode Malam / Tema</span>
        </div>
        <p>&copy; 2026 Cabe Kami. Semua hak dilindungi. | <a href="#">Privacy Policy</a> | <a href="#">Terms & Conditions</a></p>
      </div>
    `;
  }
};

// ─── SEO ────────────────────────────────────────────────────────────────────
const SEO = {
  pages: {
    beranda: { title: 'Cabe Kami — Cabe Segar Langsung dari Greenhouse Jambi', desc: 'Cabe segar berkualitas premium dari Greenhouse Fayseri Jambi. Teknologi IoT, jaminan kesegaran 48 jam, pengiriman ke seluruh Indonesia.' },
    tentang: { title: 'Tentang Cabe Kami | Greenhouse Fayseri', desc: 'Pelajari sejarah, visi, misi, dan teknologi di balik Greenhouse Fayseri Jambi.' },
    produk: { title: 'Produk & Layanan | Cabe Kami', desc: 'Katalog lengkap produk cabe segar dari Greenhouse Fayseri dengan harga terbaik.' },
    panduan: { title: 'Panduan & Edukasi | Cabe Kami', desc: 'Panduan menanam cabe, tips kesegaran, dan resep makanan dari Cabe Kami.' },
    kontak: { title: 'Hubungi Kami | Cabe Kami', desc: 'Hubungi Greenhouse Fayseri untuk pemesanan atau pertanyaan tentang produk.' }
  },
  update(page) {
    const data = this.pages[page] || this.pages.beranda;
    document.title = data.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', data.desc);
  }
};

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

const Lightbox = {
  open(src) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-image');
    img.src = src;
    modal.style.display = 'flex';
  },
  close() {
    document.getElementById('lightbox-modal').style.display = 'none';
  }
};

const Theme = {
  themes: ['faesa', 'light', 'dark'],

  toggle() {
    const current = AppState.theme;
    const currentIndex = this.themes.indexOf(current);
    const next = this.themes[(currentIndex + 1) % this.themes.length];
    document.documentElement.setAttribute('data-theme', next);
    AppState.theme = next;
    localStorage.setItem(THEME_KEY, next);
    this.updateIcon();
  },

  updateIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      if (AppState.theme === 'faesa') {
        icon.className = 'fas fa-palette';
      } else if (AppState.theme === 'light') {
        icon.className = 'fas fa-moon';
      } else {
        icon.className = 'fas fa-sun';
      }
    }
  }
};

function navigate(hash) {
  window.location.hash = hash;
}

// ─── SCROLL HANDLERS ────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top');
  if (btn) btn.style.display = window.scrollY > 300 ? 'block' : 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', AppState.theme);
  Footer.render();
  Navbar.render();
  Theme.updateIcon();
  Router.init();
  setInterval(() => Navbar.updateJamStatus(), 60000);

  const backToTop = document.getElementById('back-to-top');
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  document.querySelector('.lightbox-close')?.addEventListener('click', () => Lightbox.close());
  document.getElementById('lightbox-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-modal') Lightbox.close();
  });
});
