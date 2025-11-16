import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useState } from "react";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./Login";
import UploadForm from "./UploadForm";
import DocumentsList from "./DocumentsList";
import UserManagement from "./UserManagement";

const Navigation = () => {
  const location = useLocation();
  const { user, logout, isCompanyAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Desktop Navigation - Top */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-gray-800">🚛 DocManage</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 border-r border-gray-200">
                <p className="text-sm text-gray-600">📱 {user.mobile}</p>
                <p className="text-xs text-gray-500">{user.company_name}</p>
              </div>
              
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  location.pathname === "/"
                    ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📤 Upload
              </Link>
              
              <Link
                to="/documents"
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  location.pathname === "/documents"
                    ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                📋 Documents
              </Link>
              
              {isCompanyAdmin() && (
                <Link
                  to="/users"
                  className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                    location.pathname === "/users"
                      ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  👥 Users
                </Link>
              )}
              
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-all text-sm"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${
              location.pathname === "/"
                ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-xs font-medium">Upload</span>
          </Link>
          
          <Link
            to="/documents"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${
              location.pathname === "/documents"
                ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">Documents</span>
          </Link>
          
          {isCompanyAdmin() && (
            <Link
              to="/users"
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${
                location.pathname === "/users"
                  ? "bg-gradient-to-r from-slate-600 to-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-xs font-medium">Users</span>
            </Link>
          )}
          
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-lg text-red-600 hover:bg-red-50 transition-all"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>
      
      <div className="h-0 md:h-20"></div>
      <div className="h-20 md:h-0"></div>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UploadForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsList />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/users"
          element={
            <ProtectedRoute requireAdmin={true}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
