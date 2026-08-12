# 아공노 모바일조합원증 — 설계안 (v1.0)

PRD 50번 지시(아키텍처 → DB스키마 → 화면구조 → Excel구조 → 보안구조 제시 후 승인)에 따라 작성.
승인 후 Phase 1부터 실제 코드 구현을 시작한다.

---

## 1. 시스템 아키텍처

### 1.1 전체 구성

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌─────────────────┐
│  회원 PWA (모바일 브라우저) │        │  관리자 웹 (PC 브라우저)     │        │                 │
│  React + Vite + Tailwind │◄──────►│  React + Vite + Tailwind  │◄──────►│  Express API     │
│  /member/*               │  HTTPS │  /admin/*                 │  HTTPS │  (Node.js + TS)  │
└─────────────────────────┘        └──────────────────────────┘        └────────┬─────────┘
                                                                                  │
                                                            ┌─────────────────────┼─────────────────────┐
                                                            │                     │                     │
                                                     ┌──────▼──────┐     ┌────────▼────────┐   ┌────────▼────────┐
                                                     │ PostgreSQL  │     │ 파일 저장소       │   │ 세션 저장소       │
                                                     │ (members,   │     │ (회원 사진,       │   │ (connect-pg-     │
                                                     │  admins,    │     │  비공개 디렉터리) │   │  simple)         │
                                                     │  batches,   │     └─────────────────┘   └─────────────────┘
                                                     │  audit_logs)│
                                                     └─────────────┘
```

### 1.2 모노레포 디렉터리 구조

```
asgongno-membercard/
├── DESIGN.md
├── package.json                # workspaces 루트
├── docker-compose.yml          # (선택) 로컬 개발용 Postgres — 이번엔 로컬 설치 Postgres 사용
├── .env.example
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/     # SQL 마이그레이션 (node-pg-migrate)
│   │   │   └── pool.ts
│   │   ├── modules/
│   │   │   ├── auth/           # 회원/관리자 로그인, 세션
│   │   │   ├── members/        # 회원 CRUD, 검색
│   │   │   ├── excel/          # 업로드 파싱·검증·반영
│   │   │   ├── photos/         # ZIP 처리, 이미지 매칭, 비공개 서빙
│   │   │   └── audit/          # 변경 이력
│   │   ├── middleware/         # authGuard, adminGuard, rateLimit, errorHandler
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── member/              # 회원 전용 화면
│   │   ├── admin/                # 관리자 전용 화면 (별도 라우트 트리)
│   │   ├── shared/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── icons/
│   └── package.json
└── storage/
    └── photos/                 # 웹 루트 밖, API를 통해서만 접근 가능
```

### 1.3 요청 흐름 요약

- 정적 프론트엔드(회원/관리자)는 같은 Vite 빌드에서 역할별 라우트로 분리하되, **관리자 API와 회원 API는 완전히 다른 Express 라우터·미들웨어 체인**을 사용한다 (PRD 원칙 9).
- 인증은 `httpOnly` 쿠키 기반 세션(connect-pg-simple, PostgreSQL에 세션 저장)을 기본으로 한다. PRD 29번이 "세션 또는 안전한 JWT"를 허용하므로, XSS에 의한 토큰 탈취 위험이 낮은 세션 쿠키를 1순위로 채택한다.
- 사진은 `storage/photos/`에 저장하고 공개 정적 경로로 노출하지 않는다. `/api/members/me/photo`, `/api/admin/members/:id/photo` 같은 인증된 API 엔드포인트가 파일을 스트리밍한다 (금지사항 5, 9 대응).

---

## 2. 데이터베이스 스키마

PostgreSQL, PRD 27–28 기반으로 구체화.

```sql
-- 회원 상태는 정의된 값만 허용
CREATE TYPE member_status AS ENUM ('active', 'inactive');

CREATE TABLE members (
  id            BIGSERIAL PRIMARY KEY,
  member_id     VARCHAR(30)  NOT NULL UNIQUE,        -- 예: 2026-1 (발급연도-일련번호)
  name          VARCHAR(50)  NOT NULL,
  birth_date    DATE         NOT NULL,
  issue_date    DATE         NOT NULL,
  photo_path    TEXT,                                 -- storage 내부 상대경로 (공개 URL 아님)
  phone         VARCHAR(20),                          -- 정규화된 숫자만 저장. 회원 로그인 식별자로 사용 (UNIQUE, 2026-08-12 추가)
  status        member_status NOT NULL DEFAULT 'active',
  password_hash TEXT,                                  -- bcrypt 해시, 최초 로그인 전 NULL 가능
  password_set_at TIMESTAMPTZ,
  failed_login_count SMALLINT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_name ON members (name);
CREATE INDEX idx_members_status ON members (status);

CREATE TABLE admins (
  id             BIGSERIAL PRIMARY KEY,
  username       VARCHAR(50) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,                        -- bcrypt/argon2
  name           VARCHAR(50) NOT NULL,
  totp_secret    TEXT,                                  -- 2단계 인증용 (선택, 향후 확장)
  totp_enabled   BOOLEAN NOT NULL DEFAULT false,
  failed_login_count SMALLINT NOT NULL DEFAULT 0,
  locked_until   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE batch_status AS ENUM ('validated', 'committed', 'cancelled', 'failed');

CREATE TABLE upload_batches (
  id               BIGSERIAL PRIMARY KEY,
  file_name        TEXT NOT NULL,
  uploaded_by       BIGINT NOT NULL REFERENCES admins(id),
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at      TIMESTAMPTZ,
  total_rows        INT NOT NULL DEFAULT 0,
  new_count         INT NOT NULL DEFAULT 0,
  updated_count     INT NOT NULL DEFAULT 0,
  unchanged_count   INT NOT NULL DEFAULT 0,
  inactive_count    INT NOT NULL DEFAULT 0,
  error_count       INT NOT NULL DEFAULT 0,
  status            batch_status NOT NULL DEFAULT 'validated',
  column_mapping    JSONB,                              -- 관리자가 선택한 컬럼 매핑
  staged_rows       JSONB,                               -- STEP2/3 검증 결과(임시 데이터 영역), 반영 후 정리 가능
  error_detail      JSONB                                -- 행 단위 오류 목록
);

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT REFERENCES admins(id),
  member_id   VARCHAR(30),                                -- members.member_id 참조값 (탈퇴 이후도 남도록 FK 미사용)
  batch_id    BIGINT REFERENCES upload_batches(id),
  action      VARCHAR(30) NOT NULL,                        -- create / update / deactivate / photo_update / login_fail 등
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_member ON audit_logs (member_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);

-- 세션 저장 테이블은 connect-pg-simple이 자동 생성 ("session" 테이블)
```

**제약조건 반영**
- `member_id UNIQUE` → 중복 저장 자체가 DB 레벨에서 차단됨.
- `birth_date`, `issue_date`는 `DATE` 타입 → 문자열 저장 금지.
- `status`는 ENUM으로 제한.
- 물리 삭제 없음 — `status = 'inactive'`로만 전환 (PRD 37).

**회원번호 양식 (2026-08-11 수정)**
회원번호 권장 양식을 **"발급연도-일련번호"** (예: `2026-1`, `2026-2`)로 정한다. 관리자 회원 신규 등록 화면은 `GET /api/admin/members/next-id`로 해당 연도의 다음 일련번호를 자동 제안하되, 관리자가 값을 직접 수정할 수도 있다. 단, DB/검증 단(`member_id` 정규식)은 이 양식을 강제하지 않고 영문·숫자·하이픈·언더스코어를 포함한 일반적인 문자열을 허용한다 — PRD 7번이 요구하는 대로 "실제 Excel에서 사용하는 기존 회원번호 체계"를 그대로 가져와 쓸 수 있어야 하기 때문이다.

---

## 3. 화면 구조

### 3.1 라우팅

```
/member/login              회원 로그인 (이름 + 휴대폰번호, 2026-08-12 변경)
/member/card               로그인 후 첫 화면 = 모바일 조합원증 (기본 진입점)
/member/info                내 정보 (회원번호 등 최소 정보)
/member/help                 안내 (정적 페이지)

/admin/login                관리자 로그인
/admin/dashboard             대시보드
/admin/members                회원 목록/검색
/admin/members/:id            회원 상세/수정
/admin/members/new             회원 신규 등록
/admin/excel/upload             Excel(+사진 ZIP) 업로드
/admin/excel/preview/:batchId    검증 결과·변경사항 미리보기 → 최종 반영
/admin/excel/history              업로드 이력
/admin/audit-logs                  변경 이력 조회
```

- 회원 라우트(`/member/*`)와 관리자 라우트(`/admin/*`)는 코드 스플리팅되어 별도 청크로 로드되고, 각각 별도의 인증 가드(`memberGuard` / `adminGuard`)를 통과해야 한다.
- MVP 하단 메뉴는 PRD 22 지침대로 "회원증 / 내 정보 / 안내"로 최소화하고, "설정"은 로그아웃 버튼 정도로만 축소한다.

### 3.2 회원증 화면 레이아웃 (2026-08-11 수정: 상단 로고 제거, 사진을 세로형 증명사진 비율로 변경)

```
상단 고정바:  아산시공무원노동조합
─────────────────────────────

        ┌───────────┐
        │           │
        │           │
        │  회원 사진  │  ← 세로형 증명사진 비율(3:4), object-fit: cover
        │  (3:4 세로) │     사진 없으면 기본 실루엣 아이콘을 동일 비율로 표시
        │           │
        │           │
        └───────────┘

            홍 길 동
           1985.03.15

        발급일 2026.08.11

      아산시공무원노동조합
─────────────────────────────
하단 탭:  [회원증] [내 정보] [안내]
```

**변경 사항**
- 카드 상단의 아공노 로고 이미지는 표시하지 않는다. 브랜드 식별은 상단 고정바와 하단의 "아산시공무원노동조합" 텍스트로만 처리한다.
- 회원 사진은 정사각형이 아닌 **세로형 증명사진 비율(3:4, 일반적인 3.5×4.5cm 증명사진에 가까운 비율)** 카드로 표시하고, 카드 내에서 시각적으로 가장 큰 비중을 차지하는 핵심 요소로 배치한다.
- 사진 비율이 다른 원본이 업로드되어도 `object-fit: cover`로 3:4 프레임을 채우되, 얼굴 형태 자체는 변형하지 않는다(PRD 5.2 원칙 유지).
- 회원번호는 화면에 표시하지 않는다(PRD 41). 카드가 화면의 주 콘텐츠가 되도록 다른 UI 요소는 최소화한다.

> 참고: PRD 4.1/원문은 "아공노 로고 표시"를 필수 항목으로 명시하고 있으나, 실제 사용자(발주자) 요청에 따라 카드 내 로고 이미지는 제거하고 텍스트 브랜딩으로 대체한다. 이후 로고 이미지가 준비되면 상단 고정바 등 다른 위치에 다시 추가할 수 있도록 컴포넌트는 분리해서 구현한다.

### 3.3 관리자 Excel 업로드 화면 흐름 (PRD 44 반영)

```
[업로드 화면] → [.xlsx 선택] + [사진 ZIP 선택(선택 사항)] → [컬럼 매핑 확인] → [데이터 검증]
     → [검증 결과 화면: 총 N명 / 신규 / 변경 / 변경없음 / 비활성화 / 오류]
     → [상세 변경내역 보기] (표 형태, 행 단위 diff)
     → 오류 0건 아니면 [최종 반영] 비활성화, [오류 확인] 강조
     → 관리자가 [최종 반영] 클릭 → 트랜잭션 커밋 → 결과 요약 + 업로드 이력에 기록
```

---

## 4. Excel 업로드 데이터 구조

### 4.1 권장 컬럼 (PRD 9, 51)

| 회원번호 | 이름 | 생년월일 | 발급일 | 사진파일명 | 상태 |
|---|---|---|---|---|---|
| 2026-1 | 홍길동 | 1985-03-15 | 2026-08-11 | 2026-1.jpg | 정상 |

### 4.2 컬럼 매핑 기능 (PRD 51)

실제 노조 명부의 컬럼명이 다를 수 있으므로, 업로드 STEP2에서 엑셀의 실제 헤더를 읽어 화면에 드롭다운으로 보여주고 관리자가 다음처럼 매핑한다.

```
Excel 컬럼(자동 인식)   →  시스템 필드
성명                    →  이름 (name)
생년월일                →  생년월일 (birth_date)
발급일자                →  발급일 (issue_date)
회원번호                →  회원번호 (member_id)
사진                    →  사진파일명 (photo_file)
회원상태                →  상태 (status)
```
매핑 결과는 `upload_batches.column_mapping`에 JSON으로 저장해 다음 업로드 시 기본값으로 재사용한다.

### 4.3 검증 파이프라인 (PRD 10–11, 33–34)

```
STEP1 파일선택 → STEP2 파싱(SheetJS) → STEP3 행단위 검증 → STEP3 임시 영역(staged_rows)에 저장
   검증 항목:
     - 필수값(회원번호/이름/생년월일/발급일) 누락
     - 회원번호 형식/중복 (Excel 내부 중복 포함)
     - 날짜 파싱: YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD / YYYYMMDD 모두 허용,
       내부적으로 YYYY-MM-DD로 표준화, 존재하지 않는 날짜(2026-02-31 등)는 오류
     - status 값이 정상/탈퇴/자격상실/삭제/비활성 중 하나인지
   → STEP3 결과 화면(신규/변경/변경없음/비활성화/오류 카운트 + 상세 diff)
   → STEP4 관리자가 [최종 반영] 클릭
      → DB 트랜잭션 시작
      → staged_rows를 members 테이블에 반영(신규 insert / 값 변경 update / status inactive 전환)
      → 각 변경 건에 대해 audit_logs insert
      → upload_batches.status = 'committed', 카운트 확정
      → 오류 발생 시 전체 ROLLBACK, upload_batches.status = 'failed'
```

### 4.4 사진 ZIP 구조 (PRD 16–17)

```
members.zip
├── members.xlsx            (선택: xlsx를 zip 안에 포함하거나 별도 업로드 가능)
└── photos/
    ├── 2026-1.jpg
    ├── 2026-2.jpg
    └── ...
```
- 허용 확장자: jpg/jpeg/png/webp, 개별 파일 크기 제한(예: 5MB), 총 zip 크기 제한.
- 압축 해제 시 zip-slip(경로 탈출) 방지, 파일 시그니처(매직바이트) 검사로 위장 파일 차단.
- Excel의 `사진파일명`과 zip 내 실제 파일을 `photos/{member_id 매칭}` 기준으로 연결하고, 실제 파일이 없으면 해당 행을 "오류"가 아닌 "사진 없음" 경고로 분리해 전체 업로드를 막지 않는다.
- 매칭된 사진은 Sharp로 리사이즈/포맷 정규화 후 `storage/photos/{member_id}.webp`로 저장.

---

## 5. 개인정보 및 보안 구조

| 항목 | 적용 방식 |
|---|---|
| 회원 인증 | **이름 + 휴대폰번호** (2026-08-12 변경, 아래 별도 설명) |
| 관리자 인증 | 별도 로그인 경로, bcrypt/argon2 해시, 향후 TOTP 2단계 인증 확장 가능한 컬럼 미리 준비 |
| 세션 | httpOnly + Secure + SameSite=Lax 쿠키, PostgreSQL 세션 스토어, 로그아웃 시 서버측 세션 파기 |
| 권한 분리 | `memberGuard`(본인 데이터만) / `adminGuard`(전체) 미들웨어를 API 라우터 단위로 강제 분리 |
| 사진 노출 | 공개 정적 경로 없음. 인증된 사용자 본인(or 관리자)만 스트리밍 API로 조회 가능 |
| API 응답 | 회원 API는 `member_id`, `password_hash` 등 내부 식별자·해시를 응답에 절대 포함하지 않음 |
| Excel 원본 | 업로드된 xlsx는 서버 임시 디렉터리에만 보관, 프론트엔드/공개 경로로 재공개하지 않음. 처리 후 일정 기간 뒤 정리 |
| 전송 구간 | 배포 시 HTTPS 강제 (개발 중 로컬은 HTTP 허용) |
| 감사 로그 | 회원정보 변경/로그인 실패/관리자 작업을 `audit_logs`에 기록 |
| 테스트 데이터 | PRD 39 원칙에 따라 가상 인물(2026-1, 홍길동 등)만 시드 데이터로 사용 |

### 회원 로그인 방식 변경: 회원번호+비밀번호 → 이름+휴대폰번호 (2026-08-12)

**배경**: 실제 조합원 규모가 약 1,900명이며, 모바일 조합원증 링크를 일괄 발송한 뒤 각자 첫 로그인을 하는 운영 방식이 확정되었다. 회원번호(비정형 값)와 관리자 발급 임시 비밀번호를 1,900명에게 개별 전달하는 것은 운영 부담이 크므로, 각 회원이 이미 알고 있는 **이름 + 본인 휴대폰번호**로 로그인하도록 변경했다.

**동명이인 문제 대응**: PRD 7번은 "이름만으로, 또는 이름+생년월일만으로 회원을 식별하지 않는다"고 명시한다. 1,900명 규모에서는 동명이인이 사실상 확실하므로, 이름 단독 식별은 금지 원칙을 그대로 위반하게 된다. 이를 지키기 위해:
- `members.phone`에 **DB 레벨 UNIQUE 제약**(부분 인덱스, NULL은 여러 개 허용)을 걸어 동일 휴대폰번호가 두 회원에게 배정될 수 없도록 구조적으로 차단한다.
- 로그인 조회는 `WHERE name = ? AND phone = ?`이므로, 휴대폰번호의 유일성 덕분에 이름이 겹치더라도 결과는 항상 0건 또는 1건이다 (동명이인이 각자 자신의 계정에만 로그인됨을 실제 테스트로 확인).
- 관리자 회원 등록/Excel 업로드 시 휴대폰번호가 이미 다른 회원에게 등록되어 있으면 저장 자체를 차단한다.
- 계정별 로그인 실패 잠금은 더 이상 적용하지 않는다(첫 조회 단계에서 계정이 특정되지 않는 구조이므로). 대신 IP 단위 요청 빈도 제한(`loginRateLimiter`)으로 무차별 대입을 방어한다.

**트레이드오프**: 비밀번호(사용자만 아는 비밀 값) 대신 휴대폰번호(상대적으로 덜 비밀스러운 값)를 사용하므로 순수 보안 강도는 낮아진다. 다만 회원증에 담긴 정보(이름/생년월일/사진, PRD 41 최소 노출 원칙)의 민감도가 크지 않고, 1,900명 규모의 실제 온보딩 편의성이 중요하다는 점을 고려한 의도적 선택이다. `password_hash`/`must_reset_password` 등 기존 비밀번호 관련 컬럼은 스키마에 남겨두되(향후 확장 가능성), 회원 로그인 로직에서는 더 이상 사용하지 않는다.

### 32번 금지사항 체크리스트 반영
- [x] 회원 전체 명단 공개 API 없음 — 관리자 전용 `/api/admin/members` 만 존재, `adminGuard` 필수
- [x] 회원번호만으로 회원증 노출 불가 — 반드시 이름+휴대폰번호(고유 조합) 확인 필요
- [x] 생년월일 단독 로그인 불가 (이름+생년월일 조합도 사용하지 않음, 대신 이름+휴대폰번호의 DB 고유 제약으로 식별)
- [x] 관리자 비밀번호 bcrypt 해시 저장
- [x] 사진 무제한 공개 URL 없음 — 인증 스트리밍 API만 존재
- [x] Excel 업로드 즉시 DB 삭제 없음 — staged → preview → 승인 → commit 구조
- [x] 오류 존재 시 강제 전체 반영 금지 — 오류 0건이 아니면 최종반영 버튼 비활성화 또는 명시적 부분 처리 정책 필요(오류 행 제외 반영 여부는 관리자가 화면에서 확인 후 선택)
- [x] 일반 회원의 타 회원 검색 기능 없음
- [x] LocalStorage에 전체 회원정보 저장 안 함 (세션 쿠키만 사용, 클라이언트는 본인 카드 데이터만 메모리에 보관)
- [x] 개인정보 포함 Excel/사진을 저장소(git)에 커밋하지 않음 — `.gitignore`에 storage/, uploads/ 제외 처리
- [x] 테스트 데이터는 가상 인물만 사용

---

## 6. 다음 단계

이 설계안이 승인되면 Phase 1부터 순서대로 실제 프로젝트 파일을 생성한다.
(Phase 1 프로젝트 구조 → Phase 2 DB → Phase 3 관리자 로그인 → … → Phase 12 통합 테스트)
