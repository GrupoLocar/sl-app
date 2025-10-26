import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Reset from './pages/Reset'
import Dashboard from './pages/Dashboard'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset/:token" element={<Reset />} />
      <Route path="/app" element={<Dashboard />} />
    </Routes>
  )
}
