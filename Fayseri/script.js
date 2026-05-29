// 1. Set up konfigurasi Supabase kamu
const supabaseUrl = 'https://oqufttiwgmgcxlncoguj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xdWZ0dGl3Z21nY3hsbmNvZ3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODMxMjAsImV4cCI6MjA5NTI1OTEyMH0.RQ2PwcEoSWWEt2fOItqmBFRgSdi4wFuIpKV7XamkmZ8';

// 2. Buat client koneksi global dengan konfigurasi sesi permanen
//    persistSession   : true  → sesi disimpan di localStorage, tidak hilang meski tab ditutup
//    autoRefreshToken : true  → token diperbarui otomatis sebelum 1 jam kedaluwarsa
//    detectSessionInUrl: true → bantu Supabase deteksi sesi dari URL saat redirect OAuth
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fayseri-admin-session'
    }
});


/* ================================================================

   FAYSERI SMART PLANT MONITORING - MAIN JAVASCRIPT
   Versi: 2.1.0
   Dibuat oleh: Tim Faesa Technology
   ================================================================ */

// ================= KONFIGURASI GLOBAL =================
const APP_CONFIG = {
    appName: 'Fayseri',
    version: '2.1.0',
    envUpdateInterval: 5000,
    activitySimInterval: 15000,
    animDuration: 400,
    toastDuration: 3000,
    chartColors: {
        primary: '#6366F1',
        primaryLight: 'rgba(99, 102, 241, 0.1)',
        success: '#059669',
        successLight: 'rgba(5, 150, 105, 0.1)',
        warning: '#D97706',
        warningLight: 'rgba(217, 119, 6, 0.1)',
        danger: '#DC2626',
        dangerLight: 'rgba(220, 38, 38, 0.1)',
        info: '#2563EB',
        infoLight: 'rgba(37, 99, 235, 0.1)',
        grid: '#F3F4F6',
        text: '#6B7280',
        textDark: '#1F2937'
    },
    storageKeys: {
        sidebarState: 'fayseri_sidebar',
        activePage: 'fayseri_page',
        theme: 'fayseri_theme'
    }
};

// ================= STATE MANAGEMENT =================
const AppState = {
    currentPage: 'dashboardPage',
    sidebarOpen: true,
    charts: {},
    envData: {
        suhu: 32,
        lembab: 68
    },
    activityLog: [],
    tableData: {
        sortColumn: null,
        sortDirection: 'asc',
        filterText: '',
        filterColumn: ''
    },
    notificationQueue: [],
    isAnimating: false
};

// ================= UTILITAS UMUM =================
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            callback(compressedBase64);
        };
    };
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function formatDate(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(date).toLocaleDateString('id-ID', options);
}

function base64ToBlob(base64, mimeType = 'image/jpeg') {
    try {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (e) {
        console.error('Failed to convert base64 to blob:', e);
        return null;
    }
}

async function ensureBucketExists(bucketName) {
    if (!supabaseClient) return;
    try {
        console.log(`☁️ Mengecek/membuat storage bucket "${bucketName}"...`);
        const { data, error } = await supabaseClient.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880 // 5MB
        });
        if (error) {
            console.warn(`Info createBucket "${bucketName}":`, error.message);
        } else {
            console.log(`☁️ Storage bucket "${bucketName}" berhasil dibuat atau sudah ada.`);
        }
    } catch (e) {
        console.warn(`Eksepsi saat memastikan bucket "${bucketName}" ada:`, e);
    }
}

async function uploadFotoToSupabaseStorage(base64Data, originalFileName) {
    if (!supabaseClient) throw new Error('Supabase client tidak aktif');
    
    // Convert base64 to Blob (format umum gambar)
    const blob = base64ToBlob(base64Data, 'image/jpeg');
    if (!blob) throw new Error('Gagal memproses gambar ke format binary blob');

    const fileExt = originalFileName ? (originalFileName.split('.').pop() || 'jpg') : 'jpg';
    const fileName = `panduan_${Date.now()}.${fileExt}`;
    const filePath = `panduan/${fileName}`;
    
    // We can try multiple common bucket names: 'fayseri', 'images', 'panduan'
    const buckets = ['fayseri', 'images', 'panduan'];
    let lastError = null;
    
    for (const bucket of buckets) {
        try {
            // Coba pastikan bucket ada (buat jika belum ada)
            await ensureBucketExists(bucket);
            
            console.log(`☁️ Mengunggah ke Supabase Storage bucket: "${bucket}"...`);
            const { data, error } = await supabaseClient.storage
                .from(bucket)
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true
                });
                
            if (!error && data) {
                // Get public URL
                const { data: urlData } = supabaseClient.storage
                    .from(bucket)
                    .getPublicUrl(filePath);
                
                if (urlData && urlData.publicUrl) {
                    console.log(`☁️ Sukses mengunggah foto ke bucket "${bucket}"! URL:`, urlData.publicUrl);
                    return urlData.publicUrl;
                }
            }
            if (error) {
                console.warn(`Gagal upload ke bucket "${bucket}":`, error.message);
                lastError = error;
            }
        } catch (e) {
            console.warn(`Eksepsi saat upload ke bucket "${bucket}":`, e);
            lastError = e;
        }
    }
    
    throw lastError || new Error('Gagal mengupload ke semua bucket penyimpanan Supabase.');
}


function timeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' menit lalu';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' jam lalu';
    const days = Math.floor(hours / 24);
    return days + ' hari lalu';
}

function showInlineMessage(containerId, text, type = 'success') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    if (type === 'success') {
        el.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        el.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        el.style.color = '#10B981';
    } else {
        el.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        el.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        el.style.color = '#EF4444';
    }
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// ================= PERSISTENT STORAGE HELPER =================
const Storage = {
    userId: null,
    cache: {},

    get(key) {
        if (this.cache[key] !== undefined) {
            return this.cache[key];
        }

        try {
            const raw = localStorage.getItem(key);
            if (raw === null) {
                return null;
            }
            const parsed = JSON.parse(raw);
            this.cache[key] = parsed;
            return parsed;
        } catch {
            return null;
        }
    },

    set(key, value) {
        this.cache[key] = value;

        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore persistence failures
        }

        if (this.userId) {
            this.syncToDatabase(key, value);
        }
    },

    remove(key) {
        delete this.cache[key];

        try {
            localStorage.removeItem(key);
        } catch {
            // ignore persistence failures
        }

        if (this.userId) {
            this.syncRemoveFromDatabase(key);
        }
    },

    async syncToDatabase(key, value) {
        if (!this.userId) return;
        try {
            const { error } = await supabaseClient.from('fayseri_storage').upsert({
                user_id: this.userId,
                key_name: key,
                value_data: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,key_name' });

            if (error) {
                console.warn(`Failed to sync ${key} to Supabase:`, error.message);
            } else {
                console.log(`☁️ Synced ${key} to Supabase database.`);
            }
        } catch (e) {
            console.warn(`Sync error for ${key}:`, e);
        }
    },

    async syncRemoveFromDatabase(key) {
        if (!this.userId) return;
        try {
            const { error } = await supabaseClient.from('fayseri_storage')
                .delete()
                .eq('user_id', this.userId)
                .eq('key_name', key);

            if (error) {
                console.warn(`Failed to delete ${key} from Supabase:`, error.message);
            }
        } catch (e) {
            console.warn(`Sync delete error for ${key}:`, e);
        }
    },

    async syncFromDatabase(userId) {
        this.userId = userId;
        this.cache = {};
        console.log("☁️ Loading all data directly from Supabase for user:", userId);
        try {
            const { data, error } = await supabaseClient
                .from('fayseri_storage')
                .select('key_name, value_data')
                .eq('user_id', userId);

            if (error) {
                console.warn("Failed to fetch data from Supabase:", error.message);
                return;
            }

            if (data && data.length > 0) {
                data.forEach(row => {
                    // Skip overwriting local UI preferences if they already exist in localStorage.
                    // This prevents race conditions where the UI jumps/resets if a user interacts with it before sync completes.
                    const isUiKey = ['fayseri_sidebar', 'fayseri_theme', 'fayseri_page'].includes(row.key_name);
                    if (isUiKey && localStorage.getItem(row.key_name) !== null) {
                        return;
                    }

                    this.cache[row.key_name] = row.value_data;
                    try {
                        localStorage.setItem(row.key_name, JSON.stringify(row.value_data));
                    } catch {
                        // ignore persistence failures
                    }
                });
                console.log(`☁️ Loaded ${data.length} keys directly from Supabase database.`);
            } else {
                console.log("☁️ Supabase is empty. Modules will self-seed and upload default data directly to Supabase.");
            }
        } catch (e) {
            console.warn("Sync from Supabase failed:", e);
        }
    },

    autoSyncTimer: null,

    startAutoSync() {
        if (this.autoSyncTimer) return;
        console.log("☁️ Memulai sinkronisasi latar belakang otomatis...");
        this.autoSyncTimer = setInterval(async () => {
            if (!this.userId) return;
            try {
                const { data, error } = await supabaseClient
                    .from('fayseri_storage')
                    .select('key_name, value_data')
                    .eq('user_id', this.userId);

                if (error || !data) return;

                let hasChanges = false;
                data.forEach(row => {
                    const localVal = localStorage.getItem(row.key_name);
                    const localString = localVal ? localVal : '';
                    const remoteString = JSON.stringify(row.value_data);
                    
                    const isUiKey = ['fayseri_sidebar', 'fayseri_theme', 'fayseri_page'].includes(row.key_name);
                    
                    if (localString !== remoteString) {
                        if (isUiKey && localStorage.getItem(row.key_name) !== null) {
                            return;
                        }
                        this.cache[row.key_name] = row.value_data;
                        localStorage.setItem(row.key_name, remoteString);
                        hasChanges = true;
                        console.log(`☁️ AutoSync: Modul "${row.key_name}" diperbarui dari Cloud.`);
                    }
                });

                if (hasChanges && typeof AuthManager !== 'undefined' && typeof AuthManager.refreshAppModules === 'function') {
                    AuthManager.refreshAppModules();
                    if (AppState.currentPage === 'produkPage' && typeof ProdukSiapJual !== 'undefined') {
                        ProdukSiapJual.load();
                        ProdukSiapJual.renderGrid();
                    } else if (AppState.currentPage === 'dashboardPage' && typeof DashboardBlok !== 'undefined') {
                        DashboardBlok.load();
                        DashboardBlok.render();
                    }
                }
            } catch (e) {
                console.warn("Background auto sync error:", e);
            }
        }, 12000);
    },

    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
            console.log("☁️ Sinkronisasi latar belakang otomatis dihentikan.");
        }
    }
};

// ================= TOAST NOTIFICATION SYSTEM =================
const Toast = {
    init() {},
    show(message, type = 'info', duration = APP_CONFIG.toastDuration) {
        // Disabled all popup notifications as per user request
        return;
    },
    success(msg) {},
    error(msg) {},
    warning(msg) {},
    info(msg) {}
};

