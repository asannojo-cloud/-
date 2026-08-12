-- 회원 로그인 방식을 "이름 + 휴대폰번호"로 전환하기 위한 컬럼 추가.
-- 1900명 규모 실제 운영 시, 회원번호(임의 발급 값)나 관리자 발급 임시 비밀번호를
-- 일일이 개별 전달하는 대신, 각 회원이 이미 알고 있는 이름+본인 휴대폰번호로 첫 로그인할 수 있도록 한다.
--
-- 이름만으로는 동명이인 문제가 있으므로(설계 원칙 위반), 반드시 휴대폰번호와 조합하여 식별하고,
-- 휴대폰번호 자체는 DB 레벨에서 UNIQUE 제약을 걸어 동일 번호가 서로 다른 두 회원에게 배정되지 않도록 한다.
-- (NULL은 여러 개 허용 — 아직 휴대폰번호가 등록되지 않은 회원은 로그인 전 관리자가 채워줘야 한다.)

ALTER TABLE members ADD COLUMN phone VARCHAR(20);

CREATE UNIQUE INDEX idx_members_phone_unique ON members (phone) WHERE phone IS NOT NULL;
