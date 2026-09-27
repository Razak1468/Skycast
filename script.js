const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const els = {
  search: document.getElementById("citySearch"),
  results: document.getElementById("searchResults"),
  locationBtn: document.getElementById("locationBtn"),
  locationName: document.getElementById("locationName"),
  locationMeta: document.getElementById("locationMeta"),
  updatedAt: document.getElementById("updatedAt"),
  currentIcon: document.getElementById("currentIcon"),
  currentTemp: document.getElementById("currentTemp"),
  conditionText: document.getElementById("conditionText"),
  feelsLike: document.getElementById("feelsLike"),
  todayLow: document.getElementById("todayLow"),
  todayHigh: document.getElementById("todayHigh"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  rainChance: document.getElementById("rainChance"),
  visibility: document.getElementById("visibility"),
  uv: document.getElementById("uv"),
  pressure: document.getElementById("pressure"),
  hourly: document.getElementById("hourlyForecast"),
  daily: document.getElementById("dailyForecast"),
  timezone: document.getElementById("timezoneLabel"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  sunPosition: document.getElementById("sunPosition"),
  toast: document.getElementById("toast")
};

let searchTimer;

const weatherCodes = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "❄️"], 80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"], 85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm + hail", "⛈️"], 99: ["Thunderstorm + hail", "⛈️"]
};

function codeInfo(code) { return weatherCodes[code] || ["Unknown", "🌡️"]; }

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 3000);
}

function formatTime(iso, timezone) {
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(iso));
  } catch { return iso.slice(11,16); }
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}