// ================= CUSTOM CONFIRM DIALOG SYSTEM =================
const CustomConfirm = {
    show(message, onConfirm, okText = 'Hapus', cancelText = 'Batal', type = 'danger') {
        let container = document.getElementById('customConfirmContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'customConfirmContainer';
            container.style.cssText = `
                position:fixed;bottom:20px;right:20px;z-index:10000;
                display:flex;flex-direction:column;pointer-events:none;
            `;
            document.body.appendChild(container);
        }

        container.innerHTML = '';

        const card = document.createElement('div');
        card.style.cssText = `
            display:flex;flex-direction:column;gap:12px;padding:16px 20px;
            background:rgba(30, 41, 59, 0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255, 255, 255, 0.1);border-radius:16px;
            color:#fff;font-size:13px;font-family:'Inter',sans-serif;
            box-shadow:0 12px 32px rgba(0,0,0,0.25);pointer-events:auto;
            transform:translateX(130%);transition:transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            max-width:320px;
        `;

        let iconColor = '#F59E0B';
        let okBg = '#3B82F6';
        let okHoverBg = '#2563EB';
        let okShadow = 'rgba(59, 130, 246, 0.3)';

        if (type === 'danger') {
            iconColor = '#EF4444';
            okBg = '#EF4444';
            okHoverBg = '#DC2626';
            okShadow = 'rgba(239, 68, 68, 0.3)';
        } else if (type === 'success') {
            iconColor = '#10B981';
            okBg = '#10B981';
            okHoverBg = '#059669';
            okShadow = 'rgba(16, 185, 129, 0.3)';
        } else if (type === 'info') {
            iconColor = '#3B82F6';
            okBg = '#0d6efd'; // Bootstrap / Faesa Blue
            okHoverBg = '#0b5ed7';
            okShadow = 'rgba(13, 110, 253, 0.3)';
        }

        card.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <i class="fa-solid fa-circle-question" style="font-size:18px;color:${iconColor};margin-top:2px;"></i>
                <div style="flex:1;">
                    <strong style="display:block;margin-bottom:4px;font-weight:600;">Konfirmasi Tindakan</strong>
                    <span style="color:rgba(255,255,255,0.8);line-height:1.4;">${message}</span>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
                <button id="customConfirmCancel" style="padding:6px 12px;background:rgba(255,255,255,0.1);border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:background 0.2s;">${cancelText}</button>
                <button id="customConfirmOk" style="padding:6px 12px;background:${okBg};border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:background 0.2s;box-shadow:0 2px 6px ${okShadow};">${okText}</button>
            </div>
        `;

        container.appendChild(card);

        requestAnimationFrame(() => {
            card.style.transform = 'translateX(0)';
        });

        const cancelBtn = card.querySelector('#customConfirmCancel');
        const okBtn = card.querySelector('#customConfirmOk');

        const dismiss = () => {
            card.style.transform = 'translateX(130%)';
            setTimeout(() => card.remove(), 400);
        };

        cancelBtn.addEventListener('click', () => {
            dismiss();
        });

        okBtn.addEventListener('click', () => {
            dismiss();
            if (typeof onConfirm === 'function') onConfirm();
        });

        cancelBtn.addEventListener('mouseover', () => { cancelBtn.style.background = 'rgba(255,255,255,0.18)'; });
        cancelBtn.addEventListener('mouseout', () => { cancelBtn.style.background = 'rgba(255,255,255,0.1)'; });
        okBtn.addEventListener('mouseover', () => { okBtn.style.background = okHoverBg; });
        okBtn.addEventListener('mouseout', () => { okBtn.style.background = okBg; });
    }
};

// ================= BUAT TOMBOL TOGGLE SIDEBAR =================
function createSidebarToggle() {
    const navbarLeft = $('.navbar-left');
    if (!navbarLeft || $('#sidebarToggle')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Toggle Sidebar');
    toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    navbarLeft.insertBefore(toggleBtn, navbarLeft.firstChild);

    toggleBtn.addEventListener('click', function () {
        toggleSidebar();
    });
}

// ================= LOGIKA TOGGLE SIDEBAR =================
function toggleSidebar() {
    const sidebar = $('.sidebar');
    const mainContent = $('.main-content');
    const icon = $('#sidebarToggle i');

    if (!sidebar || !mainContent) return;

    AppState.sidebarOpen = !AppState.sidebarOpen;

    if (AppState.sidebarOpen) {
        sidebar.classList.remove('sidebar-hidden');
        mainContent.classList.remove('content-expanded');
        icon.className = 'fa-solid fa-bars';
    } else {
        sidebar.classList.add('sidebar-hidden');
        mainContent.classList.add('content-expanded');
        icon.className = 'fa-solid fa-bars-staggered';
    }

    Storage.set(APP_CONFIG.storageKeys.sidebarState, AppState.sidebarOpen);

    setTimeout(() => {
        Object.values(AppState.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }, APP_CONFIG.animDuration + 50);
}

function restoreSidebarState() {
    const saved = Storage.get(APP_CONFIG.storageKeys.sidebarState);
    const sidebar = $('.sidebar');
    const mainContent = $('.main-content');
    const icon = $('#sidebarToggle i');

    if (!sidebar || !mainContent) return;

    if (window.innerWidth <= 768) {
        AppState.sidebarOpen = false;
    } else if (saved !== null) {
        AppState.sidebarOpen = saved;
    } else {
        AppState.sidebarOpen = true;
    }

    if (AppState.sidebarOpen) {
        sidebar.classList.remove('sidebar-hidden');
        mainContent.classList.remove('content-expanded');
        if (icon) icon.className = 'fa-solid fa-bars';
    } else {
        sidebar.classList.add('sidebar-hidden');
        mainContent.classList.add('content-expanded');
        if (icon) icon.className = 'fa-solid fa-bars-staggered';
    }
}

// ================= RESPONSIVE HANDLER =================
function handleResize() {
    const sidebar = $('.sidebar');
    const mainContent = $('.main-content');
    const icon = $('#sidebarToggle i');

    if (window.innerWidth <= 768) {
        if (AppState.sidebarOpen) {
            AppState.sidebarOpen = false;
            sidebar.classList.add('sidebar-hidden');
            mainContent.classList.add('content-expanded');
            if (icon) icon.className = 'fa-solid fa-bars-staggered';
        }
    }
}

const debouncedResize = debounce(handleResize, 150);
window.addEventListener('resize', debouncedResize);

// ================= NAVIGASI SIDEBAR =================
function initNavigation() {
    const menuLinks = $$('.sidebar-menu .menu-link');
    const pages = $$('main > section');

    menuLinks.forEach((link, index) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.dataset.page || pages[index]?.id;
            if (!targetId) return;

            navigateTo(targetId);

            menuLinks.forEach(m => m.classList.remove('active'));
            this.classList.add('active');

            if (window.innerWidth <= 768 && AppState.sidebarOpen) {
                toggleSidebar();
            }
        });
    });

    restoreLastPage();
}

function navigateTo(pageId) {
    const pages = $$('main > section');

    pages.forEach(page => {
        page.style.display = 'none';
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = 'block';
        AppState.currentPage = pageId;
        Storage.set(APP_CONFIG.storageKeys.activePage, pageId);
    }

    // Dynamic rendering of specific pages upon navigation
    if (pageId === 'dashboardPage') {
        if (typeof DashboardBlok !== 'undefined') {
            DashboardBlok.load();
            DashboardBlok.render();
        }
        if (typeof GridCardManager !== 'undefined') {
            GridCardManager.apply();
        }
        if (typeof renderWelcomeBannerSchedule === 'function') {
            renderWelcomeBannerSchedule();
        }
    } else if (pageId === 'analysisPage') {
        if (typeof AnalisisTanaman !== 'undefined') {
            if (typeof AnalisisTanaman.renderTable === 'function') {
                AnalisisTanaman.renderTable();
            }
            if (typeof AnalisisTanaman.updateStats === 'function') {
                AnalisisTanaman.updateStats();
            }
        }
    } else if (pageId === 'profilPage') {
        if (typeof ProfilDanKonfigurasi !== 'undefined' && typeof ProfilDanKonfigurasi.resetEditMode === 'function') {
            ProfilDanKonfigurasi.resetEditMode();
        }
    } else if (pageId === 'produkPage') {
        if (typeof ProdukSiapJual !== 'undefined') {
            ProdukSiapJual.load();
            ProdukSiapJual.renderGrid();
        }
    } else if (pageId === 'panduanPage') {
        if (typeof BukuPanduan !== 'undefined') {
            BukuPanduan.load();
            BukuPanduan.renderTable();
        }
    }

    setTimeout(() => {
        initPageCharts(pageId);
        initPageAnimations(pageId);
    }, 60);
}

function restoreLastPage() {
    const savedPage = Storage.get(APP_CONFIG.storageKeys.activePage);
    const menuLinks = $$('.sidebar-menu .menu-link');
    const pages = $$('main > section');

    if (savedPage) {
        // Match sidebar link by actual data-page attribute instead of fragile DOM index mapping
        const matchingLink = Array.from(menuLinks).find(link => link.dataset.page === savedPage);
        if (matchingLink) {
            menuLinks.forEach(m => m.classList.remove('active'));
            matchingLink.classList.add('active');
            navigateTo(savedPage);
            return;
        }

        // Fallback to index search if data-page attribute was missing
        const targetIndex = Array.from(pages).findIndex(p => p.id === savedPage);
        if (targetIndex !== -1) {
            menuLinks.forEach(m => m.classList.remove('active'));
            if (menuLinks[targetIndex]) menuLinks[targetIndex].classList.add('active');
            navigateTo(savedPage);
            return;
        }
    }

    if (pages.length > 0) {
        navigateTo(pages[0].id);
    }
}

// ================= ANIMASI COUNTER ANGKA =================
function animateCounter(element, target, duration = 800) {
    if (!element) return;

    const isFloat = String(target).includes('.');
    const hasPrefix = element.textContent.match(/^[^\d]*/)[0];
    const hasSuffix = element.textContent.match(/[^\d]*$/)[0];
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;

        let displayValue;
        if (hasSuffix && hasSuffix.includes('%')) {
            displayValue = current.toFixed(1) + '%';
        } else if (isFloat) {
            displayValue = current.toFixed(1);
        } else {
            displayValue = Math.floor(current).toLocaleString('id-ID');
        }

        element.textContent = displayValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function initPageAnimations(pageId) {
    if (pageId === 'dashboardPage' || pageId === 'jadwalPage' || pageId === 'analysisPage' || pageId === 'stokPage' || pageId === 'pekerjaPage' || pageId === 'kasPage') {
        const page = document.getElementById(pageId);
        if (!page) return;

        const valueElements = page.querySelectorAll('.stat-card .card-value');
        valueElements.forEach(el => {
            const text = el.textContent.trim();
            const numMatch = text.match(/([\d.,]+)/);

            if (numMatch) {
                let numStr = numMatch[1];
                const parts = numStr.split('.');
                if (parts.length === 2) {
                    const decimalPart = parts[1];
                    if (decimalPart.length === 3) {
                        // Likely a thousands separator (e.g. 1.250)
                        numStr = numStr.replace(/\./g, '');
                    } else {
                        // Likely a decimal separator (e.g. 94.2)
                        // Do not strip the dot
                    }
                } else if (parts.length > 2) {
                    // Multiple dots represent thousands separators (e.g. 1.250.000)
                    numStr = numStr.replace(/\./g, '');
                }
                
                numStr = numStr.replace(/,/g, '.');
                const num = parseFloat(numStr);

                if (!isNaN(num) && num > 0) {
                    animateCounter(el, num, 700);
                }
            }
        });
    }
}

// ================= CHART: SKOR PERTUMBUHAN (DASHBOARD) =================
function buildDashboardHourLabels() {
    const labels = [];
    const baseTime = new Date();
    baseTime.setMinutes(0, 0, 0);

    for (let i = -3; i <= 3; i++) {
        const current = new Date(baseTime.getTime() + (i * 60 * 60 * 1000));
        labels.push(current.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }

    return labels;
}

function initKesehatanChart() {
    const canvas = document.getElementById('kesehatanChart');
    if (!canvas) return;

    const section = canvas.closest('section');
    if (section && section.style.display === 'none') return;

    if (AppState.charts.kesehatan) {
        AppState.charts.kesehatan.destroy();
    }

    const ctx = canvas.getContext('2d');
    const baseTemp = AppState.envData.suhu || 32;
    const baseHum = AppState.envData.lembab || 68;

    let tempArray = [];
    let humArray = [];

    if (AppState.envData.hourlyTemp && AppState.envData.hourlyTemp.length === 7) {
        tempArray = AppState.envData.hourlyTemp;
        humArray = AppState.envData.hourlyLembab;
    } else {
        const now = new Date();
        for (let i = -3; i <= 3; i++) {
            const checkTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
            const sim = getSimulatedJambiWeather(checkTime.getHours());
            tempArray.push(sim.suhu);
            humArray.push(sim.lembab);
        }
    }

    const isF = (typeof ProfilDanKonfigurasi !== 'undefined' && ProfilDanKonfigurasi.konfig && ProfilDanKonfigurasi.konfig.satuanSuhu && ProfilDanKonfigurasi.konfig.satuanSuhu.includes('Fahrenheit'));
    const unit = getTempUnitLabel();
    const dispTempArray = tempArray.map(t => toDispTemp(t));

    AppState.charts.kesehatan = new Chart(ctx, {
        type: 'line',
        data: {
            labels: buildDashboardHourLabels(),
            datasets: [
                {
                    label: `Suhu (${unit})`,
                    data: dispTempArray,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Kelembaban (%)',
                    data: humArray,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Inter', size: 11, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: '#1F2937',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 11 },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: isF ? 73 : 23,
                    max: isF ? 95 : 35,
                    title: {
                        display: true,
                        text: `Suhu (${unit})`,
                        font: { family: 'Inter', size: 10, weight: '600' }
                    },
                    ticks: {
                        font: { family: 'Inter', size: 10 },
                        padding: 6
                    },
                    grid: { color: APP_CONFIG.chartColors.grid }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Kelembaban (%)',
                        font: { family: 'Inter', size: 10, weight: '600' }
                    },
                    ticks: {
                        font: { family: 'Inter', size: 10 },
                        padding: 6
                    }
                }
            }
        }
    });
}

// ================= CHART: PERTUMBUHAN MINGGUAN (ANALISIS) =================
function initAnalysisChart() {
    const canvas = document.getElementById('analysisChart');
    if (!canvas) return;

    const section = canvas.closest('section');
    if (section && section.style.display === 'none') return;

    if (AppState.charts.analysis) {
        AppState.charts.analysis.destroy();
    }

    const ctx = canvas.getContext('2d');

    const gradientTinggi = ctx.createLinearGradient(0, 0, 0, 280);
    gradientTinggi.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
    gradientTinggi.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    const gradientDaun = ctx.createLinearGradient(0, 0, 0, 280);
    gradientDaun.addColorStop(0, 'rgba(5, 150, 105, 0.12)');
    gradientDaun.addColorStop(1, 'rgba(5, 150, 105, 0.0)');

    AppState.charts.analysis = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4', 'Mg 5', 'Mg 6', 'Mg 7'],
            datasets: [
                {
                    label: 'Tinggi (cm)',
                    data: [5, 10, 16, 22, 28, 32, 35],
                    borderColor: APP_CONFIG.chartColors.primary,
                    backgroundColor: gradientTinggi,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: APP_CONFIG.chartColors.primary,
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2.5
                },
                {
                    label: 'Jumlah Daun',
                    data: [4, 8, 12, 15, 18, 21, 24],
                    borderColor: APP_CONFIG.chartColors.success,
                    backgroundColor: gradientDaun,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: APP_CONFIG.chartColors.success,
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        font: { family: 'Inter', size: 11, weight: '500' },
                        color: '#4B5563',
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 3,
                        useBorderRadius: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#1F2937',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 11 },
                    padding: 12,
                    cornerRadius: 8,
                    boxPadding: 4
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: APP_CONFIG.chartColors.grid,
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        color: APP_CONFIG.chartColors.text,
                        padding: 8
                    },
                    border: { display: false }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '500' },
                        color: APP_CONFIG.chartColors.textDark,
                        padding: 8
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// ================= INISIALISASI CHART PER HALAMAN =================
function initPageCharts(pageId) {
    switch (pageId) {
        case 'dashboardPage':
            initKesehatanChart();
            break;
        case 'analysisPage':
            initAnalysisChart();
            break;
    }
}

// ================= DATA CUACA REAL-TIME (OPEN-METEO API) =================
// Model fluktuasi cuaca Kebon 9, Jambi berbasis waktu sebagai fallback API yang realistis
function getSimulatedJambiWeather(hour) {
    const angle = (hour - 8) * Math.PI / 12; // puncak jam 14 (14.00), titik terendah jam 2 (02.00)
    const temp = 27.5 + 4.5 * Math.sin(angle); // rentang 23°C - 32°C
    const hum = 82.5 - 12.5 * Math.sin(angle); // rentang 70% - 95%
    return {
        suhu: Math.round(temp + getRandomFloat(-0.5, 0.5, 1)),
        lembab: Math.round(Math.min(100, Math.max(0, hum + getRandomInt(-1, 1))))
    };
}

const WEATHER_LOCATION = 'Kebon 9, Sungai Gelam, Muaro Jambi, Jambi';
let lastApiCallTime = 0;
let apiBaseSuhu = null;
let apiBaseLembab = null;
let apiRainForecast = { value: '--', detail: 'Sedang memantau...' };
let isFetchingWeather = false;

function buildRainForecast(forecastData) {
    const currentPrecip = Number(forecastData?.current?.precipitation ?? 0);

    if (currentPrecip > 0) {
        return {
            value: 'Segera',
            detail: `${currentPrecip.toFixed(1)} mm saat ini`
        };
    }

    const hourly = forecastData?.hourly;
    const times = hourly?.time || [];
    const chances = hourly?.precipitation_probability || [];
    const amounts = hourly?.precipitation || [];

    for (let i = 0; i < times.length; i++) {
        const time = new Date(times[i]);
        if (time <= new Date()) continue;

        const chance = Number(chances[i] ?? 0);
        const amount = Number(amounts[i] ?? 0);

        if (chance >= 20 || amount > 0) {
            return {
                value: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                detail: amount > 0
                    ? `${chance}% peluang • ${amount.toFixed(1)} mm`
                    : `${chance}% peluang`
            };
        }
    }

    return {
        value: 'Tidak ada',
        detail: 'Peluang hujan sangat rendah'
    };
}

async function fetchWeatherForecastForLocation(locationName) {
    // Koordinat presisi Kebon 9, Sungai Gelam, Muaro Jambi, Jambi
    const lat = -1.6966;
    const lon = 103.6874;

    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&timezone=auto`);
    if (!forecastResponse.ok) {
        throw new Error(`Forecast request failed: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();
    if (!forecastData?.current) {
        throw new Error('Forecast response missing current weather data');
    }

    // Cari index jam sekarang di hourly data
    let currentHourIdx = -1;
    const now = new Date();
    
    if (forecastData.hourly && Array.isArray(forecastData.hourly.time)) {
        const currentHourMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
        let minDiff = Infinity;
        for (let i = 0; i < forecastData.hourly.time.length; i++) {
            const tMs = new Date(forecastData.hourly.time[i]).getTime();
            const diff = Math.abs(tMs - currentHourMs);
            if (diff < minDiff) {
                minDiff = diff;
                currentHourIdx = i;
            }
        }
    }

    let hourlyTemp = [];
    let hourlyLembab = [];
    if (currentHourIdx !== -1 && forecastData.hourly) {
        for (let i = -3; i <= 3; i++) {
            const idx = currentHourIdx + i;
            if (idx >= 0 && idx < forecastData.hourly.time.length) {
                hourlyTemp.push(Math.round(forecastData.hourly.temperature_2m[idx]));
                hourlyLembab.push(Math.round(forecastData.hourly.relative_humidity_2m[idx]));
            } else {
                const baseT = Math.round(forecastData.current.temperature_2m);
                const baseH = Math.round(forecastData.current.relative_humidity_2m);
                hourlyTemp.push(baseT);
                hourlyLembab.push(baseH);
            }
        }
    }

    // Hitung perbedaan kelembaban rata-rata dibanding jam sebelumnya secara dinamis
    let lembabChange = -3; // Default fallback
    if (forecastData.hourly && Array.isArray(forecastData.hourly.relative_humidity_2m) && currentHourIdx !== -1) {
        const prevIdx = currentHourIdx - 1;
        if (prevIdx >= 0 && prevIdx < forecastData.hourly.relative_humidity_2m.length) {
            const currentHum = forecastData.hourly.relative_humidity_2m[currentHourIdx];
            const prevHum = forecastData.hourly.relative_humidity_2m[prevIdx];
            lembabChange = Math.round(currentHum - prevHum);
        }
    }

    return {
        suhu: Math.round(forecastData.current.temperature_2m),
        lembab: Math.round(forecastData.current.relative_humidity_2m),
        lembabChange,
        rainForecast: buildRainForecast(forecastData),
        hourlyTemp,
        hourlyLembab,
        location: 'Kebon 9, Sungai Gelam'
    };
}

async function updateEnvData() {
    const suhuEl = $('#suhu');
    const lembabEl = $('#lembab');
    const rainValueEl = document.getElementById('rainForecastVal');
    const rainMetaEl = document.getElementById('rainForecastMeta');

    if (!suhuEl || !lembabEl) return;

    const prevSuhu = AppState.envData.suhu || 0;
    const prevLembab = AppState.envData.lembab || 0;

    const now = Date.now();
    if ((lastApiCallTime === 0 || now - lastApiCallTime > 60000) && !isFetchingWeather) {
        isFetchingWeather = true;
        try {
            const weatherData = await fetchWeatherForecastForLocation(WEATHER_LOCATION);
            apiBaseSuhu = weatherData.suhu;
            apiBaseLembab = weatherData.lembab;
            apiRainForecast = weatherData.rainForecast || apiRainForecast;
            
            if (weatherData.hourlyTemp && weatherData.hourlyTemp.length === 7) {
                AppState.envData.hourlyTemp = weatherData.hourlyTemp;
                AppState.envData.hourlyLembab = weatherData.hourlyLembab;
            }
            AppState.envData.lembabChange = weatherData.lembabChange;
            
            lastApiCallTime = now;
            console.log(`✅ Cuaca real-time Kebon 9 (Open-Meteo API): ${apiBaseSuhu}°C, ${apiBaseLembab}%`);
            
            // Render ulang chart dengan data riil yang baru di-fetch
            if (typeof initKesehatanChart === 'function') {
                initKesehatanChart();
            }
        } catch (err) {
            console.warn('⚠️ Gagal mengambil data cuaca real-time dari Open-Meteo API, menggunakan simulasi Kebon 9:', err);
            const sysHour = new Date().getHours();
            const currentSim = getSimulatedJambiWeather(sysHour);
            
            apiBaseSuhu = currentSim.suhu;
            apiBaseLembab = currentSim.lembab;
            
            // Simulasikan juga data 7 jam ke depan dan ke belakang secara konsisten
            const hourlyTemp = [];
            const hourlyLembab = [];
            const sysNow = new Date();
            for (let i = -3; i <= 3; i++) {
                const checkTime = new Date(sysNow.getTime() + (i * 60 * 60 * 1000));
                const sim = getSimulatedJambiWeather(checkTime.getHours());
                hourlyTemp.push(sim.suhu);
                hourlyLembab.push(sim.lembab);
            }
            AppState.envData.hourlyTemp = hourlyTemp;
            AppState.envData.hourlyLembab = hourlyLembab;
            
            // Hitung lembabChange dari jam sekarang dibanding jam sebelumnya
            const simPrev = getSimulatedJambiWeather((sysHour - 1 + 24) % 24);
            AppState.envData.lembabChange = Math.round(currentSim.lembab - simPrev.lembab);

            // Prediksi Hujan realistis untuk wilayah Jambi
            const nextRainHour = (sysHour + 2) % 24;
            const nextRainStr = String(nextRainHour).padStart(2, '0') + '.00';
            apiRainForecast = {
                value: nextRainStr,
                detail: '45% peluang • 0.2 mm'
            };
            
            // Render ulang chart dengan data simulasi yang dinamis
            if (typeof initKesehatanChart === 'function') {
                initKesehatanChart();
            }
        } finally {
            isFetchingWeather = false;
        }
    }

    if (apiBaseSuhu !== null) {
        AppState.envData.suhu = apiBaseSuhu;
        AppState.envData.lembab = apiBaseLembab;

        if (typeof apiBaseSuhu === 'number') {
            const dispSuhu = toDispTemp(apiBaseSuhu);
            const prevSuhuDisp = toDispTemp(prevSuhu);
            animateValueChange(suhuEl, prevSuhuDisp, dispSuhu);
        } else {
            suhuEl.textContent = apiBaseSuhu;
        }

        const unitEl = document.getElementById('suhuUnit');
        if (unitEl) {
            unitEl.textContent = getTempUnitLabel();
        }

        if (typeof apiBaseLembab === 'number') {
            animateValueChange(lembabEl, prevLembab, AppState.envData.lembab);
        } else {
            lembabEl.textContent = apiBaseLembab;
        }

        const gridLembabVal = document.getElementById('gridLembabVal');
        if (gridLembabVal) {
            gridLembabVal.textContent = (typeof apiBaseLembab === 'number') ? apiBaseLembab + '%' : '--';
        }
    }

    if (rainValueEl && rainMetaEl) {
        rainValueEl.textContent = apiRainForecast.value || '--';
        rainMetaEl.className = 'card-trend up';
        rainMetaEl.innerHTML = `<i class="fa-solid fa-cloud-rain"></i> ${apiRainForecast.detail || 'Sedang memantau...'}`;
    }
}

function animateValueChange(element, oldVal, newVal) {
    if (oldVal === newVal) {
        if (element.textContent !== String(newVal)) {
            element.textContent = newVal;
            element.style.color = '';
        }
        return;
    }

    element.style.transition = 'color 0.3s ease';
    element.style.color = newVal > oldVal ? '#DC2626' : '#2563EB';
    element.textContent = newVal;

    setTimeout(() => {
        element.style.color = '';
    }, 600);
}

function renderWelcomeBannerSchedule() {
    const container = document.getElementById('welcomeScheduleBox');
    if (!container) return;

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayIdx = new Date().getDay();
    
    const allSchedules = (typeof WateringSchedule !== 'undefined' && WateringSchedule.data)
        ? WateringSchedule.data.filter(d => d.aktif)
        : [];

    const scheduleWithDistance = [];

    allSchedules.forEach(item => {
        if (!item.hari || !Array.isArray(item.hari) || item.hari.length === 0) return;
        
        let minDistance = 8;
        let closestDayName = '';

        item.hari.forEach(day => {
            const targetIdx = dayNames.indexOf(day);
            if (targetIdx !== -1) {
                let distance = targetIdx - todayIdx;
                if (distance < 0) {
                    distance += 7; // Wrap to next week
                }
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDayName = day;
                }
            }
        });

        if (minDistance < 8) {
            scheduleWithDistance.push({
                item: item,
                distance: minDistance,
                dayName: closestDayName
            });
        }
    });

    // Sort by distance ascending
    scheduleWithDistance.sort((a, b) => a.distance - b.distance);

    // Take top 3
    const top3 = scheduleWithDistance.slice(0, 3);

    let html = `
        <div class="schedule-header">
            <i class="fa-solid fa-clock-rotate-left"></i> JADWAL TERDEKAT AKTIVITAS
        </div>
    `;

    const getDayLabel = (distance, dayName) => {
        if (distance === 0) return 'Hari Ini';
        if (distance === 1) return 'Besok';
        return dayName;
    };

    const getIconHTML = (activity) => {
        const act = activity.toLowerCase();
        if (act.includes('siram') || act.includes('irigasi') || act.includes('watering')) {
            return `<i class="fa-solid fa-faucet-drip" style="font-size:11px; color:#cff4fc;"></i>`;
        } else if (act.includes('pupuk') || act.includes('nutrisi')) {
            return `<i class="fa-solid fa-jar-wheat" style="font-size:11px; color:#d1e7dd;"></i>`;
        } else if (act.includes('semprot') || act.includes('insektisida') || act.includes('fungisida') || act.includes('pestisida')) {
            return `<i class="fa-solid fa-spray-can-sparkles" style="font-size:11px; color:#fff3cd;"></i>`;
        } else {
            return `<i class="fa-solid fa-calendar-day" style="font-size:11px; color:#e2e8f0;"></i>`;
        }
    };

    if (top3.length === 0) {
        html += `
            <div class="schedule-item" style="opacity: 0.6;">
                <span class="time"><i class="fa-solid fa-calendar-xmark" style="font-size:11px;"></i> -</span>
                <span class="task">Belum ada jadwal terdekat</span>
            </div>
        `;
    } else {
        top3.forEach(sch => {
            const label = getDayLabel(sch.distance, sch.dayName);
            const iconHtml = getIconHTML(sch.item.aktivitas);
            html += `
                <div class="schedule-item">
                    <span class="time">${iconHtml} ${label}</span>
                    <span class="task">${sch.item.aktivitas} ${sch.item.catatan ? `(${sch.item.catatan})` : ''}</span>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

function renderDashboardActivityList() {
    const activityList = $('#dashboardPage .activity-list');
    if (!activityList) return;

    const displayLogs = AppState.activityLog.slice(0, 5);

    if (displayLogs.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="user-avatar bg-green"><i class="fa-solid fa-circle-info"></i></div>
                <div class="item-info">
                    <strong>Belum ada aktivitas</strong>
                    <p>Aktivitas akan muncul setelah Anda melakukan perubahan data.</p>
                </div>
                <span class="item-time">-</span>
            </div>
        `;
    } else {
        activityList.innerHTML = displayLogs.map(act => `
            <div class="activity-item" style="cursor: pointer;">
                <div class="user-avatar ${act.bg}">${act.user}</div>
                <div class="item-info">
                    <strong>${act.name}</strong>
                    <p>${act.action}</p>
                </div>
                <span class="item-time">${act.time}</span>
            </div>
        `).join('');
    }

    initActivityClick();
}

function addRealActivityLog(userShort, name, action, bgClass = '') {
    if (typeof AppState !== 'undefined' && AppState.activityLog) {
        AppState.activityLog.unshift({
            user: userShort,
            name: name,
            bg: bgClass,
            action: action,
            time: 'Baru saja'
        });
        if (AppState.activityLog.length > 50) {
            AppState.activityLog.pop();
        }

        renderDashboardActivityList();
    }
}

function logUserAction(action) {
    const name = (typeof ProfilDanKonfigurasi !== 'undefined' && ProfilDanKonfigurasi.profil && ProfilDanKonfigurasi.profil.nama)
        ? ProfilDanKonfigurasi.profil.nama
        : 'Admin Fayseri';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    addRealActivityLog(initials, name, action, '');
}

// ================= SIMULASI AKTIVITAS REAL-TIME =================
const activityTemplates = [
    { user: 'AF', name: 'Admin Fayseri', bg: '', actions: [
        'Menyiram tanaman cabai',
        'Memeriksa pH tanah',
        'Memperbarui data pertumbuhan',
        'Selesai penyemprotan insektisida',
        'Menambahkan pupuk cair'
    ]},
    { user: 'JS', name: 'Jane Smith', bg: 'bg-blue', actions: [
        'Menambahkan 50 bibit Cabai baru',
        'Memeriksa kondisi daun tanaman',
        'Mengambil foto tanaman untuk analisis',
        'Melaporkan gejala antraknosa'
    ]},
    { user: 'BS', name: 'Budi Santoso', bg: 'bg-green', actions: [
        'Menyiram tanaman',
        'Bersih-bersih area greenhouse',
        'Mengganti polybag yang rusak'
    ]},
    { user: 'RW', name: 'Rina Wati', bg: 'bg-blue', actions: [
        'Melakukan pemupukan tanaman',
        'Mencatat hasil panen harian',
        'Memeriksa stok gudang'
    ]},
    { user: 'AI', name: 'Sistem Fayseri', bg: 'bg-green', actions: [
        'Analisis harian selesai: Kondisi Stabil',
        'Peringatan: Kelembaban tinggi di greenhouse',
        'Analisis harian selesai: Perlu perhatian',
        'Notifikasi: Jadwal proteksi hari ini',
        'Backup data otomatis berhasil'
    ]}
];

function simulateActivity() {
    const activityList = $('.activity-list');
    if (!activityList) return;

    const page = activityList.closest('section');
    if (page && page.style.display === 'none') return;

    const template = activityTemplates[getRandomInt(0, activityTemplates.length - 1)];
    const action = template.actions[getRandomInt(0, template.actions.length - 1)];

    // Push to AppState activity log
    if (typeof AppState !== 'undefined' && AppState.activityLog) {
        AppState.activityLog.unshift({
            user: template.user,
            name: template.name,
            bg: template.bg,
            action,
            time: 'Baru saja'
        });
        if (AppState.activityLog.length > 50) {
            AppState.activityLog.pop();
        }
        // Sync older timestamps in our log
        AppState.activityLog.forEach((act, idx) => {
            if (idx === 0) return;
            if (act.time === 'Baru saja') {
                act.time = '1 menit lalu';
            } else {
                const match = act.time.match(/(\d+)/);
                if (match) {
                    const mins = parseInt(match[1]) + 1;
                    act.time = mins + ' menit lalu';
                }
            }
        });
    }

    const newItem = document.createElement('div');
    newItem.className = 'activity-item';
    newItem.style.cssText = 'opacity:0;transform:translateY(-10px);transition:all 0.3s ease;';
    newItem.innerHTML = `
        <div class="user-avatar ${template.bg}">${template.user}</div>
        <div class="item-info">
            <strong>${template.name}</strong>
            <p>${action}</p>
        </div>
        <span class="item-time">Baru saja</span>
    `;

    activityList.insertBefore(newItem, activityList.firstChild);

    requestAnimationFrame(() => {
        newItem.style.opacity = '1';
        newItem.style.transform = 'translateY(0)';
    });

    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 8) {
        const last = items[items.length - 1];
        last.style.opacity = '0';
        last.style.transform = 'translateY(-10px)';
        setTimeout(() => last.remove(), 300);
    }

    updateOldTimestamps(activityList);
}

function updateOldTimestamps(container) {
    const times = container.querySelectorAll('.item-time');
    times.forEach((t, i) => {
        if (i === 0) return;
        const currentText = t.textContent.trim();
        if (currentText === 'Baru saja') {
            t.textContent = '1 menit lalu';
        } else {
            const match = currentText.match(/(\d+)/);
            if (match) {
                const mins = parseInt(match[1]) + 1;
                t.textContent = mins + ' menit lalu';
            }
        }
    });
}

// ================= TABEL: SORTING =================
function initTableSorting() {
    const tables = $$('.data-table');

    tables.forEach(table => {
        const headers = table.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.title = 'Klik untuk mengurutkan';

            header.addEventListener('click', function () {
                const tbody = table.querySelector('tbody');
                if (!tbody) return;

                const rows = Array.from(tbody.querySelectorAll('tr'));
                const currentDir = AppState.tableData.sortDirection;

                if (AppState.tableData.sortColumn === index) {
                    AppState.tableData.sortDirection = currentDir === 'asc' ? 'desc' : 'asc';
                } else {
                    AppState.tableData.sortColumn = index;
                    AppState.tableData.sortDirection = 'asc';
                }

                rows.sort((a, b) => {
                    const aText = a.cells[index]?.textContent.trim() || '';
                    const bText = b.cells[index]?.textContent.trim() || '';

                    const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
                    const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));

                    let comparison;
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        comparison = aNum - bNum;
                    } else {
                        comparison = aText.localeCompare(bText, 'id-ID');
                    }

                    return AppState.tableData.sortDirection === 'asc' ? comparison : -comparison;
                });

                rows.forEach(row => tbody.appendChild(row));

                headers.forEach(h => {
                    h.style.color = '';
                });
                header.style.color = '#6366F1';

                Toast.info('Tabel diurutkan: ' + header.textContent.trim());
            });
        });
    });
}

// ================= TABEL: PENCARIAN =================
function initTableSearch() {
    const searchInput = $('.search-input');
    if (!searchInput) return;

    const debouncedSearch = debounce(function () {
        const keyword = this.value.toLowerCase();
        const table = this.closest('.content-box')?.querySelector('.data-table tbody');
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const visible = text.includes(keyword);
            row.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });

        if (keyword.length > 0) {
            Toast.info(`Ditemukan ${visibleCount} data`);
        }
    }, 250);

    searchInput.addEventListener('input', debouncedSearch);
}

// ================= TABEL: FILTER SELECT =================
function initTableFilter() {
    const selectFilter = $('.select-filter');
    if (!selectFilter) return;

    selectFilter.addEventListener('change', function () {
        const value = this.value.toLowerCase();
        const table = this.closest('.content-box')?.querySelector('.data-table tbody');
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const visible = value === 'semua blok' || row.textContent.toLowerCase().includes(value);
            row.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });

        Toast.info(`Menampilkan ${visibleCount} data`);
    });
}

// ================= TOMBOL DETAIL TABEL =================
function initDetailButtons() {
    $$('.btn-small').forEach(btn => {
        btn.addEventListener('click', function () {
            const row = this.closest('tr');
            if (!row) return;

            const cells = row.querySelectorAll('td');
            const headers = row.closest('.data-table').querySelectorAll('thead th');
            let detailHTML = '<div style="text-align:left;padding:8px 0;">';

            cells.forEach((cell, i) => {
                if (headers[i]) {
                    const label = headers[i].textContent.trim();
                    const value = cell.textContent.trim();
                    detailHTML += `<div style="margin-bottom:6px;font-size:12px;"><strong style="color:#6366F1;">${label}:</strong> <span style="color:#1F2937;">${value}</span></div>`;
                }
            });

            detailHTML += '</div>';

            showModal('Detail Data', detailHTML);
        });
    });
}

// ================= MODAL SYSTEM =================
function showModal(title, content) {
    let modalOverlay = $('#modalOverlay');

    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'modalOverlay';
        modalOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);opacity:0;transition:opacity 0.2s ease;';
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', function (e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    modalOverlay.innerHTML = `
        <div style="background:#fff;border-radius:14px;width:90%;max-width:480px;max-height:80vh;overflow-y:auto;transform:scale(0.95);transition:transform 0.2s ease;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #F3F4F6;">
                <h3 style="font-size:16px;font-weight:700;color:#111827;font-family:'Inter',sans-serif;">${title}</h3>
                <button onclick="closeModal()" style="background:none;border:none;font-size:18px;color:#9CA3AF;cursor:pointer;padding:4px;border-radius:6px;transition:all 0.15s;" onmouseover="this.style.background='#F3F4F6';this.style.color='#374151';" onmouseout="this.style.background='none';this.style.color='#9CA3AF';">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div style="padding:24px;font-family:'Inter',sans-serif;">
                ${content}
            </div>
            <div style="padding:12px 24px 18px;display:flex;justify-content:flex-end;gap:8px;">
                <button onclick="closeModal()" style="padding:8px 20px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:background 0.15s;" onmouseover="this.style.background='#E5E7EB';" onmouseout="this.style.background='#F3F4F6';">Tutup</button>
            </div>
        </div>
    `;

    requestAnimationFrame(() => {
        modalOverlay.style.opacity = '1';
        modalOverlay.querySelector('div').style.transform = 'scale(1)';
    });
}

function closeModal() {
    const modalOverlay = $('#modalOverlay');
    if (!modalOverlay) return;

    const box = modalOverlay.querySelector('div');
    if (box) box.style.transform = 'scale(0.95)';

    modalOverlay.style.opacity = '0';

    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 200);
}

// ================= TOMBOL TAMBAH DATA =================
function initAddDataButton() {
    const triggerModal = $('#triggerModal');
    if (!triggerModal) return;

    triggerModal.addEventListener('click', function () {
        const formHTML = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;">ID Blok</label>
                    <input type="text" placeholder="Contoh: BL-A1" style="width:100%;padding:9px 14px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:border 0.15s;" onfocus="this.style.borderColor='#6366F1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)';" onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;">Jenis Tanaman</label>
                    <input type="text" placeholder="Contoh: Cabai Rawit" style="width:100%;padding:9px 14px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:border 0.15s;" onfocus="this.style.borderColor='#6366F1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)';" onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;">Umur (Hari)</label>
                    <input type="number" placeholder="Contoh: 30" style="width:100%;padding:9px 14px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:border 0.15s;" onfocus="this.style.borderColor='#6366F1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)';" onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';">
                </div>
                <div>
                    <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;">Catatan</label>
                    <textarea placeholder="Catatan tambahan..." rows="3" style="width:100%;padding:9px 14px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;resize:vertical;transition:border 0.15s;" onfocus="this.style.borderColor='#6366F1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)';" onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';"></textarea>
                </div>
            </div>
        `;

        showModal('Tambah Data Tanaman', formHTML);
    });
}

// ================= TOMBOL REFRESH =================
function initRefreshButton() {
    const refreshBtn = $('.header-actions .btn-icon-outline');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', function () {
        if (AppState.isAnimating) return;
        AppState.isAnimating = true;

        const icon = this.querySelector('i');
        icon.style.transition = 'transform 0.6s ease';
        icon.style.transform = 'rotate(360deg)';

        updateEnvData();

        setTimeout(() => {
            icon.style.transition = 'none';
            icon.style.transform = 'rotate(0deg)';
            AppState.isAnimating = false;
            Toast.success('Data berhasil diperbarui');
        }, 600);
    });
}

