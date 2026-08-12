# 노트북 인수인계 가이드 (2026-08-12 기준)

이 문서는 사무실 PC(현재 세션)에서 노트북으로 작업을 옮기기 위한 안내입니다.
노트북에서 **Claude Code를 새로 실행**하고, 이 문서와 `DESIGN.md`, `README.md`를 먼저 읽게 하면
지금까지의 설계·결정 사항을 그대로 이어받아 작업할 수 있습니다.

## 지금까지 진행 상황 요약

- 회원 로그인 방식: **이름 + 휴대폰번호** (회원번호+비밀번호 아님)
- 회원번호 권장 양식: 발급연도-일련번호 (예: 2026-1), 신규등록/Excel 모두 자동 채번 가능
- 관리자 화면: 회원 검색/등록/수정/사진등록/비활성화/완전삭제(비활성 회원만)/체크박스 일괄삭제, Excel 업로드(양식 다운로드·형식 안내 포함), 변경 이력
- Excel 업로드: 이름·휴대폰번호·생년월일만 필수, 나머지는 비워도 업로드 가능(자동 채번/발급일 기본값)
- PWA 적용, 로고·조합원증 라벨 등 디자인 반영 완료
- **미완료**: 실제 인터넷 공개(배포) — 이 사무실 PC 네트워크가 Cloudflare Tunnel 등 터널링 서비스를 차단하고 있어(아산시 네트워크 보안 필터), 이번엔 클라우드 배포(Render.com 추천)로 방향을 잡았고 진행 중 노트북으로 이관하게 됨

## 노트북에서 할 일

### 1. 필수 프로그램 설치
- [Node.js LTS](https://nodejs.org) 설치
- [PostgreSQL](https://www.postgresql.org/download/windows/) 설치 (로컬에서 계속 개발하려면 필요. 클라우드 DB만 쓸 거면 건너뛰어도 됨)
- [Claude Code](https://claude.com/claude-code) 설치 후 로그인
- Git 설치 (보통 Node.js 설치 시 같이 있거나, [git-scm.com](https://git-scm.com)에서 설치)

### 2. 프로젝트 파일 옮기기
전달받은 `asgongno-membercard-handoff.zip`을 노트북의 원하는 위치(예: `C:\Users\<사용자>\projects\`)에 압축 해제합니다.
압축 파일에는 다음이 포함되어 있습니다:
- 전체 소스 코드 (`node_modules` 제외 — 나중에 `npm install`로 재설치)
- `backup_2026-08-12.sql` — 현재까지의 회원 데이터 백업 (아래 4번에서 복원)
- `backend/storage/photos/` — 등록된 회원 사진 원본

### 3. Claude Code 실행 및 컨텍스트 전달
압축 해제한 폴더에서 터미널을 열고 `claude`를 실행한 뒤, 첫 메시지로 다음과 같이 요청하세요:

```
DESIGN.md, README.md, HANDOFF.md를 읽고 지금까지 진행 상황을 파악해줘.
이 프로젝트를 노트북에서 이어서 개발할 거야. 먼저 npm install, DB 마이그레이션,
backup_2026-08-12.sql 복원까지 진행하고, 그다음 Render.com 배포를 도와줘.
```

### 4. 로컬 DB 준비 (계속 로컬 개발도 하고 싶다면)
1. PostgreSQL 설치 후, 전용 계정/DB 생성 (README.md "로컬 개발 환경" 참고)
2. `backend/.env` 새로 작성 (README.md 참고 — 비밀번호·세션 시크릿은 노트북에서 새로 생성, 사무실 PC 값을 그대로 옮기지 마세요)
3. `npm install` (루트에서)
4. `npm run migrate`
5. 데이터 복원: `psql -U <계정> -d asgongno_membercard -f backup_2026-08-12.sql`
6. `npm run dev:backend`, `npm run dev:frontend`로 정상 동작 확인

### 5. 배포 (Render.com)
GitHub 계정과 Render 계정이 준비되면, Claude에게 "Render 배포 진행해줘"라고 요청하세요.
대략적인 흐름:
1. GitHub에 이 프로젝트 push
2. Render에서 PostgreSQL(관리형 DB) 생성 → 접속정보 확보
3. Render에서 Web Service 2개(또는 backend만 Node 서비스로, frontend는 Static Site로) 생성, GitHub 저장소 연결
4. 환경변수 설정 (`DATABASE_URL`을 Render DB 것으로, `SESSION_SECRET`은 새로 생성, `NODE_ENV=production` 등)
5. 배포 후 나온 실제 URL로 로그인 테스트

## 주의사항
- `backend/storage/photos/`에는 실제 회원 사진이 들어있습니다. 노트북 반출 시 분실/유출에 주의해주세요.
- 시드 계정(테스트용): 관리자 `admin` / `Admin!2026Dev`, 회원 예시는 `backup_2026-08-12.sql` 복원 후 회원관리 화면에서 확인 가능합니다. **운영 전 관리자 비밀번호는 반드시 변경하세요.**
