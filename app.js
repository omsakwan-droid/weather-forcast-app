/**
 * Atmosphere Premium Weather Experience - Core Logic
 */

// --- Global App State ---
const state = {
    currentCoords: { lat: 40.7128, lon: -74.0060 }, // Default: New York
    currentLocationName: "New York, USA",
    activeUnit: 'C', // 'C' or 'F'
    weatherData: null,
    aqiData: null,
    favorites: [],
    searchTimeout: null,
    canvasEngine: null
};

// --- Weather Code to Theme/Description Mapping ---
function getWeatherMeta(wmoCode, isNight = false) {
    // Reference: WMO weather interpretation codes
    const codes = {
        0: { desc: "Clear Sky", theme: isNight ? "night" : "sunny", icon: "clear" },
        1: { desc: "Mainly Clear", theme: isNight ? "night" : "sunny", icon: "partly-cloudy" },
        2: { desc: "Partly Cloudy", theme: isNight ? "night" : "cloudy", icon: "partly-cloudy" },
        3: { desc: "Overcast", theme: "cloudy", icon: "cloudy" },
        45: { desc: "Foggy", theme: "cloudy", icon: "fog" },
        48: { desc: "Depositing Rime Fog", theme: "cloudy", icon: "fog" },
        51: { desc: "Light Drizzle", theme: "rainy", icon: "rain" },
        53: { desc: "Moderate Drizzle", theme: "rainy", icon: "rain" },
        55: { desc: "Heavy Drizzle", theme: "rainy", icon: "rain" },
        56: { desc: "Light Freezing Drizzle", theme: "snowy", icon: "snow" },
        57: { desc: "Dense Freezing Drizzle", theme: "snowy", icon: "snow" },
        61: { desc: "Light Rain", theme: "rainy", icon: "rain" },
        63: { desc: "Moderate Rain", theme: "rainy", icon: "rain" },
        65: { desc: "Heavy Rain", theme: "rainy", icon: "rain" },
        66: { desc: "Light Freezing Rain", theme: "snowy", icon: "snow" },
        67: { desc: "Heavy Freezing Rain", theme: "snowy", icon: "snow" },
        71: { desc: "Slight Snow Fall", theme: "snowy", icon: "snow" },
        73: { desc: "Moderate Snow Fall", theme: "snowy", icon: "snow" },
        75: { desc: "Heavy Snow Fall", theme: "snowy", icon: "snow" },
        77: { desc: "Snow Grains", theme: "snowy", icon: "snow" },
        80: { desc: "Slight Rain Showers", theme: "rainy", icon: "rain" },
        81: { desc: "Moderate Rain Showers", theme: "rainy", icon: "rain" },
        82: { desc: "Violent Rain Showers", theme: "rainy", icon: "rain" },
        85: { desc: "Slight Snow Showers", theme: "snowy", icon: "snow" },
        86: { desc: "Heavy Snow Showers", theme: "snowy", icon: "snow" },
        95: { desc: "Thunderstorm", theme: "stormy", icon: "storm" },
        96: { desc: "Thunderstorm with Hail", theme: "stormy", icon: "storm" },
        99: { desc: "Severe Storm with Hail", theme: "stormy", icon: "storm" }
    };
    return codes[wmoCode] || { desc: "Unknown Weather", theme: "default", icon: "cloudy" };
}

