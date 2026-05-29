/* ================================================================
   CABE KAMI — App Logic v2.1
   Fitur: Tema, Wishlist, Modal, Search/Filter, Pagination,
          Settings Panel, Login Gate (Supabase Auth)
   ================================================================ */

// ===================== CONFIG =====================
const SUPABASE_URL    = 'https://oqufttiwgmgcxlncoguj.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xdWZ0dGl3Z21nY3hsbmNvZ3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODMxMjAsImV4cCI6MjA5NTI1OTEyMH0.RQ2PwcEoSWWEt2fOItqmBFRgSdi4wFuIpKV7XamkmZ8';
const WA_NUMBER       = '6289601572430';
const STORAGE_KEY     = 'fayseri_produk_siap_jual';
const PANDUAN_KEY     = 'fayseri_buku_panduan';
const THEME_KEY       = 'fayseri_theme';
const WISHLIST_KEY    = 'cabekami_wishlist';
const CHAT_KEY        = 'fayseri_chat_messages';
const ITEMS_PER_PAGE  = 12;

let supabaseClient = null;
let scrollObserver = null;

function isImageSource(value) {
    if (typeof value !== 'string') return false;
    const clean = value.trim();
    return /^(data:image\/|https?:\/\/|blob:)/i.test(clean);
}

function readCachedProducts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveCachedProducts(products) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products || []));
    } catch {
        // ignore persistence failures
    }
}

function readCachedPanduan() {
    try {
        const raw = localStorage.getItem(PANDUAN_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveCachedPanduan(panduan) {
    try {
        localStorage.setItem(PANDUAN_KEY, JSON.stringify(panduan || []));
    } catch {
        // ignore
    }
}

// ===================== STATE =====================
const State = {
    all:         [],
    filtered:    [],
    page:        1,
    query:       '',
    filter:      'semua',
    sort:        'default',
    wishlist:    [],
    modalProd:   null,
    panduan:     [],
    filteredPanduan: [],
};

// ===================== UTILS =====================
const fmt = (n) => n > 0
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
    : 'Hubungi Admin';

const encWA = (t) => encodeURIComponent(t);

function buildWAText(nama, harga, stok) {
    return encWA(`Halo Admin Cabe Kami 🌶️\n\nSaya ingin memesan:\n*Produk:* ${nama}\n*Harga:* ${harga}\n*Stok:* ${stok || 'Sesuai kesepakatan'}\n\nMohon info lebih lanjut. Terima kasih!`);
}

function toast(msg, type = 'ok') {
    // Disabled all popup notifications as per user request
    return;
}

// ===================== INIT SUPABASE =====================
function initSupa() {
    try {
        if (window.supabase?.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            return true;
        }
    } catch (e) { /* retry */ }
    return false;
}

// ===================== THEME MANAGER =====================
const ThemeManager = {
    themes:  ['faesa', 'light', 'dark'],

    get() { return localStorage.getItem(THEME_KEY) || 'faesa'; },

    apply(theme) {
        if (!this.themes.includes(theme)) theme = 'faesa';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);

        // Update visual aktif di settings panel
        document.querySelectorAll('.theme-opt').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    },

    init() {
        this.apply(this.get());

        // Klik opsi tema di settings panel
        document.querySelectorAll('.theme-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                this.apply(btn.dataset.theme);
                toast(`Tema: ${btn.dataset.theme.charAt(0).toUpperCase() + btn.dataset.theme.slice(1)}`);
            });
        });
    }
};

