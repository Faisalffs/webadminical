package com.faesa.cabekami;

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
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    
    // Properti untuk penanganan File Upload (Unggah Lampiran/Gambar) menggunakan API Jetpack modern
    private ValueCallback<Uri[]> uploadMessage;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    // Properti untuk penanganan double-back-to-exit
    private boolean doubleBackToExitPressedOnce = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Memaksa Hardware Acceleration penuh tingkat Activity Window untuk animasi 60 FPS super smooth
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        
        // Mengatur status bar warna default Cabe Kami secara native
        adjustSystemBars("faesa");

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

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
        
        // Aktifkan eksekusi JavaScript (Sangat wajib karena Cabe Kami berbasis Vanilla JS)
        webSettings.setJavaScriptEnabled(true);
        
        // Aktifkan DOM Storage (Sangat wajib agar Supabase Auth dan localStorage favorit tetap tersimpan)
        webSettings.setDomStorageEnabled(true);
        
        // Dukungan zoom
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false); // Sembunyikan tombol zoom overlay
        
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
        // Dengan FLAG_HARDWARE_ACCELERATED aktif di tingkat window, memaksa LAYER_TYPE_HARDWARE bersama
        // prioritas rendering HIGH akan memaksa GPU mengunci frame rate rendering WebView pada 60 FPS yang stabil.
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(true);
        }

        // --- MENGKONFIGURASI WEBVIEWCLIENT (NAVIGASI) ---
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                
                // Sinkronisasi status bar HP dengan warna tema Cabe Kami secara reaktif
                syncStatusBarTheme();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Mencegah link WhatsApp atau nomor telepon dilempar ke webview (tapi dilempar ke aplikasi eksternal WA di HP!)
                if (url.startsWith("whatsapp:") || url.contains("wa.me") || url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Aplikasi WhatsApp tidak ditemukan di HP Anda.", Toast.LENGTH_SHORT).show();
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
                    Toast.makeText(MainActivity.this, "Gagal memuat katalog toko online Cabe Kami.", Toast.LENGTH_LONG).show();
                }
            }
        });

        // --- MENGKONFIGURASI WEBCHROMECLIENT (DOKUMEN & FOTO UPLOAD) ---
        webView.setWebChromeClient(new WebChromeClient() {
            // Mengatasi upload file (Galeri/Kamera) jika dibutuhkan di masa mendatang
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
                    Toast.makeText(MainActivity.this, "Gagal membuka galeri foto.", Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }
        });

        // --- MEMUAT ASET LOKAL UTAMA CABE KAMI ---
        webView.loadUrl("file:///android_asset/www/index.html");

        // --- PENANGANAN TOMBOL KEMBALI FISIK (ANDROID BACK BUTTON INTEGRATION) ---
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Jika di halaman utama, terapkan double press back to exit
                    if (doubleBackToExitPressedOnce) {
                        finish();
                    } else {
                        doubleBackToExitPressedOnce = true;
                        Toast.makeText(MainActivity.this, "Tekan sekali lagi untuk keluar dari Cabe Kami", Toast.LENGTH_SHORT).show();

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

    // Membaca tema aktif dari localStorage di WebView untuk menyinkronkan warna status bar HP
    private void syncStatusBarTheme() {
        webView.evaluateJavascript(
            "(function() { return localStorage.getItem('fayseri_theme') || 'faesa'; })();",
            value -> {
                // value dikembalikan dalam bentuk string dengan tanda kutip, misal "\"dark\""
                if (value != null) {
                    String theme = value.replace("\"", "");
                    adjustSystemBars(theme);
                }
            }
        );
    }

    // Mengatur warna status bar HP agar serasi dengan tema Cabe Kami yang aktif
    @SuppressWarnings("deprecation")
    private void adjustSystemBars(String theme) {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        
        int statusBarColor;
        int navBarColor;
        boolean lightStatusText = false;

        if ("dark".equalsIgnoreCase(theme)) {
            statusBarColor = ContextCompat.getColor(this, R.color.bg_dark);
            navBarColor = ContextCompat.getColor(this, R.color.bg_dark);
            lightStatusText = true;
        } else if ("light".equalsIgnoreCase(theme)) {
            statusBarColor = ContextCompat.getColor(this, R.color.white);
            navBarColor = ContextCompat.getColor(this, R.color.white);
            lightStatusText = false;
        } else {
            // Faesa Theme (Default) -> Status bar Biru Terang (#0d6efd)
            statusBarColor = ContextCompat.getColor(this, R.color.primary);
            navBarColor = ContextCompat.getColor(this, R.color.white);
            lightStatusText = true;
        }

        window.setStatusBarColor(statusBarColor);
        window.setNavigationBarColor(navBarColor);
        
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(!lightStatusText);
    }
}