// ================= FORM VALIDATION (PROFIL) =================
function initFormValidation() {
    const formInputs = $$('.form-input');

    formInputs.forEach(input => {
        input.addEventListener('focus', function () {
            this.closest('.form-group')?.querySelector('label')?.style.setProperty('color', '#6366F1');
        });

        input.addEventListener('blur', function () {
            this.closest('.form-group')?.querySelector('label')?.style.setProperty('color', '#374151');
        });

        if (input.type === 'email') {
            input.addEventListener('input', debounce(function () {
                const value = input.value.trim();
                if (value && !value.includes('@')) {
                    input.style.borderColor = '#EF4444';
                    Toast.warning('Format email tidak valid');
                } else if (value && value.includes('@')) {
                    input.style.borderColor = '#10B981';
                } else {
                    input.style.borderColor = '#E5E7EB';
                }
            }, 400));
        }

        if (input.type === 'tel') {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9+\-\s]/g, '');
            });
        }
    });
}

// ================= TOMBOL SIMPAN =================
function initSaveButtons() {
    $$('.btn-primary').forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        if (text.includes('simpan')) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();

                const section = this.closest('section');
                if (!section) return;

                const requiredInputs = section.querySelectorAll('.form-input[required]');
                let isValid = true;

                requiredInputs.forEach(input => {
                    if (!input.value.trim()) {
                        isValid = false;
                        input.style.borderColor = '#EF4444';
                        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

                        setTimeout(() => {
                            input.style.borderColor = '#E5E7EB';
                            input.style.boxShadow = 'none';
                        }, 2000);
                    }
                });

                if (!isValid) {
                    Toast.error('Lengkapi semua field yang wajib diisi');
                    return;
                }

                const original = this.innerHTML;
                const originalBg = this.style.background;

                this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
                this.style.background = '#9CA3AF';
                this.disabled = true;

                setTimeout(() => {
                    this.innerHTML = '<i class="fa-solid fa-check"></i> Tersimpan';
                    this.style.background = '#059669';

                    Toast.success('Data berhasil disimpan');

                    setTimeout(() => {
                        this.innerHTML = original;
                        this.style.background = originalBg;
                        this.disabled = false;
                    }, 1500);
                }, 800);
            });
        }
    });
}

// ================= LIHAT SEMUA AKTIVITAS =================
function initViewAllLinks() {
    $$('.view-all').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            Toast.info('Menampilkan semua aktivitas...');
        });
    });
}

// ================= KEYBOARD SHORTCUTS =================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.key === '[' || e.key === '{') {
            e.preventDefault();
            toggleSidebar();
        }

        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = $('.search-input');
            if (searchInput) {
                const page = searchInput.closest('section');
                if (page && page.style.display === 'none') {
                    const menuLinks = $$('.sidebar-menu .menu-link');
                    const pages = $$('main > section');
                    const daftarIndex = Array.from(pages).findIndex(p => p.id === 'daftarPage');
                    if (daftarIndex !== -1) {
                        menuLinks[daftarIndex].click();
                        setTimeout(() => searchInput.focus(), 200);
                    }
                } else {
                    searchInput.focus();
                }
            }
        }

        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ================= TOMBOL EXPORT/PRINT =================
function exportCurrentPageData() {
    const activeSection = $('main > section:not([style*="display: none"])');
    const pageId = activeSection ? activeSection.id : AppState.currentPage;
    
    let filename = 'export.csv';
    let headers = [];
    let rows = [];

    if (pageId === 'kasPage') {
        filename = 'laporan_keuangan_kas.csv';
        headers = ['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Jumlah (IDR)'];
        rows = (typeof LaporanKas !== 'undefined' && LaporanKas.data) ? LaporanKas.data.map(k => [
            k.tanggal,
            k.keterangan,
            k.kategori,
            k.tipe,
            k.jumlah
        ]) : [];
    } else if (pageId === 'daftarPage') {
        filename = 'daftar_tanaman.csv';
        headers = ['Varietas', 'Jumlah', 'Tanggal Tanam', 'Umur', 'Fase Pertumbuhan', 'Status'];
        rows = (typeof DaftarTanaman !== 'undefined' && DaftarTanaman.data) ? DaftarTanaman.data.map(t => [
            t.varietas,
            t.jumlah,
            t.tanggal,
            t.umur,
            t.fase,
            t.status
        ]) : [];
    } else if (pageId === 'stokPage') {
        filename = 'stok_gudang.csv';
        headers = ['Nama Barang', 'Kategori', 'Jumlah', 'Satuan', 'Estimasi Nilai (IDR)'];
        rows = (typeof StokLogistik !== 'undefined' && StokLogistik.data) ? StokLogistik.data.map(s => [
            s.nama,
            s.kategori,
            s.jumlah,
            s.satuan,
            s.nilai
        ]) : [];
    } else if (pageId === 'pekerjaPage') {
        filename = 'pekerja_lapangan.csv';
        headers = ['ID Pekerja', 'Nama Pekerja', 'Divisi', 'Status', 'Tugas Hari Ini', 'Kinerja (%)'];
        rows = (typeof PekerjaLap !== 'undefined' && PekerjaLap.data) ? PekerjaLap.data.map(p => [
            p.id,
            p.nama,
            p.divisi,
            p.status,
            p.tugas,
            p.kinerja
        ]) : [];
    } else if (pageId === 'analysisPage') {
        filename = 'analisis_varietas_tanaman.csv';
        headers = ['Varietas Cabai', 'Tinggi (cm)', 'Jumlah Daun', 'Warna Daun', 'Gejala Penyakit', 'Skor Kesehatan (%)'];
        const rowsCollection = document.querySelectorAll('#analysisTableBody tr');
        rowsCollection.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 6) {
                rows.push([
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim(),
                    cells[2].textContent.trim(),
                    cells[3].textContent.trim(),
                    cells[4].textContent.trim(),
                    cells[5].textContent.trim().replace('%', '')
                ]);
            }
        });
    } else {
        Toast.warning('Tidak ada data tabel yang dapat diexport di halaman ini');
        return;
    }

    if (rows.length === 0) {
        Toast.warning('Data tabel kosong, tidak ada yang dapat diexport');
        return;
    }

    Toast.info('Mempersiapkan data unduhan...');

    setTimeout(() => {
        let csvContent = '\uFEFF'; // UTF-8 BOM
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Toast.success(`Berhasil mengunduh: ${filename}`);
    }, 800);
}

function initExportButtons() {
    $$('.btn-icon-outline').forEach(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return;

        if (icon.classList.contains('fa-file-export') || icon.classList.contains('fa-download')) {
            // Unbind any previous listeners by replacing button to clone (if necessary) or just add event listener
            // (since standard binding is once during initApp)
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                exportCurrentPageData();
            });
        }

        if (icon.classList.contains('fa-print')) {
            btn.addEventListener('click', function () {
                Toast.info('Membuka dialog cetak...');
                setTimeout(() => window.print(), 500);
            });
        }

        if (icon.classList.contains('fa-filter')) {
            btn.addEventListener('click', function () {
                const searchInput = this.closest('.header-actions')?.querySelector('.search-input');
                if (searchInput) searchInput.focus();
            });
        }
    });
}