// ===================== WISHLIST =====================
const Wishlist = {
    load() {
        try { State.wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
        catch { State.wishlist = []; }
    },
    save()  { localStorage.setItem(WISHLIST_KEY, JSON.stringify(State.wishlist)); },
    has(id) { return State.wishlist.some(p => p.id === id); },

    toggle(product) {
        const nama = product.nama || product.nama_produk || 'Produk';
        if (this.has(product.id)) {
            State.wishlist = State.wishlist.filter(p => p.id !== product.id);
            toast('Dihapus dari favorit');
        } else {
            State.wishlist.push(product);
            toast(`${nama} disimpan ke favorit ❤️`);
        }
        this.save();
        this._updateBadge();
        this._syncCardBtns(product.id);
        this.renderPanel();
    },

    _updateBadge() {
        const el = document.getElementById('wishlistCount');
        if (!el) return;
        const c = State.wishlist.length;
        el.textContent = c;
        el.style.display = c > 0 ? 'flex' : 'none';

        // Update icon jantung di navbar
        const navBtn = document.getElementById('btnWishlist');
        if (navBtn) {
            const icon = navBtn.querySelector('i');
            if (icon) icon.className = c > 0 ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    },

    _syncCardBtns(id) {
        document.querySelectorAll(`.card-wishlist-btn[data-id="${id}"]`).forEach(btn => {
            const inWL = this.has(id);
            btn.classList.toggle('active', inWL);
            const i = btn.querySelector('i');
            if (i) i.className = inWL ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        });
    },

    renderPanel() {
        const body = document.getElementById('wishlistPanelBody');
        if (!body) return;
        if (!State.wishlist.length) {
            body.innerHTML = `<div class="panel-empty"><i class="fa-regular fa-heart"></i><p>Belum ada produk favorit</p></div>`;
            return;
        }
        body.innerHTML = State.wishlist.map(p => {
            const nama  = p.nama || p.nama_produk || 'Produk';
            const harga = fmt(p.harga);
            const foto  = isImageSource(p.foto) ? p.foto : null;
            const imgHTML = foto ? `<img src="${foto}" alt="${nama}" loading="lazy">` : `<i class="fa-solid fa-pepper-hot"></i>`;
            const waT = buildWAText(nama, harga, p.stok || p.stok_tersedia || '');
            const dataAttr = JSON.stringify(p).replace(/"/g, '&quot;');
            return `
                <div class="wishlist-item">
                    <div class="wishlist-item-img">${imgHTML}</div>
                    <div class="wishlist-item-info">
                        <div class="wishlist-item-name">${nama}</div>
                        <div class="wishlist-item-price">${harga}</div>
                    </div>
                    <div class="wishlist-item-actions">
                        <a href="https://wa.me/${WA_NUMBER}?text=${waT}" target="_blank" rel="noopener" class="wishlist-item-wa" title="Pesan via WA">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        <button class="wishlist-item-del" onclick="Wishlist.toggle(${dataAttr})" title="Hapus dari favorit">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    },

    openPanel() {
        this.renderPanel();
        document.getElementById('wishlistPanelOverlay')?.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        SettingsPanel.close();
    },
    closePanel() {
        document.getElementById('wishlistPanelOverlay')?.classList.remove('show');
        const any = document.querySelectorAll('.side-panel-overlay.show, .modal-overlay.show');
        if (!any || any.length === 0) {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    },

    init() {
        this.load();
        this._updateBadge();
        document.getElementById('btnWishlist')?.addEventListener('click', () => this.openPanel());
        document.getElementById('closeWishlistPanel')?.addEventListener('click', () => this.closePanel());
        document.getElementById('wishlistPanelOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closePanel();
        });
    }
};

// ===================== SETTINGS PANEL =====================
const SettingsPanel = {
    open() {
        document.getElementById('settingsPanelOverlay')?.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        Wishlist.closePanel();
        Auth.refreshUI();
    },
    close() {
        document.getElementById('settingsPanelOverlay')?.classList.remove('show');
        const any = document.querySelectorAll('.side-panel-overlay.show, .modal-overlay.show');
        if (!any || any.length === 0) {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    },

    init() {
        document.getElementById('btnSettings')?.addEventListener('click', () => this.open());
        document.getElementById('closeSettingsPanel')?.addEventListener('click', () => this.close());
        document.getElementById('settingsPanelOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.close();
        });

        // Toggle Info Akun
        const btnToggleAcc = document.getElementById('btnToggleAccountInfo');
        const accContainer = document.getElementById('accountInfoContainer');
        if (btnToggleAcc && accContainer) {
            btnToggleAcc.addEventListener('click', () => {
                const isHidden = accContainer.style.display === 'none';
                accContainer.style.display = isHidden ? 'block' : 'none';
                btnToggleAcc.innerHTML = isHidden
                    ? `<i class="fa-solid fa-chevron-up"></i> Sembunyikan Info Akun`
                    : `<i class="fa-solid fa-circle-user"></i> Info Akun`;
            });
        }

        // Tombol "Login untuk Akses Dashboard"
        document.getElementById('btnGoLoginFirst')?.addEventListener('click', () => {
            // Auto open the toggle first if closed
            if (accContainer && accContainer.style.display === 'none') {
                btnToggleAcc?.click();
            }
            document.getElementById('authLoginForm')?.scrollIntoView({ behavior: 'smooth' });
            document.getElementById('authEmail')?.focus();
        });
    }
};

// ===================== LOGIN PANEL =====================
const LoginPanel = {
    open() {
        switchStorefrontView('login');
        SettingsPanel.close();
        Wishlist.closePanel();
        ChatPanel.close();
    },
    close() {
        switchStorefrontView('home');
    },
    init() {
        document.getElementById('linkToRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            RegisterPanel.open();
        });
    }
};

// ===================== REGISTER PANEL =====================
const RegisterPanel = {
    open() {
        switchStorefrontView('register');
        SettingsPanel.close();
        Wishlist.closePanel();
    },
    close() {
        switchStorefrontView('home');
    },
    init() {
        document.getElementById('linkToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            LoginPanel.open();
        });
    }
};

// ===================== AUTH (Login Gate) =====================
const Auth = {
    async getSession() {
        if (!supabaseClient) return null;
        try {
            const { data } = await supabaseClient.auth.getSession();
            return data?.session || null;
        } catch { return null; }
    },

    async refreshUI() {
        const session = await this.getSession();
        const loggedOut  = document.getElementById('authStatusLoggedOut');
        const loggedIn   = document.getElementById('authStatusLoggedIn');
        const needLogin  = document.getElementById('dashboardNeedLogin');
        const canAccess  = document.getElementById('dashboardCanAccess');
        const userEmail  = document.getElementById('authUserEmail');
        const userNickname = document.getElementById('authUserNickname');
        const userRole = document.getElementById('authUserRole');

        if (session) {
            if (loggedOut)  loggedOut.style.display  = 'none';
            if (loggedIn)   loggedIn.style.display   = 'block';
            
            const email = session.user?.email || '—';
            const nickname = session.user?.user_metadata?.nickname || email.split('@')[0];
            
            if (userEmail)  userEmail.textContent     = email;
            if (userNickname) userNickname.textContent = nickname;
            
            const isAdmin = email === 'ahmadfaisalassaudi30@gmail.com';
            
            if (userRole) {
                userRole.textContent = isAdmin ? 'Administrator' : 'Pelanggan';
                userRole.style.color = isAdmin ? '#ef4444' : 'var(--primary)';
            }
            
            if (isAdmin) {
                if (needLogin)  needLogin.style.display  = 'none';
                if (canAccess)  canAccess.style.display  = 'block';
            } else {
                if (needLogin) {
                    needLogin.style.display  = 'block';
                    const noteEl = needLogin.querySelector('.settings-note');
                    if (noteEl) noteEl.textContent = 'Akses Dashboard terbatas hanya untuk email administrator utama (ahmadfaisalassaudi30@gmail.com).';
                    const btnGo = document.getElementById('btnGoLoginFirst');
                    if (btnGo) btnGo.style.display = 'none';
                }
                if (canAccess)  canAccess.style.display  = 'none';
            }
        } else {
            if (loggedOut)  loggedOut.style.display  = 'block';
            if (loggedIn)   loggedIn.style.display   = 'none';
            if (needLogin) {
                needLogin.style.display  = 'block';
                const noteEl = needLogin.querySelector('.settings-note');
                if (noteEl) noteEl.textContent = 'Akses Dashboard Fayseri memerlukan login akun admin terlebih dahulu.';
                const btnGo = document.getElementById('btnGoLoginFirst');
                if (btnGo) btnGo.style.display = 'block';
            }
            if (canAccess)  canAccess.style.display  = 'none';
        }
    },

    async login(email, password) {
        if (!supabaseClient) { toast('Koneksi gagal.', 'error'); return; }
        const btn = document.getElementById('btnAuthLogin');
        const errMsg = document.getElementById('authErrorMsg');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Masuk...'; }
        if (errMsg) errMsg.style.display = 'none';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            const userEmail = data.user?.email || '';
            const nickname = data.user?.user_metadata?.nickname || userEmail.split('@')[0];
            toast(`Selamat datang, ${nickname}!`);
            
            this.refreshUI();
            LoginPanel.close();
        } catch (err) {
            const msg = err.message?.includes('Invalid') ? 'Email atau password salah.' : (err.message || 'Login gagal.');
            if (errMsg) { errMsg.textContent = msg; errMsg.style.display = 'block'; }
            toast(msg, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk'; }
        }
    },

    async register(email, password, nickname) {
        if (!supabaseClient) { toast('Koneksi gagal.', 'error'); return; }
        const btn = document.getElementById('btnAuthRegister');
        const errMsg = document.getElementById('authRegErrorMsg');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendaftar...'; }
        if (errMsg) errMsg.style.display = 'none';

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nickname: nickname
                    }
                }
            });
            if (error) throw error;
            toast('Pendaftaran berhasil! Akun Anda aktif.');
            
            RegisterPanel.close();
            LoginPanel.open();
            
            const emailInput = document.getElementById('authEmail');
            if (emailInput) {
                emailInput.value = email;
                document.getElementById('authPassword')?.focus();
            }
        } catch (err) {
            const msg = err.message || 'Pendaftaran gagal.';
            if (errMsg) { errMsg.textContent = msg; errMsg.style.display = 'block'; }
            toast(msg, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Daftar Akun'; }
        }
    },

    async logout() {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        toast('Berhasil keluar dari akun.');
        this.refreshUI();
    },

    init() {
        LoginPanel.init();
        RegisterPanel.init();

        document.getElementById('btnOpenLoginPanel')?.addEventListener('click', () => LoginPanel.open());
        document.getElementById('btnOpenRegisterPanel')?.addEventListener('click', () => RegisterPanel.open());

        document.getElementById('authLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email    = document.getElementById('authEmail')?.value.trim() || '';
            const password = document.getElementById('authPassword')?.value || '';
            if (!email || !password) { toast('Isi email dan password terlebih dahulu.', 'error'); return; }
            this.login(email, password);
        });

        document.getElementById('authRegisterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const nickname = document.getElementById('authRegNickname')?.value.trim() || '';
            const email    = document.getElementById('authRegEmail')?.value.trim() || '';
            const password = document.getElementById('authRegPassword')?.value || '';
            if (!nickname || !email || !password) { toast('Isi semua kolom pendaftaran terlebih dahulu.', 'error'); return; }
            if (password.length < 6) { toast('Password minimal 6 karakter.', 'error'); return; }
            this.register(email, password, nickname);
        });

        document.getElementById('btnAuthLogout')?.addEventListener('click', () => this.logout());
    }
};

// ===================== MODAL DETAIL PRODUK =====================
const ProductModal = {
    open(prod) {
        State.modalProd = prod;
        const nama  = prod.nama || prod.nama_produk || 'Produk';
        const harga = fmt(prod.harga);
        const stok  = prod.stok || prod.stok_tersedia || '';
        const status = prod.status || 'Tersedia';
        const isHabis = status === 'Habis';
        const desc  = prod.deskripsi || '';

        document.getElementById('modalProdukNama').textContent = nama;
        document.getElementById('modalHarga').textContent = harga;
        document.getElementById('modalDeskripsi').textContent = desc;

        const badge = document.getElementById('modalStokBadge');
        badge.textContent = stok || status;
        badge.className = `modal-stok-badge tag-stok${isHabis ? ' habis' : ''}`;

        document.getElementById('modalMeta').innerHTML = `
            ${stok ? `<div class="modal-meta-item"><strong>Stok</strong><span>${stok}</span></div>` : ''}
            <div class="modal-meta-item"><strong>Status</strong><span>${status}</span></div>
            <div class="modal-meta-item"><strong>Asal</strong><span>Greenhouse Fayseri, Kebon 9</span></div>
        `;

        // Gambar
        const imgWrap = document.getElementById('modalImgWrap');
        if (isImageSource(prod.foto)) {
            imgWrap.innerHTML = `<img src="${prod.foto}" alt="${nama}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            imgWrap.innerHTML = `<div class="product-img-placeholder" style="flex-direction:column;gap:0.5rem;"><i class="fa-solid fa-pepper-hot" style="font-size:3.5rem;color:#94a3b8;"></i><span style="font-size:0.75rem;color:#94a3b8;">Foto belum tersedia</span></div>`;
        }

        // WA Button
        document.getElementById('modalWABtn').href = `https://wa.me/${WA_NUMBER}?text=${buildWAText(nama, harga, stok)}`;

        // Wishlist Button
        this._updateWishlistBtn(prod.id);

        document.getElementById('modalDetail')?.classList.add('show');
    },

    _updateWishlistBtn(id) {
        const btn = document.getElementById('modalWishlistBtn');
        if (!btn) return;
        const inWL = Wishlist.has(id);
        btn.innerHTML = inWL
            ? `<i class="fa-solid fa-heart" style="color:#ef4444;"></i> Tersimpan`
            : `<i class="fa-regular fa-heart"></i> Favorit`;
    },

    close() {
        document.getElementById('modalDetail')?.classList.remove('show');
        State.modalProd = null;
    },

    init() {
        document.getElementById('closeModalDetail')?.addEventListener('click', () => this.close());
        document.getElementById('modalDetail')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalDetail')) this.close();
        });

        document.getElementById('modalWishlistBtn')?.addEventListener('click', () => {
            if (!State.modalProd) return;
            Wishlist.toggle(State.modalProd);
            this._updateWishlistBtn(State.modalProd.id);
        });

        document.getElementById('modalShareBtn')?.addEventListener('click', () => {
            if (!State.modalProd) return;
            const nama  = State.modalProd.nama || State.modalProd.nama_produk || 'Produk';
            const harga = fmt(State.modalProd.harga);
            const text  = `🌶️ ${nama} — ${harga}\nDari Cabe Kami by Fayseri Greenhouse`;
            if (navigator.share) {
                navigator.share({ title: 'Cabe Kami', text, url: window.location.href }).catch(() => {});
            } else {
                navigator.clipboard?.writeText(text + '\n' + window.location.href).then(() => toast('Info produk disalin!'));
            }
        });
    }
};

// ===================== MODAL DETAIL PANDUAN =====================
const GuidebookModal = {
    open(item) {
        // Populate modal fields
        const judul    = item.judul    || '—';
        const kategori = item.kategori || 'Panduan';
        const konten   = item.konten   || '—';
        const tanggal  = item.tanggal  || '—';

        const elJudul   = document.getElementById('modalPanduanJudul');
        const elKonten  = document.getElementById('modalPanduanKonten');
        const elKat     = document.getElementById('modalPanduanKategori');
        const elTanggal = document.getElementById('modalPanduanTanggal');

        if (elJudul)   elJudul.textContent   = judul;
        if (elKonten)  elKonten.textContent   = konten;
        if (elTanggal) elTanggal.textContent  = tanggal;

        // Set badge color & icon per kategori
        let badgeBg = 'rgba(245,158,11,0.12)';
        let badgeColor = '#f59e0b';
        let icon = 'fa-solid fa-book-open';
        if (kategori === 'Cara Menanam') { badgeBg = 'rgba(16,185,129,0.12)'; badgeColor = '#10b981'; icon = 'fa-solid fa-seedling'; }
        else if (kategori === 'Cara Menyemprot') { badgeBg = 'rgba(59,130,246,0.12)'; badgeColor = '#3b82f6'; icon = 'fa-solid fa-spray-can-sparkles'; }
        else if (kategori === 'Penyebab Cabai Keriting') { badgeBg = 'rgba(239,68,68,0.12)'; badgeColor = '#ef4444'; icon = 'fa-solid fa-bug'; }
        else if (kategori === 'Lainnya') { badgeBg = 'rgba(99,102,241,0.12)'; badgeColor = '#6366f1'; icon = 'fa-solid fa-book'; }

        if (elKat) {
            elKat.innerHTML = `<i class="${icon}"></i> ${kategori}`;
            elKat.style.background = badgeBg;
            elKat.style.color      = badgeColor;
        }

        // Update gradient bar to match category color
        const bar = document.querySelector('#modalPanduanDetail .modal-box > div[style*="height: 6px"]');
        if (bar) bar.style.background = `linear-gradient(90deg, ${badgeColor}, var(--primary))`;

        const mp = document.getElementById('modalPanduanDetail');
        if (mp) {
            mp.classList.add('show');
            // prevent background scroll while modal open
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }

        // Show/hide foto in popup
        const elFoto = document.getElementById('modalPanduanFoto');
        const elFotoWrap = document.getElementById('modalPanduanFotoWrap');
        const validFoto = isImageSource(item.foto) ? item.foto : '';
        if (elFoto && elFotoWrap) {
            if (validFoto) {
                elFoto.src = validFoto;
                elFotoWrap.style.display = 'block';
            } else {
                elFoto.src = '';
                elFotoWrap.style.display = 'none';
            }
        }
    },

    close() {
        const mp = document.getElementById('modalPanduanDetail');
        if (mp) mp.classList.remove('show');
        // if no other overlays/modals open, re-enable body scroll
        const any = document.querySelectorAll('.side-panel-overlay.show, .modal-overlay.show');
        if (!any || any.length === 0) {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    },

    init() {
        document.getElementById('closeModalPanduanDetail')?.addEventListener('click', () => this.close());
        document.getElementById('modalPanduanDetail')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalPanduanDetail')) this.close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }
};

// ===================== SEARCH & FILTER & SORT =====================
function applyFilters() {
    let arr = [...State.all];
    const q = State.query.toLowerCase();

    if (q) arr = arr.filter(p => {
        const n = (p.nama || p.nama_produk || '').toLowerCase();
        const d = (p.deskripsi || '').toLowerCase();
        const s = (p.stok || '').toLowerCase();
        return n.includes(q) || d.includes(q) || s.includes(q);
    });

    if (State.filter === 'tersedia')
        arr = arr.filter(p => p.status !== 'Habis' && p.stok !== '0');
    else if (State.filter === 'habis')
        arr = arr.filter(p => p.status === 'Habis' || p.stok === '0');

    if (State.sort === 'harga-asc')  arr.sort((a, b) => (a.harga||0) - (b.harga||0));
    if (State.sort === 'harga-desc') arr.sort((a, b) => (b.harga||0) - (a.harga||0));
    if (State.sort === 'nama-asc')   arr.sort((a, b) => (a.nama||a.nama_produk||'').localeCompare(b.nama||b.nama_produk||''));
    if (State.sort === 'nama-desc')  arr.sort((a, b) => (b.nama||b.nama_produk||'').localeCompare(a.nama||a.nama_produk||''));

    State.filtered = arr;
    State.page = 1;
    renderGrid();
    renderPagination();
}

function syncSearch(val) {
    State.query = val;
    const h = document.getElementById('headerSearch');
    const c = document.getElementById('searchInput');
    const hc = document.getElementById('headerSearchClear');
    const sc = document.getElementById('searchClear');
    if (h && h !== document.activeElement) h.value = val;
    if (c && c !== document.activeElement) c.value = val;
    if (hc) hc.style.display = val ? 'block' : 'none';
    if (sc) sc.style.display = val ? 'flex' : 'none';
}

function initSearchFilter() {
    const headerSearch = document.getElementById('headerSearch');
    const catalogSearch = document.getElementById('searchInput');
    const headerClear = document.getElementById('headerSearchClear');
    const catalogClear = document.getElementById('searchClear');

    const onSearch = (val) => { syncSearch(val); applyFilters(); };

    headerSearch?.addEventListener('input', () => onSearch(headerSearch.value.trim()));
    catalogSearch?.addEventListener('input', () => onSearch(catalogSearch.value.trim()));
    headerClear?.addEventListener('click', () => onSearch(''));
    catalogClear?.addEventListener('click', () => onSearch(''));

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.filter = btn.dataset.filter || 'semua';
            applyFilters();
        });
    });

    document.getElementById('sortSelect')?.addEventListener('change', (e) => {
        State.sort = e.target.value;
        applyFilters();
    });

    // Panduan Menanam Search & Filter
    document.getElementById('searchPanduanInput')?.addEventListener('input', () => applyPanduanFilters());
    document.getElementById('filterPanduanKategori')?.addEventListener('change', () => applyPanduanFilters());
}

