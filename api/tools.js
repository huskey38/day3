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
];

const toolHandlers = { find_spots };

module.exports = { find_spots, toolDefinitions, toolHandlers };
