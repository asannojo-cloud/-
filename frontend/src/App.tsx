import { Routes, Route, Navigate } from "react-router-dom";
import { MemberSessionProvider } from "./member/MemberSessionContext";
import MemberLoginPage from "./member/MemberLoginPage";
import MemberLayout from "./member/MemberLayout";
import MemberCardPage from "./member/MemberCardPage";
import MemberInfoPage from "./member/MemberInfoPage";
import MemberHelpPage from "./member/MemberHelpPage";

import { AdminSessionProvider } from "./admin/AdminSessionContext";
import AdminLoginPage from "./admin/AdminLoginPage";
import AdminLayout from "./admin/AdminLayout";
import DashboardPage from "./admin/DashboardPage";
import MembersListPage from "./admin/MembersListPage";
import MemberDetailPage from "./admin/MemberDetailPage";
import MemberNewPage from "./admin/MemberNewPage";
import ExcelUploadPage from "./admin/ExcelUploadPage";
import ExcelHistoryPage from "./admin/ExcelHistoryPage";
import AuditLogsPage from "./admin/AuditLogsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/member/card" replace />} />

      <Route
        path="/member/*"
        element={
          <MemberSessionProvider>
            <Routes>
              <Route path="login" element={<MemberLoginPage />} />
              <Route element={<MemberLayout />}>
                <Route path="card" element={<MemberCardPage />} />
                <Route path="info" element={<MemberInfoPage />} />
                <Route path="help" element={<MemberHelpPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/member/card" replace />} />
            </Routes>
          </MemberSessionProvider>
        }
      />

      <Route
        path="/admin/*"
        element={
          <AdminSessionProvider>
            <Routes>
              <Route path="login" element={<AdminLoginPage />} />
              <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="members" element={<MembersListPage />} />
                <Route path="members/new" element={<MemberNewPage />} />
                <Route path="members/:memberId" element={<MemberDetailPage />} />
                <Route path="excel" element={<ExcelUploadPage />} />
                <Route path="excel/history" element={<ExcelHistoryPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminSessionProvider>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