// ===================== RENDER GRID =====================
function renderGrid() {
    const grid  = document.getElementById('productGrid');
    const badge = document.getElementById('productCount');
    if (!grid) return;

    const start = (State.page - 1) * ITEMS_PER_PAGE;
    const paged = State.filtered.slice(start, start + ITEMS_PER_PAGE);

    if (badge) {
        badge.textContent = State.filtered.length !== State.all.length
            ? `${State.filtered.length} dari ${State.all.length} produk`
            : `${State.all.length} produk`;
    }

    if (!paged.length) {
        const isSearch = !!State.query || State.filter !== 'semua';
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-${isSearch ? 'magnifying-glass' : 'store-slash'}"></i>
                <h3>${isSearch ? 'Produk Tidak Ditemukan' : 'Belum Ada Produk'}</h3>
                <p>${isSearch ? 'Coba ubah kata kunci atau filter.' : 'Pantau terus untuk pembaruan stok terbaru.'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    paged.forEach((item, index) => {
        const nama   = item.nama || item.nama_produk || 'Produk';
        const harga  = fmt(item.harga);
        const desc   = item.deskripsi || '';
        const stok   = item.stok || item.stok_tersedia || '';
        const status = item.status || 'Tersedia';
        const isHabis = status === 'Habis';
        const inWL    = Wishlist.has(item.id);

        const imgHTML = isImageSource(item.foto)
            ? `<img src="${item.foto}" alt="${nama}" class="product-img" loading="lazy">`
            : `<div class="product-img-placeholder"><i class="fa-solid fa-pepper-hot"></i><span>Foto belum tersedia</span></div>`;

        const stokTag = stok
            ? `<span class="tag-stok${isHabis ? ' habis' : ''}">${isHabis ? '⚠ ' : '✓ '}${stok}</span>`
            : '';

        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = item.id;
        card.innerHTML = `
            <div class="product-img-wrapper" role="img" aria-label="Foto ${nama}">
                ${imgHTML}
                <button class="card-wishlist-btn${inWL ? ' active' : ''}" data-id="${item.id}" aria-label="${inWL ? 'Hapus dari favorit' : 'Simpan ke favorit'}">
                    <i class="fa-${inWL ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="product-body">
                <h3 class="product-name">${nama}</h3>
                ${desc ? `<p class="product-desc">${desc}</p>` : ''}
                <div class="product-meta">
                    <span class="product-price">${harga}</span>
                    ${stokTag}
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${WA_NUMBER}?text=${buildWAText(nama, harga, stok)}"
                       target="_blank" rel="noopener" class="btn-order" aria-label="Pesan ${nama} via WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i> Pesan
                    </a>
                    <button class="btn-detail" aria-label="Lihat detail ${nama}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>`;

        card.querySelector('.product-img-wrapper').addEventListener('click', () => ProductModal.open(item));
        card.querySelector('.btn-detail').addEventListener('click', (e) => { e.stopPropagation(); ProductModal.open(item); });
        card.querySelector('.card-wishlist-btn').addEventListener('click', (e) => { e.stopPropagation(); Wishlist.toggle(item); });
        grid.appendChild(card);
    });
}

// ===================== PAGINATION =====================
function renderPagination() {
    const wrap   = document.getElementById('paginationWrap');
    const nums   = document.getElementById('pageNumbers');
    const prev   = document.getElementById('pagePrev');
    const next   = document.getElementById('pageNext');
    if (!wrap) return;

    const total = Math.ceil(State.filtered.length / ITEMS_PER_PAGE);
    if (total <= 1) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';

    prev.disabled = State.page === 1;
    next.disabled = State.page === total;

    prev.onclick = () => { if (State.page > 1) { State.page--; renderGrid(); renderPagination(); scrollToCat(); } };
    next.onclick = () => { if (State.page < total) { State.page++; renderGrid(); renderPagination(); scrollToCat(); } };

    if (nums) {
        nums.innerHTML = '';
        buildRange(State.page, total).forEach(p => {
            const el = p === '...'
                ? Object.assign(document.createElement('span'), { className: 'page-num', textContent: '…', style: 'cursor:default;' })
                : Object.assign(document.createElement('button'), { className: `page-num${p === State.page ? ' active' : ''}`, textContent: p });
            if (p !== '...') el.addEventListener('click', () => { State.page = p; renderGrid(); renderPagination(); scrollToCat(); });
            nums.appendChild(el);
        });
    }
}

function buildRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (cur >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total];
    return [1, '...', cur-1, cur, cur+1, '...', total];
}

function scrollToCat() {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================== HERO STATS =====================
function updateStats(total, tersedia) {
    const elT = document.getElementById('statTotal');
    const elS = document.getElementById('statTersedia');
    if (elT) elT.textContent = total;
    if (elS) elS.textContent = tersedia;
}

// ===================== REFRESH BUTTON =====================
function initRefresh() {
    const btn = document.getElementById('btnRefresh');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const icon = btn.querySelector('i');
        if (icon) icon.style.animation = 'spin 0.6s linear infinite';
        await fetchProducts();
        if (icon) icon.style.animation = '';
        toast('Data diperbarui');
    });
}

