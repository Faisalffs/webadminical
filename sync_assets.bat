@echo off
:: =====================================================================
:: FAYSERI SMART PLANT MONITORING - ANDROID ASSET SYNCHRONIZATION SCRIPT
:: Dibuat oleh: Tim Faesa Technology
:: =====================================================================
chcp 65001 > nul
title Sinkronisasi Aset Fayseri ke Android

echo =====================================================================
echo    SINKRONISASI ASET WEB FAYSERI DASHBOARD KE PROYEK ANDROID
echo =====================================================================
echo.

:: Menentukan path asal dan tujuan secara relatif
set "SOURCE_DIR=%~dp0Fayseri"
set "TARGET_DIR=%~dp0FayseriAndroid\app\src\main\assets\www"

:: Validasi folder sumber
if not exist "%SOURCE_DIR%" (
    echo [ERROR] Folder sumber Fayseri tidak ditemukan di: "%SOURCE_DIR%"
    echo Pastikan script ini dijalankan di dalam folder utama FayseriProject.
    echo.
    pause
    exit /b 1
)

echo [1/4] Menyiapkan direktori aset Android...
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
    echo - Membuat direktori baru: "%TARGET_DIR%"
) else (
    echo - Membersihkan berkas lama di direktori target...
    del /q /f /s "%TARGET_DIR%\*" > nul 2>&1
)

echo [2/4] Menyalin berkas inti dashboard...
echo - Menyalin index.html...
copy /y "%SOURCE_DIR%\index.html" "%TARGET_DIR%\index.html" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin index.html!
    pause
    exit /b 1
)

echo - Menyalin style.css...
copy /y "%SOURCE_DIR%\style.css" "%TARGET_DIR%\style.css" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin style.css!
    pause
    exit /b 1
)

echo - Menyalin script.js...
copy /y "%SOURCE_DIR%\script.js" "%TARGET_DIR%\script.js" > nul
if errorlevel 1 (
    echo [ERROR] Gagal menyalin script.js!
    pause
    exit /b 1
)

echo - Menyalin favicon.png...
copy /y "%SOURCE_DIR%\favicon.png" "%TARGET_DIR%\favicon.png" > nul

echo [3/4] Menyalin berkas gambar...
if exist "%SOURCE_DIR%\images" (
    if not exist "%TARGET_DIR%\images" mkdir "%TARGET_DIR%\images"
    echo - Menyalin aset gambar dari folder images...
    xcopy "%SOURCE_DIR%\images" "%TARGET_DIR%\images" /y /e /q > nul
) else (
    echo - Tidak ada folder gambar eksternal ditemukan.
)

echo.
echo =====================================================================
echo [4/4] SINKRONISASI SELESAI DENGAN SUKSES!
echo.
echo Aset web terbaru berhasil disalin ke folder aset Android Anda:
echo "%TARGET_DIR%"
echo Anda sekarang dapat membuka folder 'FayseriAndroid' di Android Studio
echo dan langsung melakukan build/run aplikasi Android Anda!
echo =====================================================================
echo.
pause