// ================= STAT CARD HOVER EFFECT =================
function initStatCardEffects() {
    $$('.stat-card').forEach(card => {
        card.addEventListener('mouseenter', function () {
            const icon = this.querySelector('.card-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(-5deg)';
                icon.style.transition = 'transform 0.2s ease';
            }
        });

        card.addEventListener('mouseleave', function () {
            const icon = this.querySelector('.card-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
}

// ================= ACTIVITY ITEM CLICK =================
function initActivityClick() {
    $$('.activity-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', function () {
            const name = this.querySelector('strong')?.textContent || '';
            const desc = this.querySelector('p')?.textContent || '';
            const time = this.querySelector('.item-time')?.textContent || '';

            showModal('Detail Aktivitas', `
                <div style="font-size:13px;color:#374151;">
                    <div style="margin-bottom:10px;"><strong style="color:#6366F1;">Pelaku:</strong> ${name}</div>
                    <div style="margin-bottom:10px;"><strong style="color:#6366F1;">Aktivitas:</strong> ${desc}</div>
                    <div><strong style="color:#6366F1;">Waktu:</strong> ${time}</div>
                </div>
            `);
        });
    });
}

// ================= TAG STATUS CLICK INFO =================
function initTagClickInfo() {
    $$('.tag-success, .tag-warning').forEach(tag => {
        tag.style.cursor = 'default';
    });
}

// ================= LOG KONSOL =================
function logSystemInfo() {
    console.log(
        `%c🌾 ${APP_CONFIG.appName} v${APP_CONFIG.version}`,
        'font-size:16px;font-weight:bold;color:#6366F1;'
    );
    console.log(
        '%cDibuat oleh Tim Faesa Technology',
        'font-size:11px;color:#6B7280;'
    );
    console.log(
        '%cTekan [ untuk toggle sidebar | Ctrl+K untuk pencarian',
        'font-size:10px;color:#9CA3AF;'
    );
}

// ================= WARNING JIKA DUPLIKAT CANVAS ID =================
function checkDuplicateCanvasIds() {
    const canvasIds = ['kesehatanChart', 'analysisChart'];
    canvasIds.forEach(id => {
        const elements = $$(`#${id}`);
        if (elements.length > 1) {
            console.warn(`⚠️ Canvas #${id} ditemukan ${elements.length}x. Pastikan hanya ada satu per halaman.`);
        }
    });
}

// ================= PROFIL & KONFIGURASI =================
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 21 12 21z'/%3E%3C/svg%3E";

// ================= PROFIL & KONFIGURASI =================
const ProfilDanKonfigurasi = {
    profilKey: 'fayseri_profil',
    konfigKey: 'fayseri_konfig',
    profil: {
        nama: '',
        namaPanggilan: '',
        email: '',
        telp: '',
        alamat: '',
        jabatan: '',
        foto: '',
        notifEmail: true,
        notifStok: true,
        notifPenyakit: true,
        pengalaman: '',
        keahlian: '',
        sertifikasi: ''
    },
    konfig: {
        namaLahan: 'Kebun Cabai Fayseri',
        lokasiLahan: 'Malang, Jawa Timur',
        zonaWaktu: 'WIB (UTC+7)',
        satuanSuhu: 'Celsius (°C)'
    },
    load() {
        const savedProfil = Storage.get(this.profilKey);
        if (savedProfil) this.profil = { ...this.profil, ...savedProfil };
        const savedKonfig = Storage.get(this.konfigKey);
        if (savedKonfig) this.konfig = { ...this.konfig, ...savedKonfig };
    },
    saveProfil() {
        Storage.set(this.profilKey, this.profil);
        this.apply();
        showInlineMessage('profileMessage', 'Profil berhasil diperbarui', 'success');
    },
    saveKonfig() {
        Storage.set(this.konfigKey, this.konfig);
        this.apply();
        showInlineMessage('konfigMessage', 'Konfigurasi sistem disimpan', 'success');
    },
    apply() {
        // Update UI with Profil & Konfig data
        const navProfileSpan = $('.user-profile-mini span');
        if (navProfileSpan) {
            navProfileSpan.textContent = this.profil.namaPanggilan || (this.profil.nama ? this.profil.nama.split(' ')[0] : 'Admin');
        }

        const navProfilePhoto = $('#navProfilePhoto');
        if (navProfilePhoto) {
            navProfilePhoto.src = this.profil.foto || DEFAULT_AVATAR;
        }

        const profilePhotoPreview = $('#profilePhotoPreview');
        if (profilePhotoPreview) {
            profilePhotoPreview.src = this.profil.foto || DEFAULT_AVATAR;
        }

        const subtitleEl = $('.subtitle-temp');
        if (subtitleEl) {
            subtitleEl.textContent = this.profil.nama || 'Administrator';
        }

        const welcomeTitle = $('.welcome-title');
        if (welcomeTitle) {
            const displayName = this.profil.namaPanggilan || (this.profil.nama ? this.profil.nama.split(' ')[0] : '');
            welcomeTitle.textContent = displayName ? `Selamat Datang Kembali, ${displayName}!` : 'Selamat Datang Kembali!';
        }

        // Header Card inside profilePage
        const headerName = $('#profileHeaderName');
        if (headerName) headerName.textContent = this.profil.nama || 'Admin Fayseri';
        
        const headerJabatan = $('#profileHeaderJabatan');
        if (headerJabatan) headerJabatan.textContent = this.profil.jabatan || 'Administrator';

        const headerEmail = $('#profileHeaderEmail');
        if (headerEmail) headerEmail.innerHTML = `<i class="fa-solid fa-envelope" style="opacity: 0.8;"></i>${this.profil.email || '-'}`;

        const headerTelp = $('#profileHeaderTelp');
        if (headerTelp) headerTelp.innerHTML = `<i class="fa-solid fa-phone" style="opacity: 0.8;"></i>${this.profil.telp || '-'}`;

        const sidebarLogoSpan = $('.sidebar-logo span');
        if (sidebarLogoSpan) sidebarLogoSpan.textContent = this.konfig.namaLahan;

        // Fill inputs on Profil Page
        const pNama = $('#profileNama');
        if (pNama) {
            pNama.value = this.profil.nama;
            const pPanggilan = $('#profilePanggilan');
            if (pPanggilan) pPanggilan.value = this.profil.namaPanggilan || '';
            $('#profileEmail').value = this.profil.email;
            $('#profileTelp').value = this.profil.telp;
            $('#profileAlamat').value = this.profil.alamat;
            $('#profileJabatan').value = this.profil.jabatan;

            // Portfolio & experience inputs
            const pPengalaman = $('#profilePengalaman');
            if (pPengalaman) pPengalaman.value = this.profil.pengalaman || '';
            const pKeahlian = $('#profileKeahlian');
            if (pKeahlian) pKeahlian.value = this.profil.keahlian || '';
            const pSertifikasi = $('#profileSertifikasi');
            if (pSertifikasi) pSertifikasi.value = this.profil.sertifikasi || '';

            $('#notifEmail').checked = this.profil.notifEmail;
            $('#notifStok').checked = this.profil.notifStok;
            $('#notifPenyakit').checked = this.profil.notifPenyakit;
        }

        // Fill inputs on Konfigurasi Page
        const cNama = $('#configNamaLahan');
        if (cNama) {
            cNama.value = this.konfig.namaLahan;
            $('#configLokasiLahan').value = this.konfig.lokasiLahan;
            
            const configZW = $('#configZonaWaktu');
            if (configZW) {
                configZW.value = this.konfig.zonaWaktu;
                configZW.setAttribute('data-prev-value', this.konfig.zonaWaktu);
            }
            
            const configSS = $('#configSatuanSuhu');
            if (configSS) {
                configSS.value = this.konfig.satuanSuhu;
                configSS.setAttribute('data-prev-value', this.konfig.satuanSuhu);
            }

            const configTema = $('#configTemaAplikasi');
            if (configTema) {
                const curTheme = Storage.get(APP_CONFIG.storageKeys.theme) || 'faesa';
                configTema.value = curTheme;
                configTema.setAttribute('data-prev-value', curTheme);
            }
        }
        
        // Instantly update Clock, Environmental widgets and Salud Chart on timezone/unit change
        if (typeof updateTopbarClock === 'function') {
            updateTopbarClock();
        }
        if (typeof updateEnvData === 'function') {
            updateEnvData();
        }
        if (typeof initKesehatanChart === 'function') {
            initKesehatanChart();
        }
    },
    setEditMode(isEditing) {
        const inputsToToggle = [
            '#profilePhotoInput',
            '#profileNama',
            '#profilePanggilan',
            '#profileEmail',
            '#profileTelp',
            '#profileAlamat',
            '#profileJabatan',
            '#profilePengalaman',
            '#profileKeahlian',
            '#profileSertifikasi',
            '#profilePassLama',
            '#profilePassBaru',
            '#profilePassKonf',
            '#notifEmail',
            '#notifStok',
            '#notifPenyakit'
        ];

        inputsToToggle.forEach(selector => {
            const el = $(selector);
            if (el) el.disabled = !isEditing;
        });

        const photoLabel = $('#profilePhotoInputLabel');
        if (photoLabel) {
            photoLabel.style.display = isEditing ? 'flex' : 'none';
        }

        const btnEdit = $('#btnEditProfil');
        const btnBatal = $('#btnBatalEditProfil');
        const btnSimpan = $('#btnSimpanProfil');

        if (btnEdit) btnEdit.style.display = isEditing ? 'none' : 'inline-flex';
        if (btnBatal) btnBatal.style.display = isEditing ? 'inline-flex' : 'none';
        if (btnSimpan) btnSimpan.style.display = isEditing ? 'inline-flex' : 'none';
    },
    resetEditMode() {
        this.setEditMode(false);
    },
    init() {
        this.load();
        this.apply();
        this.setEditMode(false); // Make sure it starts in read-only mode

        // Bind Edit Profile Button
        const btnEditProfil = $('#btnEditProfil');
        if (btnEditProfil) {
            btnEditProfil.addEventListener('click', (e) => {
                e.preventDefault();
                this.setEditMode(true);
            });
        }

        // Bind Batal Profile Button
        const btnBatalEditProfil = $('#btnBatalEditProfil');
        if (btnBatalEditProfil) {
            btnBatalEditProfil.addEventListener('click', (e) => {
                e.preventDefault();
                this.apply(); // Re-apply original values
                this.setEditMode(false);
                // Clear password fields
                const passLama = $('#profilePassLama');
                if (passLama) passLama.value = '';
                const passBaru = $('#profilePassBaru');
                if (passBaru) passBaru.value = '';
                const passKonf = $('#profilePassKonf');
                if (passKonf) passKonf.value = '';
            });
        }

        // Bind profile photo input change
        const profilePhotoInput = $('#profilePhotoInput');
        if (profilePhotoInput) {
            profilePhotoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                Toast.info('Mengompresi dan memproses foto profil...');

                compressImage(file, 250, 250, 0.85, (compressedBase64) => {
                    this.profil.foto = compressedBase64;
                    const preview = $('#profilePhotoPreview');
                    if (preview) preview.src = compressedBase64;
                    // Simpan foto profil secara instan agar tidak hilang saat reload halaman/backgrounding di HP
                    this.saveProfil();
                });
            });
        }

        // Bind Save Profil
        const btnSaveProfil = $('#btnSimpanProfil');
        if (btnSaveProfil) {
            btnSaveProfil.addEventListener('click', (e) => {
                e.preventDefault();
                
                const passBaru = $('#profilePassBaru')?.value || '';
                const passKonf = $('#profilePassKonf')?.value || '';

                if (passBaru) {
                    if (passBaru.length < 6) {
                        showInlineMessage('profileMessage', 'Password baru minimal 6 karakter!', 'error');
                        return;
                    }
                    if (passBaru !== passKonf) {
                        showInlineMessage('profileMessage', 'Konfirmasi password tidak cocok!', 'error');
                        return;
                    }
                }

                CustomConfirm.show('Apakah Anda yakin ingin menyimpan perubahan profil Anda?', async () => {
                    this.profil.nama = $('#profileNama').value.trim();
                    this.profil.namaPanggilan = $('#profilePanggilan')?.value.trim() || '';
                    this.profil.email = $('#profileEmail').value.trim();
                    this.profil.telp = $('#profileTelp').value.trim();
                    this.profil.alamat = $('#profileAlamat').value.trim();
                    this.profil.jabatan = $('#profileJabatan').value.trim();
                    
                    // Portfolio & experience inputs
                    this.profil.pengalaman = $('#profilePengalaman').value.trim();
                    this.profil.keahlian = $('#profileKeahlian').value.trim();
                    this.profil.sertifikasi = $('#profileSertifikasi').value.trim();

                    this.profil.notifEmail = $('#notifEmail').checked;
                    this.profil.notifStok = $('#notifStok').checked;
                    this.profil.notifPenyakit = $('#notifPenyakit').checked;
                    
                    if (passBaru) {
                        const { error } = await supabaseClient.auth.updateUser({ password: passBaru });
                        if (error) {
                            showInlineMessage('profileMessage', 'Gagal memperbarui password: ' + error.message, 'error');
                            return;
                        } else {
                            showInlineMessage('profileMessage', 'Password berhasil diperbarui', 'success');
                            const passL = $('#profilePassLama'); if (passL) passL.value = '';
                            const passB = $('#profilePassBaru'); if (passB) passB.value = '';
                            const passK = $('#profilePassKonf'); if (passK) passK.value = '';
                        }
                    }

                    this.saveProfil();
                    this.setEditMode(false);
                }, 'Oke', 'Batal', 'info');
            });
        }

        // Bind Save Konfig
        const btnSaveKonfig = $('#btnSimpanKonfig');
        if (btnSaveKonfig) {
            btnSaveKonfig.addEventListener('click', (e) => {
                e.preventDefault();
                CustomConfirm.show('Apakah Anda yakin ingin menyimpan perubahan konfigurasi sistem?', () => {
                    this.konfig.namaLahan = $('#configNamaLahan').value.trim();
                    this.konfig.lokasiLahan = $('#configLokasiLahan').value.trim();
                    this.konfig.zonaWaktu = $('#configZonaWaktu').value;
                    this.konfig.satuanSuhu = $('#configSatuanSuhu').value;
                    
                    const newTheme = $('#configTemaAplikasi')?.value || 'faesa';
                    applyTheme(newTheme);

                    this.saveKonfig();
                }, 'Oke', 'Batal', 'info');
            });
        }

        // Helper to bind select with CustomConfirm
        const bindSelectConfirm = (selector, name, onConfirmAction) => {
            const selectEl = $(selector);
            if (!selectEl) return;

            selectEl.setAttribute('data-prev-value', selectEl.value);

            selectEl.addEventListener('change', function(e) {
                const prevValue = this.getAttribute('data-prev-value');
                const newValue = this.value;

                CustomConfirm.show(`Apakah Anda yakin ingin mengganti ${name} menjadi "${newValue}"?`, () => {
                    this.value = newValue;
                    this.setAttribute('data-prev-value', newValue);
                    onConfirmAction(newValue);
                }, 'Oke', 'Batal', 'info');

                this.value = prevValue;
            });
        };

        bindSelectConfirm('#configZonaWaktu', 'Zona Waktu', (val) => {
            this.konfig.zonaWaktu = val;
            this.saveKonfig();
        });

        bindSelectConfirm('#configSatuanSuhu', 'Satuan Suhu', (val) => {
            this.konfig.satuanSuhu = val;
            this.saveKonfig();
        });

        bindSelectConfirm('#configTemaAplikasi', 'Tema Aplikasi', (val) => {
            applyTheme(val);
            this.saveKonfig();
        });

        // Bind Reset Konfig
        const btnResetKonfig = $('#btnResetKonfig');
        if (btnResetKonfig) {
            btnResetKonfig.addEventListener('click', (e) => {
                e.preventDefault();
                CustomConfirm.show('Apakah Anda yakin ingin menyetel ulang konfigurasi ke nilai default?', () => {
                    this.konfig = {
                        namaLahan: 'Kebun Cabai Faesa',
                        lokasiLahan: 'Malang, Jawa Timur',
                        zonaWaktu: 'WIB (UTC+7)',
                        satuanSuhu: 'Celsius (°C)'
                    };
                    applyTheme('faesa');
                    this.saveKonfig();
                }, 'Oke', 'Batal', 'info');
            });
        }
    }
};

// ================= BLOK TANAMAN (DASHBOARD) =================
const DashboardBlok = {
    data: [],
    storageKey: 'fayseri_dashboard_bloks',
    load() {
        this.data = [];
    },
    save() {},
    render() {},
    bindEvents() {},
    openAddForm() {},
    openEditForm() {},
    closeModal() {},
    saveFromForm() {},
    deleteBlok() {},
    init() {}
};

// ================= ANALISIS TANAMAN (PEMINDAIAN & FILTER GRAFIK) =================
const AnalisisTanaman = {
    data: [],
    storageKey: 'fayseri_analisis_tanaman',
    intervals: ['Harian', 'Mingguan', 'Bulanan'],
    activeInterval: 'Mingguan',
    chartData: {
        'Harian': {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            tinggi: [30, 31, 32, 33, 34, 35, 36],
            daun: [18, 19, 20, 20, 21, 22, 24]
        },
        'Mingguan': {
            labels: ['Mg 1', 'Mg 2', 'Mg 3', 'Mg 4', 'Mg 5', 'Mg 6', 'Mg 7'],
            tinggi: [5, 10, 16, 22, 28, 32, 35],
            daun: [4, 8, 12, 15, 18, 21, 24]
        },
        'Bulanan': {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'],
            tinggi: [10, 25, 45, 60, 75, 88, 95],
            daun: [6, 14, 25, 38, 52, 68, 80]
        }
    },

    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved)) {
            this.data = saved;
        } else {
            this.data = [
                { id: 'AN-001', name: 'Cabai Rawit Merah', tinggi: 35, daun: 20, warna: 'Hijau Segar', gejala: 'Tidak ada', skor: 95 },
                { id: 'AN-002', name: 'Cabai Keriting', tinggi: 32, daun: 18, warna: 'Kuning Muda', gejala: 'Bercak kecil', skor: 82 },
                { id: 'AN-003', name: 'Cabai Besar', tinggi: 35, daun: 20, warna: 'Hijau Segar', gejala: 'Tidak ada', skor: 95 }
            ];
            this.save();
        }
    },

    save() {
        Storage.set(this.storageKey, this.data);
    },

    renderTable() {
        const tbody = $('#analysisTableBody');
        if (!tbody) return;

        if (this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:24px;">Belum ada data analisis. Silakan klik "Tambah Data Analisis".</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.map(v => {
            let tagClass = 'tag-success';
            if (v.warna.includes('Kuning')) {
                tagClass = 'tag-warning';
            }
            return `
                <tr>
                    <td><strong>${v.name}</strong></td>
                    <td>${v.tinggi}</td>
                    <td>${v.daun}</td>
                    <td><span class="${tagClass}">${v.warna}</span></td>
                    <td>${v.gejala}</td>
                    <td><strong>${v.skor}%</strong></td>
                    <td>
                        <div style="display:flex;gap:4px;">
                            <button class="wl-act edit btn-edit-analisis" data-id="${v.id}"><i class="fa-solid fa-pen"></i></button>
                            <button class="wl-act del btn-del-analisis" data-id="${v.id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.bindEvents();
        initTagClickInfo();
    },

    bindEvents() {
        $$('.btn-edit-analisis').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.id);
            });
        });
        $$('.btn-del-analisis').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAnalisis(btn.dataset.id);
            });
        });
    },

    updateStats() {
        const stats = $$('#analysisPage .stat-card .card-value');
        if (!stats || stats.length < 4) return;

        let avgSkor = 0;
        let avgHeight = 0;
        let statusPenyakit = 'Optimal';
        let statusNutrisi = 'Optimal';

        if (this.data.length > 0) {
            const totalSkor = this.data.reduce((sum, item) => sum + (item.skor || 0), 0);
            avgSkor = Math.round(totalSkor / this.data.length);

            const totalHeight = this.data.reduce((sum, item) => sum + (item.tinggi || 0), 0);
            avgHeight = Math.round(totalHeight / this.data.length);

            const hasWaspada = this.data.some(item => item.skor < 85 && item.skor >= 70);
            const hasSakit = this.data.some(item => item.skor < 70);
            if (hasSakit) {
                statusPenyakit = 'Bahaya';
            } else if (hasWaspada) {
                statusPenyakit = 'Waspada';
            } else {
                statusPenyakit = 'Optimal';
            }

            statusNutrisi = avgSkor >= 90 ? 'Baik' : 'Perhatian';
        }

        if (stats[0]) stats[0].textContent = this.data.length > 0 ? avgSkor + '%' : '—%';
        if (stats[1]) stats[1].textContent = this.data.length > 0 ? avgHeight + ' cm' : '— cm';
        
        if (stats[2]) {
            stats[2].textContent = this.data.length > 0 ? statusPenyakit : '—';
            const trendEl = stats[2].nextElementSibling;
            if (trendEl) {
                if (this.data.length === 0) {
                    trendEl.className = 'card-trend neutral';
                    trendEl.innerHTML = '<i class="fa-solid fa-circle-minus"></i> Belum ada data';
                } else if (statusPenyakit === 'Bahaya') {
                    trendEl.className = 'card-trend down';
                    trendEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Segera Semprot';
                } else if (statusPenyakit === 'Waspada') {
                    trendEl.className = 'card-trend down';
                    trendEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Pantau Bercak Daun';
                } else {
                    trendEl.className = 'card-trend up';
                    trendEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Semua Blok Sehat';
                }
            }
        }
        if (stats[3]) stats[3].textContent = this.data.length > 0 ? statusNutrisi : '—';
    },

    openAddForm() {
        $('#editAnalisisKey').value = '';
        $('#analisisVarietas').value = '';
        $('#analisisTinggi').value = '';
        $('#analisisDaun').value = '';
        $('#analisisWarna').value = 'Hijau Segar';
        $('#analisisGejala').value = '';
        $('#analisisSkor').value = '';

        $('#modalAnalisisTitle').textContent = 'Tambah Data Analisis';
        $('#modalAnalisis').classList.add('show');
    },

    openEditForm(id) {
        const item = this.data.find(x => x.id === id);
        if (!item) return;

        $('#editAnalisisKey').value = item.id;
        $('#analisisVarietas').value = item.name;
        $('#analisisTinggi').value = item.tinggi;
        $('#analisisDaun').value = item.daun;
        $('#analisisWarna').value = item.warna;
        $('#analisisGejala').value = item.gejala;
        $('#analisisSkor').value = item.skor;

        $('#modalAnalisisTitle').textContent = 'Edit Data Analisis';
        $('#modalAnalisis').classList.add('show');
    },

    closeModal() {
        $('#modalAnalisis').classList.remove('show');
    },

    saveFromForm() {
        const name = $('#analisisVarietas').value.trim();
        const tinggi = parseInt($('#analisisTinggi').value);
        const daun = parseInt($('#analisisDaun').value);
        const warna = $('#analisisWarna').value;
        const gejala = $('#analisisGejala').value.trim() || 'Tidak ada';
        const skor = parseInt($('#analisisSkor').value);
        const editId = $('#editAnalisisKey').value;

        if (!name || isNaN(tinggi) || isNaN(daun) || isNaN(skor)) {
            showInlineMessage('analysisMessage', 'Harap lengkapi seluruh kolom wajib!', 'error');
            return;
        }

        if (editId) {
            const idx = this.data.findIndex(x => x.id === editId);
            if (idx !== -1) {
                this.data[idx] = { id: editId, name, tinggi, daun, warna, gejala, skor };
                showInlineMessage('analysisMessage', 'Data analisis diperbarui', 'success');
                logUserAction(`Memperbarui data analisis ${name}`);
            }
        } else {
            const id = 'AN-' + Date.now().toString(36).toUpperCase();
            this.data.push({ id, name, tinggi, daun, warna, gejala, skor });
            showInlineMessage('analysisMessage', 'Data analisis baru ditambahkan', 'success');
            logUserAction(`Menambahkan data analisis baru ${name}`);
        }

        this.save();
        this.renderTable();
        this.updateStats();
        this.closeModal();

        if (typeof GridCardManager !== 'undefined') {
            GridCardManager.apply();
        }
    },

    deleteAnalisis(id) {
        CustomConfirm.show('Apakah Anda yakin ingin menghapus data analisis blok ini?', () => {
            const item = this.data.find(x => x.id === id);
            const name = item ? item.name : id;
            this.data = this.data.filter(x => x.id !== id);
            this.save();
            this.renderTable();
            this.updateStats();
            showInlineMessage('analysisMessage', 'Data analisis berhasil dihapus', 'success');
            logUserAction(`Menghapus data analisis ${name}`);

            if (typeof GridCardManager !== 'undefined') {
                GridCardManager.apply();
            }
        });
    },

    init() {
        this.load();
        this.renderTable();
        this.updateStats();

        $('#btnTambahAnalisis')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddForm();
        });

        $('#btnRefreshAnalisis')?.addEventListener('click', () => {
            this.load();
            this.renderTable();
            this.updateStats();
            Toast.success('Data analisis disinkronkan');
        });

        $('#closeModalAnalisis')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalAnalisis')?.addEventListener('click', () => this.closeModal());
        $('#simpanAnalisis')?.addEventListener('click', () => this.saveFromForm());
        $('#modalAnalisis')?.addEventListener('click', (e) => {
            if (e.target === $('#modalAnalisis')) this.closeModal();
        });

        // Scan sensor button
        const btnScan = $('#btnScanSensor');
        if (btnScan) {
            btnScan.addEventListener('click', (e) => {
                e.preventDefault();
                const original = btnScan.innerHTML;
                btnScan.disabled = true;
                btnScan.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memindai Sensor...';
                
                // Langkah 1: Hubungkan ke IoT Gateway
                showInlineMessage('analysisMessage', '🔌 Menghubungkan ke IoT Gateway Node #09 (Greenhouse Kebon 9, Jambi)...', 'success');

                setTimeout(() => {
                    btnScan.innerHTML = '<i class="fa-solid fa-satellite-dish fa-fade"></i> Membaca Sensor...';
                    
                    // Baca data sensor riil saat ini
                    const suhu = AppState.envData.suhu || 32;
                    const lembab = AppState.envData.lembab || 68;
                    
                    showInlineMessage('analysisMessage', `📡 Sensor Terbaca: Suhu Lingkungan = ${suhu}°C, Kelembaban Udara = ${lembab}%`, 'success');

                    setTimeout(() => {
                        btnScan.innerHTML = '<i class="fa-solid fa-calculator"></i> Menganalisis...';
                        
                        // Re-evaluasi kesehatan berdasarkan kondisi fisik cuaca nyata
                        let statusAnalisis = 'Optimal';
                        let deltaSkor = 0;
                        let agronomicReport = '';

                        if (lembab > 75) {
                            statusAnalisis = 'Sangat Lembab (Rawan Jamur Antraknosa)';
                            deltaSkor = -5;
                            agronomicReport = '⚠️ Kelembaban tinggi (>75%) memicu spora jamur Colletotrichum (Antraknosa).';
                        } else if (suhu > 34) {
                            statusAnalisis = 'Suhu Ekstrem (Stres Panas)';
                            deltaSkor = -4;
                            agronomicReport = '🔥 Suhu ekstrem (>34°C) memicu penguapan tinggi dan stres panas pada stomata daun.';
                        } else if (suhu < 24) {
                            statusAnalisis = 'Suhu Rendah';
                            deltaSkor = -2;
                            agronomicReport = '❄️ Suhu rendah (<24°C) memperlambat fotosintesis dan pertumbuhan vegetative.';
                        } else {
                            statusAnalisis = 'Kondisi Lingkungan Optimal';
                            deltaSkor = 2;
                            agronomicReport = '🌿 Suhu dan kelembaban dalam rentang ideal untuk pertumbuhan tanaman cabai.';
                        }

                        showInlineMessage('analysisMessage', `🧮 Analisis Agronomis: ${agronomicReport} Menghitung dampak kesehatan tiap blok...`, 'success');

                        setTimeout(() => {
                            btnScan.disabled = false;
                            btnScan.innerHTML = original;

                            // Update skor & gejala secara dinamis pada data riil
                            this.data = this.data.map(item => {
                                let newSkor = Math.min(100, Math.max(50, item.skor + deltaSkor));
                                let newWarna = item.warna;
                                let newGejala = item.gejala;

                                if (newSkor < 85) {
                                    newWarna = 'Kuning Muda';
                                    if (lembab > 75) {
                                        newGejala = 'Bercak antraknosa ringan';
                                    } else {
                                        newGejala = 'Daun layu kekeringan';
                                    }
                                } else {
                                    newWarna = 'Hijau Segar';
                                    newGejala = 'Tidak ada';
                                }

                                return {
                                    ...item,
                                    skor: newSkor,
                                    warna: newWarna,
                                    gejala: newGejala
                                };
                            });

                            this.save();
                            this.renderTable();
                            this.updateStats();

                            if (typeof GridCardManager !== 'undefined') {
                                GridCardManager.apply();
                            }

                            const finalMsg = `✅ Scan IoT Selesai! Suhu: ${suhu}°C | Lembab: ${lembab}%. Diagnosis: ${statusAnalisis}. Skor kesehatan varietas telah disesuaikan dengan kondisi riil cuaca.`;
                            showInlineMessage('analysisMessage', finalMsg, deltaSkor >= 0 ? 'success' : 'error');
                            logUserAction(`Scan IoT berhasil. Deteksi: ${statusAnalisis} (Suhu: ${suhu}°C, Lembab: ${lembab}%)`);
                        }, 1200);
                    }, 1200);
                }, 1200);
            });
        }

        // Chart Filter button
        const btnFilter = $('#analysisPage .box-header .btn-text');
        if (btnFilter) {
            btnFilter.addEventListener('click', (e) => {
                e.preventDefault();
                const currentIdx = this.intervals.indexOf(this.activeInterval);
                const nextIdx = (currentIdx + 1) % this.intervals.length;
                this.activeInterval = this.intervals[nextIdx];

                btnFilter.innerHTML = `${this.activeInterval} <i class="fa-solid fa-chevron-down"></i>`;
                Toast.info(`Menampilkan data analisis: ${this.activeInterval}`);

                if (AppState.charts.analysis) {
                    const data = this.chartData[this.activeInterval];
                    AppState.charts.analysis.data.labels = data.labels;
                    AppState.charts.analysis.data.datasets[0].data = data.tinggi;
                    AppState.charts.analysis.data.datasets[1].data = data.daun;
                    AppState.charts.analysis.update();
                }
            });
        }
    }
};

// ================= DAFTAR TANAMAN (CRUD) =================
const DaftarTanaman = {
    storageKey: 'fayseri_tanaman',
    data: [],

    normalizeData(items) {
        const map = new Map();

        items.forEach((item) => {
            if (!item || typeof item !== 'object') return;

            const varietas = (item.varietas || item.nama || '').trim();
            if (!varietas) return;

            const key = varietas.toLowerCase();
            const jumlah = Number(item.jumlah) || 0;
            const current = map.get(key);

            const safeItem = {
                varietas,
                jumlah: current ? current.jumlah + jumlah : jumlah,
                tanggal: item.tanggal || current?.tanggal || formatDate(new Date()),
                umur: item.umur || current?.umur || '1 Hari',
                fase: item.fase || current?.fase || 'Awal Vegetatif',
                status: item.status || current?.status || 'Sehat',
                foto: item.foto || current?.foto || ''
            };

            if (current) {
                if (safeItem.status === 'Sakit') {
                    safeItem.status = 'Sakit';
                } else if (current.status === 'Sakit') {
                    safeItem.status = 'Sakit';
                }
            }

            map.set(key, safeItem);
        });

        return Array.from(map.values());
    },

    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.data = this.normalizeData(saved);
            this.save();
        } else {
            this.data = [];
            this.save();
        }
    },

    save() {
        Storage.set(this.storageKey, this.data);
    },

    getTotalJumlah() {
        return this.data.reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
    },

    updateStats() {
        const totalEl = $('#tanamanTotalVal');
        const blokEl = $('#tanamanBlokVal');
        const varietasEl = $('#tanamanVarietasVal');
        const perhatianEl = $('#tanamanPerhatianVal');

        if (totalEl) {
            totalEl.textContent = this.getTotalJumlah().toLocaleString('id-ID');
            if (blokEl) blokEl.textContent = 'Greenhouse 1';
            const vars = new Set(this.data.map(x => x.varietas));
            varietasEl.textContent = vars.size;
            const perhatian = this.data.filter(x => x.status === 'Waspada' || x.status === 'Sakit').length;
            perhatianEl.textContent = perhatian;
        }
    },

    getStatusClass(status) {
        return status === 'Sehat' ? 'tag-success' : 'tag-warning';
    },

    getPhaseClass(fase) {
        return ['Vegetatif', 'Generatif', 'Awal Vegetatif'].includes(fase) ? 'tag-success' : 'tag-warning';
    },

    tempFoto: '',

    renderGrid() {
        const grid = $('#tanamanGrid');
        if (!grid) return;

        if (this.data.length === 0) {
            grid.innerHTML = '<div class="tanaman-grid-empty">Belum ada tanaman tersimpan. Tambahkan varietas baru untuk melihat grid otomatis.</div>';
            return;
        }

        grid.innerHTML = this.data.map((t) => {
            const hasFoto = t.foto && t.foto.startsWith('data:image/');
            const imageStyle = hasFoto 
                ? `background-image: url('${t.foto}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(135deg, var(--primary-light), rgba(5, 150, 105, 0.15)); display: flex; align-items: center; justify-content: center;`;
                
            const imageHeader = `<div class="tanaman-grid-image" style="height: 120px; border-radius: 8px; margin-bottom: 12px; overflow: hidden; ${imageStyle}">
                ${!hasFoto ? `<i class="fa-solid fa-seedling" style="font-size: 36px; color: var(--primary);"></i>` : ''}
            </div>`;

            return `
            <div class="tanaman-grid-card">
                ${imageHeader}
                <p class="tanaman-grid-qty">${t.jumlah.toLocaleString('id-ID')} tanaman</p>
                <h4>${t.varietas}</h4>
                <div class="tanaman-grid-meta">
                    <span><strong>Tanggal:</strong> ${t.tanggal}</span>
                    <span><strong>Umur:</strong> ${t.umur}</span>
                    <span><strong>Fase:</strong> <span class="${this.getPhaseClass(t.fase)}">${t.fase}</span></span>
                    <span><strong>Status:</strong> <span class="${this.getStatusClass(t.status)}">${t.status}</span></span>
                </div>
                <div class="tanaman-grid-actions">
                    <button class="wl-act edit btn-edit-tanaman" data-varietas="${t.varietas}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="wl-act del btn-del-tanaman" data-varietas="${t.varietas}"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </div>
            `;
        }).join('');
    },

    render() {
        const tbody = $('#daftarTanamanTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.map((t) => {
            const hasFoto = t.foto && t.foto.startsWith('data:image/');
            const photoThumbnail = hasFoto
                ? `<div style="width: 32px; height: 32px; border-radius: 6px; overflow: hidden; background-image: url('${t.foto}'); background-size: cover; background-position: center; flex-shrink: 0;"></div>`
                : `<div style="width: 32px; height: 32px; border-radius: 6px; overflow: hidden; background: var(--primary-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-seedling" style="color: var(--primary); font-size: 13px;"></i></div>`;

            return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${photoThumbnail}
                        <strong>${t.varietas}</strong>
                    </div>
                </td>
                <td>${t.jumlah.toLocaleString('id-ID')}</td>
                <td>${t.tanggal}</td>
                <td>${t.umur}</td>
                <td><span class="${this.getPhaseClass(t.fase)}">${t.fase}</span></td>
                <td><span class="${this.getStatusClass(t.status)}">${t.status}</span></td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="wl-act edit btn-edit-tanaman" data-varietas="${t.varietas}"><i class="fa-solid fa-pen"></i></button>
                        <button class="wl-act del btn-del-tanaman" data-varietas="${t.varietas}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        this.renderGrid();
        this.bindEvents();
        this.updateStats();
        initTagClickInfo();
    },

    bindEvents() {
        $$('.btn-edit-tanaman').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.varietas);
            });
        });
        $$('.btn-del-tanaman').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTanaman(btn.dataset.varietas);
            });
        });
    },

    openAddForm() {
        $('#editTanamanKey').value = '';
        $('#tanamanVarietas').value = '';
        $('#tanamanJumlah').value = '1';
        $('#tanamanTanggal').value = formatDate(new Date());
        $('#tanamanUmur').value = '1 Hari';
        $('#tanamanFase').value = 'Awal Vegetatif';
        $('#tanamanStatus').value = 'Sehat';
        
        this.tempFoto = '';
        const preview = $('#tanamanFotoPreview');
        const placeholder = $('#tanamanFotoPlaceholder');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        const fileInput = $('#tanamanFotoInput');
        if (fileInput) fileInput.value = '';

        $('#modalTanamanTitle').textContent = 'Tambah Tanaman';
        $('#modalTanaman').classList.add('show');
    },

    openEditForm(varietas) {
        const t = this.data.find((x) => x.varietas.toLowerCase() === varietas.toLowerCase());
        if (!t) return;

        $('#editTanamanKey').value = t.varietas;
        $('#tanamanVarietas').value = t.varietas;
        $('#tanamanJumlah').value = t.jumlah;
        $('#tanamanTanggal').value = t.tanggal;
        $('#tanamanUmur').value = t.umur;
        $('#tanamanFase').value = t.fase;
        $('#tanamanStatus').value = t.status;
        
        this.tempFoto = t.foto || '';
        const preview = $('#tanamanFotoPreview');
        const placeholder = $('#tanamanFotoPlaceholder');
        if (this.tempFoto) {
            if (preview) {
                preview.src = this.tempFoto;
                preview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        } else {
            if (preview) {
                preview.src = '';
                preview.style.display = 'none';
            }
            if (placeholder) {
                placeholder.style.display = 'flex';
            }
        }
        const fileInput = $('#tanamanFotoInput');
        if (fileInput) fileInput.value = '';

        $('#modalTanamanTitle').textContent = 'Edit Tanaman';
        $('#modalTanaman').classList.add('show');
    },

    closeModal() {
        $('#modalTanaman').classList.remove('show');
    },

    saveFromForm() {
        const originalKey = $('#editTanamanKey').value.trim();
        const varietas = $('#tanamanVarietas').value.trim();
        const jumlah = parseInt($('#tanamanJumlah').value) || 0;
        const tanggal = $('#tanamanTanggal').value.trim();
        const umur = $('#tanamanUmur').value.trim();
        const fase = $('#tanamanFase').value;
        const status = $('#tanamanStatus').value;

        if (!varietas || !tanggal || !umur || jumlah <= 0) {
            Toast.error('Lengkapi semua field wajib dan pastikan jumlah lebih dari 0!');
            return;
        }

        const currentIndex = this.data.findIndex((x) => x.varietas.toLowerCase() === originalKey.toLowerCase());
        const existingIndex = this.data.findIndex((x) => x.varietas.toLowerCase() === varietas.toLowerCase());

        if (currentIndex !== -1) {
            this.data[currentIndex] = {
                varietas,
                jumlah,
                tanggal,
                umur,
                fase,
                status,
                foto: this.tempFoto
            };
            Toast.success('Tanaman diperbarui');
            logUserAction(`Memperbarui data tanaman ${varietas}`);
        } else if (existingIndex !== -1) {
            this.data[existingIndex].jumlah += jumlah;
            this.data[existingIndex].tanggal = tanggal;
            this.data[existingIndex].umur = umur;
            this.data[existingIndex].fase = fase;
            this.data[existingIndex].status = status;
            if (this.tempFoto) this.data[existingIndex].foto = this.tempFoto;
            Toast.success('Jumlah tanaman ditambahkan');
            logUserAction(`Menambahkan ${jumlah} tanaman ${varietas}`);
        } else {
            this.data.push({ varietas, jumlah, tanggal, umur, fase, status, foto: this.tempFoto });
            Toast.success('Tanaman baru ditambahkan');
            logUserAction(`Menambahkan tanaman baru ${varietas}`);
        }

        this.save();
        this.render();
        this.closeModal();
    },

    deleteTanaman(varietas) {
        CustomConfirm.show(`Apakah Anda yakin ingin menghapus tanaman ${varietas}?`, () => {
            this.data = this.data.filter((x) => x.varietas.toLowerCase() !== varietas.toLowerCase());
            this.save();
            this.render();
            Toast.success('Tanaman berhasil dihapus');
            logUserAction(`Menghapus data tanaman ${varietas} dari lahan`);
        });
    },

    init() {
        this.load();
        this.render();

        const btnAdd = $('#btnTambahTanaman');
        if (btnAdd) {
            btnAdd.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAddForm();
            });
        }

        // Bind upload click zone to trigger hidden file input
        const uploadZone = $('#tanamanUploadZone');
        const fileInput = $('#tanamanFotoInput');
        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                Toast.info('Mengompresi dan memproses foto tanaman...');

                compressImage(file, 600, 400, 0.85, (compressedBase64) => {
                    this.tempFoto = compressedBase64;
                    
                    const preview = $('#tanamanFotoPreview');
                    const placeholder = $('#tanamanFotoPlaceholder');
                    if (preview && placeholder) {
                        preview.src = compressedBase64;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                    Toast.success('Foto tanaman berhasil diproses');
                });
            });
        }

        $('#closeModalTanaman')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalTanaman')?.addEventListener('click', () => this.closeModal());
        $('#simpanTanaman')?.addEventListener('click', () => this.saveFromForm());
        $('#modalTanaman')?.addEventListener('click', (e) => {
            if (e.target === $('#modalTanaman')) this.closeModal();
        });
    }
};

