# 해외사업팀 일일보고 (Global BD Daily Tracker)

해외사업팀 팀원이 매일 직접 작성하는 **일일보고 양식**과, 팀장·팀원이 함께 보는 **업무 현황 대시보드**를 한 페이지에 담은 웹 앱입니다. 설치나 빌드 없이 `index.html` 하나로 동작합니다.

## 화면 구성

| 탭 | 내용 |
|---|---|
| **팀 현황** | 날짜별 제출 현황(제출률, 미제출자), 진행 중·지연 업무, 미해결 긴급 이슈, 출장·외근자, 최근 10 근무일 제출 매트릭스, 팀원별 업무 카드, 이슈·지원 요청 보드(해결 처리), 거래처별 최신 영업 파이프라인과 통화별 합계 |
| **보고 작성** | 기본 정보(작성일·작성자·담당 지역·근무 형태·출장지·업무량) → 오늘 한 일 → 다음 근무일 계획 → 영업 파이프라인 변동 → 이슈·지원 요청 → 공유 사항. 오른쪽에 메신저용 보고문이 실시간으로 만들어지고 복사할 수 있습니다. |
| **보고 이력** | 작성자·기간·키워드로 검색, 보고 전문 보기·수정·삭제, CSV(업무 내역/보고 요약) 내보내기, JSON 백업·복원 |
| **팀원·설정** | 팀 이름, 팀장, 팀원(이름·직급·담당 지역·담당 국가) 관리, 현재 저장 방식 안내 |

편의 기능
- 상단에 팀원 담당 지역의 **현지 시각**과 업무 시간 여부(초록 점)를 표시합니다.
- **이전 계획 불러오기**: 지난 보고의 ‘다음 근무일 계획’을 오늘 한 일로 가져옵니다.
- 같은 날짜·작성자로 다시 열면 기존 보고를 불러와 **수정**합니다(하루 1인 1건).
- 처음 작성하는 팀원은 작성 화면에서 **이름을 직접 등록**할 수 있습니다.
- 작성 중인 내용은 브라우저에 임시 저장되어 창을 닫아도 이어서 쓸 수 있습니다.

## 저장 방식 (자동 선택)

| 실행 위치 | 저장소 | 팀원 간 공유 |
|---|---|---|
| Claude 아티팩트 | Claude 아티팩트 공유 저장소 | ✅ 실시간 |
| GitHub Pages + `config.js`에 `SHEETS_API_URL` 설정 | Google 스프레드시트 | ✅ 1분 간격 갱신 |
| GitHub Pages (설정 없음) / 로컬 파일 | 각자의 브라우저(localStorage) | ❌ 개인용 |

## 현재 배포 상태

- 사이트: https://global-bd.github.io/Global-BD_Daily-Report/ (이 링크를 팀원에게 공유하면 바로 작성·편집 가능)
- 저장소: https://github.com/global-bd/Global-BD_Daily-Report
- 데이터: Google 스프레드시트 ‘해외사업팀 일일보고 DB’ (kmgdec08@gmail.com 소유), Apps Script 프로젝트 ‘해외사업팀 일일보고 API’

## GitHub에 올리기 (새로 만들 때)

```bash
# 1) GitHub에서 새 저장소를 만든 뒤 (예: bd-daily-report)
git remote add origin https://github.com/<계정>/bd-daily-report.git
git branch -M main
git push -u origin main
```

**GitHub Pages 켜기**: 저장소 → Settings → Pages → Build and deployment → Source: *Deploy from a branch* → Branch: `main` / `/ (root)` → Save.
1~2분 뒤 `https://<계정>.github.io/bd-daily-report/` 에서 열립니다.

> 무료 계정은 **공개(Public) 저장소**에서만 Pages를 쓸 수 있습니다. 코드는 공개되지만 보고 데이터는 저장소에 들어가지 않습니다(Google 시트 또는 각자의 브라우저에 저장).

## 팀 공유 저장소 연결 (Google Sheets)

1. 새 Google 스프레드시트를 만들고 **확장 프로그램 → Apps Script**를 엽니다.
2. `apps-script/Code.gs` 내용을 붙여넣고 저장합니다.
3. **배포 → 새 배포 → 유형: 웹 앱**
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
4. 권한 승인 후 나오는 웹 앱 URL(`https://script.google.com/macros/s/…/exec`)을 복사합니다.
5. `config.js`를 열어 붙여넣고 커밋·푸시합니다.

```js
window.BD_CONFIG = {
  TEAM_NAME: "해외사업팀",
  SHEETS_API_URL: "https://script.google.com/macros/s/XXXX/exec"
};
```

연결이 끝나면 **페이지 링크만 받은 사람도 바로 보고를 작성·수정·삭제하고 팀원 목록을 저장할 수 있습니다** (로그인 불필요). 상단 배지가 ‘Google Sheets 공유’로 바뀌면 정상입니다.

시트에는 `reports`(보고 1건 1행), `tasks`(업무 1건 1행), `issues`(이슈 1건 1행), `pipeline`(파이프라인 변동 1건 1행), `team` 시트가 자동으로 생깁니다. `reports` 시트의 마지막 `json` 열과 `team` 시트의 B1 셀이 원본이니 직접 고치지 마세요. `tasks` 시트로 바로 피벗·필터 분석을 할 수 있습니다.

> **보안 참고**: 웹 앱 URL을 아는 사람은 누구나 읽고 쓸 수 있습니다. 링크는 팀 내부에서만 공유하고, 민감한 계약 조건은 적지 않는 것을 권장합니다. Apps Script 코드를 수정하면 **배포 관리 → 새 버전**으로 다시 배포해야 반영됩니다.

## 항목 바꾸기

`index.html` 상단 `설정 · 상수` 부분에서 수정합니다.

| 상수 | 내용 |
|---|---|
| `TASK_CATS` | 업무 구분 (바이어 미팅, 제안·견적, 계약·협상 …) |
| `STATUSES` | 진행 상태 (완료, 진행중, 대기, 지연) |
| `STAGES` | 파이프라인 단계 (리드 → 첫 접촉 → 제안·견적 → 협상 → 계약, 보류, 실주) |
| `CURRENCIES` | 통화 |
| `REGIONS` | 담당 지역과 현지 시간대 |
| `WORK_TYPES` | 근무 형태 |

## 파일 구성

```
index.html          앱 전체 (HTML·CSS·JS)
config.js           팀 이름, Google Sheets 연결 주소
apps-script/Code.gs Google Sheets 백엔드 (팀 공유 시 필요)
.nojekyll           GitHub Pages가 파일을 그대로 서비스하도록 하는 빈 파일
```

## 현재 팀 구성 (config.js 기본값)

- 팀장: 이호용 상무 (보고 제출 대상 아님, 이슈 요청 대상 목록에 포함)
- 팀원: 남종현 과장, 김요한 과장, 김상현 과장, 김민구 대리, 조병주 대리, 이재웅 주임, 이수진 주임

담당 지역·국가는 앱의 **팀원·설정** 탭에서 지정하세요. 상단 현지 시각이 담당 지역 기준으로 바뀝니다.
