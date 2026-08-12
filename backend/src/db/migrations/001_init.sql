-- 아공노 모바일회원증 초기 스키마
-- PRD 27-28, DESIGN.md 2절 기반

CREATE TYPE member_status AS ENUM ('active', 'inactive');

CREATE TABLE members (
  id                  BIGSERIAL PRIMARY KEY,
  member_id           VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(50)  NOT NULL,
  birth_date          DATE         NOT NULL,
  issue_date          DATE         NOT NULL,
  photo_path          TEXT,
  status              member_status NOT NULL DEFAULT 'active',
  password_hash       TEXT,
  password_set_at     TIMESTAMPTZ,
  must_reset_password BOOLEAN NOT NULL DEFAULT true,
  failed_login_count  SMALLINT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_name ON members (name);
CREATE INDEX idx_members_status ON members (status);

CREATE TABLE admins (
  id                  BIGSERIAL PRIMARY KEY,
  username            VARCHAR(50) NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  name                VARCHAR(50) NOT NULL,
  totp_secret         TEXT,
  totp_enabled        BOOLEAN NOT NULL DEFAULT false,
  failed_login_count  SMALLINT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE batch_status AS ENUM ('validated', 'committed', 'cancelled', 'failed');

CREATE TABLE upload_batches (
  id               BIGSERIAL PRIMARY KEY,
  file_name        TEXT NOT NULL,
  uploaded_by      BIGINT NOT NULL REFERENCES admins(id),
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at     TIMESTAMPTZ,
  total_rows       INT NOT NULL DEFAULT 0,
  new_count        INT NOT NULL DEFAULT 0,
  updated_count    INT NOT NULL DEFAULT 0,
  unchanged_count  INT NOT NULL DEFAULT 0,
  inactive_count   INT NOT NULL DEFAULT 0,
  error_count      INT NOT NULL DEFAULT 0,
  status           batch_status NOT NULL DEFAULT 'validated',
  column_mapping   JSONB,
  staged_rows      JSONB,
  error_detail     JSONB,
  photo_zip_name   TEXT,
  photo_extract_dir TEXT
);

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT REFERENCES admins(id),
  member_id   VARCHAR(30),
  batch_id    BIGINT REFERENCES upload_batches(id),
  action      VARCHAR(30) NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_member ON audit_logs (member_id);
CREATE INDEX idx_audit_created ON audit_logs (created_at);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