// --- Custom Inline SVG Icons Renderer ---
function getWeatherSVG(iconName, isNight = false) {
    const svgs = {
        "clear": isNight ? 
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M45 25 A 22 22 0 1 0 75 55 A 16 16 0 1 1 45 25 Z" fill="#e2e8f0" filter="drop-shadow(0 0 8px rgba(226,232,240,0.5))" />
                <circle cx="25" cy="30" r="1.5" fill="#ffffff" style="opacity: 0.8;"/>
                <circle cx="65" cy="20" r="1" fill="#ffffff" style="opacity: 0.6;"/>
                <circle cx="35" cy="70" r="1.5" fill="#ffffff" style="opacity: 0.9;"/>
             </svg>` :
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="18" class="svg-sun" />
                <g class="svg-sun">
                    <line x1="50" y1="12" x2="50" y2="22" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="50" y1="78" x2="50" y2="88" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="12" y1="50" x2="22" y2="50" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="78" y1="50" x2="88" y2="50" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="23" y1="23" x2="30" y2="30" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="70" y1="70" x2="77" y2="77" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="23" y1="70" x2="30" y2="63" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                    <line x1="70" y1="30" x2="77" y2="23" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
                </g>
             </svg>`,

        "partly-cloudy": isNight ?
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M38 30 A 18 18 0 1 0 60 52 A 13 13 0 1 1 38 30 Z" fill="#e2e8f0" style="opacity: 0.9;" />
                <path d="M30 65 A 15 15 0 0 1 50 45 A 20 20 0 0 1 85 55 A 15 15 0 0 1 70 75 L 35 75 A 12 12 0 0 1 30 65 Z" class="svg-cloud" />
             </svg>` :
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <circle cx="38" cy="38" r="14" class="svg-sun" />
                <g class="svg-sun">
                    <line x1="38" y1="12" x2="38" y2="18" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
                    <line x1="38" y1="58" x2="38" y2="64" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
                    <line x1="12" y1="38" x2="18" y2="38" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
                    <line x1="58" y1="38" x2="64" y2="38" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
                </g>
                <path d="M30 65 A 15 15 0 0 1 50 45 A 20 20 0 0 1 85 55 A 15 15 0 0 1 70 75 L 35 75 A 12 12 0 0 1 30 65 Z" class="svg-cloud" />
             </svg>`,

        "cloudy": 
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M20 60 A 12 12 0 0 1 38 43 A 16 16 0 0 1 68 50 A 12 12 0 0 1 58 70 L 25 70 A 10 10 0 0 1 20 60 Z" class="svg-cloud-dark" style="opacity: 0.7;" />
                <path d="M35 68 A 15 15 0 0 1 55 48 A 20 20 0 0 1 90 58 A 15 15 0 0 1 75 78 L 40 78 A 12 12 0 0 1 35 68 Z" class="svg-cloud" />
             </svg>`,

        "rain":
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M30 55 A 12 12 0 0 1 48 38 A 18 18 0 0 1 80 47 A 12 12 0 0 1 68 67 L 35 67 A 10 10 0 0 1 30 55 Z" class="svg-cloud" />
                <line x1="42" y1="72" x2="40" y2="78" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" class="svg-rain-drop" />
                <line x1="55" y1="72" x2="53" y2="78" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" class="svg-rain-drop" />
                <line x1="68" y1="72" x2="66" y2="78" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" class="svg-rain-drop" />
             </svg>`,

        "snow":
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M30 55 A 12 12 0 0 1 48 38 A 18 18 0 0 1 80 47 A 12 12 0 0 1 68 67 L 35 67 A 10 10 0 0 1 30 55 Z" class="svg-cloud" />
                <g class="svg-snow-flake">
                    <circle cx="42" cy="74" r="2.5" fill="#f8fafc" />
                </g>
                <g class="svg-snow-flake">
                    <circle cx="55" cy="75" r="2" fill="#f8fafc" />
                </g>
                <g class="svg-snow-flake">
                    <circle cx="68" cy="74" r="2.5" fill="#f8fafc" />
                </g>
             </svg>`,

        "storm":
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M30 55 A 12 12 0 0 1 48 38 A 18 18 0 0 1 80 47 A 12 12 0 0 1 68 67 L 35 67 A 10 10 0 0 1 30 55 Z" class="svg-cloud-dark" />
                <polygon points="53,65 45,77 51,77 47,88 59,74 51,74" class="svg-lightning" />
                <line x1="38" y1="72" x2="36" y2="78" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" class="svg-rain-drop" />
                <line x1="62" y1="72" x2="60" y2="78" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" class="svg-rain-drop" />
             </svg>`,

        "fog":
            `<svg class="weather-svg" viewBox="0 0 100 100">
                <path d="M30 45 A 12 12 0 0 1 48 28 A 18 18 0 0 1 80 37 A 12 12 0 0 1 68 57 L 35 57 A 10 10 0 0 1 30 45 Z" class="svg-cloud" style="opacity: 0.65;" />
                <line x1="25" y1="65" x2="75" y2="65" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" style="opacity: 0.7;" />
                <line x1="32" y1="72" x2="68" y2="72" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" style="opacity: 0.5;" />
             </svg>`
    };

    return svgs[iconName] || svgs["cloudy"];
}

