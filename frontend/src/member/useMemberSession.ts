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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MemberInfo>("/member/me");
      setMember(data);
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

  return { member, loading, login, logout, refresh };
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "알 수 없는 오류가 발생했습니다.";
}
