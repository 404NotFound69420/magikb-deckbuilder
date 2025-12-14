import React, { useState } from "react";
import { api, setAuth } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.login(form);
      setAuth(res.token, res.user);
      nav("/decks");
    } catch (e) { setErr(String(e.message || e)); }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={submit} style={{display:"grid", gap:8, maxWidth:360}}>
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        <button>Login</button>
        {err && <div style={{color:"tomato"}}>{err}</div>}
      </form>
    </div>
  );
}
