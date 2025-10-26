import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import '../styles.css'

export default function Reset(){
  const { token } = useParams()
  const nav = useNavigate()
  const [password,setPassword] = useState('')
  const [msg,setMsg] = useState('')
  async function submit(e){
    e.preventDefault()
    try{
      await api.post('/api/auth/reset', { token, password })
      setMsg('Senha alterada. Faça login.')
      setTimeout(()=>nav('/login'), 1000)
    }catch{ setMsg('Token inválido/expirado') }
  }
  return (
    <div className="container">
      <div className="card">
        <h3>Definir nova senha</h3>
        <form onSubmit={submit}>
          <label>Nova senha</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn">Salvar</button>
        </form>
        <p>{msg}</p>
      </div>
    </div>
  )
}
