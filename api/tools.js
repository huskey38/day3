const fs = require("fs");
const path = require("path");

const spots = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "jeju_spots.json"), "utf8")
).spots;

const AREAS = ["동쪽", "서쪽", "서귀포", "제주시"];
const MAX_RESULTS = 8;

// 데이터의 area 는 "동쪽(성산)" · "서쪽(한림)" 처럼 읍면이 붙어 있으므로 앞부분으로 비교한다.
function find_spots({ area, indoor } = {}) {
  if (!AREAS.includes(area)) {
    return { error: `area 는 ${AREAS.join(" · ")} 중 하나여야 합니다.` };
  }

  const found = spots.filter(
    (s) => s.area.startsWith(area) && (indoor === undefined || s.indoor === indoor)
  );

  return {
    total: found.length,
    spots: found.slice(0, MAX_RESULTS).map((s) => ({
      name: s.name,
      area: s.area,
      indoor: s.indoor,
      description: s.type,
    })),
  };
}

// 지역별 대표 좌표 (제주시청 · 서귀포 시내 · 성산 · 한림 부근, 날씨 조회용 근사값)
const AREA_COORDS = {
  제주시: { latitude: 33.5097, longitude: 126.5219 },
  서귀포: { latitude: 33.2541, longitude: 126.5601 },
  동쪽: { latitude: 33.458, longitude: 126.9425 },
  서쪽: { latitude: 33.4115, longitude: 126.265 },
};

// Open-Meteo 의 WMO 날씨 코드 → 한글
const WEATHER_TEXT = {
  0: "맑음", 1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
  45: "안개", 48: "서리 안개",
  51: "약한 이슬비", 53: "이슬비", 55: "강한 이슬비",
  56: "약한 얼어붙는 이슬비", 57: "강한 얼어붙는 이슬비",
  61: "약한 비", 63: "비", 65: "강한 비",
  66: "약한 얼어붙는 비", 67: "강한 얼어붙는 비",
  71: "약한 눈", 73: "눈", 75: "강한 눈", 77: "싸락눈",
  80: "약한 소나기", 81: "소나기", 82: "강한 소나기",
  85: "약한 눈보라", 86: "강한 눈보라",
  95: "뇌우", 96: "우박을 동반한 뇌우", 99: "강한 우박을 동반한 뇌우",
};

async function get_weather({ area, days = 1 } = {}) {
  const coords = AREA_COORDS[area];
  if (!coords) {
    return { error: `area 는 ${AREAS.join(" · ")} 중 하나여야 합니다.` };
  }
  const forecastDays = Math.min(Math.max(Math.trunc(Number(days)) || 1, 1), 3);

  const params = new URLSearchParams({
    latitude: coords.latitude,
    longitude: coords.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    timezone: "Asia/Seoul",
    forecast_days: forecastDays,
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) {
    return { error: `날씨 조회에 실패했습니다. (HTTP ${res.status})` };
  }
  const w = await res.json();

  return {
    area,
    current: {
      time: w.current.time,
      weather: WEATHER_TEXT[w.current.weather_code] ?? "알 수 없음",
      temperature_c: w.current.temperature_2m,
      feels_like_c: w.current.apparent_temperature,
      humidity_percent: w.current.relative_humidity_2m,
      precipitation_mm: w.current.precipitation,
      wind_kmh: w.current.wind_speed_10m,
    },
    daily: w.daily.time.map((date, i) => ({
      date,
      weather: WEATHER_TEXT[w.daily.weather_code[i]] ?? "알 수 없음",
      max_c: w.daily.temperature_2m_max[i],
      min_c: w.daily.temperature_2m_min[i],
      precipitation_probability_percent: w.daily.precipitation_probability_max[i],
      precipitation_mm: w.daily.precipitation_sum[i],
    })),
  };
}

const toolDefinitions = [
  {
    name: "find_spots",
    description:
      "제주도 관광지 목록(jeju_spots.json)에서 지역과 실내/야외 조건에 맞는 장소를 최대 8곳 찾아 " +
      "이름 · 지역 · 실내 여부 · 설명(유형)을 돌려준다. " +
      "이 목록에 없는 장소는 없다. 목록 밖 장소(다른 지역 · 제주 밖 장소 포함)는 추천하거나 지어내지 말고, " +
      "결과가 비면 조건에 맞는 곳이 목록에 없다고 답한다.",
    input_schema: {
      type: "object",
      properties: {
        area: {
          type: "string",
          enum: AREAS,
          description: "찾을 지역. 동쪽 · 서쪽 · 서귀포 · 제주시 중 하나.",
        },
        indoor: {
          type: "boolean",
          description: "true 면 실내만, false 면 야외만. 생략하면 구분하지 않는다.",
        },
      },
      required: ["area"],
    },
  },
  {
    name: "get_weather",
    description:
      "제주 지역(동쪽 · 서쪽 · 서귀포 · 제주시)의 현재 날씨와 오늘부터 최대 3일의 일별 예보" +
      "(날씨 · 최고/최저 기온 · 강수확률 · 강수량)를 Open-Meteo 에서 가져온다. " +
      "비나 강풍처럼 날씨가 장소 선택에 영향을 줄 때 find_spots 로 실내/야외를 정하기 전에 호출한다. " +
      "지역 대표 지점 기준이라 읍면 단위의 세밀한 값은 아니다.",
    input_schema: {
      type: "object",
      properties: {
        area: {
          type: "string",
          enum: AREAS,
          description: "날씨를 볼 지역. 동쪽 · 서쪽 · 서귀포 · 제주시 중 하나.",
        },
        days: {
          type: "integer",
          minimum: 1,
          maximum: 3,
          description: "오늘부터 며칠치 예보를 볼지. 기본 1(오늘), 최대 3.",
        },
      },
      required: ["area"],
    },
  },
];

const toolHandlers = { find_spots, get_weather };

module.exports = { find_spots, get_weather, toolDefinitions, toolHandlers };
