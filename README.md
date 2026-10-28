# 제주 여행 추천 에이전트

질문하면 Gemini 가 `get_weather`(Open-Meteo)와 `find_spots`(`jeju_spots.json`)를 스스로 골라 호출해 장소를 추천한다.

## Gemini API 키 발급 (Google AI Studio)

1. <https://aistudio.google.com/> 에 접속해 Google 계정으로 **로그인**한다.
2. "Google AI Studio에 오신 것을 환영합니다" 화면에서 만 18세 이상 확인란에 체크하고 **계속**을 누른다.
3. 방문 목적 질문이 나오면 **건너뛰기**를 눌러도 된다.
4. 왼쪽 아래의 열쇠 아이콘(**Get API key**)을 눌러 API 키 대시보드로 이동한다.
5. 처음 들어가면 `Default Gemini API Key` 가 이미 하나 만들어져 있다. 오른쪽의 **API 키 복사** 아이콘으로 복사한다. (없으면 **API 키 만들기**)
6. 복사한 키를 아래 "키 설정"대로 환경변수에 넣는다. **키는 코드나 저장소에 적지 않는다.**

무료 티어는 호출 한도(비율 제한)가 낮다. AI Studio 왼쪽 메뉴의 **사용량**, **비율 제한**, **로그 및 데이터 세트**에서 호출 횟수와 한도를 확인할 수 있고, 더 쓰려면 **결제**에서 프로젝트(`Default Gemini Project`)를 골라 Cloud Billing 을 설정한다.

## 키 설정과 테스트

PowerShell 에서 키가 동작하는지 먼저 확인한다.

```powershell
$env:GEMINI_API_KEY = "발급받은 API 키"
powershell -ExecutionPolicy Bypass -File .\gemini_api_test.ps1
```

"Gemini API 응답 성공"과 한 문장 답이 나오면 키가 정상이다.

## 실행

- **로컬**: `.env.example` 을 `.env.local` 로 복사해 키를 채운 뒤 `npx vercel dev`
- **배포(Vercel)**: 프로젝트 Settings → Environment Variables 에 `GEMINI_API_KEY` 를 등록하고 배포한다.

서버 함수(`api/chat.js`)가 키를 들고 Gemini 를 호출하므로 키는 브라우저로 나가지 않는다.
모델은 기본 `gemini-3.5-flash-lite` 이고, 환경변수 `GEMINI_MODEL` 로 바꿀 수 있다.
