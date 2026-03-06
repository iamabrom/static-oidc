import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { OidcCallback } from './auth/OidcCallback';
import { FileBrowser } from './pages/FileBrowser';
import { AdminPanel } from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/callback" element={<OidcCallback />} />
          <Route
            path="/_admin/*"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/*" element={<FileBrowser />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