// ===================== FETCH PRODUCTS =====================
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    const cachedProducts = readCachedProducts();

    // Render cache immediately to ensure instant visual load without spinner flicker
    if (cachedProducts && cachedProducts.length > 0) {
        renderProducts(cachedProducts);
    } else {
        if (grid) {
            grid.innerHTML = `<div class="loading-state" style="grid-column:1/-1;"><div class="loading-spinner"></div><p>Memuat dari Fayseri Cloud...</p></div>`;
        }
    }

    if (!supabaseClient) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('fayseri_storage')
            .select('value_data')
            .eq('key_name', STORAGE_KEY)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data?.length && Array.isArray(data[0].value_data)) {
            const products = data[0].value_data.filter(p =>
                p.id && !p.id.startsWith('PRD-0')
            );
            
            // Clean/filter fiktif IDs to compare precisely with what's actually rendered
            const cleanedProducts = products.filter(p => p.id && !p.id.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(p.id));
            const cleanedCached = (cachedProducts || []).filter(p => p.id && !p.id.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(p.id));

            // Only re-render and re-cache if the remote data actually changed from our cached state
            if (JSON.stringify(cleanedCached) !== JSON.stringify(cleanedProducts)) {
                saveCachedProducts(products);
                renderProducts(products);
            }
            return;
        }

        // If Supabase returned empty but we loaded nothing from cache, render empty state
        const cleanedCached = (cachedProducts || []).filter(p => p.id && !p.id.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(p.id));
        if (cleanedCached.length === 0) {
            renderProducts([]);
        }
    } catch (err) {
        console.warn('Gagal fetch produk:', err);
        const cleanedCached = (cachedProducts || []).filter(p => p.id && !p.id.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(p.id));
        if (cleanedCached.length === 0) {
            renderProducts([]);
        }
    }
}

