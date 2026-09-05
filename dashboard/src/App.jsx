import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api.js';
import Login from './Login.jsx';
import DeviceList from './DeviceList.jsx';
import DeviceDetail from './DeviceDetail.jsx';
import Blocklist from './Blocklist.jsx';
import Alerts from './Alerts.jsx';
import Shell from './Shell.jsx';

function RequireAuth({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DeviceList />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="blocklist" element={<Blocklist />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