// ================= STOK & LOGISTIK (CRUD) =================
const StokLogistik = {
    data: [],
    storageKey: 'fayseri_stoks',
    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved)) {
            this.data = saved.map((item) => ({
                nama: item.nama || item.id || 'Barang Baru',
                kategori: item.kategori || 'Umum',
                jumlah: Number(item.jumlah) || 0,
                satuan: item.satuan || 'Unit',
                nilai: Number(item.nilai) || 0
            }));
        } else {
            this.data = [];
            this.save();
        }
    },
    save() {
        Storage.set(this.storageKey, this.data);
    },
    updateStats() {
        const totalEl = $('#stokTotalVal');
        const menipisEl = $('#stokMenipisVal');
        const habisEl = $('#stokHabisVal');
        const nilaiEl = $('#stokNilaiVal');

        if (totalEl) {
            totalEl.textContent = this.data.length;
            const menipis = this.data.filter(x => x.jumlah > 0 && x.jumlah <= 5).length;
            menipisEl.textContent = menipis;
            const habis = this.data.filter(x => x.jumlah === 0).length;
            habisEl.textContent = habis;

            const totalNilai = this.data.reduce((sum, item) => sum + (item.nilai || 0), 0);
            nilaiEl.textContent = formatRupiah(totalNilai);
        }
    },
    render() {
        const tbody = $('#stokTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.map(s => {
            let tagHTML = '';
            if (s.jumlah === 0) {
                tagHTML = `<span style="background:#FEE2E2;color:#DC2626;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600">Habis</span>`;
            } else if (s.jumlah <= 5) {
                tagHTML = `<span class="tag-warning">Menipis</span>`;
            } else {
                tagHTML = `<span class="tag-success">Aman</span>`;
            }

            return `
            <tr>
                <td><strong>${s.nama}</strong></td>
                <td>${s.kategori}</td>
                <td><strong>${s.jumlah}</strong></td>
                <td>${s.satuan}</td>
                <td>${tagHTML}</td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="wl-act edit btn-restock-stok" data-name="${s.nama}" title="Restock +10" style="background:#EEF2FF;color:#4F46E5;"><i class="fa-solid fa-plus-circle"></i></button>
                        <button class="wl-act edit btn-edit-stok" data-name="${s.nama}"><i class="fa-solid fa-pen"></i></button>
                        <button class="wl-act del btn-del-stok" data-name="${s.nama}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        this.bindEvents();
        this.updateStats();
        initTagClickInfo();
    },
    bindEvents() {
        $$('.btn-restock-stok').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.restockItem(btn.dataset.name);
            });
        });
        $$('.btn-edit-stok').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.name);
            });
        });
        $$('.btn-del-stok').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStok(btn.dataset.name);
            });
        });
    },
    restockItem(nama) {
        const item = this.data.find(x => x.nama.toLowerCase() === nama.toLowerCase());
        if (!item) return;
        item.jumlah += 10;
        item.nilai += 10 * 50000;
        this.save();
        this.render();
        Toast.success(`Berhasil menambah +10 untuk ${item.nama}`);
        logUserAction(`Melakukan restock barang ${item.nama} (+10)`);
    },
    openAddForm() {
        $('#editStokKey').value = '';
        $('#stokNama').value = '';
        $('#stokKategori').value = '';
        $('#stokJumlah').value = '0';
        $('#stokSatuan').value = 'Liter';
        $('#modalStokTitle').textContent = 'Tambah Stok Gudang';
        $('#modalStok').classList.add('show');
    },
    openEditForm(nama) {
        const s = this.data.find(x => x.nama.toLowerCase() === nama.toLowerCase());
        if (!s) return;
        $('#editStokKey').value = s.nama;
        $('#stokNama').value = s.nama;
        $('#stokKategori').value = s.kategori;
        $('#stokJumlah').value = s.jumlah;
        $('#stokSatuan').value = s.satuan;
        $('#modalStokTitle').textContent = 'Edit Stok Gudang';
        $('#modalStok').classList.add('show');
    },
    closeModal() {
        $('#modalStok').classList.remove('show');
    },
    saveFromForm() {
        const originalKey = $('#editStokKey').value.trim();
        const nama = $('#stokNama').value.trim();
        const kategori = $('#stokKategori').value.trim();
        const jumlah = parseInt($('#stokJumlah').value) || 0;
        const satuan = $('#stokSatuan').value.trim();

        if (!nama || !kategori || !satuan) {
            Toast.error('Lengkapi semua field wajib!');
            return;
        }

        const estimatedPrice = 50000;
        const itemVal = jumlah * estimatedPrice;
        const currentIndex = this.data.findIndex(x => x.nama.toLowerCase() === originalKey.toLowerCase());
        const existingIndex = this.data.findIndex(x => x.nama.toLowerCase() === nama.toLowerCase());

        if (currentIndex !== -1) {
            this.data[currentIndex] = { nama, kategori, jumlah, satuan, nilai: itemVal };
            Toast.success('Stok logistik diperbarui');
            logUserAction(`Memperbarui detail stok ${nama}`);
        } else if (existingIndex !== -1) {
            this.data[existingIndex] = { nama, kategori, jumlah, satuan, nilai: itemVal };
            Toast.success('Stok logistik diperbarui');
            logUserAction(`Memperbarui detail stok ${nama}`);
        } else {
            this.data.push({ nama, kategori, jumlah, satuan, nilai: itemVal });
            Toast.success('Barang stok ditambahkan');
            logUserAction(`Menambahkan item stok baru ${nama}`);
        }

        this.save();
        this.render();
        this.closeModal();
    },
    deleteStok(nama) {
        CustomConfirm.show(`Apakah Anda yakin ingin menghapus stok ${nama}?`, () => {
            this.data = this.data.filter(x => x.nama.toLowerCase() !== nama.toLowerCase());
            this.save();
            this.render();
            Toast.success('Stok berhasil dihapus');
            logUserAction(`Menghapus item stok ${nama} dari gudang`);
        });
    },
    init() {
        this.load();
        this.render();

        const btnAdd = $('#btnTambahStok');
        if (btnAdd) {
            btnAdd.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAddForm();
            });
        }

        $('#closeModalStok')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalStok')?.addEventListener('click', () => this.closeModal());
        $('#simpanStok')?.addEventListener('click', () => this.saveFromForm());
        $('#modalStok')?.addEventListener('click', (e) => {
            if (e.target === $('#modalStok')) this.closeModal();
        });
    }
};

// ================= PEKERJA LAPANGAN (CRUD) =================
const PekerjaLap = {
    data: [],
    storageKey: 'fayseri_pekerjas',
    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.data = saved;
        } else {
            this.data = [];
            this.save();
        }
    },
    save() {
        Storage.set(this.storageKey, this.data);
    },
    updateStats() {
        const totalEl = $('#pekerjaTotalVal');
        const aktifEl = $('#pekerjaAktifVal');
        const tugasEl = $('#pekerjaTugasVal');
        const kinerjaEl = $('#pekerjaKinerjaVal');

        if (totalEl) {
            totalEl.textContent = this.data.length;
            const aktif = this.data.filter(x => x.status === 'Aktif').length;
            aktifEl.textContent = aktif;
            const tugas = this.data.filter(x => x.tugas !== '-' && x.tugas !== '').length;
            tugasEl.textContent = tugas;
            
            const totalKinerja = this.data.reduce((sum, item) => sum + (item.kinerja || 0), 0);
            kinerjaEl.textContent = this.data.length > 0 ? Math.round(totalKinerja / this.data.length) + '%' : '0%';
        }
    },
    render() {
        const tbody = $('#pekerjaTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.map(p => `
            <tr>
                <td><strong>${p.id}</strong></td>
                <td>${p.nama}</td>
                <td>${p.divisi}</td>
                <td><span class="${p.status === 'Aktif' ? 'tag-success' : 'tag-warning'}">${p.status}</span></td>
                <td>${p.tugas}</td>
                <td><strong>${p.kinerja}%</strong></td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="wl-act edit btn-toggle-pekerja" data-id="${p.id}" title="Toggle Status" style="background:#ECFDF5;color:#059669;"><i class="fa-solid fa-user-check"></i></button>
                        <button class="wl-act edit btn-edit-pekerja" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="wl-act del btn-del-pekerja" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.bindEvents();
        this.updateStats();
        initTagClickInfo();
    },
    bindEvents() {
        $$('.btn-toggle-pekerja').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleStatus(btn.dataset.id);
            });
        });
        $$('.btn-edit-pekerja').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.id);
            });
        });
        $$('.btn-del-pekerja').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePekerja(btn.dataset.id);
            });
        });
    },
    toggleStatus(id) {
        const item = this.data.find(x => x.id === id);
        if (!item) return;
        item.status = item.status === 'Aktif' ? 'Izin' : 'Aktif';
        if (item.status === 'Izin') item.tugas = '-';
        this.save();
        this.render();
        Toast.success(`Status ${item.nama} diubah menjadi ${item.status}`);
        logUserAction(`Mengubah status pekerja ${item.nama} menjadi ${item.status}`);
    },
    openAddForm() {
        $('#editPekerjaId').value = '';
        $('#pekerjaCode').value = '';
        $('#pekerjaCode').disabled = false;
        $('#pekerjaNama').value = '';
        $('#pekerjaDivisi').value = '';
        $('#pekerjaStatus').value = 'Aktif';
        $('#pekerjaTugas').value = '';
        $('#pekerjaKinerja').value = '90';
        $('#modalPekerjaTitle').textContent = 'Tambah Pekerja';
        $('#modalPekerja').classList.add('show');
    },
    openEditForm(id) {
        const p = this.data.find(x => x.id === id);
        if (!p) return;
        $('#editPekerjaId').value = p.id;
        $('#pekerjaCode').value = p.id;
        $('#pekerjaCode').disabled = true;
        $('#pekerjaNama').value = p.nama;
        $('#pekerjaDivisi').value = p.divisi;
        $('#pekerjaStatus').value = p.status;
        $('#pekerjaTugas').value = p.tugas;
        $('#pekerjaKinerja').value = p.kinerja;
        $('#modalPekerjaTitle').textContent = 'Edit Pekerja';
        $('#modalPekerja').classList.add('show');
    },
    closeModal() {
        $('#modalPekerja').classList.remove('show');
    },
    saveFromForm() {
        const id = $('#pekerjaCode').value.trim();
        const nama = $('#pekerjaNama').value.trim();
        const divisi = $('#pekerjaDivisi').value.trim();
        const status = $('#pekerjaStatus').value;
        const tugas = $('#pekerjaTugas').value.trim() || '-';
        const kinerja = parseInt($('#pekerjaKinerja').value) || 90;
        const editId = $('#editPekerjaId').value;

        if (!id || !nama || !divisi) {
            Toast.error('Lengkapi semua field wajib!');
            return;
        }

        if (editId) {
            const idx = this.data.findIndex(x => x.id === editId);
            if (idx !== -1) {
                this.data[idx] = { id: editId, nama, divisi, status, tugas, kinerja };
                Toast.success('Data pekerja diperbarui');
                logUserAction(`Memperbarui data pekerja ${nama}`);
            }
        } else {
            if (this.data.some(x => x.id.toLowerCase() === id.toLowerCase())) {
                Toast.error('ID Pekerja sudah terdaftar!');
                return;
            }
            this.data.push({ id, nama, divisi, status, tugas, kinerja });
            Toast.success('Pekerja baru ditambahkan');
            logUserAction(`Menambahkan pekerja baru ${nama}`);
        }

        this.save();
        this.render();
        this.closeModal();
    },
    deletePekerja(id) {
        CustomConfirm.show(`Apakah Anda yakin ingin menghapus pekerja ${id}?`, () => {
            const item = this.data.find(x => x.id === id);
            const nama = item ? item.nama : id;
            this.data = this.data.filter(x => x.id !== id);
            this.save();
            this.render();
            Toast.success('Pekerja berhasil dihapus');
            logUserAction(`Menghapus data pekerja ${nama} dari sistem`);
        });
    },
    init() {
        this.load();
        this.render();

        const btnAdd = $('#btnTambahPekerja');
        if (btnAdd) {
            btnAdd.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAddForm();
            });
        }

        $('#closeModalPekerja')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalPekerja')?.addEventListener('click', () => this.closeModal());
        $('#simpanPekerja')?.addEventListener('click', () => this.saveFromForm());
        $('#modalPekerja')?.addEventListener('click', (e) => {
            if (e.target === $('#modalPekerja')) this.closeModal();
        });
    }
};