async function geocode(query) {
  const url = `${GEO_API}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Location search failed");
  const data = await res.json();
  return data.results || [];
}

async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: "auto",
    forecast_days: "7",
    current: [
      "temperature_2m","relative_humidity_2m","apparent_temperature",
      "is_day","precipitation","rain","showers","weather_code",
      "cloud_cover","surface_pressure","wind_speed_10m","wind_direction_10m",
      "wind_gusts_10m"
    ].join(","),
    hourly: [
      "temperature_2m","apparent_temperature","precipitation_probability",
      "weather_code","relative_humidity_2m","visibility","uv_index","wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code","temperature_2m_max","temperature_2m_min",
      "sunrise","sunset","uv_index_max","precipitation_probability_max",
      "precipitation_sum","wind_speed_10m_max"
    ].join(",")
  });
  const res = await fetch(`${WEATHER_API}?${params}`);
  if (!res.ok) throw new Error("Weather service failed");
  return res.json();
}

function setLocationText(place) {
  const parts = [place.name, place.admin1, place.country].filter(Boolean);
  els.locationName.textContent = place.name || "Your location";
  els.locationMeta.textContent = parts.slice(1).join(" • ") || "Current location";
}

function render(place, data) {
  const c = data.current;
  const d = data.daily;
  const h = data.hourly;
  const [condition, icon] = codeInfo(c.weather_code);

  setLocationText(place);
  els.updatedAt.textContent = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric", minute: "2-digit", second: "2-digit",
    timeZone: data.timezone
  }).format(new Date());

  els.currentIcon.textContent = icon;
  els.currentTemp.textContent = Math.round(c.temperature_2m);
  els.conditionText.textContent = condition;
  els.feelsLike.textContent = Math.round(c.apparent_temperature);
  els.todayLow.textContent = Math.round(d.temperature_2m_min[0]);
  els.todayHigh.textContent = Math.round(d.temperature_2m_max[0]);
  els.humidity.textContent = `${Math.round(c.relative_humidity_2m)}%`;
  els.wind.textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  els.rainChance.textContent = `${Math.round(d.precipitation_probability_max[0] ?? 0)}%`;

  // Visibility and UV are hourly; use the current matching hour when possible.
  const hourIndex = closestHourIndex(h.time);
  els.visibility.textContent = `${(h.visibility[hourIndex] / 1000).toFixed(1)} km`;
  els.uv.textContent = Number(h.uv_index[hourIndex] ?? d.uv_index_max[0] ?? 0).toFixed(1);
  els.pressure.textContent = `${Math.round(c.surface_pressure)} hPa`;
  els.timezone.textContent = data.timezone.replaceAll("_", " ");

  els.sunrise.textContent = formatTime(d.sunrise[0], data.timezone);
  els.sunset.textContent = formatTime(d.sunset[0], data.timezone);

  renderHourly(h, hourIndex, data.timezone);
  renderDaily(d);
  positionSun(d.sunrise[0], d.sunset[0], data.timezone);
}

function closestHourIndex(times) {
  const now = Date.now();
  let best = 0, diff = Infinity;
  times.forEach((t, i) => {
    const delta = Math.abs(new Date(t).getTime() - now);
    if (delta < diff) { diff = delta; best = i; }
  });
  return best;
}

function renderHourly(h, currentIndex, timezone) {
  els.hourly.innerHTML = "";
  for (let i = currentIndex; i < Math.min(currentIndex + 12, h.time.length); i++) {
    const [condition, icon] = codeInfo(h.weather_code[i]);
    const card = document.createElement("div");
    card.className = `hour ${i === currentIndex ? "now" : ""}`;
    card.innerHTML = `
      <div class="hour-time">${i === currentIndex ? "Now" : formatTime(h.time[i], timezone)}</div>
      <div class="hour-icon" title="${condition}">${icon}</div>
      <div class="hour-temp">${Math.round(h.temperature_2m[i])}°</div>
      <div class="hour-rain">💧 ${Math.round(h.precipitation_probability[i] ?? 0)}%</div>
    `;
    els.hourly.appendChild(card);
  }
}

function renderDaily(d) {
  els.daily.innerHTML = "";
  const lows = d.temperature_2m_min, highs = d.temperature_2m_max;
  const minAll = Math.min(...lows), maxAll = Math.max(...highs);
  for (let i = 0; i < d.time.length; i++) {
    const [condition, icon] = codeInfo(d.weather_code[i]);
    const left = ((lows[i] - minAll) / Math.max(1, maxAll - minAll)) * 100;
    const right = ((highs[i] - minAll) / Math.max(1, maxAll - minAll)) * 100;
    const row = document.createElement("div");
    row.className = "day-row";
    row.innerHTML = `
      <div><div class="day-name">${i === 0 ? "Today" : formatDay(d.time[i])}</div>
      <div class="day-date">${formatShortDate(d.time[i])}</div></div>
      <div class="day-icon" title="${condition}">${icon}</div>
      <div class="day-condition">${condition} · ${Math.round(d.precipitation_probability_max[i] ?? 0)}% rain</div>
      <div class="temp-bar"><span class="temp-dot" style="left:${Math.max(0, Math.min(100, left))}%"></span></div>
      <div class="temp-values"><b>${Math.round(highs[i])}°</b><span>${Math.round(lows[i])}°</span></div>
    `;
    els.daily.appendChild(row);
  }
}

function positionSun(sunrise, sunset, timezone) {
  const now = new Date();
  const rise = new Date(sunrise).getTime();
  const set = new Date(sunset).getTime();
  const t = now.getTime();
  const progress = Math.max(0, Math.min(1, (t - rise) / (set - rise)));
  const angle = 180 - progress * 180;
  els.sunPosition.style.transform = `rotate(${angle}deg)`;
}

async function loadPlace(place, message = true) {
  try {
    els.locationName.textContent = "Loading weather...";
    const data = await getWeather(place.latitude, place.longitude);
    render(place, data);
    if (message) showToast(`Weather loaded for ${place.name}`);
  } catch (err) {
    console.error(err);
    els.locationName.textContent = "Weather unavailable";
    els.locationMeta.textContent = "Please check your internet connection and try again.";
    showToast("Could not load weather data");
  }
}

function searchUI(results) {
  els.results.innerHTML = "";
  if (!results.length) {
    els.results.innerHTML = `<div class="result"><div><div class="result-name">No locations found</div><div class="result-meta">Try a city, state, country or postal code</div></div></div>`;
    els.results.classList.remove("hidden");
    return;
  }
  results.forEach(place => {
    const item = document.createElement("div");
    item.className = "result";
    item.innerHTML = `
      <div><div class="result-name">${escapeHTML(place.name)}</div>
      <div class="result-meta">${escapeHTML([place.admin1, place.country].filter(Boolean).join(", "))}</div></div>
      <div class="result-meta">${place.country_code || ""}</div>
    `;
    item.addEventListener("click", () => {
      els.results.classList.add("hidden");
      els.search.value = "";
      loadPlace(place);
    });
    els.results.appendChild(item);
  });
  els.results.classList.remove("hidden");
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = els.search.value.trim();
  if (q.length < 2) { els.results.classList.add("hidden"); return; }
  searchTimer = setTimeout(async () => {
    try { searchUI(await geocode(q)); }
    catch { showToast("Search failed"); }
  }, 300);
});

document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrap")) els.results.classList.add("hidden");
});

els.locationBtn.addEventListener("click", () => requestLocation(true));

function requestLocation(showMessage = false) {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by this browser");
    return;
  }
  els.locationName.textContent = "Finding your location...";
  els.locationMeta.textContent = "Waiting for browser location permission";
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const place = {
        name: "Your current location",
        admin1: "",
        country: "",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
      try {
        // Reverse geocoding is not required: weather works directly from coordinates.
        const data = await getWeather(place.latitude, place.longitude);
        place.name = "Current location";
        render(place, data);
        els.locationMeta.textContent = `${pos.coords.latitude.toFixed(3)}°, ${pos.coords.longitude.toFixed(3)}°`;
        if (showMessage) showToast("Using your current location");
      } catch {
        showToast("Could not load weather for your location");
      }
    },
    err => {
      const msg = err.code === 1 ? "Location permission was denied" : "Could not detect your location";
      showToast(msg);
      // Fall back to a global city so the app isn't blank.
      loadPlace({name:"Guntur", admin1:"Andhra Pradesh", country:"India", latitude:16.3067, longitude:80.4365}, false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

// Start with the user's current browser location.
requestLocation(false);
