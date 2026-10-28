# Gemini API 키 테스트 - Windows PowerShell
# 사용법: 먼저 키를 환경변수로 지정한 뒤 실행한다 (키를 파일에 직접 적지 않는다).
#   $env:GEMINI_API_KEY = "발급받은 API 키"
#   powershell -ExecutionPolicy Bypass -File .\gemini_api_test.ps1

# 한글 UTF-8 처리
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $env:GEMINI_API_KEY) {
    Write-Host "GEMINI_API_KEY 환경변수가 없습니다. README.md 의 'API 키 발급' 을 먼저 따라 해 주세요."
    exit 1
}

$model = "gemini-3.5-flash-lite"

$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "안녕하세요. Gemini API 테스트입니다. 한 문장으로 답해주세요."
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

# PowerShell 5.1에서도 한글이 깨지지 않도록 UTF-8 바이트로 전송
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
    $response = Invoke-RestMethod `
        -Uri "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent" `
        -Method Post `
        -Headers @{
            "x-goog-api-key" = $env:GEMINI_API_KEY
        } `
        -ContentType "application/json; charset=utf-8" `
        -Body $bodyBytes

    Write-Host "`n=== Gemini API 응답 성공 ==="
    Write-Host "모델: $model"
    Write-Host $response.candidates[0].content.parts[0].text
}
catch {
    Write-Host "`n=== Gemini API 오류 ==="
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message
    } else {
        $_.Exception.Message
    }
}