// --- Dynamic Canvas Particle Engine ---
class WeatherCanvasEngine {
    constructor() {
        this.canvas = document.getElementById('weather-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mode = 'default';
        this.animationFrameId = null;
        
        this.resize = this.resize.bind(this);
        this.loop = this.loop.bind(this);
        
        window.addEventListener('resize', this.resize);
        this.resize();
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initParticles();
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const width = this.canvas.width;
        const height = this.canvas.height;

        if (this.mode === 'rainy' || this.mode === 'stormy') {
            const count = Math.min(width / 8, 120);
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height - height,
                    length: Math.random() * 20 + 15,
                    speed: Math.random() * 10 + 12,
                    opacity: Math.random() * 0.3 + 0.1
                });
            }
        } else if (this.mode === 'snowy') {
            const count = Math.min(width / 12, 80);
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: Math.random() * 3 + 1,
                    d: Math.random() * 30 + 10, // sway amplitude
                    speed: Math.random() * 1.5 + 0.8,
                    swingSpeed: Math.random() * 0.02 + 0.01,
                    swingPhase: Math.random() * Math.PI * 2,
                    opacity: Math.random() * 0.5 + 0.2
                });
            }
        } else if (this.mode === 'cloudy') {
            const count = 4;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * width * 1.5 - width * 0.25,
                    y: Math.random() * height * 0.5,
                    r: Math.random() * 150 + 120,
                    speed: Math.random() * 0.2 + 0.1,
                    opacity: Math.random() * 0.08 + 0.04
                });
            }
        } else if (this.mode === 'sunny') {
            const count = 3;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: width * 0.8 + (Math.random() * 50 - 25),
                    y: height * 0.2 + (Math.random() * 50 - 25),
                    r: 0,
                    maxR: Math.random() * 300 + 200,
                    speed: Math.random() * 0.5 + 0.2,
                    opacity: Math.random() * 0.15 + 0.05
                });
            }
        } else if (this.mode === 'night' || this.mode === 'default') {
            const count = Math.min(width / 15, 60);
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: Math.random() * 1.2 + 0.3,
                    twinkleSpeed: Math.random() * 0.04 + 0.01,
                    phase: Math.random() * Math.PI * 2,
                    opacity: Math.random() * 0.6 + 0.2
                });
            }
        }
    }

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.mode === 'rainy' || this.mode === 'stormy') {
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            this.ctx.lineWidth = 1.5;
            this.ctx.lineCap = 'round';
            
            // Random lightning flash for stormy mode
            if (this.mode === 'stormy' && Math.random() > 0.995) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                this.ctx.fillRect(0, 0, w, h);
            }

            for (let p of this.particles) {
                this.ctx.globalAlpha = p.opacity;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                // Slight wind tilt
                this.ctx.lineTo(p.x - 3, p.y + p.length);
                this.ctx.stroke();
                
                p.y += p.speed;
                p.x -= 0.5;
                if (p.y > h) {
                    p.y = -p.length;
                    p.x = Math.random() * w;
                }
            }
        } else if (this.mode === 'snowy') {
            this.ctx.fillStyle = '#ffffff';
            for (let p of this.particles) {
                this.ctx.globalAlpha = p.opacity;
                this.ctx.beginPath();
                this.ctx.arc(p.x + Math.sin(p.swingPhase) * p.d * 0.3, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                
                p.y += p.speed;
                p.swingPhase += p.swingSpeed;
                if (p.y > h) {
                    p.y = -p.r * 2;
                    p.x = Math.random() * w;
                }
            }
        } else if (this.mode === 'cloudy') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let p of this.particles) {
                this.ctx.globalAlpha = p.opacity;
                
                let gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
                gradient.addColorStop(0.5, 'rgba(230,240,255,0.1)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                
                p.x += p.speed;
                if (p.x - p.r > w) {
                    p.x = -p.r;
                    p.y = Math.random() * h * 0.5;
                }
            }
        } else if (this.mode === 'sunny') {
            for (let p of this.particles) {
                p.r += p.speed;
                if (p.r > p.maxR) {
                    p.r = 0;
                }
                
                let gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                let op = (1 - (p.r / p.maxR)) * p.opacity;
                gradient.addColorStop(0, `rgba(253, 224, 71, ${op * 1.5})`);
                gradient.addColorStop(0.4, `rgba(253, 224, 71, ${op * 0.4})`);
                gradient.addColorStop(1, 'rgba(253, 224, 71, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (this.mode === 'night' || this.mode === 'default') {
            this.ctx.fillStyle = '#ffffff';
            for (let p of this.particles) {
                let op = Math.abs(Math.sin(p.phase)) * p.opacity;
                this.ctx.globalAlpha = op;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                p.phase += p.twinkleSpeed;
            }
        }

        this.ctx.globalAlpha = 1.0;
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    destroy() {
        window.removeEventListener('resize', this.resize);
        cancelAnimationFrame(this.animationFrameId);
    }
}

// --- Temperature Conversion Helpers ---
function formatTemp(celsius) {
    if (state.activeUnit === 'F') {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

function formatWindSpeed(kmh) {
    if (state.activeUnit === 'F') {
        // mph
        return `${Math.round(kmh * 0.621371)} mph`;
    }
    return `${Math.round(kmh)} km/h`;
}

// --- Main UI Rendering Pipeline ---
function updateWeatherUI() {
    if (!state.weatherData) return;

    const current = state.weatherData.current_weather;
    const daily = state.weatherData.daily;
    const hourly = state.weatherData.hourly;
    const aqi = state.aqiData;

    // 1. Resolve Weather condition, themes, and classes
    const isNight = current.is_day === 0;
    const meta = getWeatherMeta(current.weathercode, isNight);

    // Apply class to body to change CSS Gradient background
    document.body.className = '';
    document.body.classList.add(`theme-${meta.theme}`);
    
    // Set Canvas background particles
    if (state.canvasEngine) {
        state.canvasEngine.setMode(meta.theme);
    }

    // 2. Render Hero Card Elements
    document.getElementById('current-location').textContent = state.currentLocationName;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('current-temp').innerHTML = `${formatTemp(current.temperature)}<span style="font-size: 3rem; vertical-align: top; font-weight: 300;">°</span>`;
    document.getElementById('weather-description').textContent = meta.desc;
    
    // Animate and render Hero Weather icon SVG
    const heroIconContainer = document.getElementById('hero-weather-icon');
    heroIconContainer.innerHTML = getWeatherSVG(meta.icon, isNight);

    // Render Hero stats row
    const minTemp = daily.temperature_2m_min[0];
    const maxTemp = daily.temperature_2m_max[0];
    document.getElementById('hero-temp-range').textContent = `${formatTemp(minTemp)}° / ${formatTemp(maxTemp)}°`;
    
    // "Feels like" estimation using apparent temperatures
    const apparentMin = daily.apparent_temperature_min[0];
    const apparentMax = daily.apparent_temperature_max[0];
    const avgApparent = (apparentMin + apparentMax) / 2;
    document.getElementById('feels-like-temp').textContent = `${formatTemp(avgApparent)}°`;
    
    // Max precipitation probability for today
    const precipProb = daily.precipitation_probability_max[0];
    document.getElementById('precip-prob').textContent = `${precipProb}%`;

    // 3. Render Widgets Detail Columns
    
    // UV Index Widget
    const uvMax = Math.round(daily.uv_index_max[0]);
    document.getElementById('uv-value').textContent = uvMax;
    const uvFill = document.getElementById('uv-fill');
    const uvPercent = Math.min((uvMax / 12) * 100, 100);
    uvFill.style.width = `${uvPercent}%`;
    
    const uvDescEl = document.getElementById('uv-desc');
    if (uvMax <= 2) { uvDescEl.textContent = "Low"; }
    else if (uvMax <= 5) { uvDescEl.textContent = "Moderate"; }
    else if (uvMax <= 7) { uvDescEl.textContent = "High"; }
    else if (uvMax <= 10) { uvDescEl.textContent = "Very High"; }
    else { uvDescEl.textContent = "Extreme"; }

    // Wind Widget
    const windSpeedVal = current.windspeed;
    const windDirDeg = current.winddirection;
    document.getElementById('wind-speed').innerHTML = `${Math.round(state.activeUnit === 'F' ? windSpeedVal * 0.621371 : windSpeedVal)} <small>${state.activeUnit === 'F' ? 'mph' : 'km/h'}</small>`;
    
    // Gusts (estimated since basic Open-Meteo current weather doesn't always contain it, we fetch max wind gust)
    const windGustsVal = daily.windgusts_10m ? daily.windgusts_10m[0] : windSpeedVal * 1.3;
    document.getElementById('wind-gusts').textContent = `Gusts up to ${formatWindSpeed(windGustsVal)}`;
    
    // Wind direction icon angle
    const windArrow = document.getElementById('wind-direction-arrow');
    windArrow.style.transform = `rotate(${windDirDeg}deg)`;
    
    // Text direction conversion
    const windDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const dirIdx = Math.round(windDirDeg / 22.5) % 16;
    document.getElementById('wind-direction-text').textContent = windDirections[dirIdx];

    // Sunrise & Sunset visual path details
    const sunriseStr = daily.sunrise[0];
    const sunsetStr = daily.sunset[0];
    const sunriseDate = new Date(sunriseStr);
    const sunsetDate = new Date(sunsetStr);
    
    const formatTime = (dateObj) => {
        return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };
    
    document.getElementById('sunrise-time').textContent = formatTime(sunriseDate);
    document.getElementById('sunset-time').textContent = formatTime(sunsetDate);
    
    // Sun arc visual indicator positioning
    const nowTime = new Date();
    const totalDaylightMs = sunsetDate - sunriseDate;
    const currentMs = nowTime - sunriseDate;
    let sunProgressPercent = 0;
    
    if (nowTime > sunriseDate && nowTime < sunsetDate) {
        sunProgressPercent = currentMs / totalDaylightMs;
    } else if (nowTime >= sunsetDate) {
        sunProgressPercent = 1;
    }
    
    // Path length calculation
    const arcPath = document.getElementById('sun-arc-progress');
    if (arcPath) {
        const pathLength = arcPath.getTotalLength ? arcPath.getTotalLength() : 125.6; // fallback approximate circumference length
        arcPath.style.strokeDasharray = pathLength;
        arcPath.style.strokeDashoffset = pathLength - (pathLength * sunProgressPercent);
    }

    // Air Quality Index Widget
    const aqiVal = aqi ? Math.round(aqi.current.us_aqi) : 25;
    document.getElementById('aqi-value').textContent = aqiVal;
    
    const aqiIndicator = document.getElementById('aqi-indicator');
    const aqiPercent = Math.min((aqiVal / 150) * 100, 100);
    aqiIndicator.style.left = `${aqiPercent}%`;
    
    const aqiStatus = document.getElementById('aqi-status');
    const aqiDesc = document.getElementById('aqi-desc');
    
    if (aqiVal <= 50) {
        aqiStatus.className = 'aqi-badge status-good';
        aqiStatus.textContent = 'Good';
        aqiDesc.textContent = 'Air quality is excellent. Great day for outdoor activities.';
    } else if (aqiVal <= 100) {
        aqiStatus.className = 'aqi-badge status-moderate';
        aqiStatus.textContent = 'Moderate';
        aqiDesc.textContent = 'Air quality is acceptable. Very sensitive groups should monitor symptoms.';
    } else {
        aqiStatus.className = 'aqi-badge status-poor';
        aqiStatus.textContent = 'Poor';
        aqiDesc.textContent = 'Air quality is reduced. Limit prolonged heavy outdoor exertion.';
    }

    // Humidity & Pressure Widget
    // Calculate dew point: Td = T - ((100 - RH)/5) approx.
    const currentHumidity = hourly.relativehumidity_2m[0];
    document.getElementById('humidity-val').textContent = `${currentHumidity}%`;
    
    const approxDewPoint = current.temperature - ((100 - currentHumidity) / 5);
    document.getElementById('dew-point').textContent = `Dew point is ${formatTemp(approxDewPoint)}°`;
    
    // Pressure mapping (estimated standard atmospheric average)
    // We map a default pressure since raw basic Open-Meteo coordinates have average surface pressure
    const surfacePressure = hourly.surface_pressure ? hourly.surface_pressure[0] : 1013;
    document.getElementById('pressure-val').innerHTML = `${Math.round(surfacePressure)} <small>hPa</small>`;
    
    const pressureTrendText = document.getElementById('pressure-trend');
    if (surfacePressure > 1015) pressureTrendText.textContent = "High";
    else if (surfacePressure < 1008) pressureTrendText.textContent = "Low";
    else pressureTrendText.textContent = "Steady";

    // Visibility & Clouds details
    const cloudCover = hourly.cloudcover ? hourly.cloudcover[0] : 30;
    document.getElementById('cloud-cover-val').textContent = `${cloudCover}%`;
    
    const cloudDesc = document.getElementById('cloud-desc');
    if (cloudCover <= 15) cloudDesc.textContent = "Mainly clear sky";
    else if (cloudCover <= 50) cloudDesc.textContent = "Scattered clouds";
    else if (cloudCover <= 80) cloudDesc.textContent = "Partly cloudy sky";
    else cloudDesc.textContent = "Fully overcast sky";

    const visibilityVal = hourly.visibility ? (hourly.visibility[0] / 1000) : 10.0; // convert meters to km
    document.getElementById('visibility-val').innerHTML = `${Math.round(visibilityVal)} <small>km</small>`;
    
    const visibilityDesc = document.getElementById('visibility-desc');
    if (visibilityVal >= 9) visibilityDesc.textContent = "Perfectly clear view";
    else if (visibilityVal >= 5) visibilityDesc.textContent = "Haze / Light mist";
    else visibilityDesc.textContent = "Low visibility fog";

    // 4. Render 24-Hour Hourly Forecast
    const hourlyContainer = document.getElementById('hourly-container');
    hourlyContainer.innerHTML = '';
    
    // Find current hour index to start forecast
    const currentHourStr = new Date().toISOString().substring(0, 13) + ":00";
    let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourStr));
    if (startIndex === -1) startIndex = 0;

    // Pull next 24 elements
    for (let i = 0; i < 24; i++) {
        const idx = startIndex + i;
        if (idx >= hourly.time.length) break;

        const timeStr = hourly.time[idx];
        const rawTime = new Date(timeStr);
        const hourLabel = i === 0 ? "Now" : rawTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(" ", "");
        const temp = hourly.temperature_2m[idx];
        const wCode = hourly.weathercode[idx];
        const prProb = hourly.precipitation_probability[idx];
        
        // Resolve hourly daytime flag
        // A simple day/night helper for hour
        const hr = rawTime.getHours();
        const hourIsNight = hr < 6 || hr > 20;
        const hourMeta = getWeatherMeta(wCode, hourIsNight);

        const card = document.createElement('div');
        card.className = `hourly-card ${i === 0 ? 'active' : ''}`;
        
        card.innerHTML = `
            <span class="hourly-time">${hourLabel}</span>
            <div class="hourly-icon">${getWeatherSVG(hourMeta.icon, hourIsNight)}</div>
            <span class="hourly-temp">${formatTemp(temp)}°</span>
            <span class="hourly-precip">${prProb > 10 ? prProb + '%' : '&nbsp;'}</span>
        `;
        hourlyContainer.appendChild(card);
    }

    // 5. Render 7-Day Forecast Rows
    const weeklyContainer = document.getElementById('weekly-container');
    weeklyContainer.innerHTML = '';
    
    // Calculate global weekly min and max temp to scale progress bars relatively
    const absMin = Math.min(...daily.temperature_2m_min);
    const absMax = Math.max(...daily.temperature_2m_max);
    const globalDiff = absMax - absMin;

    for (let i = 0; i < 7; i++) {
        const timeStr = daily.time[i];
        const rawDate = new Date(timeStr + 'T00:00:00'); // ensure timezone safety
        
        let dayLabel = rawDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (i === 0) dayLabel = "Today";

        const wCode = daily.weathercode[i];
        const max = daily.temperature_2m_max[i];
        const min = daily.temperature_2m_min[i];
        const precip = daily.precipitation_probability_max[i];
        const weeklyMeta = getWeatherMeta(wCode, false);

        // Calculate progress bar limits
        // Relative percentage positioning
        const minPercent = ((min - absMin) / globalDiff) * 100;
        const maxPercent = ((max - absMin) / globalDiff) * 100;
        const barWidth = maxPercent - minPercent;

        const row = document.createElement('div');
        row.className = 'weekly-row';
        row.innerHTML = `
            <span class="weekly-day ${i === 0 ? 'today' : ''}">${dayLabel}</span>
            <div class="weekly-condition-container">
                <div class="weekly-icon">${getWeatherSVG(weeklyMeta.icon, false)}</div>
                <span class="weekly-precip">${precip > 15 ? precip + '%' : ''}</span>
            </div>
            <div class="weekly-temp-range">
                <span class="weekly-min-temp">${formatTemp(min)}°</span>
                <div class="temp-bar-wrapper">
                    <div class="temp-bar-fill" style="left: ${minPercent}%; width: ${barWidth}%;"></div>
                </div>
                <span class="weekly-max-temp">${formatTemp(max)}°</span>
            </div>
        `;
        weeklyContainer.appendChild(row);
    }

    // Update Lucide SVG replacement
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Update Favorites Star button status
    updateFavoriteButtonStatus();

    // Toggle loader transition
    document.getElementById('dashboard-loader').classList.add('hidden');
    document.getElementById('dashboard-grid').classList.remove('hidden');
    document.getElementById('error-panel').classList.add('hidden');
}

// --- Favorites Storage Management ---
function loadFavorites() {
    try {
        const stored = localStorage.getItem('atmosphere_favorites');
        if (stored) {
            state.favorites = JSON.parse(stored);
        } else {
            // Default initial recommendations
            state.favorites = [
                { name: "New York", lat: 40.7128, lon: -74.0060, country: "United States" },
                { name: "London", lat: 51.5074, lon: -0.1278, country: "United Kingdom" },
                { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "Japan" }
            ];
            saveFavorites();
        }
        renderFavoritesUI();
    } catch (e) {
        console.error("Error loading favorites", e);
    }
}

function saveFavorites() {
    localStorage.setItem('atmosphere_favorites', JSON.stringify(state.favorites));
}

function renderFavoritesUI() {
    const listContainer = document.getElementById('favorites-list');
    listContainer.innerHTML = '';
    
    if (state.favorites.length === 0) {
        listContainer.innerHTML = `
            <div class="no-favorites">
                <p>No saved locations yet.</p>
                <span>Click the star icon on any city to add.</span>
            </div>
        `;
        return;
    }

    state.favorites.forEach((fav, index) => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="fav-info">
                <span class="fav-city">${fav.name}</span>
                <span class="fav-country">${fav.country || ''}</span>
            </div>
            <div class="fav-weather">
                <!-- Fallback loading indicator -->
                <span class="fav-temp" id="fav-temp-${index}">...</span>
                <button class="remove-fav-btn" data-index="${index}" style="background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; display: flex; align-items: center;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            </div>
        `;
        
        // Load temperature in background
        fetchFavTemperature(fav, index);

        // Click on fav item selects it
        item.addEventListener('click', (e) => {
            // Avoid triggers when clicking the trash delete button
            if (e.target.closest('.remove-fav-btn')) {
                e.stopPropagation();
                removeFavorite(index);
                return;
            }
            selectLocation(fav.lat, fav.lon, `${fav.name}, ${fav.country}`);
        });

        listContainer.appendChild(item);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

async function fetchFavTemperature(fav, index) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${fav.lat}&longitude=${fav.lon}&current_weather=true`);
        if (response.ok) {
            const data = await response.json();
            const tempEl = document.getElementById(`fav-temp-${index}`);
            if (tempEl) {
                tempEl.textContent = `${formatTemp(data.current_weather.temperature)}°`;
            }
        }
    } catch (e) {
        console.error("Error loading fav temp", e);
    }
}

