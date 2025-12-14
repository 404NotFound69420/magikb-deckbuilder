import React, { useState } from "react";
import { api, setAuth } from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username:"", email:"", password:"" });
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.register(form);
      setAuth(res.token, res.user);
      nav("/decks");
    } catch (e) { setErr(String(e.message || e)); }
  }

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={submit} style={{display:"grid", gap:8, maxWidth:360}}>
        <input placeholder="Username" value={form.username} onChange={e=>setForm({...form, username:e.target.value})} />
        <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input placeholder="Password (8+ chars)" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        <button>Create account</button>
        {err && <div style={{color:"tomato"}}>{err}</div>}
      </form>
    </div>
  );
}