// ================= LAPORAN KAS (CRUD) =================
const LaporanKas = {
    data: [],
    storageKey: 'fayseri_kas',
    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved)) {
            // Saring agar data fiktif bawaan lama terhapus bersih secara permanen
            this.data = saved.filter(x => !['KAS-01', 'KAS-02', 'KAS-03', 'KAS-001', 'KAS-002', 'KAS-003'].includes(x.id) && !x.id.startsWith('KAS-0'));
        } else {
            this.data = [];
            this.save();
        }
    },
    save() {
        Storage.set(this.storageKey, this.data);
    },
    updateStats() {
        const pemasukanEl = $('#kasPemasukanVal');
        const pengeluaranEl = $('#kasPengeluaranVal');
        const saldoEl = $('#kasSaldoVal');
        const totalEl = $('#kasTotalVal');

        if (pemasukanEl) {
            const pemasukan = this.data.filter(x => x.tipe === 'Masuk').reduce((sum, item) => sum + item.jumlah, 0);
            pemasukanEl.textContent = formatRupiah(pemasukan);

            const pengeluaran = this.data.filter(x => x.tipe === 'Keluar').reduce((sum, item) => sum + item.jumlah, 0);
            pengeluaranEl.textContent = formatRupiah(pengeluaran);

            saldoEl.textContent = formatRupiah(pemasukan - pengeluaran);
            totalEl.textContent = this.data.length;
        }
    },
    render() {
        const tbody = $('#kasTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.data.map(k => {
            const prefix = k.tipe === 'Masuk' ? '+' : '-';
            const color = k.tipe === 'Masuk' ? '#16A34A' : '#DC2626';
            const labelClass = k.tipe === 'Masuk' ? 'tag-success' : 'tag-warning';
            return `
            <tr>
                <td>${k.tanggal}</td>
                <td>${k.keterangan}</td>
                <td>${k.kategori}</td>
                <td><span class="${labelClass}" style="${k.tipe === 'Keluar' ? 'background:#FEE2E2;color:#DC2626;' : ''}">${k.tipe}</span></td>
                <td><strong style="color:${color}">${prefix}${formatRupiah(k.jumlah)}</strong></td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="wl-act edit btn-edit-kas" data-id="${k.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="wl-act del btn-del-kas" data-id="${k.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;}).join('');

        this.bindEvents();
        this.updateStats();
        initTagClickInfo();
    },
    bindEvents() {
        $$('.btn-edit-kas').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.id);
            });
        });
        $$('.btn-del-kas').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteKas(btn.dataset.id);
            });
        });
    },
    openAddForm() {
        $('#editKasId').value = '';
        $('#kasTanggal').value = formatDate(new Date());
        $('#kasKeterangan').value = '';
        $('#kasKategori').value = '';
        $('#kasTipe').value = 'Masuk';
        $('#kasJumlah').value = '';
        $('#modalKasTitle').textContent = 'Catat Transaksi Kas';
        $('#modalKas').classList.add('show');
    },
    openEditForm(id) {
        const k = this.data.find(x => x.id === id);
        if (!k) return;
        $('#editKasId').value = k.id;
        $('#kasTanggal').value = k.tanggal;
        $('#kasKeterangan').value = k.keterangan;
        $('#kasKategori').value = k.kategori;
        $('#kasTipe').value = k.tipe;
        $('#kasJumlah').value = k.jumlah;
        $('#modalKasTitle').textContent = 'Edit Transaksi Kas';
        $('#modalKas').classList.add('show');
    },
    closeModal() {
        $('#modalKas').classList.remove('show');
    },
    saveFromForm() {
        const tanggal = $('#kasTanggal').value.trim();
        const keterangan = $('#kasKeterangan').value.trim();
        const kategori = $('#kasKategori').value.trim();
        const tipe = $('#kasTipe').value;
        const jumlah = parseInt($('#kasJumlah').value);
        const editId = $('#editKasId').value;

        if (!tanggal || !keterangan || !kategori || isNaN(jumlah) || jumlah <= 0) {
            Toast.error('Lengkapi semua field wajib dengan benar!');
            return;
        }

        if (editId) {
            const idx = this.data.findIndex(x => x.id === editId);
            if (idx !== -1) {
                this.data[idx] = { id: editId, tanggal, keterangan, kategori, tipe, jumlah };
                Toast.success('Transaksi kas diperbarui');
                logUserAction(`Mengedit transaksi kas: ${keterangan}`);
            }
        } else {
            const id = 'KAS-' + Date.now().toString(36).toUpperCase();
            this.data.unshift({ id, tanggal, keterangan, kategori, tipe, jumlah });
            Toast.success('Transaksi kas berhasil dicatat');
            logUserAction(`Mencatat transaksi kas baru: ${keterangan}`);
        }

        this.save();
        this.render();
        this.closeModal();
    },
    deleteKas(id) {
        CustomConfirm.show('Apakah Anda yakin ingin menghapus transaksi kas ini?', () => {
            const item = this.data.find(x => x.id === id);
            const ket = item ? item.keterangan : id;
            this.data = this.data.filter(x => x.id !== id);
            this.save();
            this.render();
            Toast.success('Transaksi kas dihapus');
            logUserAction(`Menghapus transaksi kas: ${ket}`);
        });
    },
    init() {
        this.load();
        this.render();

        const btnAdd = $('#btnTambahKas');
        if (btnAdd) {
            btnAdd.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAddForm();
            });
        }

        $('#closeModalKas')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalKas')?.addEventListener('click', () => this.closeModal());
        $('#simpanKas')?.addEventListener('click', () => this.saveFromForm());
        $('#modalKas')?.addEventListener('click', (e) => {
            if (e.target === $('#modalKas')) this.closeModal();
        });
    }
};

// ================= BUKU PANDUAN (CRUD) =================
const BukuPanduan = {
    data: [],
    tempFoto: '',

    getDefaultSeed() {
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
    },

    load() {
        const saved = Storage.get('fayseri_buku_panduan');
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.data = saved;
        } else {
            this.data = this.getDefaultSeed();
        }
    },

    async save() {
        // Use Storage.set() — same as ProdukSiapJual — handles localStorage + Supabase sync
        Storage.set('fayseri_buku_panduan', this.data);
    },

    setFotoPreview(base64) {
        const preview = $('#panduanFotoPreview');
        const wrap = $('#panduanFotoPreviewWrap');
        const placeholder = $('#panduanFotoPlaceholder');
        const button = $('#btnHapusPanduanFoto');

        if (base64) {
            if (preview) preview.src = base64;
            if (wrap) wrap.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            if (button) button.style.display = 'inline-flex';
        } else {
            if (preview) preview.src = '';
            if (wrap) wrap.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
            if (button) button.style.display = 'none';
        }
    },

    clearFoto() {
        this.tempFoto = '';
        this.setFotoPreview('');
    },

    renderTable() {
        const tbody = $('#panduanTableBody');
        if (!tbody) return;

        if (this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px;">Belum ada panduan tersimpan. Silakan klik "Tambah Panduan Baru".</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.map(v => {
            const shortKonten = v.konten.length > 80 ? v.konten.substring(0, 80) + '...' : v.konten;
            const fotoUrl = v.foto || '';
            const imgHTML = fotoUrl 
                ? `<div style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; background: var(--gray-50); margin: 0 auto;">
                    <img src="${fotoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto">
                   </div>`
                : `<div style="width: 50px; height: 50px; border-radius: 8px; background: var(--gray-100); display: flex; align-items: center; justify-content: center; color: var(--gray-400); border: 1.5px solid var(--border-color); margin: 0 auto;" title="Tidak ada foto">
                    <i class="fa-solid fa-image" style="font-size: 16px;"></i>
                   </div>`;

            return `
                <tr>
                    <td style="text-align: center; vertical-align: middle; padding: 8px 12px;">${imgHTML}</td>
                    <td><strong>${v.judul}</strong></td>
                    <td><span class="tag-success">${v.kategori}</span></td>
                    <td><span style="font-size: 12px; color: var(--gray-500);">${shortKonten}</span></td>
                    <td>${v.tanggal}</td>
                    <td>
                        <div style="display:flex;gap:4px;justify-content:center;">
                            <button class="wl-act edit btn-edit-panduan" data-id="${v.id}"><i class="fa-solid fa-pen"></i></button>
                            <button class="wl-act del btn-del-panduan" data-id="${v.id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.bindEvents();
    },

    bindEvents() {
        $$('.btn-edit-panduan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.id);
            });
        });
        $$('.btn-del-panduan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePanduan(btn.dataset.id);
            });
        });
    },

    openAddForm() {
        $('#editPanduanKey').value = '';
        $('#panduanJudul').value = '';
        $('#panduanKategori').value = 'Cara Menanam';
        $('#groupKategoriKustom').style.display = 'none';
        $('#panduanKategoriKustom').value = '';
        $('#panduanKonten').value = '';
        this.tempFoto = '';
        this.setFotoPreview('');

        $('#modalPanduanTitle').textContent = 'Tambah Panduan Baru';
        $('#modalPanduan').classList.add('show');
    },

    openEditForm(id) {
        const item = this.data.find(x => x.id === id);
        if (!item) return;

        $('#editPanduanKey').value = item.id;
        $('#panduanJudul').value = item.judul;

        const standardCats = ['Cara Menanam', 'Cara Menyemprot', 'Penyebab Cabai Keriting', 'Lainnya'];
        if (standardCats.includes(item.kategori)) {
            $('#panduanKategori').value = item.kategori;
            $('#groupKategoriKustom').style.display = 'none';
            $('#panduanKategoriKustom').value = '';
        } else {
            $('#panduanKategori').value = 'KUSTOM';
            $('#groupKategoriKustom').style.display = 'block';
            $('#panduanKategoriKustom').value = item.kategori;
        }

        $('#panduanKonten').value = item.konten;
        this.tempFoto = item.foto || '';
        this.setFotoPreview(this.tempFoto);

        $('#modalPanduanTitle').textContent = 'Edit Buku Panduan';
        $('#modalPanduan').classList.add('show');
    },

    closeModal() {
        $('#modalPanduan').classList.remove('show');
    },

    async saveFromForm() {
        const judul = $('#panduanJudul').value.trim();
        let kategori = $('#panduanKategori').value;
        const konten = $('#panduanKonten').value.trim();
        const editId = $('#editPanduanKey').value;

        if (kategori === 'KUSTOM') {
            kategori = $('#panduanKategoriKustom').value.trim();
            if (!kategori) {
                showInlineMessage('panduanMessage', 'Harap isi nama kategori kustom Anda!', 'error');
                return;
            }
        }

        if (!judul || !konten || !kategori) {
            showInlineMessage('panduanMessage', 'Harap isi semua kolom wajib!', 'error');
            return;
        }

        const payload = {
            judul,
            kategori,
            konten,
            foto: this.tempFoto || '',
            tanggal: formatDate(new Date())
        };

        if (editId) {
            const idx = this.data.findIndex(x => x.id === editId);
            if (idx !== -1) {
                this.data[idx] = { id: editId, ...payload };
            }
        } else {
            const id = 'GP-' + Date.now().toString(36).toUpperCase();
            this.data.push({ id, ...payload });
        }

        try {
            await this.save();
            if (editId) {
                showInlineMessage('panduanMessage', 'Materi panduan berhasil diperbarui', 'success');
                logUserAction(`Memperbarui panduan ${judul}`);
            } else {
                showInlineMessage('panduanMessage', 'Materi panduan baru ditambahkan', 'success');
                logUserAction(`Menambahkan panduan baru ${judul}`);
            }
            this.renderTable();
            this.closeModal();
        } catch (err) {
            console.warn('Gagal menyimpan panduan ke Supabase:', err);
            showInlineMessage('panduanMessage', 'Gagal menyimpan panduan ke Supabase', 'error');
        }
    },

    async deletePanduan(id) {
        CustomConfirm.show('Apakah Anda yakin ingin menghapus materi panduan ini?', async () => {
            const item = this.data.find(x => x.id === id);
            const judul = item ? item.judul : id;
            this.data = this.data.filter(x => x.id !== id);

            try {
                await this.save();
                this.renderTable();
                showInlineMessage('panduanMessage', 'Materi panduan berhasil dihapus', 'success');
                logUserAction(`Menghapus panduan ${judul}`);
            } catch (err) {
                console.warn('Gagal menghapus panduan dari Supabase:', err);
                showInlineMessage('panduanMessage', 'Gagal menghapus panduan dari Supabase', 'error');
            }
        });
    },

    init() {
        this.load();
        this.renderTable();

        $('#btnTambahPanduan')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddForm();
        });

        $('#btnRefreshPanduan')?.addEventListener('click', () => {
            this.load();
            this.renderTable();
            showInlineMessage('panduanMessage', 'Buku panduan disinkronkan dengan database', 'success');
        });

        $('#closeModalPanduan')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalPanduan')?.addEventListener('click', () => this.closeModal());
        $('#simpanPanduan')?.addEventListener('click', () => this.saveFromForm());
        $('#modalPanduan')?.addEventListener('click', (e) => {
            if (e.target === $('#modalPanduan')) this.closeModal();
        });

        // Toggle custom category field on select change
        $('#panduanKategori')?.addEventListener('change', (e) => {
            const val = e.target.value;
            const customGroup = $('#groupKategoriKustom');
            if (customGroup) {
                customGroup.style.display = val === 'KUSTOM' ? 'block' : 'none';
            }
        });

        const uploadZone = $('#panduanFotoDropzone');
        const fileInput = $('#panduanFotoInput');
        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                Toast.info('Mengompresi foto panduan...');
                compressImage(file, 600, 400, 0.7, (compressedBase64) => {
                    this.tempFoto = compressedBase64;
                    this.setFotoPreview(compressedBase64);
                    Toast.success('Foto berhasil dikompresi dan dimuat!');
                });
            });
        }
    }
};

// ================= PRODUK SIAP JUAL (CRUD) =================
const ProdukSiapJual = {
    data: [],
    storageKey: 'fayseri_produk_siap_jual',
    tempFoto: '',

    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved)) {
            // Saring agar data fiktif bawaan lama terhapus bersih secara permanen
            this.data = saved.filter(x => !['PRD-01', 'PRD-02', 'PRD-03'].includes(x.id) && !x.id.startsWith('PRD-0'));
        } else {
            this.data = [];
            this.save();
        }
    },

    save() {
        Storage.set(this.storageKey, this.data);
    },

    updateStats() {
        const totalVal = $('#produkTotalVal');
        const stokVal = $('#produkTotalStokVal');
        const activeVal = $('#produkActiveVal');
        const outVal = $('#produkOutOfStockVal');

        if (totalVal) {
            totalVal.textContent = this.data.length;

            const totalStok = this.data.reduce((sum, item) => {
                const num = parseInt(item.stok);
                return sum + (isNaN(num) ? 0 : num);
            }, 0);
            stokVal.textContent = totalStok;

            const activeCount = this.data.filter(x => x.status === 'Tersedia').length;
            activeVal.textContent = activeCount;

            const outCount = this.data.filter(x => x.status === 'Habis' || x.stok === '0').length;
            outVal.textContent = outCount;
        }
    },

    renderGrid() {
        const grid = $('#produkGrid');
        const emptyEl = $('#produkEmpty');
        if (!grid) return;

        if (this.data.length === 0) {
            grid.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        grid.innerHTML = this.data.map(p => {
            const hasFoto = p.foto && p.foto.startsWith('data:image/');
            const imageStyle = hasFoto 
                ? `background-image: url('${p.foto}'); background-size: cover; background-position: center;`
                : `background: linear-gradient(135deg, var(--primary-light), rgba(59, 130, 246, 0.15)); display: flex; align-items: center; justify-content: center;`;

            const imageHeader = `<div class="tanaman-grid-image" style="height: 140px; border-radius: 8px; margin-bottom: 12px; overflow: hidden; ${imageStyle}">
                ${!hasFoto ? `<i class="fa-solid fa-basket-shopping" style="font-size: 40px; color: var(--primary);"></i>` : ''}
            </div>`;

            const hargaFmt = p.harga > 0 ? formatRupiah(p.harga) : 'Hubungi Admin';
            const statusClass = p.status === 'Tersedia' ? 'tag-success' : 'tag-danger';
            const statusLabel = p.status === 'Tersedia' ? 'Tersedia' : 'Habis';

            return `
            <div class="tanaman-grid-card">
                ${imageHeader}
                <p class="tanaman-grid-qty" style="color: var(--primary); font-weight: 700;">${hargaFmt}</p>
                <h4>${p.nama}</h4>
                <div class="tanaman-grid-meta" style="margin-top: 8px;">
                    <span><strong>Stok:</strong> ${p.stok || 'Tidak ditentukan'}</span>
                    <span><strong>Status:</strong> <span class="${statusClass}">${statusLabel}</span></span>
                    <span><strong>Keterangan:</strong> <span style="font-size:11.5px; color:var(--gray-500); display:block; margin-top:2px; line-height:1.3;">${p.deskripsi || '-'}</span></span>
                </div>
                <div class="tanaman-grid-actions" style="margin-top: 14px;">
                    <button class="wl-act edit btn-edit-produk" data-id="${p.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="wl-act del btn-del-produk" data-id="${p.id}"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </div>
            `;
        }).join('');

        this.bindEvents();
        this.updateStats();
    },

    bindEvents() {
        $$('.btn-edit-produk').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditForm(btn.dataset.id);
            });
        });
        $$('.btn-del-produk').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProduk(btn.dataset.id);
            });
        });
    },

    openAddForm() {
        $('#editProdukKey').value = '';
        $('#produkNama').value = '';
        $('#produkStok').value = '';
        $('#produkHarga').value = '';
        $('#produkStatus').value = 'Tersedia';
        $('#produkDeskripsi').value = '';
        this.tempFoto = '';
        
        const preview = $('#produkFotoPreview');
        const placeholder = $('#produkFotoPlaceholder');
        if (preview && placeholder) {
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        $('#modalProdukTitle').textContent = 'Tambah Produk Siap Jual';
        $('#modalProduk').classList.add('show');
    },

    openEditForm(id) {
        const p = this.data.find(x => x.id === id);
        if (!p) return;

        $('#editProdukKey').value = p.id;
        $('#produkNama').value = p.nama;
        $('#produkStok').value = p.stok || '';
        $('#produkHarga').value = p.harga || '';
        $('#produkStatus').value = p.status;
        $('#produkDeskripsi').value = p.deskripsi || '';
        this.tempFoto = p.foto || '';

        const preview = $('#produkFotoPreview');
        const placeholder = $('#produkFotoPlaceholder');
        if (preview && placeholder) {
            if (p.foto) {
                preview.src = p.foto;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                preview.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        }

        $('#modalProdukTitle').textContent = 'Edit Produk Siap Jual';
        $('#modalProduk').classList.add('show');
    },

    closeModal() {
        $('#modalProduk').classList.remove('show');
    },

    saveFromForm() {
        const nama = $('#produkNama').value.trim();
        const stok = $('#produkStok').value.trim();
        const harga = parseInt($('#produkHarga').value) || 0;
        const status = $('#produkStatus').value;
        const deskripsi = $('#produkDeskripsi').value.trim();
        const editId = $('#editProdukKey').value;

        if (!nama) {
            Toast.error('Nama produk wajib diisi!');
            return;
        }

        if (editId) {
            const idx = this.data.findIndex(x => x.id === editId);
            if (idx !== -1) {
                this.data[idx] = { 
                    ...this.data[idx], 
                    nama, 
                    stok, 
                    harga, 
                    status, 
                    deskripsi, 
                    foto: this.tempFoto 
                };
                Toast.success('Produk berhasil diperbarui');
                logUserAction(`Mengedit produk siap jual: ${nama}`);
            }
        } else {
            const id = 'PRD-' + Date.now().toString(36).toUpperCase();
            this.data.unshift({
                id,
                nama,
                stok,
                harga,
                status,
                deskripsi,
                foto: this.tempFoto,
                dibuat: new Date().toISOString()
            });
            Toast.success('Produk baru berhasil ditambahkan');
            logUserAction(`Menambahkan produk siap jual baru: ${nama}`);
        }

        this.save();
        this.renderGrid();
        this.closeModal();
    },

    deleteProduk(id) {
        CustomConfirm.show('Apakah Anda yakin ingin menghapus produk siap jual ini?', () => {
            const p = this.data.find(x => x.id === id);
            const nama = p ? p.nama : id;
            this.data = this.data.filter(x => x.id !== id);
            this.save();
            this.renderGrid();
            Toast.success('Produk berhasil dihapus');
            logUserAction(`Menghapus produk siap jual: ${nama}`);
        });
    },

    init() {
        this.load();
        this.renderGrid();

        $('#btnTambahProduk')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddForm();
        });

        $('#btnRefreshProduk')?.addEventListener('click', () => {
            this.load();
            this.renderGrid();
            Toast.success('Data produk disinkronkan');
        });

        $('#closeModalProduk')?.addEventListener('click', () => this.closeModal());
        $('#cancelModalProduk')?.addEventListener('click', () => this.closeModal());
        $('#simpanProduk')?.addEventListener('click', () => this.saveFromForm());
        $('#modalProduk')?.addEventListener('click', (e) => {
            if (e.target === $('#modalProduk')) this.closeModal();
        });

        // Photo upload trigger
        const uploadZone = $('#produkUploadZone');
        const fileInput = $('#produkFotoInput');
        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                Toast.info('Mengompresi foto produk...');
                compressImage(file, 400, 300, 0.8, (compressedBase64) => {
                    this.tempFoto = compressedBase64;
                    const preview = $('#produkFotoPreview');
                    const placeholder = $('#produkFotoPlaceholder');
                    if (preview && placeholder) {
                        preview.src = compressedBase64;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                });
            });
        }
    }
};

