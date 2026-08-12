import "express-session";

declare module "express-session" {
  interface SessionData {
    auth?: {
      role: "member" | "admin";
      id: number; // members.id 또는 admins.id (내부 PK, 응답에는 노출하지 않음)
    };
  }
}