function renderProducts(products) {
    // Saring bersih agar ID fiktif bawaan lama tidak pernah lolos tampil ke pengguna
    products = (products || []).filter(p => p.id && !p.id.startsWith('PRD-0') && !['PRD-01', 'PRD-02', 'PRD-03'].includes(p.id));

    saveCachedProducts(products);
    State.all      = products;
    State.filtered = [...products];
    updateStats(products.length, products.filter(p => p.status === 'Tersedia').length);
    applyFilters();
}

// ===================== PANDUAN MENANAM (SPA FETCH & RENDER) =====================
function getStorefrontDefaultSeed() {
    const formatDate = (date) => {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(date).toLocaleDateString('id-ID', options);
    };
    return [
        {
            id: 'GP-001',
            judul: 'Cara Menanam Cabai yang Optimal',
            kategori: 'Cara Menanam',
            konten: 'Langkah pertama adalah memilih benih cabai berkualitas. Rendam benih dalam air hangat selama 30 menit sebelum disemai di media tanam campuran tanah dan pupuk organik (1:1). Jaga kelembaban tanah sekitar 60-70% dan pastikan bibit mendapat sinar matahari pagi.',
            foto: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80',
            tanggal: formatDate(new Date())
        },
        {
            id: 'GP-002',
            judul: 'Cara Menyemprot Fungisida & Insektisida',
            kategori: 'Cara Menyemprot',
            konten: 'Lakukan penyemprotan pada sore hari (pukul 15.30 - 17.00) untuk menghindari penguapan cepat oleh terik matahari. Campurkan 2ml fungisida per liter air bersih. Semprotkan secara merata terutama di permukaan bawah daun tempat bersarangnya spora jamur antraknosa.',
            foto: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
            tanggal: formatDate(new Date())
        },
        {
            id: 'GP-003',
            judul: 'Penyebab Cabai Keriting & Penanganannya',
            kategori: 'Penyebab Cabai Keriting',
            konten: 'Cabai keriting umumnya disebabkan oleh serangan kutu kebul (Aphids/Thrips) yang menghisap cairan daun, atau karena infeksi Gemini Virus. Penanganannya adalah dengan menjaga sanitasi greenhouse, menggunakan jaring serangga (insect net), dan menyemprotkan insektisida organik berbahan bawang putih.',
            foto: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80',
            tanggal: formatDate(new Date())
        }
    ];
}

async function fetchPanduan() {
    const grid = document.getElementById('panduanGrid');
    const emptyState = document.getElementById('panduanEmptyState');
    
    // Load from local storage cache first (ensures instant sync if running on the same browser origin)
    const cachedPanduan = readCachedPanduan();
    if (grid) {
        State.panduan = cachedPanduan.length > 0 ? cachedPanduan : getStorefrontDefaultSeed();
        populatePanduanCategories();
        State.filteredPanduan = [...State.panduan];
        applyPanduanFilters();
    }
    if (emptyState) emptyState.style.display = 'none';

    console.log('☁️ fetchPanduan: Memulai pengambilan data. Status Supabase client:', !!supabaseClient);

    if (!supabaseClient) {
        console.warn('⚠️ fetchPanduan: Supabase client belum aktif, menggunakan cache/materi default.');
        return;
    }

    try {
        console.log('☁️ fetchPanduan: Mengirim kueri SELECT ke fayseri_storage untuk key_name "fayseri_buku_panduan"...');
        const { data, error } = await supabaseClient
            .from('fayseri_storage')
            .select('value_data')
            .eq('key_name', 'fayseri_buku_panduan')
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ fetchPanduan: Terjadi kesalahan kueri Supabase:', error);
            throw error;
        }

        console.log('☁️ fetchPanduan: Kueri berhasil. Data mentah dari Supabase:', data);

        if (data?.length && Array.isArray(data[0].value_data) && data[0].value_data.length > 0) {
            console.log(`✅ fetchPanduan: Sukses memuat ${data[0].value_data.length} materi dari Supabase Cloud!`);
            const remotePanduan = data[0].value_data;
            
            // Only update State and re-render if fetched data differs from current State
            if (JSON.stringify(State.panduan) !== JSON.stringify(remotePanduan)) {
                saveCachedPanduan(remotePanduan);
                State.panduan = remotePanduan;
                populatePanduanCategories();
                State.filteredPanduan = [...State.panduan];
                applyPanduanFilters();
            }
        } else {
            console.warn('⚠️ fetchPanduan: Data kosong atau format tidak sesuai. Menggunakan cache lokal atau seed default.');
            const defaultSeed = getStorefrontDefaultSeed();
            const fallbackPanduan = cachedPanduan.length > 0 ? cachedPanduan : defaultSeed;
            if (JSON.stringify(State.panduan) !== JSON.stringify(fallbackPanduan)) {
                State.panduan = fallbackPanduan;
                populatePanduanCategories();
                State.filteredPanduan = [...State.panduan];
                applyPanduanFilters();
            }
        }
    } catch (err) {
        console.error('❌ fetchPanduan: Gagal fetch panduan karena eksepsi:', err);
        // Only trigger fallback render if State is currently empty
        if (!State.panduan || State.panduan.length === 0) {
            const defaultSeed = getStorefrontDefaultSeed();
            State.panduan = cachedPanduan.length > 0 ? cachedPanduan : defaultSeed;
            populatePanduanCategories();
            State.filteredPanduan = [...State.panduan];
            applyPanduanFilters();
        }
    }
}


