import { createContext, useContext, type ReactNode } from "react";
import { useMemberSession, type MemberInfo } from "./useMemberSession";

interface MemberSessionValue {
  member: MemberInfo | null;
  loading: boolean;
  login: (name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MemberSessionContext = createContext<MemberSessionValue | null>(null);

export function MemberSessionProvider({ children }: { children: ReactNode }) {
  const value = useMemberSession();
  return <MemberSessionContext.Provider value={value}>{children}</MemberSessionContext.Provider>;
}

export function useMemberSessionContext(): MemberSessionValue {
  const ctx = useContext(MemberSessionContext);
  if (!ctx) throw new Error("useMemberSessionContext는 MemberSessionProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
