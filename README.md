# Fayseri Smart Greenhouse Dashboard

## Overview

Fayseri is a lightweight, web‑based dashboard for monitoring and automating smart greenhouse operations. It is built with vanilla HTML, CSS, and JavaScript, and leverages Supabase for real‑time data storage and authentication. The project is split into two main modules:

- **Fayseri** – The web dashboard that displays plant metrics, weather data, and scheduling information.
- **Cabai** – An Android app (in `CabeKamiAndroid/` and `FayseriAndroid/`) that collects sensor data from the greenhouse and syncs it with Supabase.

> The dashboard is designed to be responsive and themeable, with three built‑in themes (Faesa, Light, Dark). It also includes a custom Aurora‑animated background for a premium look.

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|---------|
| Front‑end | HTML5, CSS3, Vanilla JS (ES6+) | UI rendering and client‑side logic |
| Data | Supabase (PostgREST + Auth) | Cloud‑first JSON storage, real‑time updates |
| Charts | Chart.js | Visualize temperature, humidity, growth, etc. |
| Weather | Open‑Meteo API | Fetch current weather for the greenhouse location |
| Icons | FontAwesome v6.4.0 | UI icons |
| Fonts | Inter, Montserrat, Poppins (Google Fonts) | Typography |
| Android | Gradle, Kotlin/Java | Sensor data collection and sync |

The database schema is a single `fayseri_storage` table that stores JSON blobs keyed by `user_id` and `key_name`. This design keeps the backend simple while allowing flexible data structures.

## Project Structure

```
FayseriProject/
├─ app.js
├─ index.html
├─ style.css
├─ blueprint_cabekami.txt
├─ blueprint_fayseri.txt
├─ sync_assets.bat
├─ sync_assets_cabekami.bat
├─ CabeKamiAndroid/   # Android app for Cabai module
├─ Fayseri/            # Web dashboard source
│  ├─ index.html
│  ├─ script.js
│  ├─ style.css
│  ├─ images/
│  └─ blueprint_fayseri.txt
├─ FayseriAndroid/      # Android app for Fayseri module
└─ FayseriProject.code-workspace
```

## Getting Started

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd FayseriProject
   ```

2. **Install dependencies** (for the web part, no build tool is required; for Android, use Android Studio or Gradle)
   ```bash
   # Web – just open index.html in a browser
   # Android – open the project in Android Studio and sync Gradle
   ```

3. **Configure Supabase**
   - Create a Supabase project.
   - Add a table `fayseri_storage` with columns `user_id`, `key_name`, `value_data`, `updated_at`.
   - Update `app.js` / `script.js` with your Supabase URL and anon key.

4. **Run the dashboard**
   ```bash
   # Open index.html in your browser
   ```

5. **Sync sensor data**
   - Build and run the Android app on a device.
   - The app will push sensor readings to Supabase, which the dashboard will display in real time.

## Themes & Styling

The dashboard supports three themes controlled via the `data-theme` attribute on `<html>`:

- **Faesa** – Indigo‑blue with an animated Aurora background.
- **Light** – Clean white theme.
- **Dark** – Slate‑dark theme.

Switch themes by toggling the `data-theme` attribute or via the UI.

## Contributing

Feel free to open issues or pull requests. Please follow the existing coding style and keep the README up to date.

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