function populatePanduanCategories() {
    const select = document.getElementById('filterPanduanKategori');
    if (!select) return;
    
    const currentSelected = select.value || 'all';
    const categories = [...new Set(State.panduan.map(item => item.kategori).filter(Boolean))];
    const standard = ['Cara Menanam', 'Cara Menyemprot', 'Penyebab Cabai Keriting', 'Lainnya'];
    const combined = [...new Set([...standard, ...categories])];
    
    select.innerHTML = `<option value="all">Semua Kategori</option>` + 
        combined.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
    if (combined.includes(currentSelected)) {
        select.value = currentSelected;
    } else {
        select.value = 'all';
    }
}

function applyPanduanFilters() {
    const q = (document.getElementById('searchPanduanInput')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('filterPanduanKategori')?.value || 'all';

    let arr = [...State.panduan];

    if (q) {
        arr = arr.filter(item => {
            const judul = (item.judul || '').toLowerCase();
            const konten = (item.konten || '').toLowerCase();
            return judul.includes(q) || konten.includes(q);
        });
    }

    if (cat !== 'all') {
        arr = arr.filter(item => item.kategori === cat);
    }

    State.filteredPanduan = arr;
    renderPanduanGrid(arr);
}

function renderPanduanGrid(items) {
    const grid = document.getElementById('panduanGrid');
    const emptyState = document.getElementById('panduanEmptyState');
    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = items.map((item, index) => {
        // Dynamic custom category default styling fallback
        let badgeBg = 'rgba(245, 158, 11, 0.1)';
        let badgeColor = '#f59e0b';
        let categoryIcon = 'fa-solid fa-book-open';

        if (item.kategori === 'Cara Menanam') {
            badgeBg = 'rgba(16, 185, 129, 0.1)';
            badgeColor = '#10b981';
            categoryIcon = 'fa-solid fa-seedling';
        } else if (item.kategori === 'Cara Menyemprot') {
            badgeBg = 'rgba(59, 130, 246, 0.1)';
            badgeColor = '#3b82f6';
            categoryIcon = 'fa-solid fa-spray-can-sparkles';
        } else if (item.kategori === 'Penyebab Cabai Keriting') {
            badgeBg = 'rgba(239, 68, 68, 0.1)';
            badgeColor = '#ef4444';
            categoryIcon = 'fa-solid fa-bug';
        } else if (item.kategori === 'Lainnya') {
            badgeBg = 'rgba(99, 102, 241, 0.1)';
            badgeColor = '#6366f1';
            categoryIcon = 'fa-solid fa-book';
        }

        const foto = isImageSource(item.foto) ? item.foto : '';

        const fotoHtml = foto
            ? `<div class="panduan-card-img-wrap">
                <img src="${foto}" alt="${item.judul}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;" class="panduan-thumb">
               </div>`
            : '';

        const cardClass = `panduan-card ${foto ? 'has-photo' : ''}`;

        return `
            <article class="${cardClass}" data-panduan-id="${item.id}">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${badgeColor}, var(--primary)); ${item.foto ? 'display:none' : ''};"></div>
                ${fotoHtml}
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                        <span class="category-badge" style="padding: 4px 12px; border-radius: 50px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; background: ${badgeBg}; color: ${badgeColor}; display: inline-flex; align-items: center; gap: 0.35rem; letter-spacing: 0.5px;">
                            <i class="${categoryIcon}"></i> ${item.kategori}
                        </span>
                        <span style="font-size: 0.75rem; color: var(--text-sub); display: inline-flex; align-items: center; gap: 0.25rem;">
                            <i class="fa-regular fa-calendar"></i> ${item.tanggal || '—'}
                        </span>
                    </div>
                    <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.75rem; line-height: 1.4;">
                        ${item.judul}
                    </h3>
                    <p style="font-size: 0.9rem; color: var(--text-sub); line-height: 1.65; margin-bottom: 1rem; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${item.konten}
                    </p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; color: ${badgeColor}; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                    <i class="fa-solid fa-book-open-reader"></i> Baca Selengkapnya
                </div>
            </article>
        `;
    }).join('');

    // Dynamically register the new guide cards with the intersection scroll observer
    if (scrollObserver) {
        grid.querySelectorAll('.panduan-card').forEach(el => {
            scrollObserver.observe(el);
        });
    }

    // Make guide cards clickable to open the read-more popup
    grid.querySelectorAll('.panduan-card[data-panduan-id]').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-panduan-id');
            const item = State.panduan.find(x => x.id === id);
            if (item) {
                GuidebookModal.open(item);
            }
        });
    });
}

// ===================== SCROLL & REFRESH ENTRANCE ANIMATIONS =====================
function initScrollAnimations() {
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Elemen masuk layar → tampilkan animasi
                entry.target.classList.add('anim-show');
            } else {
                // Elemen keluar layar → reset agar bisa animasi lagi saat scroll kembali
                entry.target.classList.remove('anim-show');
            }
        });
    }, {
        threshold: 0.01,
        rootMargin: '50px 0px -50px 0px'
    });

    // Observe all animated elements (tiny delay to ensure layout is computed)
    requestAnimationFrame(() => {
        setTimeout(() => {
            document.querySelectorAll('.anim-fade-up, .anim-slide-left, .anim-slide-right').forEach(el => {
                scrollObserver.observe(el);
            });
        }, 50);
    });
}

// ===================== NAV TABS ACTIVE STATE =====================
function syncBottomNav(tabName) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function switchStorefrontView(view) {
    const mainSections = ['heroSection', 'catalog', 'cara-pesan', 'uspSectionHome'];
    const panduanSection = document.getElementById('panduanSection');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');

    // Clean active classes
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    if (view === 'panduan') {
        mainSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (panduanSection) panduanSection.style.display = 'block';
        if (loginSection) loginSection.style.display = 'none';
        if (registerSection) registerSection.style.display = 'none';

        document.getElementById('tabPanduan')?.classList.add('active');
        syncBottomNav('panduan');
        localStorage.setItem('cabekami_current_tab', 'panduan');
        fetchPanduan();
    } else if (view === 'login') {
        mainSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (panduanSection) panduanSection.style.display = 'none';
        if (loginSection) {
            loginSection.style.display = 'flex';
        }
        if (registerSection) registerSection.style.display = 'none';

        document.getElementById('tabSettings')?.classList.add('active');
        syncBottomNav('settings');
        localStorage.setItem('cabekami_current_tab', 'login');
    } else if (view === 'register') {
        mainSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (panduanSection) panduanSection.style.display = 'none';
        if (loginSection) loginSection.style.display = 'none';
        if (registerSection) {
            registerSection.style.display = 'flex';
        }

        document.getElementById('tabSettings')?.classList.add('active');
        syncBottomNav('settings');
        localStorage.setItem('cabekami_current_tab', 'register');
    } else {
        // Home
        mainSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'block';
        });
        if (panduanSection) panduanSection.style.display = 'none';
        if (loginSection) loginSection.style.display = 'none';
        if (registerSection) registerSection.style.display = 'none';

        let activeTab = localStorage.getItem('cabekami_current_tab') || 'beranda';
        if (activeTab === 'login' || activeTab === 'register' || activeTab === 'panduan') {
            activeTab = 'beranda';
        }
        const matchingTab = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.dataset.tab === activeTab);
        if (matchingTab) matchingTab.classList.add('active');
        syncBottomNav(activeTab);
        localStorage.setItem('cabekami_current_tab', activeTab);
    }
}

