const apiKey = "6b7c1aac535bc97fe25979f36cae2d97"; // paste your OpenWeather key here

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

let userLat = null;
let userLon = null;

navigator.geolocation.getCurrentPosition(
  (position) => {
    userLat = position.coords.latitude;
    userLon = position.coords.longitude;
  },
  (error) => {
    console.log("Could not get location on load:", error);
  }
);

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();

  if (city === "") {
    alert("Please enter a city name");
    return;
  }

  getWeather(city);
  getForecast(city);
  logVisit(city, userLat, userLon);
  
});

async function getWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      document.getElementById("errorText").style.display = "block";
      document.getElementById("weatherAllInfo").style.display = "none";
      document.getElementById("placeholderText").style.display = "none";
    } else {
      document.getElementById("errorText").style.display = "none";
      updateWeatherUI(data);
    }
  } catch (error) {
    console.log("Something went wrong:", error);
  }
}

async function getWeatherByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    updateWeatherUI(data);
  } catch (error) {
    console.log("Something went wrong:", error);
  }
}

function getForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.cod === "200") {
        updateForecastUI(data);
      } else {
        console.log("Error fetching forecast data:", data.message);
      }
    })
    .catch(error => {
      console.log("Something went wrong:", error);
    });
}

function updateForecastUI(data) {
  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = ""; // Clear previous forecast

  document.getElementById("forecastSection").style.display = "block";

  for (let i = 0; i < data.list.length; i += 8) { // one forecast per day (every 8th 3-hour slot)
    const forecast = data.list[i];
    const date = new Date(forecast.dt * 1000);
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const temp = Math.round(forecast.main.temp);
    const iconCode = forecast.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    const forecastCard = document.createElement("div");
    forecastCard.classList.add("forecast-card");
    forecastCard.innerHTML = `
      <div class="day">${day}</div>
      <img class="weather-icon" src="${iconUrl}" alt="${forecast.weather[0].description}">
      <div class="temp">${temp}°C</div>
    `;

    forecastList.appendChild(forecastCard);
  }
}

function updateWeatherUI(data) {
  document.getElementById("city").textContent = data.name;
  document.getElementById("country").textContent = data.sys.country;

  document.getElementById("temperature").textContent = Math.round(data.main.temp);
  document.getElementById("weatherDesc").textContent = data.weather[0].description;

  document.getElementById("humidity").textContent = data.main.humidity;
  document.getElementById("pressure").textContent = data.main.pressure;
  document.getElementById("windSpeed").textContent = (data.wind.speed * 3.6).toFixed(1);
  document.getElementById("visibility").textContent = (data.visibility / 1000).toFixed(1);

  const iconCode = data.weather[0].icon;
  document.getElementById("weatherIconMain").src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  document.getElementById("weatherAllInfo").style.display = "flex";
  document.getElementById("placeholderText").style.display = "none";
}

const locationBtn = document.getElementById("locationBtn");

locationBtn.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      await getWeatherByCoords(lat, lon);

      const placeName = await getPlaceName(lat, lon);
      if (placeName) {
        document.getElementById("city").textContent = placeName;
      }

      logVisit(placeName, lat, lon);   // ← changed from logVisit(null, lat, lon)
    },
    (error) => {
      console.log("Error getting location:", error);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
});


async function getPlaceName(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const address = data.address;
    const placeName = address.neighbourhood || address.suburb || address.road || address.city_district || address.city || address.town || address.village;

    return placeName;
  } catch (error) {
    console.log("Error getting place name:", error);
    return null;
  }
}

async function logVisit(city, lat, lon) {
  try {
    await fetch('https://weather-app-backend-agvv.onrender.com/log-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, lat, lon })
    });
  } catch (error) {
    console.log('Error logging visit:', error);
  }
}

let alertsEnabled = false;
let lastCheckedLat = null;
let lastCheckedLon = null;
let watchId = null;

const enableAlertsBtn = document.getElementById("enableAlertsBtn");

enableAlertsBtn.addEventListener("click", async () => {
  if (!alertsEnabled) {
    // Ask for notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Notifications permission is needed for live weather alerts.");
      return;
    }

    // Start watching location
    watchId = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    alertsEnabled = true;
    enableAlertsBtn.textContent = "Disable Live Weather Alerts";
  } else {
    // Turn off
    navigator.geolocation.clearWatch(watchId);
    alertsEnabled = false;
    lastCheckedLat = null;
    lastCheckedLon = null;
    enableAlertsBtn.textContent = "Enable Live Weather Alerts";
  }
});

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const ALERT_DISTANCE_THRESHOLD_KM = 0.01;

function handleLocationUpdate(position) {
  const { latitude, longitude } = position.coords;

  if (lastCheckedLat === null || lastCheckedLon === null) {
    // First reading since alerts were enabled — check immediately
    lastCheckedLat = latitude;
    lastCheckedLon = longitude;
    checkWeatherForAlerts(latitude, longitude);
    return;
  }

  const distance = getDistanceKm(lastCheckedLat, lastCheckedLon, latitude, longitude);

  if (distance >= ALERT_DISTANCE_THRESHOLD_KM) {
    lastCheckedLat = latitude;
    lastCheckedLon = longitude;
    checkWeatherForAlerts(latitude, longitude);
  }
  // else: not far enough yet, do nothing — coordinates discarded, nothing stored beyond lastCheckedLat/Lon
}

async function checkWeatherForAlerts(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    if (!response.ok) return;

    const data = await response.json();
    evaluateWeatherConditions(data);
  } catch (error) {
    console.error("Error checking weather for alerts:", error);
  }
  // Note: lat/lon are only used in this function call — nothing is stored beyond this point
}

function evaluateWeatherConditions(data) {
  const condition = data.weather[0].main; // e.g. "Rain", "Thunderstorm", "Clear"
  const temp = data.main.temp;
  const windSpeedKmh = data.wind.speed * 3.6;
  const locationName = data.name;

  if (condition === "Rain" || condition === "Thunderstorm") {
    sendWeatherNotification(`Rain expected near ${locationName}`, "You may want to carry an umbrella.");
  } else if (temp >= 40) {
    sendWeatherNotification(`Extreme heat near ${locationName}`, `Temperature is ${Math.round(temp)}°C. Stay hydrated.`);
  } else if (temp <= 5) {
    sendWeatherNotification(`Cold conditions near ${locationName}`, `Temperature is ${Math.round(temp)}°C.`);
  } else if (windSpeedKmh >= 40) {
    sendWeatherNotification(`High winds near ${locationName}`, `Wind speed is ${Math.round(windSpeedKmh)} km/h.`);
  }
  // else: normal conditions, no alert needed
}

function sendWeatherNotification(title, body) {
  new Notification(title, { body });
}