function updateFavoriteButtonStatus() {
    const starBtn = document.getElementById('favorite-toggle-btn');
    const isFav = state.favorites.some(f => 
        Math.abs(f.lat - state.currentCoords.lat) < 0.01 && 
        Math.abs(f.lon - state.currentCoords.lon) < 0.01
    );
    
    if (isFav) {
        starBtn.classList.add('active');
    } else {
        starBtn.classList.remove('active');
    }
}

function toggleFavoriteCity() {
    const isFavIndex = state.favorites.findIndex(f => 
        Math.abs(f.lat - state.currentCoords.lat) < 0.01 && 
        Math.abs(f.lon - state.currentCoords.lon) < 0.01
    );

    if (isFavIndex > -1) {
        // Remove favorite
        state.favorites.splice(isFavIndex, 1);
    } else {
        // Add new favorite
        // Extract city/country from current label
        const parts = state.currentLocationName.split(',');
        const city = parts[0].trim();
        const country = parts.slice(1).join(',').trim();
        
        state.favorites.push({
            name: city,
            country: country,
            lat: state.currentCoords.lat,
            lon: state.currentCoords.lon
        });
    }
    saveFavorites();
    renderFavoritesUI();
    updateFavoriteButtonStatus();
}

function removeFavorite(index) {
    state.favorites.splice(index, 1);
    saveFavorites();
    renderFavoritesUI();
    updateFavoriteButtonStatus();
}

