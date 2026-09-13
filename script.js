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