import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { saveToken } from "../auth";
import "./login.css";
import "../styles.css";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, [mode]);

  async function doLogin(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      const token = data?.token || data?.access_token || data?.jwt;
      if (!token) throw new Error("invalid_credentials");
      saveToken(token);
      api.defaults.headers.common.Authorization = "Bearer " + token;
      setError(false);
      setMessage("");
      nav("/dashboard");
    } catch (e) {
      setError(true);
      setMessage("Credenciais inválidas");
      // 🔹 Remove a mensagem após 5 segundos
      setTimeout(() => {
        setMessage("");
        setError(false);
      }, 3000);
    }
  }

  async function doRegister(e) {
    e.preventDefault();
    try {
      await api.post("/api/auth/register", { name, email, phone, password });
      setMessage("Cadastro ok. Faça login.");
      setError(false);
      setMode("login");
    } catch (e) {
      setError(true);
      setMessage("Erro no cadastro");
    }
  }

  async function doForgot(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/auth/forgot", { email });
      setError(false);
      setMessage("Se existir, receberá um link: " + (data.reset_url || ""));
    } catch (e) {
      setError(true);
      setMessage("Erro no envio");
    }
  }

  function handleLogin(e) {
    return doLogin(e);
  }

  return (
    <div
      className="login-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "#fff",
      }}
    >
      <div
        className="login-card"
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          className="header-logo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <img
            src="Logotipo.png"
            alt="Grupo Locar"
            style={{ width: 110, height: "auto", display: "block" }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: "bold",
              color: "#000",
              textAlign: "center",
            }}
          >
            Lavacar
          </h1>
        </div>

        <h3 style={{ margin: 0, textAlign: "center", color: "#000" }}>
          Solicitação de Lavagem
        </h3>
        <p
          style={{
            marginTop: 4,
            marginBottom: 12,
            textAlign: "center",
            color: "#000",
          }}
        >
          Insira seu e-mail e senha
        </p>

        <div
          className="auth-box"
          style={{
            width: "100%",
            border: "2px solid #000",
            borderRadius: 12,
            padding: 20,
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          {mode === "login" && (
            <form
              onSubmit={doLogin}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                color: "#000",
              }}
            >
              <label className="login-label" style={{ color: "#000" }}>
                E-mail
              </label>
              <input
                ref={emailRef}
                className="input"
                type="email"
                value={email}
                placeholder="seuemail@exemplo.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />

              <label className="login-label" style={{ color: "#000" }}>
                Senha
              </label>
              <input
                className="input"
                type="password"
                value={password}
                placeholder="Sua senha"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                className="continuar"
                title="Continuar"
                style={{ marginTop: 8 }}
                onClick={handleLogin}
              >
                Continuar
              </button>

              <div
                className="login-links"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="#/"
                  onClick={() => setMode("forgot")}
                  style={{ color: "#000" }}
                >
                  Esqueceu a senha?
                </a>
                <span style={{ color: "#000" }}>|</span>
                <a
                  href="#/"
                  onClick={() => setMode("register")}
                  style={{ color: "#000" }}
                >
                  Primeiro acesso
                </a>
              </div>

              {!!message && (
                <p
                  style={{
                    textAlign: "center",
                    marginTop: 8,
                    color: error ? "red" : "#000",
                    fontWeight: error ? "bold" : "normal",
                  }}
                  role="alert"
                >
                  {message}
                </p>
              )}

              <p
                className="termos"
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  marginTop: 10,
                  color: "#000",
                }}
              >
                Ao clicar em continuar, você concorda com os nossos{" "}
                <strong>Termos de Serviço</strong> e com a{" "}
                <strong>Política de Privacidade</strong>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