// ================= RIWAYAT AKTIVITAS LENGKAP =================
const AktivitasLog = {
    init() {
        AppState.activityLog = AppState.activityLog || [];
        renderDashboardActivityList();

        const btnViewAll = $('#btnLihatSemuaAktivitas');
        if (btnViewAll) {
            btnViewAll.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        $('#closeModalAktivitas')?.addEventListener('click', () => this.closeModal());
        $('#closeModalAktivitasBtn')?.addEventListener('click', () => this.closeModal());
        $('#modalAktivitas')?.addEventListener('click', (e) => {
            if (e.target === $('#modalAktivitas')) this.closeModal();
        });
    },
    openModal() {
        const fullList = $('#fullActivityList');
        if (!fullList) return;

        if (AppState.activityLog.length === 0) {
            fullList.innerHTML = `
                <div class="activity-item">
                    <div class="user-avatar bg-green"><i class="fa-solid fa-circle-info"></i></div>
                    <div class="item-info">
                        <strong>Belum ada aktivitas</strong>
                        <p>Aktivitas akan muncul setelah Anda melakukan perubahan data.</p>
                    </div>
                    <span class="item-time">-</span>
                </div>
            `;
        } else {
            fullList.innerHTML = AppState.activityLog.map(act => `
                <div class="activity-item">
                    <div class="user-avatar ${act.bg}">${act.user}</div>
                    <div class="item-info">
                        <strong>${act.name}</strong>
                        <p>${act.action}</p>
                    </div>
                    <span class="item-time">${act.time}</span>
                </div>
            `).join('');
        }

        $('#modalAktivitas').classList.add('show');
    },
    closeModal() {
        $('#modalAktivitas').classList.remove('show');
    }
};

// ================= FILTER DYNAMIC GRAFIK PERTUMBUHAN =================
const ChartPertumbuhanFilter = {
    sortMode: 'id',
    init() {
        const btn = $('#btnFilterChartPertumbuhan');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.sortMode === 'id') {
                    this.sortMode = 'skor-desc';
                    btn.innerHTML = 'Skor Tertinggi <i class="fa-solid fa-chevron-down"></i>';
                    Toast.info('Mengurutkan grafik berdasarkan skor tertinggi');
                } else if (this.sortMode === 'skor-desc') {
                    this.sortMode = 'skor-asc';
                    btn.innerHTML = 'Skor Terendah <i class="fa-solid fa-chevron-down"></i>';
                    Toast.info('Mengurutkan grafik berdasarkan skor terendah');
                } else {
                    this.sortMode = 'id';
                    btn.innerHTML = 'ID Blok <i class="fa-solid fa-chevron-down"></i>';
                    Toast.info('Mengurutkan grafik berdasarkan ID Blok');
                }

                this.apply();
            });
        }
    },
    apply() {
        if (!AppState.charts.kesehatan) return;

        let sorted = [...DashboardBlok.data];
        if (this.sortMode === 'skor-desc') {
            sorted.sort((a, b) => b.skor - a.skor);
        } else if (this.sortMode === 'skor-asc') {
            sorted.sort((a, b) => a.skor - b.skor);
        } else {
            sorted.sort((a, b) => a.id.localeCompare(b.id));
        }

        AppState.charts.kesehatan.data.labels = sorted.map(x => x.id);
        AppState.charts.kesehatan.data.datasets[0].data = sorted.map(x => x.skor);
        AppState.charts.kesehatan.update();
    }
};

// ================= JADWAL PENYIRAMAN =================
const WateringSchedule = {
    data: [],
    activeFilter: 'all',
    storageKey: 'fayseri_watering_schedules',

    load() {
        const saved = Storage.get(this.storageKey);
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.data = saved;
        } else {
            this.data = [];
            this.save();
        }
    },

    save() {
        Storage.set(this.storageKey, this.data);
    },

    generateId() {
        const n = this.data.length + 1;
        return 'WS-' + String(n).padStart(3, '0') + '-' + Date.now().toString(36).toUpperCase();
    },

    upsert(jadwal) {
        const cleanedJadwal = { ...jadwal };

        if (cleanedJadwal.id) {
            const idx = this.data.findIndex(d => d.id === cleanedJadwal.id);
            if (idx !== -1) {
                this.data[idx] = { ...this.data[idx], ...cleanedJadwal };
                return 'updated';
            }
        }
        cleanedJadwal.id = this.generateId();
        cleanedJadwal.dibuat = new Date().toISOString();
        cleanedJadwal.aktif = true;
        this.data.unshift(cleanedJadwal);
        return 'created';
    },

    delete(id) {
        this.data = this.data.filter(d => d.id !== id);
        this.save();
    },

    toggle(id) {
        const item = this.data.find(d => d.id === id);
        if (item) {
            item.aktif = !item.aktif;
            this.save();
        }
    },

    getFiltered() {
        return this.data;
    },

    // ---- Dashboard: stat card summary ----
    updateStatCard() {
        const aktifList = this.data.filter(d => d.aktif);

        const formatDays = (days) => {
            if (!days || days.length === 0) return 'Belum ada hari';
            return days.map(h => h.slice(0, 3)).join(', ');
        };

        // Update Jadwal Pemupukan card
        const pupukVal = document.getElementById('jadwalPupukVal');
        const pupukNext = document.getElementById('jadwalPupukNext');
        if (pupukVal && pupukNext) {
            const pemupukanList = aktifList.filter(d => d.aktivitas === 'Pemupukan');
            pupukVal.textContent = pemupukanList.length;
            if (pemupukanList.length === 0) {
                pupukNext.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Belum ada jadwal';
            } else {
                pupukNext.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${formatDays(pemupukanList[0].hari)}`;
            }
        }

        // Update Jadwal Penyiraman card
        const penyiramanVal = document.getElementById('jadwalPenyiramanVal');
        const penyiramanNext = document.getElementById('jadwalPenyiramanNext');
        if (penyiramanVal && penyiramanNext) {
            const penyiramanList = aktifList.filter(d => d.aktivitas === 'Penyiraman');
            penyiramanVal.textContent = penyiramanList.length;
            if (penyiramanList.length === 0) {
                penyiramanNext.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Belum ada jadwal';
            } else {
                penyiramanNext.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${formatDays(penyiramanList[0].hari)}`;
            }
        }

        // Update Jadwal Penyemprotan card
        const semprotVal = document.getElementById('jadwalSemprotVal');
        const semprotNext = document.getElementById('jadwalSemprotNext');
        if (semprotVal && semprotNext) {
            const semprotList = aktifList.filter(d => d.aktivitas.includes('Insektisida') || d.aktivitas.includes('Fungisida'));
            semprotVal.textContent = semprotList.length;
            if (semprotList.length === 0) {
                semprotNext.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Belum ada jadwal';
            } else {
                const types = [...new Set(semprotList.map(d => d.aktivitas.replace('Pemberian ', '')))];
                semprotNext.innerHTML = `<i class="fa-solid fa-spray-can-sparkles"></i> ${types.join(' & ')}`;
            }
        }

        if (typeof GridCardManager !== 'undefined') {
            GridCardManager.apply();
        }
    },

    // ---- Dashboard: read-only timeline ----
    renderDashboardTimeline() {
        const timeline = document.getElementById('dashScheduleTimeline');
        if (!timeline) return;

        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayName = dayNames[new Date().getDay()];
        const todaySchedules = this.data.filter(d => d.aktif && d.hari.includes(todayName));

        if (todaySchedules.length === 0) {
            timeline.innerHTML = `
                <div class="dash-schedule-empty" id="dashScheduleEmpty" style="display:block;">
                    <i class="fa-solid fa-droplet-slash"></i>
                    <p>Belum ada jadwal hari ini (${todayName})</p>
                    <span>Buat jadwal baru di menu <strong>Kelola Jadwal</strong></span>
                </div>
            `;
            return;
        }

        timeline.innerHTML = todaySchedules.map(j => {
            const dayStr = j.hari.map(h => h.slice(0, 3)).join(', ');
            const actType = j.aktivitas || 'Penyiraman';
            let actBadgeClass = 'tag-success';
            if (actType.includes('Fungisida')) actBadgeClass = 'tag-warning';
            else if (actType.includes('Insektisida')) actBadgeClass = 'tag-danger';
            else if (actType.includes('Pemupukan')) actBadgeClass = 'tag-info';

            const metaItems = [
                j.penanggung ? `<span><i class="fa-solid fa-user"></i> ${j.penanggung}</span>` : ''
            ].filter(Boolean).join('');
            return `
            <div class="dash-tl-item" style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start;">
                <div class="dash-tl-time" style="font-size:12px;text-align:center;font-weight:700;line-height:1.2;width:70px;background:var(--primary-light);color:var(--primary);padding:6px;border-radius:6px;flex-shrink:0;">${dayStr}</div>
                <div class="dash-tl-line" style="width:2px;background:var(--gray-200);align-self:stretch;position:relative;"></div>
                <div class="dash-tl-content" style="flex:1;min-width:0;">
                    <div class="dash-tl-blok" style="font-weight:700;color:var(--gray-900);font-size:13px;display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                        <span class="wl-blok-tag ${actBadgeClass}">${actType}</span>
                        ${j.catatan ? ` <span class="dash-tl-note" style="font-size:11px;color:var(--gray-500);font-weight:400;margin-left:4px;">${j.catatan}</span>` : ''}
                    </div>
                    ${metaItems ? `<div class="dash-tl-meta" style="display:flex;gap:12px;font-size:11px;color:var(--gray-400);flex-wrap:wrap;">${metaItems}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    // ---- Kelola Jadwal Page: in-page list ----
    updatePageStats() {
        const totalEl = document.getElementById('jadwalTotalPage');
        const aktifEl = document.getElementById('jadwalAktifPage');
        const nonaktifEl = document.getElementById('jadwalNonaktifPage');
        if (totalEl) totalEl.textContent = this.data.length;
        const aktif = this.data.filter(d => d.aktif).length;
        if (aktifEl) aktifEl.textContent = aktif;
        if (nonaktifEl) nonaktifEl.textContent = this.data.length - aktif;
    },

    renderPageList() {
        const list = document.getElementById('jadwalPageList');
        const empty = document.getElementById('jadwalPageEmpty');
        if (!list) return;
        const filtered = this.getFiltered();
        if (filtered.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        if (empty) empty.style.display = 'none';
        list.innerHTML = filtered.map(j => this.renderListItem(j)).join('');
        this.bindListEvents(list);
        this.updatePageStats();
    },

    renderListItem(j) {
        const dayStr = j.hari.map(h => h.slice(0, 3)).join(', ');
        const actType = j.aktivitas || 'Penyiraman';
        let actBadgeClass = 'tag-success';
        if (actType.includes('Fungisida')) actBadgeClass = 'tag-warning';
        else if (actType.includes('Insektisida')) actBadgeClass = 'tag-danger';
        else if (actType.includes('Pemupukan')) actBadgeClass = 'tag-info';

        const meta = [
            j.penanggung ? `<i class="fa-solid fa-user"></i> ${j.penanggung}` : ''
        ].filter(Boolean).join(' &nbsp;\u2022&nbsp; ');

        return `
        <div class="wl-item ${j.aktif ? '' : 'inactive'}" data-id="${j.id}">
            <div class="wl-time" style="font-size:12px;text-align:center;font-weight:700;line-height:1.2;width:70px;background:var(--primary-light);color:var(--primary);padding:6px;border-radius:6px;flex-shrink:0;">${dayStr}</div>
            <div class="wl-info" style="flex:1;min-width:0;margin-left:8px;">
                <div class="wl-blok" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-weight:700;color:var(--gray-900);font-size:13px;flex-wrap:wrap;">
                    <span class="wl-blok-tag ${actBadgeClass}">${actType}</span>
                    ${j.catatan ? ` <span style="font-size:11px;color:var(--gray-500);font-weight:400;margin-left:4px;">${j.catatan}</span>` : ''}
                </div>
                ${meta ? `<div class="wl-meta" style="display:flex;gap:10px;font-size:11px;color:var(--gray-400);flex-wrap:wrap;">${meta}</div>` : ''}
            </div>
            <label class="toggle-switch wl-toggle">
                <input type="checkbox" class="wl-toggle-input" data-id="${j.id}" ${j.aktif ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
            <div class="wl-actions">
                <button class="wl-act edit wl-edit" data-id="${j.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="wl-act del wl-del" data-id="${j.id}"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    },

    bindListEvents(list) {
        list.querySelectorAll('.wl-del').forEach(btn => {
            btn.addEventListener('click', () => this.confirmDelete(btn.dataset.id));
        });
        list.querySelectorAll('.wl-edit').forEach(btn => {
            btn.addEventListener('click', () => this.openEditForm(btn.dataset.id));
        });
        list.querySelectorAll('.wl-toggle-input').forEach(chk => {
            chk.addEventListener('change', () => {
                this.toggle(chk.dataset.id);
                const item = chk.closest('.wl-item');
                if (item) item.classList.toggle('inactive', !chk.checked);
                this.updateStatCard();
                this.updatePageStats();
                this.renderDashboardTimeline();
                renderWelcomeBannerSchedule();
                Toast.success(chk.checked ? 'Jadwal diaktifkan' : 'Jadwal dinonaktifkan');
                const sched = this.data.find(d => d.id === chk.dataset.id);
                if (sched) {
                    logUserAction(`${chk.checked ? 'Mengaktifkan' : 'Menonaktifkan'} jadwal ${sched.aktivitas}`);
                }
            });
        });
    },

    confirmDelete(id) {
        const item = this.data.find(d => d.id === id);
        if (!item) return;
        CustomConfirm.show(`Apakah Anda yakin ingin menghapus jadwal ${item.aktivitas}?`, () => {
            const act = item.aktivitas;
            this.delete(id);
            this.renderPageList();
            this.updateStatCard();
            this.renderDashboardTimeline();
            renderWelcomeBannerSchedule();
            Toast.success('Jadwal berhasil dihapus');
            logUserAction(`Menghapus jadwal ${act}`);
        });
    },

    // ---- Modal for Add/Edit ----
    openModal() {
        document.getElementById('modalJadwal').classList.add('show');
    },

    closeModal() {
        const overlay = document.getElementById('modalJadwal');
        if (overlay) overlay.classList.remove('show');
    },

    openAddForm() {
        document.getElementById('editJadwalId').value = '';
        document.getElementById('jadwalAktivitas').value = 'Penyiraman';
        document.getElementById('jadwalPenanggung').value = '';
        document.getElementById('jadwalCatatan').value = '';
        document.getElementById('modalJadwalTitle').textContent = 'Tambah Jadwal Baru';
        document.querySelectorAll('#jadwalPage .day-btn').forEach(b => b.classList.remove('selected'));
        this.openModal();
    },

    openEditForm(id) {
        const item = this.data.find(d => d.id === id);
        if (!item) return;
        document.getElementById('editJadwalId').value = id;
        document.getElementById('jadwalAktivitas').value = item.aktivitas || 'Penyiraman';
        document.getElementById('jadwalPenanggung').value = item.penanggung || '';
        document.getElementById('jadwalCatatan').value = item.catatan || '';
        document.getElementById('modalJadwalTitle').textContent = 'Edit Jadwal';
        document.querySelectorAll('#jadwalPage .day-btn').forEach(b => {
            b.classList.toggle('selected', item.hari.includes(b.dataset.day));
        });
        this.openModal();
    },

    getSelectedDays() {
        return Array.from(document.querySelectorAll('#jadwalPage .day-btn.selected')).map(b => b.dataset.day);
    },

    saveFromForm() {
        const aktivitas = document.getElementById('jadwalAktivitas').value;
        const hari = this.getSelectedDays();
        const penanggung = document.getElementById('jadwalPenanggung').value;
        const catatan = document.getElementById('jadwalCatatan').value.trim();
        const editId = document.getElementById('editJadwalId').value;

        if (hari.length === 0) { Toast.error('Pilih minimal 1 hari'); return; }

        const jadwal = { aktivitas, hari, penanggung, catatan };
        if (editId) jadwal.id = editId;

        const action = this.upsert(jadwal);
        this.save();
        this.updateStatCard();
        this.updatePageStats();
        this.renderPageList();
        this.renderDashboardTimeline();
        renderWelcomeBannerSchedule();
        Toast.success(action === 'created' ? `Jadwal berhasil ditambahkan!` : `Jadwal berhasil diperbarui!`);
        logUserAction(action === 'created' ? `Membuat jadwal ${aktivitas} baru` : `Memperbarui jadwal ${aktivitas}`);
        this.closeModal();
    },

    // Navigate to jadwal page
    goToJadwalPage() {
        const menuLinks = $$('.sidebar-menu .menu-link');
        menuLinks.forEach(link => {
            if (link.dataset.page === 'jadwalPage') {
                link.click();
            }
        });
    },

    init() {
        this.load();
        this.updateStatCard();
        this.renderDashboardTimeline();

        // Dashboard: "Kelola Jadwal" link
        const goToLink = document.getElementById('goToKelolajadwal');
        if (goToLink) {
            goToLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToJadwalPage();
            });
        }

        // Kelola Jadwal Page: "Tambah Jadwal Baru" button
        const btnTambahPage = document.getElementById('btnTambahJadwalPage');
        if (btnTambahPage) {
            btnTambahPage.addEventListener('click', () => this.openAddForm());
        }

        // Modal close buttons
        document.getElementById('closeModalJadwal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelModalJadwal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalJadwal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalJadwal')) this.closeModal();
        });

        // Save button
        document.getElementById('simpanJadwal')?.addEventListener('click', () => this.saveFromForm());

        // Day picker buttons
        document.querySelectorAll('#jadwalPage .day-btn').forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('selected'));
        });

        // Escape to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Initial render
        this.renderPageList();
    }
};

const GridCardManager = {
    storageKey: 'fayseri_grid_cards_override',
    data: {},

    load() {
        const saved = Storage.get(this.storageKey);
        if (saved) {
            this.data = saved;
        } else {
            this.data = {};
        }
    },

    save() {
        Storage.set(this.storageKey, this.data);
    },

    apply() {
        const totalTanamanCount = (typeof DaftarTanaman !== 'undefined' && DaftarTanaman.data) ? DaftarTanaman.data.length : 0;
        const totalPekerjaCount = (typeof PekerjaLap !== 'undefined' && PekerjaLap.data) ? PekerjaLap.data.length : 0;
        
        let avgSkor = 0;
        if (typeof AnalisisTanaman !== 'undefined' && AnalisisTanaman.data && AnalisisTanaman.data.length > 0) {
            const totalSkor = AnalisisTanaman.data.reduce((sum, item) => sum + (Number(item.skor) || 0), 0);
            avgSkor = parseFloat((totalSkor / AnalisisTanaman.data.length).toFixed(1));
        }

        let avgAge = 0;
        if (typeof DaftarTanaman !== 'undefined' && DaftarTanaman.data && DaftarTanaman.data.length > 0) {
            const totalAge = DaftarTanaman.data.reduce((sum, t) => {
                const ageNum = parseInt(t.umur) || 0;
                return sum + ageNum;
            }, 0);
            avgAge = totalAge / DaftarTanaman.data.length;
        }

        const activeSchedules = (typeof WateringSchedule !== 'undefined' && Array.isArray(WateringSchedule.data))
            ? WateringSchedule.data.filter(item => item.aktif)
            : [];

        const dayOrder = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const formatDays = (days) => {
            if (!days || days.length === 0) return 'Belum ada jadwal';
            const sortedDays = [...new Set(days)].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
            return sortedDays.map(day => day.slice(0, 3)).join(', ');
        };

        const insektisidaDays = formatDays(activeSchedules
            .filter(item => item.aktivitas.includes('Insektisida'))
            .flatMap(item => item.hari));
        const fungisidaDays = formatDays(activeSchedules
            .filter(item => item.aktivitas.includes('Fungisida'))
            .flatMap(item => item.hari));
        const pemupukanDays = formatDays(activeSchedules
            .filter(item => item.aktivitas === 'Pemupukan')
            .flatMap(item => item.hari));
        const penyiramanDays = formatDays(activeSchedules
            .filter(item => item.aktivitas === 'Penyiraman')
            .flatMap(item => item.hari));

        $$('.stat-card[data-grid-id]').forEach(card => {
            const id = card.dataset.gridId;
            const labelEl = card.querySelector('.card-label');
            const valueEl = card.querySelector('.card-value');
            const trendEl = card.querySelector('.card-trend');

            // Apply calculated real values
            if (id === '1') {
                const totalJumlah = (typeof DaftarTanaman !== 'undefined' && typeof DaftarTanaman.getTotalJumlah === 'function')
                    ? DaftarTanaman.getTotalJumlah()
                    : 0;
                const totalVarietas = (typeof DaftarTanaman !== 'undefined' && DaftarTanaman.data)
                    ? DaftarTanaman.data.length
                    : 0;

                if (valueEl) valueEl.textContent = totalJumlah.toLocaleString('id-ID');

                if (trendEl) {
                    trendEl.className = 'card-trend up';
                    trendEl.style.color = '';
                    trendEl.innerHTML = `<i class="fa-solid fa-leaf"></i> ${totalVarietas} Varietas Tanaman`;
                }
            } else if (id === '2') {
                if (valueEl) valueEl.textContent = totalPekerjaCount;
                const aktifCount = (typeof PekerjaLap !== 'undefined' && PekerjaLap.data)
                    ? PekerjaLap.data.filter(x => x.status === 'Aktif').length
                    : 0;
                if (trendEl) {
                    trendEl.className = 'card-trend up';
                    trendEl.style.color = '';
                    trendEl.innerHTML = `<i class="fa-solid fa-user-check"></i> ${aktifCount} Aktif`;
                }
            } else if (id === '3') {
                if (valueEl) valueEl.textContent = avgSkor > 0 ? avgSkor + '%' : '—%';
                if (trendEl) {
                    const hasProblem = (typeof AnalisisTanaman !== 'undefined' && AnalisisTanaman.data)
                        ? AnalisisTanaman.data.some(x => x.skor < 90)
                        : false;
                    const hasTanaman = (typeof AnalisisTanaman !== 'undefined' && AnalisisTanaman.data)
                        ? AnalisisTanaman.data.length > 0
                        : false;
                    trendEl.className = hasProblem ? 'card-trend down' : 'card-trend up';
                    trendEl.style.color = hasProblem ? 'var(--danger)' : '';
                    trendEl.innerHTML = !hasTanaman
                        ? `<i class="fa-solid fa-seedling"></i> Belum Ada Tanaman`
                        : (hasProblem
                            ? `<i class="fa-solid fa-triangle-exclamation"></i> Perlu Perawatan`
                            : `<i class="fa-solid fa-circle-check"></i> Sistem Optimal`);
                }
            } else if (id === '4') {
                const remaining = avgAge > 0 ? Math.max(1, 75 - Math.round(avgAge)) : 0;
                if (valueEl) valueEl.textContent = remaining > 0 ? remaining + ' Hari' : '—';
                if (trendEl) {
                    trendEl.className = 'card-trend';
                    trendEl.style.color = 'var(--gray-500)';
                    trendEl.innerHTML = avgAge > 0 
                        ? `<i class="fa-solid fa-calendar"></i> Rata-rata Umur: ${Math.round(avgAge)} Hari`
                        : `<i class="fa-solid fa-calendar"></i> Belum ada data umur`;
                }
            } else if (id === '5') {
                if (valueEl) valueEl.textContent = (AppState.envData.lembab || 68) + '%';
                if (trendEl && typeof AppState.envData.lembabChange === 'number') {
                    const diff = AppState.envData.lembabChange;
                    if (diff > 0) {
                        trendEl.className = 'card-trend up';
                        trendEl.style.color = '';
                        trendEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> +${diff}%`;
                    } else if (diff < 0) {
                        trendEl.className = 'card-trend down';
                        trendEl.style.color = '';
                        trendEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${diff}%`;
                    } else {
                        trendEl.className = 'card-trend';
                        trendEl.style.color = 'var(--gray-500)';
                        trendEl.innerHTML = `<i class="fa-solid fa-minus"></i> 0%`;
                    }
                }
            } else if (id === '6') {
                // Jadwal Pemupukan - handled by WateringSchedule.updateStatCard()
            } else if (id === '7') {
                // Jadwal Penyiraman - handled by WateringSchedule.updateStatCard()
            } else if (id === '8') {
                // Jadwal Penyemprotan - handled by WateringSchedule.updateStatCard()
            }

            const override = this.data[id];
            if (override) {
                if (labelEl && override.label !== undefined) labelEl.textContent = override.label;
                if (valueEl && override.value !== undefined && !['1', '2', '3', '4', '5', '6', '7', '8'].includes(id)) {
                    valueEl.textContent = override.value;
                }
                
                if (trendEl && override.trend !== undefined && !['4', '5', '6', '7', '8'].includes(id)) {
                    trendEl.classList.remove('up', 'down', 'neutral');
                    
                    if (override.trendType === 'up') {
                        trendEl.classList.add('up');
                        trendEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${override.trend}`;
                    } else if (override.trendType === 'down') {
                        trendEl.classList.add('down');
                        trendEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${override.trend}`;
                    } else {
                        trendEl.classList.add('neutral');
                        trendEl.style.color = 'var(--gray-500)';
                        trendEl.innerHTML = override.trend;
                    }
                }
            }
        });

        // Update Status Lapangan card dynamically
        const statusCard = document.querySelector('.status-card');
        if (statusCard) {
            const valEl = statusCard.querySelector('.card-value');
            const trendEl = statusCard.querySelector('.card-trend');
            
            const activeTasksCount = activeSchedules.length;
            const hasSakit = (typeof AnalisisTanaman !== 'undefined' && AnalisisTanaman.data)
                ? AnalisisTanaman.data.some(x => x.skor < 85)
                : false;
                
            if (valEl) {
                valEl.textContent = hasSakit ? 'Perhatian' : 'Optimal';
            }
            if (trendEl) {
                if (hasSakit) {
                    trendEl.className = 'card-trend down';
                    trendEl.style.color = 'var(--danger)';
                    trendEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Ada tanaman waspada/sakit`;
                } else {
                    trendEl.className = 'card-trend up';
                    trendEl.style.color = '';
                    trendEl.innerHTML = `<i class="fa-solid fa-check"></i> ${activeTasksCount} tugas aktif berjalan`;
                }
            }
        }
    },

    init() {
        this.load();
        this.apply();
        
        // Bind the "Sinkronkan Data" Dashboard button
        const btnSync = document.getElementById('btnRefreshDashboard');
        if (btnSync) {
            btnSync.addEventListener('click', async (e) => {
                e.preventDefault();
                const original = btnSync.innerHTML;
                btnSync.disabled = true;
                btnSync.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Mensinkronkan...';
                
                try {
                    if (typeof AuthManager !== 'undefined' && typeof AuthManager.refreshAppModules === 'function') {
                        AuthManager.refreshAppModules();
                    }
                    this.apply();
                } catch (err) {
                    console.error('Error syncing:', err);
                } finally {
                    btnSync.disabled = false;
                    btnSync.innerHTML = original;
                }
            });
        }
    }
};

