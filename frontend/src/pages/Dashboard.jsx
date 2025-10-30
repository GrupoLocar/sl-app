import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { getToken, logout } from "../auth";
import "../styles.css";
import Swal from "sweetalert2";
import HigienizadorModal from "../components/HigienizadorModal";
import * as XLSX from "xlsx";

/* ===== Helpers para robustez de usuário/role ===== */
function coalesceUserShape(data) {
  return data?.user || data?.currentUser || data?.me || data || null;
}
function hasAdminRole(user) {
  if (!user) return false;
  const raw = user.role;
  if (typeof raw === "string") return raw.trim().toLowerCase() === "admin";
  if (Array.isArray(raw)) {
    return raw.some((r) => {
      if (typeof r === "string") return r.trim().toLowerCase() === "admin";
      if (r && typeof r === "object") {
        const v = String(r.name || r.role || "").trim().toLowerCase();
        return v === "admin";
      }
      return false;
    });
  }
  if (raw && typeof raw === "object") {
    const v = String(raw.name || raw.role || "").trim().toLowerCase();
    return v === "admin";
  }
  return false;
}

/* ===== ÍCONES: base + fallback automático ===== */
function resolveIcon(name) {
  return `${import.meta.env.BASE_URL}icons/${name}.png`;
}
function onIconErrorFactory(name) {
  return (e) => {
    const tried = e.currentTarget.dataset.tried || "base";
    if (tried === "base") {
      e.currentTarget.src = `./icons/${name}.png`;
      e.currentTarget.dataset.tried = "dot";
    } else if (tried === "dot") {
      e.currentTarget.src = `/icons/${name}.png`;
      e.currentTarget.dataset.tried = "root";
    } else {
      e.currentTarget.alt = `${name} (ícone não encontrado)`;
    }
  };
}

