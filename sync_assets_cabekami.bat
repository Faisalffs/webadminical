@echo off
:: =====================================================================
:: CABE KAMI ONLINE STORE - ANDROID ASSET SYNCHRONIZATION SCRIPT
:: Dibuat oleh: Tim Faesa Technology
:: =====================================================================
chcp 65001 > nul
title Sinkronisasi Aset Cabe Kami ke Android

echo =====================================================================
echo   SINKRONISASI ASET WEB TOKO ONLINE CABE KAMI KE PROYEK ANDROID
echo =====================================================================
echo.

:: Menentukan path asal (root) dan tujuan
set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%~dp0CabeKamiAndroid\app\src\main\assets\www"

echo [1/4] Menyiapkan direktori aset Android...
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
    echo - Membuat direktori baru: "%TARGET_DIR%"
) else (
    echo - Membersihkan berkas lama di direktori target...
    del /q /f /s "%TARGET_DIR%\*" > nul 2>&1
)

:: Membersihkan direktori build untuk menghindari cache build Android Studio
echo - Membersihkan cache build Android (agar tidak menggunakan berkas lama)...
if exist "%~dp0CabeKamiAndroid\app\build" (
    rd /s /q "%~dp0CabeKamiAndroid\app\build"
    echo   - Cache build lama berhasil dibersihkan!
)


echo [2/4] Menyalin berkas inti toko online Cabe Kami...
echo - Menyalin index.html...
copy /y "%SOURCE_DIR%index.html" "%TARGET_DIR%\index.html" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin index.html!
    pause
    exit /b 1
)

echo - Menyalin style.css...
copy /y "%SOURCE_DIR%style.css" "%TARGET_DIR%\style.css" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin style.css!
    pause
    exit /b 1
)

echo - Menyalin app.js...
copy /y "%SOURCE_DIR%app.js" "%TARGET_DIR%\app.js" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin app.js!
    pause
    exit /b 1
)

echo - Menyalin favicon.png...
copy /y "%SOURCE_DIR%favicon.png" "%TARGET_DIR%\favicon.png" > nul

echo [3/4] Menyalin berkas gambar...
if exist "%SOURCE_DIR%images" (
    if not exist "%TARGET_DIR%\images" mkdir "%TARGET_DIR%\images"
    echo - Menyalin aset gambar dari folder images...
    xcopy "%SOURCE_DIR%images" "%TARGET_DIR%\images" /y /e /q > nul
) else (
    echo - Tidak ada folder gambar eksternal ditemukan.
)

echo.
echo =====================================================================
echo [4/4] SINKRONISASI SELESAI DENGAN SUKSES!
echo.
echo Aset web Cabe Kami terbaru berhasil disalin ke folder aset Android Anda:
echo "%TARGET_DIR%"
echo Anda sekarang dapat membuka folder 'CabeKamiAndroid' di Android Studio
echo dan langsung melakukan build/run aplikasi Android Anda!
echo =====================================================================
echo.
pause