// --- Data Fetching Engine ---
async function fetchWeatherDetails(lat, lon) {
    document.getElementById('dashboard-loader').classList.remove('hidden');
    
    try {
        // 1. Fetch Forecast Details
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,weathercode,windspeed_10m,cloudcover,visibility,surface_pressure&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max,windgusts_10m&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error("Weather forecast service unavailable");
        state.weatherData = await weatherResponse.json();

        // 2. Fetch Air Quality Index in parallel
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
        const aqiResponse = await fetch(aqiUrl);
        if (aqiResponse.ok) {
            state.aqiData = await aqiResponse.json();
        } else {
            state.aqiData = null;
        }

        // Render dashboard UI
        updateWeatherUI();
    } catch (error) {
        console.error("Error fetching weather information", error);
        showErrorPanel(error.message);
    }
}

function showErrorPanel(message) {
    document.getElementById('dashboard-loader').classList.add('hidden');
    document.getElementById('dashboard-grid').classList.add('hidden');
    
    const errPanel = document.getElementById('error-panel');
    errPanel.classList.remove('hidden');
    if (message) {
        document.getElementById('error-message').textContent = message;
    }
}

function selectLocation(lat, lon, locationLabel) {
    state.currentCoords = { lat: parseFloat(lat), lon: parseFloat(lon) };
    state.currentLocationName = locationLabel;
    
    // Clear search dropdown inputs
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').classList.add('hidden');
    document.getElementById('suggestions-dropdown').classList.add('hidden');

    fetchWeatherDetails(lat, lon);
}