/* ===== Datas / Filtros ===== */
function pad2(n) {
  return n.toString().padStart(2, "0");
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
// normaliza "dd-mm-aaaa" -> "dd/mm/aaaa"
function normalizeBR(str) {
  return (str || "").trim().replace(/-/g, "/");
}
// dd/mm/aaaa -> Date (00:00)
function parseBRDate(str) {
  if (!str) return null;
  const s = normalizeBR(str);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function todayBR() {
  const now = new Date();
  return `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
}
// "dd/mm/aaaa" -> "dd-mm-aaaa"
function brToDash(str) {
  const s = normalizeBR(str);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || "");
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/* ===== Tempo de Lavagem (TL) ===== */
function formatTL(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return "-";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}
function calcTL(opened_at, closed_at) {
  if (!opened_at || !closed_at) return "-";
  const ini = new Date(opened_at).getTime();
  const fim = new Date(closed_at).getTime();
  if (isNaN(ini) || isNaN(fim) || fim < ini) return "-";
  return formatTL(fim - ini);
}

export default function Dashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [filialSel, setFilialSel] = useState("");
  const [stats, setStats] = useState({ Aberta: 0, "Em andamento": 0, Finalizada: 0 });
  const [list, setList] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // MODAIS / FORM NOVA SL
  const [showNew, setShowNew] = useState(false);
  const [showHModal, setShowHModal] = useState(false);
  const [editandoSL, setEditandoSL] = useState(null);
  const [newForm, setNewForm] = useState({
    sl_number: "",
    priority: false,
    plate: "",
    tipo_lavagem: "LAVAGEM SIMPLES",
    observacao: "",
  });

  // CONTROLES DE FILTRO
  const [search, setSearch] = useState("");
  const [dataIni, setDataIni] = useState(todayBR());
  const [dataFim, setDataFim] = useState(todayBR());

  // Ref para focar no campo SL (opcional)
  const slInputRef = useRef(null);

  /* ===== Login / Me ===== */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      nav("/login");
      return;
    }
    api.defaults.headers.common.Authorization = "Bearer " + token;
    api
      .get("/api/meta/me")
      .then(({ data }) => setUser(coalesceUserShape(data)))
      .catch(() => logout());
  }, []);

  /* ===== Filiais ===== */
  useEffect(() => {
    if (!user) return;
    api
      .get("/api/filiais/codigos")
      .then(({ data }) => {
        let all = Array.isArray(data) ? data : [];
        if (user.filiais?.length) {
          const setFil = new Set(user.filiais.map((f) => String(f).toUpperCase()));
          all = all.filter((f) => setFil.has(String(f).toUpperCase()));
        }
        setFiliais(all.sort());
        setFilialSel((prev) => (all.includes(prev) ? prev : all[0] || ""));
      })
      .catch(() => {
        const fallback = Array.isArray(user.filiais) ? user.filiais : [];
        setFiliais(fallback);
        setFilialSel((prev) => (fallback.includes(prev) ? prev : fallback[0] || ""));
      });
  }, [user]);

  /* ===== Carregar SLs ===== */
  useEffect(() => {
    if (!filialSel) return;
    refresh();
  }, [filialSel]);

  function refresh() {
    api.get("/api/sl/stats", { params: { filial: filialSel } }).then(({ data }) => setStats(data));
    api.get("/api/sl", { params: { filial: filialSel } }).then(({ data }) => setList(Array.isArray(data) ? data : []));
  }

  /* ===== View (busca + datas) ===== */
  const view = useMemo(() => {
    const term = (search || "").trim().toUpperCase();
    const di = parseBRDate(dataIni);
    const df = parseBRDate(dataFim);
    const ini = di ? startOfDay(di) : null;
    const fim = df ? endOfDay(df) : null;

    return (list || []).filter((sl) => {
      if (term) {
        const plate = String(sl.plate || "").toUpperCase();
        const sln = String(sl.sl_number || "").toUpperCase();
        if (!plate.includes(term) && !sln.includes(term)) return false;
      }
      if (ini || fim) {
        const ab = sl.opened_at ? new Date(sl.opened_at) : null;
        if (!ab) return false;
        if (ini && ab < ini) return false;
        if (fim && ab > fim) return false;
      }
      return true;
    });
  }, [list, search, dataIni, dataFim]);

  /* ===== Estatísticas pela view (cards seguem tabela) ===== */
  const statsFromView = useMemo(() => {
    const s = { Aberta: 0, "Em andamento": 0, Finalizada: 0 };
    for (const v of view) {
      if (v.status === "Aberta") s.Aberta++;
      else if (v.status === "Em andamento") s["Em andamento"]++;
      else if (v.status === "Finalizada") s.Finalizada++;
    }
    return s;
  }, [view]);

  /* ===== Menu ===== */
  function toggleMenu() {
    setMenuOpen((v) => !v);
    const el = document.getElementById("menu");
    if (el) el.classList.toggle("hide");
  }

  // === MODAL: Iniciar ===
  async function abrirModalIniciar(sl) {
    if (sl.status !== "Aberta") return;
    const result = await Swal.fire({
      title: "Iniciar lavagem?",
      text: `Deseja iniciar a SL ${sl.sl_number || ""}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Iniciar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await api.patch(`/api/sl/${sl._id}/start`);
      refresh();
    } catch {
      Swal.fire("Erro", "Não foi possível iniciar a SL.", "error");
    }
  }

  // === MODAL: Finalizar ===
  async function finish(sl) {
    if (sl.status !== "Em andamento") return;
    const result = await Swal.fire({
      title: "Finalizar lavagem?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const payload = { status: "Finalizada", closed_at: new Date().toISOString(), filial: filialSel };

    try {
      await api.patch(`/api/sl/${sl._id}/finish`, { force: true, filial: filialSel });
      refresh();
    } catch {
      await api.patch(`/api/sl/${sl._id}`, payload).then(refresh);
    }
  }

  // === MODAL: Editar (reutiliza o modal "Nova SL" com campos preenchidos)
  function abrirModalEditar(sl) {
    if (!sl || sl.status === "Finalizada") return;
    setEditandoSL(sl);
    setShowNew(true);
    setNewForm({
      sl_number: sl.sl_number || "",
      priority: !!sl.priority,
      plate: sl.plate || "",
      tipo_lavagem: sl.tipo_lavagem || "LAVAGEM SIMPLES",
      observacao: sl.observacao || "",
    });
  }

  // === MODAL: Excluir ===
  async function abrirModalExcluir(sl) {
    if (!sl || sl.status === "Finalizada") return;
    const result = await Swal.fire({
      title: "Excluir SL?",
      text: `Tem certeza que deseja excluir a SL ${sl.sl_number || ""}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const attempts = [
      () => api.delete(`/api/sl/${sl._id}`),
      () => api.delete(`/api/sl/delete/${sl._id}`),
      () => api.post(`/api/sl/${sl._id}/delete`),
      () => api.delete(`/api/sl`, { params: { id: sl._id } }),
      () => api.delete(`/api/sl`, { data: { id: sl._id } }),
    ];

    let ok = false;
    let lastErr = null;

    for (const call of attempts) {
      try {
        await call();
        ok = true;
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (ok) {
      Swal.fire("Excluída!", "A SL foi excluída com sucesso.", "success");
      refresh();
    } else {
      const msg =
        lastErr?.response?.data?.message ||
        lastErr?.response?.data?.error ||
        lastErr?.message ||
        "Erro ao excluir SL.";
      Swal.fire("Erro", msg, "error");
    }
  }

  // Salvar Nova/Editar SL
  async function createNew(e) {
    e.preventDefault();
    const body = { ...newForm, filial: filialSel };
    const plateUp = String(body.plate || "").toUpperCase();

    try {
      if (editandoSL) {
        await api.patch(`/api/sl/${editandoSL._id}`, {
          priority: !!body.priority,
          plate: plateUp,
          tipo_lavagem: body.tipo_lavagem,
          observacao: body.observacao || "",
        });
        setEditandoSL(null);
      } else {
        await api.post("/api/sl", {
          ...body,
          plate: plateUp,
          observacao: body.observacao || "",
        });
      }
      setShowNew(false);
      setNewForm({
        sl_number: "",
        priority: false,
        plate: "",
        tipo_lavagem: "LAVAGEM SIMPLES",
        observacao: "",
      });
      refresh();
    } catch {
      Swal.fire("Erro", "Erro ao salvar SL.", "error");
    }
  }

  /* ===== EXPORTAÇÃO XLSX (view atual) ===== */
  function exportar() {
    // Ordena por Abertura crescente
    const sorted = [...view].sort(
      (a, b) => new Date(a.opened_at || 0) - new Date(b.opened_at || 0)
    );

    // Monta linhas na ordem exigida
    const rows = sorted.map((sl) => ({
      SL: sl.sl_number || "-",
      P: sl.priority ? "P" : "",
      Placa: sl.plate || "",
      "Tipo de Lavagem": sl.tipo_lavagem || "",
      Abertura: sl.opened_at ? new Date(sl.opened_at).toLocaleString("pt-BR") : "",
      Status: sl.status || "",
      Finalização: sl.closed_at ? new Date(sl.closed_at).toLocaleString("pt-BR") : "",
      TL: calcTL(sl.opened_at, sl.closed_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["SL", "P", "Placa", "Tipo de Lavagem", "Abertura", "Status", "Finalização", "TL"],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SL");

    const filial = filialSel ? String(filialSel).toUpperCase() : "TODAS";
    const din = brToDash(dataIni);
    const dfi = brToDash(dataFim);
    const nome = `SL_${filial}_${din}_${dfi}.xlsx`;

    XLSX.writeFile(wb, nome);
  }

  const isAdmin = hasAdminRole(user);

  function onLimparFiltros() {
    setSearch("");
    const hoje = todayBR();
    setDataIni(hoje);
    setDataFim(hoje);
  }

  /* ===== CSS inline: hover + moldura do celular ===== */
  const hoverStyle = `
    .btn:hover { background-color:#c2fb4a!important; color:black!important; }

    .phone-frame{
      background-image:url('${import.meta.env.BASE_URL}phone.png');
      background-repeat:no-repeat;
      background-position:center top;
      background-size:420px auto;
      min-height:640px;
      margin:20px;
      padding:20px;
      display:flex;
      justify-content:center;
      align-items:flex-start;
    }
    .phone-content{
      width:320px;
      margin-top:10px;
      margin-bottom:40px;
      padding:14px 12px;
      background:transparent;
    }
    .phone-content h3{ text-align:center; margin-top:0; }

    .phone-content .input,
    .phone-content select,
    .phone-content textarea {
      border: 1px solid #333 !important;
    }

    .field{ margin-bottom:10px; }
    .field.inline{ display:flex; align-items:center; gap:10px; }

    /* Linha combinada SL + Prioridade numa mesma row */
    .row-sl-prio{
      display:flex;
      gap:12px;
      align-items:end;
      flex-wrap:nowrap;
    }
    .row-sl-prio .col-sl{ flex:1 1 auto; min-width:0; }
    .row-sl-prio .col-prio{
      display:flex; align-items:center; gap:8px;
      white-space:nowrap;
      margin-bottom: 8px;   /* aproxima da linha do label SL */
    }
    .row-sl-prio .prio-box{ width:18px; height:18px; }

    /* Inputs de largura sugestiva */
    .w-8ch{ width: 8ch; }
    .w-9ch{ width: 9ch; }
    .w-12ch{ width: 12ch; }
    .w-26ch{ width: 26ch; }
    .mono{ font-family: monospace; }
  `;

  // Foco no campo SL quando o modal abrir
  useEffect(() => {
    if (showNew && slInputRef.current) {
      slInputRef.current.focus();
      slInputRef.current.select?.();
    }
  }, [showNew]);

  return (
    <div className="container">
      <style>{hoverStyle}</style>

      {/* TOPO */}
      <div className="topbar">
        <div className="brand" onClick={toggleMenu} style={{ cursor: "pointer" }} title="Abrir/Fechar Menu">
          <img className="logo" src="Logotipo.png" alt="Lavacar" />
        </div>
        <h2 className="brand-title" onClick={toggleMenu} style={{ cursor: "pointer" }} title="Abrir/Fechar Menu">
          Lavacar
        </h2>
        <button className="hamburger" title="Menu" onClick={toggleMenu}>☰</button>
      </div>

      {/* MENU */}
      <div id="menu" className={`card ${menuOpen ? "" : "hide"}`}>
        <b>Menu</b>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button className="btn" disabled={!isAdmin}>Cadastro de Filial</button>
          <button className="btn" onClick={() => setShowHModal(true)} disabled={!isAdmin}>Cadastro de Higienizador</button>
          <button className="btn" disabled={!isAdmin}>Relatório</button>
          <button className="btn" onClick={logout}>Sair</button>
        </div>
      </div>

      {/* MODAL CADASTRO HIGIENIZADOR */}
      <HigienizadorModal open={showHModal} onClose={() => setShowHModal(false)} onSaved={() => {}} />

      {/* INFO */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div><b>Higienizador:</b> {user?.name}</div>
          <div style={{ marginLeft: "auto" }}>
            <label>Unidade: </label>
            <select className="input select-unidade" value={filialSel} onChange={(e) => setFilialSel(e.target.value)}>
              {filiais.map((f) => (<option key={f}>{f}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS (pela view) */}
      <div className="grid cards">
        <div className="card stat"><div className="title">Aberta</div><div className="stat-number">{statsFromView.Aberta}</div></div>
        <div className="card stat"><div className="title">Em andamento</div><div className="stat-number">{statsFromView["Em andamento"]}</div></div>
        <div className="card stat"><div className="title">Finalizada</div><div className="stat-number">{statsFromView.Finalizada}</div></div>
      </div>

      {/* AÇÕES / FILTROS */}
      <div
        className="card barra-filtros"
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", overflowX: "auto", whiteSpace: "nowrap" }}
      >
        <button className="btn" onClick={() => { setEditandoSL(null); setShowNew(true); }}>Nova SL</button>
        <button className="btn" onClick={exportar}>Exportar</button>

        <input
          className="input"
          placeholder="Buscar por placa ou SL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={23}
          style={{ width: "27ch", fontFamily: "monospace", border: "1px solid #333" }}
          title="Digite a Placa ou SL"
        />

        <input
          className="input"
          placeholder="dd/mm/aaaa"
          value={dataIni}
          onChange={(e) => setDataIni(normalizeBR(e.target.value))}
          title="Data inicial (dd/mm/aaaa)"
          style={{ width: 110, border: "1px solid #333" }}
        />
        <span>até</span>
        <input
          className="input"
          placeholder="dd/mm/aaaa"
          value={dataFim}
          onChange={(e) => setDataFim(normalizeBR(e.target.value))}
          title="Data final (dd/mm/aaaa)"
          style={{ width: 110, border: "1px solid #333" }}
        />

        <button className="btn" onClick={() => { /* filtro é aplicado em tempo real pela 'view' */ }}>
          Filtrar
        </button>
        <button className="btn" onClick={onLimparFiltros}>
          Limpar Filtros
        </button>
      </div>

      {/* MODAL NOVA/EDITAR SL (moldura) */}
      {showNew && (
        <div className="card phone-frame">
          <div className="phone-content">
            <form onSubmit={createNew}>
              <h3>{editandoSL ? "Editar SL" : "Nova SL"}</h3>

              {/* Linha combinada: SL (opcional) + Prioridade (checkbox ao lado) */}
              <div className="row-sl-prio">
                <div className="col-sl">
                  <div className="field">
                    <label htmlFor="slNumber">SL (opcional)</label>
                    <input
                      id="slNumber"
                      ref={slInputRef}
                      className="input w-12ch"
                      value={newForm.sl_number}
                      onChange={(e) =>
                        setNewForm({ ...newForm, sl_number: e.target.value.replace(/[^0-9]/g, "") })
                      }
                      maxLength={8}
                      disabled={!!editandoSL}
                      title={editandoSL ? "O número da SL não pode ser alterado" : "Opcional na criação"}
                    />
                  </div>
                </div>
                <div className="col-prio">
                  <label htmlFor="priority">Prioridade</label>
                  <input
                    id="priority"
                    type="checkbox"
                    className="prio-box"
                    checked={newForm.priority}
                    onChange={(e) => setNewForm({ ...newForm, priority: e.target.checked })}
                    aria-label="Prioridade"
                  />
                </div>
              </div>

              {/* Placa */}
              <div className="field">
                <label>Placa</label>
                <input
                  className="input w-9ch"
                  value={newForm.plate}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })
                  }
                  maxLength={7}
                />
              </div>

              {/* Tipo de Lavagem */}
              <div className="field">
                <label>Tipo de Lavagem</label>
                <select
                  className="input w-26ch"
                  value={newForm.tipo_lavagem}
                  onChange={(e) => setNewForm({ ...newForm, tipo_lavagem: e.target.value })}
                >
                  <option>LAVAGEM SIMPLES</option>
                  <option>LAVAGEM ESPECIAL</option>
                </select>
              </div>

              {/* Observacao */}
              <div className="field">
                <label>Observacao</label>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={300}
                  value={newForm.observacao}
                  onChange={(e) => setNewForm({ ...newForm, observacao: e.target.value })}
                  placeholder="Digite observacoes (opcional)"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              {/* Data e Hora de Abertura */}
              <div className="field">
                <label>Data e Hora de Abertura:</label>
                <div className="mono">{new Date().toLocaleString("pt-BR")}</div>
              </div>

              <button className="btn">{editandoSL ? "Salvar Alterações" : "Salvar"}</button>{" "}
              <button className="btn" type="button" onClick={() => { setShowNew(false); setEditandoSL(null); }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>SL</th>
              <th></th> {/* P */}
              <th>Placa</th>
              <th>Tipo de Lavagem</th>
              <th>Abertura</th>
              <th>Status</th>
              <th>Finalização</th>
              <th>TL</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 16 }}>
                  Nenhum registro correspondente encontrado
                </td>
              </tr>
            ) : (
              view.map((sl) => (
                <tr key={sl._id}>
                  <td>{sl.sl_number || "-"}</td>
                  <td>{sl.priority ? "P" : ""}</td>
                  <td>{sl.plate}</td>
                  <td>{sl.tipo_lavagem}</td>
                  <td>{sl.opened_at ? new Date(sl.opened_at).toLocaleString("pt-BR") : "-"}</td>
                  <td>{sl.status}</td>
                  <td>{sl.closed_at ? new Date(sl.closed_at).toLocaleString("pt-BR") : "-"}</td>
                  <td>{calcTL(sl.opened_at, sl.closed_at)}</td>
                  <td className="acoes">
                    <div className="acoes-inner">
                      {sl.status === "Aberta" && (
                        <img
                          src={resolveIcon("play")}
                          data-tried="base"
                          onError={onIconErrorFactory("play")}
                          alt="Iniciar"
                          className="icon-acao"
                          onClick={() => abrirModalIniciar(sl)}
                        />
                      )}
                      {sl.status === "Em andamento" && (
                        <img
                          src={resolveIcon("check")}
                          data-tried="base"
                          onError={onIconErrorFactory("check")}
                          alt="Finalizar"
                          className="icon-acao"
                          onClick={() => finish(sl)}
                        />
                      )}
                      {sl.status !== "Finalizada" && (
                        <>
                          <img
                            src={resolveIcon("pencil")}
                            data-tried="base"
                            onError={onIconErrorFactory("pencil")}
                            alt="Editar"
                            className="icon-acao"
                            onClick={() => abrirModalEditar(sl)}
                          />
                          <img
                            src={resolveIcon("trash")}
                            data-tried="base"
                            onError={onIconErrorFactory("trash")}
                            alt="Excluir"
                            className="icon-acao"
                            onClick={() => abrirModalExcluir(sl)}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