function initWateringSchedule() {
    WateringSchedule.init();
}

// ================= SUPABASE AUTHENTICATION SYSTEM =================
const AuthManager = {
    currentUser: null,
    
    init() {
        // ── Langkah 1: Cek sesi yang sudah ada di localStorage sebelum menunggu event ──
        // Ini penting agar halaman tidak flash ke layar login saat refresh.
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                this.currentUser = session.user;
                this.handleLoggedInState(session.user);
                console.log('✅ Sesi admin aktif sampai:', new Date(session.expires_at * 1000).toLocaleString('id-ID'));
            } else {
                this.currentUser = null;
                this.handleLoggedOutState();
            }
        });

        // ── Langkah 2: Pasang listener perubahan status auth (login/logout/token refresh) ──
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.handleLoggedInState(session.user);
            } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                this.currentUser = null;
                this.handleLoggedOutState();
            } else if (event === 'TOKEN_REFRESHED') {
                // Token diperbarui otomatis di background — tidak perlu login ulang
                if (session) {
                    this.currentUser = session.user;
                    console.log('🔄 Token admin diperbarui otomatis. Aktif sampai:', new Date(session.expires_at * 1000).toLocaleString('id-ID'));
                }
            }
        });
        
        // Bind UI Elements for Login/Register switching
        const btnSwitchToReg = document.getElementById('btnSwitchToRegister');
        const btnSwitchToLog = document.getElementById('btnSwitchToLogin');
        const loginForm = document.getElementById('loginForm');
        const regForm = document.getElementById('registerForm');
        const subtitle = document.getElementById('loginSubtitle');
        
        if (btnSwitchToReg) {
            btnSwitchToReg.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                regForm.style.display = 'flex';
                subtitle.textContent = 'Daftar akun admin pertanian baru';
            });
        }
        
        if (btnSwitchToLog) {
            btnSwitchToLog.addEventListener('click', (e) => {
                e.preventDefault();
                regForm.style.display = 'none';
                loginForm.style.display = 'flex';
                subtitle.textContent = 'Silakan masuk ke panel admin pertanian';
            });
        }
        
        // Bind Submit Forms
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                const pass = document.getElementById('loginPassword').value;
                
                const btnSubmit = document.getElementById('btnLoginSubmit');
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
                
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: pass
                });
                
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>Masuk</span> <i class="fa-solid fa-right-to-bracket"></i>`;
                
                if (error) {
                    const sub = document.getElementById('loginSubtitle');
                    if (sub) {
                        sub.textContent = 'Login Gagal: ' + this.translateAuthError(error.message);
                        sub.style.color = 'var(--danger)';
                    }
                } else {
                    const sub = document.getElementById('loginSubtitle');
                    if (sub) {
                        sub.textContent = 'Login Berhasil! Selamat datang.';
                        sub.style.color = '';
                    }
                }
            });
        }
        
        if (regForm) {
            regForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nama = document.getElementById('registerNama').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const pass = document.getElementById('registerPassword').value;
                
                if (pass.length < 6) {
                    Toast.warning('Password minimal harus 6 karakter!');
                    return;
                }
                
                const btnSubmit = document.getElementById('btnRegisterSubmit');
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
                
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: pass,
                    options: {
                        data: {
                            full_name: nama
                        }
                    }
                });
                
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>Daftar Akun</span> <i class="fa-solid fa-user-plus"></i>`;
                
                if (error) {
                    Toast.error('Registrasi Gagal: ' + this.translateAuthError(error.message));
                } else {
                    if (data && data.user && data.session === null) {
                        Toast.success('Registrasi berhasil! Silakan cek inbox/spam email Anda untuk verifikasi akun.');
                        regForm.style.display = 'none';
                        loginForm.style.display = 'flex';
                        subtitle.textContent = 'Silakan masuk ke panel admin pertanian';
                    } else {
                        Toast.success('Akun berhasil dibuat dan otomatis masuk!');
                    }
                }
            });
        }
        
        // User mini profile button click to toggle dropdown
        const profileBtn = document.getElementById('userProfileButton');
        const dropdown = document.getElementById('userProfileDropdown');
        if (profileBtn && dropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.style.display === 'none';
                dropdown.style.display = isHidden ? 'flex' : 'none';
            });
            
            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        }
        
        // Profile Settings click inside dropdown
        const btnSetting = document.getElementById('btnProfileSetting');
        if (btnSetting) {
            btnSetting.addEventListener('click', (e) => {
                e.preventDefault();
                const profilLink = document.querySelector('.sidebar-menu a[data-page="profilPage"]');
                if (profilLink) profilLink.click();
            });
        }
        
        // Logout Click
        const btnOut = document.getElementById('btnLogout');
        if (btnOut) {
            btnOut.addEventListener('click', async (e) => {
                e.preventDefault();
                CustomConfirm.show('Apakah Anda yakin ingin keluar dari panel admin?', async () => {
                    const { error } = await supabaseClient.auth.signOut();
                    if (error) {
                        Toast.error('Gagal Keluar: ' + error.message);
                    } else {
                        Toast.success('Anda telah keluar dari sistem.');
                    }
                }, 'Keluar', 'Batal', 'danger');
            });
        }
    },
    
    async handleLoggedInState(user) {
        if (user.email !== 'ahmadfaisalassaudi30@gmail.com') {
            const sub = document.getElementById('loginSubtitle');
            if (sub) {
                sub.textContent = 'Akses Ditolak: Hanya admin utama yang diizinkan masuk.';
                sub.style.color = 'var(--danger)';
            }
            setTimeout(async () => {
                await supabaseClient.auth.signOut();
                if (sub) {
                    sub.textContent = 'Silakan masuk ke panel admin pertanian';
                    sub.style.color = '';
                }
            }, 4000);
            return;
        }

        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
        
        // 1. Sync all data from Supabase to local storage first
        await Storage.syncFromDatabase(user.id);
        
        // 2. Apply theme from synced database if available
        const syncedTheme = Storage.get(APP_CONFIG.storageKeys.theme);
        if (syncedTheme) {
            applyTheme(syncedTheme);
        }
        
        // 3. Check if profile in database is empty, seed it with auth meta if so
        if (typeof ProfilDanKonfigurasi !== 'undefined') {
            ProfilDanKonfigurasi.load();
            
            // If the loaded profile is empty (first-time login), seed it with user auth metadata
            if (!ProfilDanKonfigurasi.profil.nama) {
                const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
                ProfilDanKonfigurasi.profil.nama = fullName;
                ProfilDanKonfigurasi.profil.email = user.email;
                ProfilDanKonfigurasi.profil.jabatan = 'Administrator';
                
                // Save it to Supabase in background
                ProfilDanKonfigurasi.saveProfil();
            }
        }
        
        // 4. Refresh UI modules with newly loaded/seeded data
        this.refreshAppModules();

        // Mulai sinkronisasi latar belakang otomatis
        Storage.startAutoSync();

        // 5. Restore active page & sidebar state after sync is fully completed
        if (typeof restoreLastPage === 'function') {
            restoreLastPage();
        }
        if (typeof restoreSidebarState === 'function') {
            restoreSidebarState();
        }
    },
    
    handleLoggedOutState() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'flex';
        
        const dropdown = document.getElementById('userProfileDropdown');
        if (dropdown) dropdown.style.display = 'none';
        
        // Clear cached user data tables for security on logout (without wiping UI preferences or Supabase session)
        const keysToRemove = [
            'fayseri_tanaman',
            'fayseri_pekerjas',
            'fayseri_watering_schedules',
            'fayseri_kas',
            'fayseri_profil',
            'fayseri_konfig',
            'fayseri_produk_siap_jual'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        // Reset Storage userId and cache memory
        Storage.userId = null;
        Storage.cache = {};
        Storage.stopAutoSync();
        
        // Refresh modules to clear displays
        this.refreshAppModules();
    },
    
    refreshAppModules() {
        if (typeof ProfilDanKonfigurasi !== 'undefined' && typeof ProfilDanKonfigurasi.apply === 'function') {
            ProfilDanKonfigurasi.load();
            ProfilDanKonfigurasi.apply();
        }
        if (typeof DashboardBlok !== 'undefined' && typeof DashboardBlok.load === 'function') {
            DashboardBlok.load();
            DashboardBlok.render();
        }
        if (typeof DaftarTanaman !== 'undefined' && typeof DaftarTanaman.load === 'function') {
            DaftarTanaman.load();
            DaftarTanaman.render();
        }
        if (typeof StokLogistik !== 'undefined' && typeof StokLogistik.load === 'function') {
            StokLogistik.load();
            StokLogistik.render();
        }
        if (typeof PekerjaLap !== 'undefined' && typeof PekerjaLap.load === 'function') {
            PekerjaLap.load();
            PekerjaLap.render();
        }
        if (typeof LaporanKas !== 'undefined' && typeof LaporanKas.load === 'function') {
            LaporanKas.load();
            LaporanKas.render();
        }
        if (typeof ProdukSiapJual !== 'undefined' && typeof ProdukSiapJual.load === 'function') {
            ProdukSiapJual.load();
            ProdukSiapJual.renderGrid();
        }
        if (typeof AktivitasLog !== 'undefined' && typeof AktivitasLog.load === 'function') {
            AktivitasLog.load();
            AktivitasLog.render();
        }
        if (typeof WateringSchedule !== 'undefined' && typeof WateringSchedule.load === 'function') {
            WateringSchedule.load();
            if (typeof WateringSchedule.renderPageList === 'function') {
                WateringSchedule.renderPageList();
            }
            if (typeof WateringSchedule.renderDashboardTimeline === 'function') {
                WateringSchedule.renderDashboardTimeline();
            }
            if (typeof WateringSchedule.updateStatCard === 'function') {
                WateringSchedule.updateStatCard();
            }
        }
        if (typeof updateEnvData === 'function') {
            updateEnvData();
        }
        if (typeof renderWelcomeBannerSchedule === 'function') {
            renderWelcomeBannerSchedule();
        }
        if (typeof BukuPanduan !== 'undefined' && typeof BukuPanduan.load === 'function') {
            BukuPanduan.load();
            BukuPanduan.renderTable();
        }
    },
    
    translateAuthError(msg) {
        if (msg.includes('Invalid login credentials')) return 'Email atau Password salah!';
        if (msg.includes('User already registered')) return 'Email ini sudah terdaftar!';
        if (msg.includes('Password should be at least')) return 'Password minimal 6 karakter!';
        if (msg.includes('Signup requires a valid email')) return 'Email tidak valid!';
        return msg;
    }
};

// ================= LOGIN & THEME INIT =================
function initTheme() {
    let currentTheme = null;
    try {
        const saved = localStorage.getItem(APP_CONFIG.storageKeys.theme);
        currentTheme = saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.warn('Gagal membaca tema dari localStorage:', e);
    }
    
    if (!currentTheme) {
        currentTheme = Storage.get(APP_CONFIG.storageKeys.theme);
    }
    
    if (!currentTheme) {
        currentTheme = 'faesa';
    }
    applyTheme(currentTheme);
}

function applyBannerBackgroundImage() {
    const candidates = ['images/gambar1.jpeg', 'images/gambar1.jpg', 'images/gambar1.png', 'images/webp'];

    const tryNext = (index) => {
        const banner = document.querySelector('.content-banner');
        if (index >= candidates.length) {
            document.documentElement.classList.remove('banner-has-image');
            if (banner) banner.style.backgroundImage = '';
            return;
        }

        const candidate = candidates[index];
        const img = new Image();
        img.onload = () => {
            document.documentElement.classList.add('banner-has-image');
            if (banner) {
                banner.style.backgroundImage = `url("${candidate}")`;
            }
        };
        img.onerror = () => tryNext(index + 1);
        img.src = candidate;
    };

    tryNext(0);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set(APP_CONFIG.storageKeys.theme, theme);
    try {
        localStorage.setItem(APP_CONFIG.storageKeys.theme, JSON.stringify(theme));
    } catch (e) {
        console.warn('Gagal menyimpan tema ke localStorage:', e);
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fa-solid fa-sun';
            } else {
                icon.className = 'fa-solid fa-moon';
            }
        }
    }

    refreshChartsForTheme(theme);
}

function refreshChartsForTheme(theme) {
    const gridColor = theme === 'dark' ? '#1E293B' : '#F3F4F6';
    const textColor = theme === 'dark' ? '#94A3B8' : '#6B7280';
    
    // Refresh Kesehatan Line Chart
    const kesehatanChart = AppState.charts.kesehatan;
    if (kesehatanChart && kesehatanChart.options && kesehatanChart.options.scales) {
        if (kesehatanChart.options.scales.x && kesehatanChart.options.scales.x.ticks) {
            kesehatanChart.options.scales.x.ticks.color = textColor;
        }
        if (kesehatanChart.options.scales.y && kesehatanChart.options.scales.y.ticks) {
            kesehatanChart.options.scales.y.ticks.color = textColor;
        }
        if (kesehatanChart.options.scales.y.grid) {
            kesehatanChart.options.scales.y.grid.color = gridColor;
        }
        if (kesehatanChart.options.scales.y1 && kesehatanChart.options.scales.y1.ticks) {
            kesehatanChart.options.scales.y1.ticks.color = textColor;
        }
        kesehatanChart.update();
    }

    // Refresh Analysis Chart
    const analysisChart = AppState.charts.analysis;
    if (analysisChart && analysisChart.options && analysisChart.options.scales) {
        if (analysisChart.options.scales.x && analysisChart.options.scales.x.ticks) {
            analysisChart.options.scales.x.ticks.color = textColor;
        }
        if (analysisChart.options.scales.y && analysisChart.options.scales.y.ticks) {
            analysisChart.options.scales.y.ticks.color = textColor;
        }
        if (analysisChart.options.scales.y.grid) {
            analysisChart.options.scales.y.grid.color = gridColor;
        }
        analysisChart.update();
    }
}

// ================= TOPBAR WIB REAL-TIME CLOCK =================
function getTzConfig() {
    const tz = (typeof ProfilDanKonfigurasi !== 'undefined' && ProfilDanKonfigurasi.konfig && ProfilDanKonfigurasi.konfig.zonaWaktu) 
        ? ProfilDanKonfigurasi.konfig.zonaWaktu 
        : 'WIB (UTC+7)';
    if (tz.includes('WITA')) {
        return { zone: 'Asia/Makassar', label: 'WITA' };
    } else if (tz.includes('WIT')) {
        return { zone: 'Asia/Jayapura', label: 'WIT' };
    } else {
        return { zone: 'Asia/Jakarta', label: 'WIB' };
    }
}

function toDispTemp(celsius) {
    const isF = (typeof ProfilDanKonfigurasi !== 'undefined' && ProfilDanKonfigurasi.konfig && ProfilDanKonfigurasi.konfig.satuanSuhu && ProfilDanKonfigurasi.konfig.satuanSuhu.includes('Fahrenheit'));
    if (isF) {
        return Math.round((celsius * 9 / 5) + 32);
    }
    return celsius;
}

function getTempUnitLabel() {
    const isF = (typeof ProfilDanKonfigurasi !== 'undefined' && ProfilDanKonfigurasi.konfig && ProfilDanKonfigurasi.konfig.satuanSuhu && ProfilDanKonfigurasi.konfig.satuanSuhu.includes('Fahrenheit'));
    return isF ? '°F' : '°C';
}

function updateTopbarClock() {
    const clockEl = document.getElementById('clockVal');
    if (!clockEl) return;
    const tzInfo = getTzConfig();
    const options = {
        timeZone: tzInfo.zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    clockEl.textContent = new Intl.DateTimeFormat('en-US', options).format(new Date()) + ' ' + tzInfo.label;
}

function startTopbarClock() {
    updateTopbarClock();
    setInterval(updateTopbarClock, 10000);
}

// ================= INISIALISASI UTAMA =================
function initApp() {
    // Bersihkan override kartu fiksi dari localStorage agar nilai riil dinamis aktif
    localStorage.removeItem('fayseri_grid_cards_override');

    // Bersihkan data kosong ([]) di localStorage agar data default berkualitas tinggi ter-seed otomatis
    const keysToValidate = ['fayseri_tanaman', 'fayseri_pekerjas', 'fayseri_watering_schedules', 'fayseri_produk_siap_jual'];
    keysToValidate.forEach(key => {
        try {
            const val = localStorage.getItem(key);
            if (!val || val === '[]' || val === '""') {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn(`Gagal memvalidasi key localStorage ${key}:`, e);
        }
    });

    // Bersihkan data kas fiktif dari localStorage agar terhapus bersih
    try {
        const kasVal = localStorage.getItem('fayseri_kas');
        if (kasVal) {
            let kasData = JSON.parse(kasVal);
            if (Array.isArray(kasData)) {
                const cleaned = kasData.filter(x => !['KAS-01', 'KAS-02', 'KAS-03', 'KAS-001', 'KAS-002', 'KAS-003'].includes(x.id) && !x.id.startsWith('KAS-0'));
                if (cleaned.length !== kasData.length) {
                    localStorage.setItem('fayseri_kas', JSON.stringify(cleaned));
                }
            }
        }
    } catch (e) {}

    // Bersihkan data produk fiktif bawaan dari localStorage agar terhapus bersih
    try {
        const prodVal = localStorage.getItem('fayseri_produk_siap_jual');
        if (prodVal) {
            let prodData = JSON.parse(prodVal);
            if (Array.isArray(prodData)) {
                const cleaned = prodData.filter(x => !['PRD-01', 'PRD-02', 'PRD-03'].includes(x.id) && !x.id.startsWith('PRD-0'));
                if (cleaned.length !== prodData.length) {
                    localStorage.setItem('fayseri_produk_siap_jual', JSON.stringify(cleaned));
                }
            }
        }
    } catch (e) {}

    initTheme();
    AuthManager.init();
    startTopbarClock();
    applyBannerBackgroundImage();
    logSystemInfo();
    checkDuplicateCanvasIds();
    Toast.init();
    createSidebarToggle();
    restoreSidebarState();
    initNavigation();
    initRefreshButton();
    initAddDataButton();
    initTableSorting();
    initTableSearch();
    initTableFilter();
    initDetailButtons();
    initFormValidation();
    initSaveButtons();
    initViewAllLinks();
    initKeyboardShortcuts();
    initExportButtons();
    initStatCardEffects();
    initActivityClick();
    initTagClickInfo();
    initWateringSchedule();
    GridCardManager.init();

    // Inisialisasi Modul Kustom CRUD dan Tombol Dinamis
    ProfilDanKonfigurasi.init();
    DashboardBlok.init();
    AnalisisTanaman.init();
    DaftarTanaman.init();
    StokLogistik.init();
    PekerjaLap.init();
    LaporanKas.init();
    ProdukSiapJual.init();
    BukuPanduan.init();
    AktivitasLog.init();
    ChartPertumbuhanFilter.init();

    updateEnvData();
    renderWelcomeBannerSchedule();
    setInterval(updateEnvData, APP_CONFIG.envUpdateInterval);

    setTimeout(() => {
        initPageAnimations(AppState.currentPage);
    }, 300);
}

// ================= JALANKAN SAAT DOM SIAP =================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