// --- Autocomplete Geocoding ---
async function fetchGeocodingSuggestions(query) {
    const loader = document.getElementById('search-loader');
    loader.classList.remove('hidden');
    
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            renderSuggestions(data.results || []);
        } else {
            renderSuggestions([]);
        }
    } catch (e) {
        console.error("Geocoding fetch error", e);
        renderSuggestions([]);
    } finally {
        loader.classList.add('hidden');
    }
}

function renderSuggestions(results) {
    const dropdown = document.getElementById('suggestions-dropdown');
    dropdown.innerHTML = '';

    if (results.length === 0) {
        dropdown.innerHTML = `<div class="suggestion-item" style="cursor: default;"><span class="suggestion-name">No locations found</span></div>`;
        dropdown.classList.remove('hidden');
        return;
    }

    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        const stateStr = res.admin1 ? `, ${res.admin1}` : '';
        const countryStr = res.country ? `, ${res.country}` : '';
        const fullName = `${res.name}${stateStr}${countryStr}`;
        
        div.innerHTML = `
            <span class="suggestion-name">${res.name}</span>
            <span class="suggestion-admin">${res.admin1 || ''} ${res.country || ''}</span>
        `;
        
        div.addEventListener('click', () => {
            selectLocation(res.latitude, res.longitude, fullName);
        });

        dropdown.appendChild(div);
    });

    dropdown.classList.remove('hidden');
}

