package com.faesa.fayseri;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.widget.ImageButton;
import android.view.animation.Animation;
import android.view.animation.RotateAnimation;
import android.view.animation.DecelerateInterpolator;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    
    // Properti untuk penanganan File Upload (Unggah Foto) menggunakan API Jetpack modern
    private ValueCallback<Uri[]> uploadMessage;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    // Properti untuk penanganan double-back-to-exit
    private boolean doubleBackToExitPressedOnce = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Mengatur status bar warna gelap premium (#0F172A) secara native agar menyatu dengan antarmuka Fayseri
        adjustSystemBars();

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        ImageButton btnRefresh = findViewById(R.id.btnRefresh);

        // Aksi Klik Tombol Refresh Melayang dengan Animasi Putar 60 FPS Smooth
        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                // Jalankan animasi putar (rotate) searah jarum jam secara elegan
                RotateAnimation rotate = new RotateAnimation(
                    0, 360,
                    Animation.RELATIVE_TO_SELF, 0.5f,
                    Animation.RELATIVE_TO_SELF, 0.5f
                );
                rotate.setDuration(750); // Kecepatan putaran yang pas
                rotate.setInterpolator(new DecelerateInterpolator());
                btnRefresh.startAnimation(rotate);

                // Lakukan pemuatan ulang halaman di WebView secara native
                if (webView != null) {
                    webView.reload();
                    Toast.makeText(MainActivity.this, "Memuat ulang halaman...", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // Inisialisasi launcher untuk penanganan File Upload secara modern dan aman dari peringatan deprecated
        fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (uploadMessage == null) return;
                Uri[] uris = null;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    String dataString = result.getData().getDataString();
                    if (dataString != null) {
                        uris = new Uri[]{Uri.parse(dataString)};
                    } else if (result.getData().getClipData() != null) {
                        int numSelectedFiles = result.getData().getClipData().getItemCount();
                        uris = new Uri[numSelectedFiles];
                        for (int i = 0; i < numSelectedFiles; i++) {
                            uris[i] = result.getData().getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                uploadMessage.onReceiveValue(uris);
                uploadMessage = null;
            }
        );

        // --- KONFIGURASI WEBSETTINGS YANG OPTIMAL & PRECISE ---
        WebSettings webSettings = webView.getSettings();
        
        // Aktifkan eksekusi JavaScript (Sangat wajib karena Fayseri berbasis Vanilla JS)
        webSettings.setJavaScriptEnabled(true);
        
        // Aktifkan DOM Storage (Sangat wajib agar Supabase Auth dan localSotrage preferensi tema tetap tersimpan)
        webSettings.setDomStorageEnabled(true);
        
        // Dukungan zoom
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false); // Sembunyikan tombol zoom overlay yang mengganggu visual
        
        // Akses file lokal (Wajib untuk memuat HTML, CSS, JS dari folder assets/www)
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Optimasi rendering & caching
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        
        // Mengaktifkan mixed content agar WebView di HP bisa memuat font Google, cuaca API, dan Supabase HTTPS
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        
        // --- OPTIMASI ANIMASI 60 FPS ---
        // Menghindari LAYER_TYPE_HARDWARE karena memaksa WebView melakukan caching offscreen texture
        // yang berat setiap frame. LAYER_TYPE_NONE memungkinkan render langsung ke hardware-accelerated canvas.
        webView.setLayerType(View.LAYER_TYPE_NONE, null);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(true);
        }

        // --- MENGKONFIGURASI WEBVIEWCLIENT (NAVIGASI) ---
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Tampilkan loading progress bar saat memuat
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Sembunyikan loading progress bar saat selesai memuat
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Mengalihkan klik "Buka Toko Online" di Fayseri agar langsung membuka aplikasi Cabe Kami jika terpasang
                if (url.contains("android_asset/index.html") || url.endsWith("android_asset/index.html")) {
                    Intent launchIntent = getPackageManager().getLaunchIntentForPackage("com.faesa.cabekami");
                    if (launchIntent != null) {
                        startActivity(launchIntent);
                    } else {
                        Toast.makeText(MainActivity.this, "Aplikasi Cabe Kami tidak ditemukan di HP Anda.", Toast.LENGTH_LONG).show();
                    }
                    return true;
                }
                
                // Mencegah link WhatsApp atau nomor telepon dilempar ke webview (tapi dilempar ke aplikasi eksternal WA di HP!)
                if (url.startsWith("whatsapp:") || url.startsWith("https://wa.me") || url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Aplikasi pihak ketiga tidak ditemukan untuk membuka tautan ini.", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }
                
                // Navigasi internal tetap dilakukan di dalam WebView
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    // Handle error pemuatan halaman utama (misal offline)
                    Toast.makeText(MainActivity.this, "Koneksi Bermasalah: Gagal memuat beberapa data eksternal.", Toast.LENGTH_LONG).show();
                }
            }
        });

        // --- MENGKONFIGURASI WEBCHROMECLIENT (DOKUMEN & FOTO UPLOAD) ---
        webView.setWebChromeClient(new WebChromeClient() {
            // Mengatasi upload file (Galeri/Kamera) dari HTML/JS ke Supabase Storage
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                }
                uploadMessage = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    uploadMessage = null;
                    Toast.makeText(MainActivity.this, "Gagal membuka pengelola dokumen untuk mengunggah foto.", Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }
        });

        // --- MEMUAT ASET LOKAL UTAMA FAYSERI ---
        webView.loadUrl("file:///android_asset/www/index.html");

        // --- PENANGANAN TOMBOL KEMBALI FISIK (ANDROID BACK BUTTON INTEGRATION) ---
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    // Jika webview memiliki riwayat navigasi internal, kembali di webview
                    webView.goBack();
                } else {
                    // Jika di halaman utama, terapkan double press back to exit
                    if (doubleBackToExitPressedOnce) {
                        finish();
                    } else {
                        doubleBackToExitPressedOnce = true;
                        Toast.makeText(MainActivity.this, "Tekan sekali lagi untuk keluar dari Fayseri", Toast.LENGTH_SHORT).show();

                        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                doubleBackToExitPressedOnce = false;
                            }
                        }, 2000); // Batas waktu 2 detik
                    }
                }
            }
        });
    }

    // Mengatur warna status bar dan navigasi bar HP agar serasi dengan desain tema gelap Fayseri (#0F172A)
    @SuppressWarnings("deprecation")
    private void adjustSystemBars() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.setStatusBarColor(ContextCompat.getColor(this, R.color.bg_main));
        window.setNavigationBarColor(ContextCompat.getColor(this, R.color.bg_main));
        
        // Set text status bar menjadi terang agar terbaca di atas background gelap
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(false); // false berarti teks/ikon berwarna putih/terang
    }
}
