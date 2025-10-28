import React, { useEffect, useState } from "react";
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
/* ================================================ */

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
/* ============================================== */

export default function Dashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [filialSel, setFilialSel] = useState("");
  const [stats, setStats] = useState({ Aberta: 0, "Em andamento": 0, Finalizada: 0 });
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showHModal, setShowHModal] = useState(false);
  const [editandoSL, setEditandoSL] = useState(null);
  const [newForm, setNewForm] = useState({
    sl_number: "",
    priority: false,
    plate: "",
    tipo_lavagem: "LAVAGEM SIMPLES (Jato)",
  });

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

  useEffect(() => {
    if (!filialSel) return;
    refresh();
  }, [filialSel]);

  function refresh() {
    api.get("/api/sl/stats", { params: { filial: filialSel } }).then(({ data }) => setStats(data));
    api.get("/api/sl", { params: { filial: filialSel } }).then(({ data }) => setList(data));
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
      tipo_lavagem: sl.tipo_lavagem || "LAVAGEM SIMPLES (Jato)",
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
        });
        setEditandoSL(null);
      } else {
        await api.post("/api/sl", { ...body, plate: plateUp });
      }
      setShowNew(false);
      setNewForm({ sl_number: "", priority: false, plate: "", tipo_lavagem: "LAVAGEM SIMPLES (Jato)" });
      refresh();
    } catch {
      Swal.fire("Erro", "Erro ao salvar SL.", "error");
    }
  }

  /* ===== EXPORTAÇÃO XLSX ===== */
  function pad(n) {
    return n.toString().padStart(2, "0");
  }
  function exportar() {
    // Ordena por Abertura (opened_at) crescente
    const sorted = [...list].sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));

    // Monta linhas com a ordem: SL, P, Placa, Tipo de Lavagem, Abertura, Status, Finalização
    const rows = sorted.map((sl) => ({
      "SL": sl.sl_number || "-",
      "P": sl.priority ? "P" : "",
      "Placa": sl.plate || "",
      "Tipo de Lavagem": sl.tipo_lavagem || "",
      "Abertura": sl.opened_at ? new Date(sl.opened_at).toLocaleString("pt-BR") : "",
      "Status": sl.status || "",
      "Finalização": sl.closed_at ? new Date(sl.closed_at).toLocaleString("pt-BR") : "",
    }));

    // Cria planilha
    const ws = XLSX.utils.json_to_sheet(rows, { header: ["SL", "P", "Placa", "Tipo de Lavagem", "Abertura", "Status", "Finalização"] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SL");

    // Nome do arquivo: SL_<FILIAL>_<dd-mm-aaaa>.xlsx
    const now = new Date();
    const dd = pad(now.getDate());
    const mm = pad(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    const filial = filialSel ? String(filialSel).toUpperCase() : "TODAS";
    const nome = `SL_${filial}_${dd}-${mm}-${yyyy}.xlsx`;

    XLSX.writeFile(wb, nome);
  }
  /* ============================================== */

  const isAdmin = hasAdminRole(user);

  return (
    <div className="container">
      {/* TOPO */}
      <div className="topbar">
        <div className="brand">
          <img className="logo" src="Logotipo.png" alt="Lavacar" />
        </div>
        <h2 className="brand-title">Lavacar</h2>
        <button
          className="hamburger"
          title="Menu"
          onClick={() => document.getElementById("menu")?.classList.toggle("hide")}
        >
          ☰
        </button>
      </div>

      {/* MENU */}
      <div id="menu" className="card">
        <b>Menu</b>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button className="btn secondary" disabled={!isAdmin}>Cadastro de Filial</button>
          <button className="btn secondary" onClick={() => setShowHModal(true)} disabled={!isAdmin}>
            Cadastro de Higienizador
          </button>
          <button className="btn secondary" disabled={!isAdmin}>Relatório</button>
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

      {/* CARDS de estatística */}
      <div className="grid cards">
        <div className="card stat">
          <div className="title">Aberta</div>
          <div className="stat-number">{stats.Aberta || 0}</div>
        </div>
        <div className="card stat">
          <div className="title">Em andamento</div>
          <div className="stat-number">{stats["Em andamento"] || 0}</div>
        </div>
        <div className="card stat">
          <div className="title">Finalizada</div>
          <div className="stat-number">{stats.Finalizada || 0}</div>
        </div>
      </div>

      {/* NOVA SL + EXPORTAR */}
      <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start" }}>
        <button className="btn" onClick={() => { setEditandoSL(null); setShowNew(true); }}>
          Nova SL
        </button>
        <button className="btn" onClick={exportar}>
          Exportar
        </button>
      </div>

      {/* FORM NOVA/EDITAR SL */}
      {showNew && (
        <div className="card">
          <form onSubmit={createNew}>
            <h3>{editandoSL ? "Editar SL" : "Nova SL"}</h3>

            {/* SL não pode ser editado */}
            <div className="field">
              <label>SL (opcional)</label>
              <input
                className="input w-8ch"
                value={newForm.sl_number}
                onChange={(e) =>
                  setNewForm({ ...newForm, sl_number: e.target.value.replace(/[^0-9]/g, "") })
                }
                maxLength={8}
                disabled={!!editandoSL}
                title={editandoSL ? "O número da SL não pode ser alterado" : "Opcional na criação"}
              />
            </div>

            <div className="field">
              <label>Prioridade</label><br />
              <input
                type="checkbox"
                checked={newForm.priority}
                onChange={(e) => setNewForm({ ...newForm, priority: e.target.checked })}
              />
            </div>

            <div className="field">
              <label>Placa</label>
              <input
                className="input w-7ch"
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

            <div className="field">
              <label>Tipo de Lavagem</label>
              <select
                className="input w-26ch"
                value={newForm.tipo_lavagem}
                onChange={(e) => setNewForm({ ...newForm, tipo_lavagem: e.target.value })}
              >
                <option>LAVAGEM SIMPLES (Jato)</option>
                <option>LAVAGEM SIMPLES</option>
                <option>LAVAGEM ESPECIAL</option>
              </select>
            </div>

            <div className="field">
              <label>Data e Hora de Abertura:</label>
              <div className="mono">{new Date().toLocaleString("pt-BR")}</div>
            </div>

            <button className="btn">{editandoSL ? "Salvar Alterações" : "Salvar"}</button>{" "}
            <button
              className="btn secondary"
              type="button"
              onClick={() => { setShowNew(false); setEditandoSL(null); }}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* TABELA */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>SL</th>
              <th></th> {/* coluna P (flag de prioridade) */}
              <th>Placa</th>
              <th>Tipo de Lavagem</th>
              <th>Abertura</th>
              <th>Status</th>
              <th>Finalização</th>
              <th>Ações</th>
            </tr>
          </thead>
        <tbody>
            {list.map((sl) => (
              <tr key={sl._id}>
                <td>{sl.sl_number || "-"}</td>
                <td>{sl.priority ? "P" : ""}</td>
                <td>{sl.plate}</td>
                <td>{sl.tipo_lavagem}</td>
                <td>{sl.opened_at ? new Date(sl.opened_at).toLocaleString() : "-"}</td>
                <td>{sl.status}</td>
                <td>{sl.closed_at ? new Date(sl.closed_at).toLocaleString() : "-"}</td>
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
            ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
