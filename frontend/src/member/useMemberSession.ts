import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../shared/api";

export interface MemberInfo {
  name: string;
  birthDate: string;
  issueDate: string;
  hasPhoto: boolean;
}

export function useMemberSession() {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // 로그아웃 후 다른 사람으로 로그인해도 사진이 이전 사람 것으로 남아있던 문제(2026-08-13) —
  // <img src>가 그대로면 브라우저가 새로 요청을 보내지 않고 캐시된 이전 사진을 계속 보여준다.
  // refresh할 때마다 값을 바꿔서 사진 URL에 붙이면 매번 새로 받아오도록 강제할 수 있다.
  const [photoNonce, setPhotoNonce] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MemberInfo>("/member/me");
      setMember(data);
      setPhotoNonce(Date.now());
    } catch (e) {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (name: string, phone: string) => {
    await api.post("/member/login", { name, phone });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post("/member/logout");
    setMember(null);
  }, []);

  return { member, loading, login, logout, refresh, photoNonce };
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "알 수 없는 오류가 발생했습니다.";
}