function initNavTabs() {
    const sections = [
        { id: 'heroSection',  tab: 'tabBeranda' },
        { id: 'catalog',      tab: 'tabKatalog' },
        { id: 'cara-pesan',   tab: 'tabCaraPesan' },
    ];

    // Catch tab clicks to handle SPA toggles
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = tab.id;
            
            if (tabId === 'tabSettings') return; // Handled separately
            
            if (tabId === 'tabPanduan') {
                e.preventDefault();
                switchStorefrontView('panduan');
                return;
            }
            
            // For other tabs (Beranda, Katalog, Cara Pesan)
            switchStorefrontView('home');
            localStorage.setItem('cabekami_current_tab', tab.dataset.tab || 'beranda');
            syncBottomNav(tab.dataset.tab || 'beranda');
            
            const targetId = tab.getAttribute('href')?.substring(1);
            if (targetId) {
                e.preventDefault();
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Catch mobile bottom nav clicks (Shopee/Tokopedia style)
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tabName = item.dataset.tab;
            
            if (tabName === 'settings') {
                e.preventDefault();
                SettingsPanel.open();
                syncBottomNav('settings');
                // Temporarily activate tab Settings in sub-navbar
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.getElementById('tabSettings')?.classList.add('active');
                return;
            }
            
            if (tabName === 'panduan') {
                e.preventDefault();
                switchStorefrontView('panduan');
                return;
            }
            
            // For other tabs (Beranda, Katalog, Cara Pesan)
            switchStorefrontView('home');
            localStorage.setItem('cabekami_current_tab', tabName);
            syncBottomNav(tabName);
            
            const targetId = item.getAttribute('href')?.substring(1);
            if (targetId) {
                e.preventDefault();
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const match = sections.find(s => s.id === entry.target.id);
                const isSpaSection = document.getElementById('panduanSection')?.style.display === 'block' ||
                                     document.getElementById('loginSection')?.style.display === 'flex' ||
                                     document.getElementById('registerSection')?.style.display === 'flex';
                if (match && !isSpaSection) {
                    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                    const tabEl = document.getElementById(match.tab);
                    if (tabEl) {
                        tabEl.classList.add('active');
                        localStorage.setItem('cabekami_current_tab', tabEl.dataset.tab || 'beranda');
                        syncBottomNav(tabEl.dataset.tab || 'beranda');
                    }
                }
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    sections.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) obs.observe(el);
    });

    // Brand → scroll to top
    document.getElementById('brandHome')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchStorefrontView('home');
        localStorage.setItem('cabekami_current_tab', 'beranda');
        syncBottomNav('beranda');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Tab Settings → buka settings panel
    document.getElementById('tabSettings')?.addEventListener('click', (e) => {
        e.preventDefault();
        SettingsPanel.open();
        
        // Tandai aktif sementara
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tabSettings')?.classList.add('active');
        syncBottomNav('settings');
    });

    // Hero CTA Tanya Penjual → buka chat
    document.getElementById('btnHeroChat')?.addEventListener('click', (e) => {
        e.preventDefault();
        ChatPanel.open();
    });

    // Restore last active view/tab on page load
    const savedTab = localStorage.getItem('cabekami_current_tab');
    if (savedTab) {
        syncBottomNav(savedTab === 'login' || savedTab === 'register' ? 'settings' : savedTab);
        if (savedTab === 'panduan') {
            switchStorefrontView('panduan');
        } else if (savedTab === 'login') {
            switchStorefrontView('login');
        } else if (savedTab === 'register') {
            switchStorefrontView('register');
        } else {
            switchStorefrontView('home');
            const matchingTab = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.dataset.tab === savedTab);
            if (matchingTab) {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                matchingTab.classList.add('active');
                const targetId = matchingTab.getAttribute('href')?.substring(1);
                if (targetId) {
                    setTimeout(() => {
                        const targetEl = document.getElementById(targetId);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'auto' });
                        }
                    }, 120);
                }
            }
        }
    }
}

// ===================== MASCOT CONTROLLER =====================
const MascotController = {
    init() {
        this.setupMascot('loginMascot', {
            passwordId: 'authPassword',
            typingInputs: ['authEmail']
        });
        this.setupMascot('regMascot', {
            passwordId: 'authRegPassword',
            typingInputs: ['authRegNickname', 'authRegEmail']
        });
    },

    setupMascot(mascotId, config) {
        const svg = document.getElementById(mascotId);
        if (!svg) return;

        const passwordInput = document.getElementById(config.passwordId);
        const handsList = svg.querySelectorAll('.mascot-hands');
        const pupils = svg.querySelectorAll('.mascot-pupil');
        const eyesL = svg.querySelectorAll('.mascot-eye-l');
        const eyesR = svg.querySelectorAll('.mascot-eye-r');
        const eyebrowsL = svg.querySelectorAll('.mascot-eyebrow-l');
        const eyebrowsR = svg.querySelectorAll('.mascot-eyebrow-r');

        // Apply auth-hands class to the hand groups dynamically
        handsList.forEach(hands => {
            hands.classList.add('auth-hands');
        });

        let isCovering = false;
        let isTyping = false;

        // 1. Logika Berkedip Otomatis (Semua Cabai)
        if (eyesL.length && eyesR.length) {
            setInterval(() => {
                eyesL.forEach(eye => eye.classList.add('blinking'));
                eyesR.forEach(eye => eye.classList.add('blinking'));
                setTimeout(() => {
                    eyesL.forEach(eye => eye.classList.remove('blinking'));
                    eyesR.forEach(eye => eye.classList.remove('blinking'));
                }, 140);
            }, 3000 + Math.random() * 3000);
        }

        const coverEyes = () => {
            isCovering = true;
            handsList.forEach(hands => hands.classList.add('covering'));
            pupils.forEach(pupil => {
                pupil.style.transform = 'translate(0px, 4px)';
            });
            // Ekspresi alis malu
            eyebrowsL.forEach(el => el.style.transform = 'translateY(-2px) rotate(-6deg)');
            eyebrowsR.forEach(el => el.style.transform = 'translateY(-2px) rotate(6deg)');
        };

        const uncoverEyes = () => {
            isCovering = false;
            handsList.forEach(hands => hands.classList.remove('covering'));
            pupils.forEach(pupil => {
                pupil.style.transform = 'translate(0px, 0px)';
            });
            eyebrowsL.forEach(el => el.style.transform = '');
            eyebrowsR.forEach(el => el.style.transform = '');
        };

        // 2. Kolom Password (Tutup Mata)
        if (passwordInput) {
            passwordInput.addEventListener('focus', coverEyes);
            passwordInput.addEventListener('blur', uncoverEyes);
            passwordInput.addEventListener('input', () => {
                if (!isCovering) coverEyes();
            });
            if (document.activeElement === passwordInput) {
                coverEyes();
            }
        }

        // 3. Kolom Teks (Email / Nama) - Pembacaan Ketikan
        config.typingInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;

            const handleInput = () => {
                if (isCovering) return;
                isTyping = true;
                const maxChars = 32;
                const len = input.value.length;
                const percent = Math.min(len / maxChars, 1);
                // Lirik ke bawah (-left/right scan)
                const moveX = -2.5 + percent * 5;
                const moveY = 2; // lirik ke bawah (membaca)
                pupils.forEach(p => {
                    p.style.transform = `translate(${moveX}px, ${moveY}px)`;
                });
            };

            input.addEventListener('focus', handleInput);
            input.addEventListener('input', handleInput);
            input.addEventListener('blur', () => {
                isTyping = false;
                pupils.forEach(p => p.style.transform = 'translate(0px, 0px)');
            });
        });

        // 4. Pelacakan Mouse Real-time
        document.addEventListener('mousemove', (e) => {
            if (isCovering || isTyping) return;
            const section = svg.closest('.auth-section');
            if (section && section.style.display === 'none') return;

            const rect = svg.getBoundingClientRect();
            const mascotX = rect.left + rect.width / 2;
            const mascotY = rect.top + rect.height / 2;

            const dx = e.clientX - mascotX;
            const dy = e.clientY - mascotY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return;

            const maxMove = 3.5;
            const moveX = (dx / dist) * maxMove;
            const moveY = (dy / dist) * maxMove;

            pupils.forEach(pupil => {
                pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }
};

// ===================== DOMContentLoaded =====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tema
    ThemeManager.init();

    // 2. Wishlist
    Wishlist.init();

    // 3. Settings Panel
    SettingsPanel.init();

    // 4. Auth
    Auth.init();

    // 4.1. Mascot Controller
    MascotController.init();

    // 5. Modal
    ProductModal.init();
    GuidebookModal.init();

    // 6. Search / Filter
    initSearchFilter();

    // 7. Refresh
    initRefresh();

    // 8. Nav Tabs
    initNavTabs();

    // 8.1. Scroll Animations
    initScrollAnimations();

    // 9. Chat
    ChatPanel.init();


    // 10. Fetch produk & panduan (dengan validasi tab aktif saat Supabase ready)
    const ready = initSupa();
    if (ready) {
        fetchProducts();
        if (localStorage.getItem('cabekami_current_tab') === 'panduan') {
            fetchPanduan();
        }
    } else {
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (initSupa()) { 
                clearInterval(t); 
                fetchProducts(); 
                if (localStorage.getItem('cabekami_current_tab') === 'panduan') {
                    fetchPanduan();
                }
            }
            else if (tries >= 8) { clearInterval(t); renderProducts([]); }
        }, 400);
    }
});

