# SkyCast Weather App

A professional responsive weather dashboard built with plain HTML, CSS and JavaScript.

## APIs used

- **Open-Meteo Forecast API** — current weather, hourly data and 7-day forecast.
- **Open-Meteo Geocoding API** — worldwide city/place search.
- No API key is required for normal non-commercial use.

Open-Meteo documentation:
https://open-meteo.com/en/docs
https://open-meteo.com/en/docs/geocoding-api

## Features

- Current browser location via `navigator.geolocation`
- Worldwide city search
- Current temperature and condition
- Feels-like temperature
- Humidity, wind, rain chance, visibility, UV and pressure
- Next 12 hours
- 7-day forecast
- Sunrise / sunset
- Responsive mobile layout
- No backend required

## Run

You can deploy the three files (`index.html`, `style.css`, `script.js`) directly to GitHub Pages, Vercel, Netlify, etc.

For local testing, open with a local server because browser geolocation is normally restricted to secure contexts.

Example with VS Code:
1. Install the Live Server extension.
2. Right-click `index.html`.
3. Choose **Open with Live Server**.
4. Allow location access when the browser asks.

## Important

If you deploy on HTTPS, browser location works normally after the user grants permission.

The app uses coordinates directly for current-location weather, so it does not need to know the user's exact street address.
