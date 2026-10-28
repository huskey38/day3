const { toolDefinitions, toolHandlers } = require("./tools.js");

const MODEL = "claude-sonnet-5-5";
const MAX_STEPS = 6;   // 도구 호출 왕복 상한 (무한 반복 방지)

const SYSTEM =
  "당신은 제주 여행 추천 도우미다. 사용자의 요청에서 지역(동쪽 · 서쪽 · 서귀포 · 제주시)과 " +
  "실내/야외 선호를 파악한다. 날씨가 추천에 영향을 줄 수 있으면 get_weather 로 날씨를 확인하고, " +
  "그 결과(비 · 강풍 · 추위 등)에 맞춰 find_spots 로 실내 또는 야외 장소를 찾아 추천한다. " +
  "장소는 반드시 find_spots 결과에 있는 것만 추천하고, 목록에 없는 장소는 지어내지 않는다. " +
  "지역을 알 수 없으면 되묻는다. 답변은 한국어로, 날씨 요약과 추천 이유를 짧게 덧붙인다.";

async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: toolDefinitions,
      messages,
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API 오류 (HTTP ${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// 에이전트 루프: Claude 가 도구를 요청하면 실행해서 결과를 돌려주고, 최종 답이 나올 때까지 반복한다.
async function runAgent(userMessage) {
  const messages = [{ role: "user", content: userMessage }];
  const steps = [];   // 화면에 보여줄 도구 호출 기록

  for (let i = 0; i < MAX_STEPS; i++) {
    const reply = await callClaude(messages);
    messages.push({ role: "assistant", content: reply.content });

    if (reply.stop_reason !== "tool_use") {
      const answer = reply.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return { answer, steps };
    }

    const results = [];
    for (const block of reply.content.filter((b) => b.type === "tool_use")) {
      let output;
      try {
        output = await toolHandlers[block.name](block.input);
      } catch (e) {
        output = { error: String(e.message || e) };
      }
      steps.push({ tool: block.name, input: block.input, output });
      results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
    }
    messages.push({ role: "user", content: results });
  }
  return { answer: "도구 호출이 너무 많아 중단했습니다. 질문을 조금 더 구체적으로 해 주세요.", steps };
}

// Vercel 서버리스 함수
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 만 지원합니다." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY 가 설정되지 않았습니다." });
  }
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 500) {
    return res.status(400).json({ error: "message 는 1~500자여야 합니다." });
  }
  try {
    res.status(200).json(await runAgent(message));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
