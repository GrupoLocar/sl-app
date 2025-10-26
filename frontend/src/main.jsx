// import React from 'react'
// import { createRoot } from 'react-dom/client'
// import { HashRouter } from 'react-router-dom'
// import App from './App'

// createRoot(document.getElementById('root')).render(
//   <HashRouter>
//     <App />
//   </HashRouter>
// )

import React from "react";
import ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

// Rotas
const router = createHashRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider
      router={router}
      // ✅ Passe os future flags AQUI (no RouterProvider)
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    />
  </React.StrictMode>
);



