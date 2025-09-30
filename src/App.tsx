// frontend/src/App.tsx
import React from "react";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 960 }}>
          <Dashboard />
        </div>
      </div>
    </div>
  );
}

export default App;
