import React, { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";

// Helpers
const stripAccents = (s="") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/gi, "c");

const toProperCase = (full="") =>
  full
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const onlyDigits = (s="") => s.replace(/\D/g, "");

// Máscara (99)99999-9999
function maskPhone(v=""){
  const d = onlyDigits(v).slice(0,11);
  const p1 = d.slice(0,2);
  const p2 = d.slice(2,7);
  const p3 = d.slice(7,11);
  if(d.length <= 2) return `(${p1}`;
  if(d.length <= 7) return `(${p1})${p2}`;
  return `(${p1})${p2}-${p3}`;
}

// Validações
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HigienizadorModal({ open, onClose, onSaved }) {
  const [allFiliais, setAllFiliais] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password_hash: "",
    role: "Higienizador",
    filiais: [""], // pelo menos 1 select visível
  });

  // Carrega todas as filiais do banco para o select
  useEffect(() => {
    if (!open) return;
    api.get("/api/filiais/codigos")
      .then(({data}) => setAllFiliais(Array.isArray(data) ? data.sort() : []))
      .catch(() => setAllFiliais([]));
  }, [open]);

  function setField(key, value){
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function setFilialAt(index, value){
    const val = String(value || "");
    // evita duplicidade
    if(form.filiais.some((f, i) => i !== index && f === val && val)){
      Swal.fire({ title: "Erro", text: "Filial já adicionada.", icon: "error", confirmButtonText: "OK" });
      return;
    }
    const arr = [...form.filiais];
    arr[index] = val;
    setForm(prev => ({ ...prev, filiais: arr }));
  }

  function addFilial(){
    // desabilitar quando já tiver todas
    if(form.filiais.filter(Boolean).length >= allFiliais.length) return;
    setForm(prev => ({ ...prev, filiais: [...prev.filiais, ""] }));
  }

  const disableAdd = form.filiais.filter(Boolean).length >= allFiliais.length;

  async function handleSubmit(e){
    e.preventDefault();

    // Normalizações/limites
    let rawName = stripAccents(form.name || "").trim().slice(0, 30).toLowerCase();
    if(!rawName){
      Swal.fire({ title: "Erro", text: "Nome é obrigatório.", icon: "error", confirmButtonText: "OK" });
      return;
    }
    let name = toProperCase(rawName); // Primeira maiúscula, demais minúsculas
    // (mantém sem acento/ç pois já stripamos)

    const email = String(form.email || "").trim().toLowerCase().slice(0, 40);
    if(!emailRegex.test(email)){
      Swal.fire({ title: "Erro", text: "E-mail inválido.", icon: "error", confirmButtonText: "OK" });
      return;
    }

    const phone = maskPhone(form.phone || "");
    if(onlyDigits(phone).length !== 11){
      Swal.fire({ title: "Erro", text: "Telefone inválido. Use (99)99999-9999.", icon: "error", confirmButtonText: "OK" });
      return;
    }

    const pwd = String(form.password_hash || "");
    if(pwd.length !== 8){
      Swal.fire({ title: "Erro", text: "A senha deve ter exatamente 8 caracteres.", icon: "error", confirmButtonText: "OK" });
      return;
    }

    const role = form.role === "Admin" ? "Admin" : "Higienizador";

    const filiais = form.filiais.filter(Boolean);
    if(filiais.length === 0){
      Swal.fire({ title: "Erro", text: "Inclua pelo menos uma Filial.", icon: "error", confirmButtonText: "OK" });
      return;
    }

    try{
      await api.post("/api/users", {
        name,
        email,
        phone,
        password_hash: pwd,
        role,
        filiais,
      });

      Swal.fire({ title: "Sucesso", text: "Higienizador cadastrado!", icon: "success", confirmButtonText: "OK" });
      onSaved?.();
      onClose?.();
      // limpa
      setForm({ name:"", email:"", phone:"", password_hash:"", role:"Higienizador", filiais:[""] });
    }catch(e){
      // tenta identificar campos duplicados (email único, por exemplo)
      const err = e?.response?.data?.error || "";
      const msg = e?.response?.data?.message || "";
      if(/duplicate|E11000/i.test(err+msg)){
        Swal.fire({ title: "Erro", text: "Já existe um usuário com estes dados (verifique e-mail).", icon: "error", confirmButtonText: "OK" });
      }else{
        Swal.fire({ title: "Erro", text: "Falha ao salvar Higienizador.", icon: "error", confirmButtonText: "OK" });
      }
    }
  }

  if(!open) return null;

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <form onSubmit={handleSubmit}>
        <h3>Cadastro de Higienizador</h3>

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <div className="field">
            <label>Nome completo</label>
            <input
              className="input"
              maxLength={30}
              value={form.name}
              onChange={e => setField("name", e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="field">
            <label>E-mail</label>
            <input
              className="input"
              maxLength={40}
              value={form.email}
              onChange={e => setField("email", e.target.value)}
              placeholder="nome@dominio.com"
            />
          </div>

          <div className="field">
            <label>Telefone</label>
            <input
              className="input"
              value={form.phone}
              onChange={e => setField("phone", maskPhone(e.target.value))}
              placeholder="(99)99999-9999"
              maxLength={14}
            />
          </div>

          <div className="field">
            <label>Senha (8 caracteres)</label>
            <input
              className="input"
              type="password"
              value={form.password_hash}
              onChange={e => setField("password_hash", e.target.value)}
              placeholder="********"
              maxLength={8}
            />
          </div>
        </div>

        <div className="field">
          <label>Filial</label>
          {form.filiais.map((f, idx) => (
            <div key={idx} style={{display:'flex', gap:8, marginBottom:8}}>
              <select
                className="input"
                value={f}
                onChange={e => setFilialAt(idx, e.target.value)}
              >
                <option value="">Selecione</option>
                {allFiliais.map(sigla => (
                  <option key={sigla} value={sigla} disabled={form.filiais.includes(sigla) && f !== sigla}>
                    {sigla}
                  </option>
                ))}
              </select>

              <button
                className="btn"
                type="button"
                onClick={addFilial}
                disabled={disableAdd}
                title={disableAdd ? "Todas as filiais já foram incluídas" : "Adicionar filial"}
              >
                +
              </button>
            </div>
          ))}
        </div>

        <div className="field">
          <label>Perfil</label>
          <select
            className="input"
            value={form.role}
            onChange={e => setField("role", e.target.value)}
          >
            <option>Higienizador</option>
            <option>Admin</option>
          </select>
        </div>

        <button className="btn" type="submit">Salvar</button>{' '}
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
      </form>
    </div>
  );
}