// --- Geolocation ---
function handleLocateUser() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    document.getElementById('dashboard-loader').classList.remove('hidden');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Open-Meteo doesn't reverse geocode, but we can label it with coordinates
            // Or look it up dynamically. We write a clean label
            const label = `GPS Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
            selectLocation(lat, lon, label);
        },
        (error) => {
            alert(`Unable to retrieve your location: ${error.message}`);
            // Fallback load default New York
            selectLocation(40.7128, -74.0060, "New York, USA");
        }
    );
}

// --- App Event Handlers Setup ---
function setupEvents() {
    // Search Box Listener (Debounced)
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    const dropdown = document.getElementById('suggestions-dropdown');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        
        if (val.length === 0) {
            clearBtn.classList.add('hidden');
            dropdown.classList.add('hidden');
            return;
        }

        clearBtn.classList.remove('hidden');

        clearTimeout(state.searchTimeout);
        if (val.length >= 2) {
            state.searchTimeout = setTimeout(() => {
                fetchGeocodingSuggestions(val);
            }, 300);
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        dropdown.classList.add('hidden');
        searchInput.focus();
    });

    // Close dropdown on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });

    // Unit toggle handler
    const unitC = document.getElementById('unit-c');
    const unitF = document.getElementById('unit-f');

    unitC.addEventListener('click', () => {
        if (state.activeUnit === 'C') return;
        state.activeUnit = 'C';
        unitC.classList.add('active');
        unitF.classList.remove('active');
        updateWeatherUI();
        renderFavoritesUI();
    });

    unitF.addEventListener('click', () => {
        if (state.activeUnit === 'F') return;
        state.activeUnit = 'F';
        unitF.classList.add('active');
        unitC.classList.remove('active');
        updateWeatherUI();
        renderFavoritesUI();
    });

    // Locate Me action button
    document.getElementById('locate-btn').addEventListener('click', handleLocateUser);

    // Favorite City toggle button
    document.getElementById('favorite-toggle-btn').addEventListener('click', toggleFavoriteCity);

    // Error retry button
    document.getElementById('error-retry').addEventListener('click', () => {
        selectLocation(40.7128, -74.0060, "New York, USA");
    });

    // Hourly carousel slider scroll navigation buttons
    const hourlyScroll = document.getElementById('hourly-container');
    
    document.getElementById('slide-left-btn').addEventListener('click', () => {
        hourlyScroll.scrollBy({ left: -240, behavior: 'smooth' });
    });

    document.getElementById('slide-right-btn').addEventListener('click', () => {
        hourlyScroll.scrollBy({ left: 240, behavior: 'smooth' });
    });
}

// --- App Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialise particle canvas background
    state.canvasEngine = new WeatherCanvasEngine();

    // 2. Setup button and form click events
    setupEvents();
    
    // 3. Load favorite bookmarks
    loadFavorites();
    
    // 4. Initial Fetch (Default: New York)
    selectLocation(state.currentCoords.lat, state.currentCoords.lon, state.currentLocationName);
});