// ===================== CHAT PANEL =====================
const ChatPanel = {
    pollingTimer: null,
    currentUserId: null,
    currentEmail: null,
    greetingAdded: false,

    async open() {
        Wishlist.closePanel();
        SettingsPanel.close();
        document.getElementById('chatPanelOverlay')?.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        const session = await Auth.getSession();
        if (session) {
            this.currentUserId = session.user.id;
            this.currentEmail  = session.user.email;
            const el = document.getElementById('chatUserEmail');
            if (el) el.textContent = this.currentEmail;
            document.getElementById('chatStateNotLogged').style.display = 'none';
            document.getElementById('chatStateLogged').style.display    = 'flex';
            await this.loadMessages();
            this.startPolling();
        } else {
            document.getElementById('chatStateNotLogged').style.display = 'flex';
            document.getElementById('chatStateLogged').style.display    = 'none';
        }
    },

    close() {
        document.getElementById('chatPanelOverlay')?.classList.remove('show');
        this.stopPolling();
        const any = document.querySelectorAll('.side-panel-overlay.show, .modal-overlay.show');
        if (!any || any.length === 0) {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
    },

    async loadMessages() {
        if (!supabaseClient || !this.currentUserId) return;
        try {
            const { data } = await supabaseClient
                .from('fayseri_storage')
                .select('value_data')
                .eq('user_id', this.currentUserId)
                .eq('key_name', CHAT_KEY)
                .limit(1);

            let messages = data?.[0]?.value_data || [];

            // Tambah sapaan admin jika chat baru
            if (!messages.length && !this.greetingAdded) {
                this.greetingAdded = true;
                messages = [{
                    id: 'greet-01',
                    from: 'admin',
                    text: 'Halo! 👋 Selamat datang di Cabe Kami. Ada produk yang ingin kamu tanyakan?',
                    timestamp: new Date().toISOString(),
                }];
                // Simpan sapaan ke Supabase
                await supabaseClient.from('fayseri_storage').upsert({
                    user_id: this.currentUserId,
                    key_name: CHAT_KEY,
                    value_data: messages,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,key_name' });
            }
            this.renderMessages(messages);
        } catch (err) {
            console.warn('Chat load error:', err);
        }
    },

    renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        if (!messages.length) {
            container.innerHTML = `<div class="chat-empty-msg"><i class="fa-regular fa-comment-dots"></i><span>Belum ada pesan</span></div>`;
            return;
        }
        container.innerHTML = messages.map(msg => {
            const isMe = msg.from === 'buyer';
            const time  = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : '';
            return `
                <div class="chat-msg-wrap ${isMe ? 'me' : 'admin'}">
                    <div class="chat-bubble ${isMe ? 'from-me' : 'from-admin'}">
                        ${msg.text}
                    </div>
                    <div class="bubble-time">${isMe ? 'Kamu' : 'Admin'} · ${time}</div>
                </div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    },

    async sendMessage(text) {
        if (!text.trim() || !supabaseClient || !this.currentUserId) return;
        const btn = document.getElementById('chatSendBtn');
        if (btn) btn.disabled = true;
        try {
            const { data } = await supabaseClient
                .from('fayseri_storage')
                .select('value_data')
                .eq('user_id', this.currentUserId)
                .eq('key_name', CHAT_KEY)
                .limit(1);

            const messages = data?.[0]?.value_data || [];
            messages.push({
                id: `msg-${Date.now()}`,
                from: 'buyer',
                email: this.currentEmail,
                text: text.trim(),
                timestamp: new Date().toISOString(),
            });

            await supabaseClient.from('fayseri_storage').upsert({
                user_id: this.currentUserId,
                key_name: CHAT_KEY,
                value_data: messages,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,key_name' });

            this.renderMessages(messages);
        } catch (err) {
            console.warn('Chat send error:', err);
            toast('Gagal mengirim pesan.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    startPolling() {
        this.stopPolling();
        this.pollingTimer = setInterval(() => this.loadMessages(), 7000);
    },
    stopPolling() {
        if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null; }
    },

    init() {
        document.getElementById('btnChat')?.addEventListener('click', () => this.open());
        document.getElementById('closeChatPanel')?.addEventListener('click', () => this.close());
        document.getElementById('chatPanelOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.close();
        });
        document.getElementById('chatSendBtn')?.addEventListener('click', () => {
            const input = document.getElementById('chatInput');
            const text = input?.value.trim();
            if (text) { this.sendMessage(text); input.value = ''; }
        });
        document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('chatSendBtn')?.click();
            }
        });
        document.getElementById('chatGoToLogin')?.addEventListener('click', () => {
            this.close();
            LoginPanel.open();
        });
    }
};

// Poll for latest products and guides every 10 seconds to keep storefront in real-time sync
setInterval(() => {
    if (typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
        fetchProducts();
        if (localStorage.getItem('cabekami_current_tab') === 'panduan') {
            fetchPanduan();
        }
    }
}, 10000);
