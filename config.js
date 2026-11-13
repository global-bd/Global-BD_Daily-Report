// 해외사업팀 일일보고 — 설정 파일
// GitHub Pages 등에 올려 팀원끼리 데이터를 공유하려면 Google Apps Script 웹 앱 주소를 넣으세요.
// (설정 방법: README.md → "팀 공유 저장소 연결")
// 비워 두면 각자의 브라우저에만 저장됩니다. Claude 아티팩트에서는 자동으로 공유 저장소를 사용합니다.
window.BD_CONFIG = {
  SITE_TITLE: "Global-BD_Daily Report",
  TEAM_NAME: "해외사업팀",
  SHEETS_API_URL: "https://script.google.com/macros/s/AKfycbwi4mbN5pU8CWNkU4ItOKLTaxTHbgG0Xd9cuugYp3nBk4BNPHvnajuWm8lipdKPLGt_iA/exec",

  // 기본 팀 구성. 저장소에 팀 정보가 아직 없을 때 사용합니다.
  // 앱의 "팀원·설정" 탭에서 저장한 뒤에는 저장소의 정보가 우선합니다.
  // id는 보고 데이터와 연결되므로 한번 정한 뒤에는 바꾸지 마세요.
  TEAM: {
    teamName: "해외사업팀",
    leader: { name: "이호용", title: "상무" },
    members: [
      { id: "m01", name: "남종현", title: "과장", region: "", role: "" },
      { id: "m02", name: "김요한", title: "과장", region: "", role: "" },
      { id: "m03", name: "김상현", title: "과장", region: "", role: "" },
      { id: "m04", name: "김민구", title: "대리", region: "", role: "" },
      { id: "m05", name: "조병주", title: "대리", region: "", role: "" },
      { id: "m06", name: "이재웅", title: "주임", region: "", role: "" },
      { id: "m07", name: "이수진", title: "주임", region: "", role: "" }
    ]
  }
};
