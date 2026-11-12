import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { configured, supabase } from './supabase';
import './style.css';
import Workspace, { StaffDirectory } from './Workspace';
import { staffRole } from './data';

const pages = ['Home', 'Client Lookup', 'Dashboard', 'Add/Edit Record'];
const descriptions = ['A little clarity for the day ahead.', 'Find the people at the heart of your practice.', 'A clearer picture of your practice.', 'Keep your practice information up to date.'];

function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(configured);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      setSession(data.session); setChecking(false);
    }).catch(() => { if (active) { setError('Unable to restore your session. Please try again.'); setChecking(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setChecking(false); if (!next) setPage(0); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function signOut() {
    setError('');
    try { const { error } = await supabase.auth.signOut(); if (error) setError(error.message); }
    catch { setError('Unable to sign out. Please try again.'); }
  }
  if (checking) return <div className="center" role="status">Restoring your session…</div>;
  if (!session) return <Login error={error} setError={setError} />;
  const role = staffRole(session);
  return <div className="layout">
    <aside><Brand/><p className="nav-label">FRONT DESK</p><nav aria-label="Main navigation">{pages.map((name, i) => <button key={name} aria-current={page === i ? 'page' : undefined} className={page === i ? 'active' : ''} onClick={() => setPage(i)}><span aria-hidden="true">{['⌂', '⌕', '▥', '+'][i]}</span>{name}</button>)}</nav><div className="sidebar-bottom"><span className="avatar">RF</span><strong>Care starts here.</strong><p>Richmond Area Family Therapy</p></div></aside>
    <div className="workspace"><header><span>Richmond Area Family Therapy</span><div className="account"><span>{session.user.email}<small>Role: {role || 'Unrecognized — access blocked'}</small></span><button className="secondary" onClick={signOut}>Sign out</button></div></header>
    <main><div className="eyebrow">RAFT / {pages[page].toUpperCase()}</div><h1>{page === 0 ? 'Welcome to your front desk' : pages[page]}</h1><p className="subtitle">{descriptions[page]}</p>{error && <p className="error" role="alert">{error}</p>}
    {!role ? <section className="panel"><h2>Staff access could not be verified</h2><p>Your app metadata staff role and JWT database role must match. Sign out and back in after your administrator configures access.</p></section> : page === 0 ? <><section className="welcome"><div><span className="eyebrow">PEOPLE FIRST. ALWAYS.</span><h2>More connected care.<br/>A calmer working day.</h2><p>Your shared space for clients, appointments,<br/>and the details that bring care together.</p><button onClick={() => setPage(1)}>Go to client lookup <span aria-hidden="true">↗</span></button></div><div className="art" aria-hidden="true"><div className="sun"/><div className="hill one"/><div className="hill two"/><div className="water"/><span>RAFT</span></div></section><h2 className="section-title">Your workspace</h2><div className="cards">{pages.slice(1).map((name, i) => <button className="card" key={name} onClick={() => setPage(i + 1)}><span className="card-icon" aria-hidden="true">{['⌕','▥','+'][i]}</span><h3>{name}</h3><p>{['Find contact details, appointments, and family connections.', 'Explore client totals, counselor appointments, and room usage.', 'Add and update client or appointment information.'][i]}</p><span className="card-link">Open workspace ↗</span></button>)}</div><StaffDirectory key={`${session.user.id}:${role}`} role={role}/></> : <Workspace key={`${session.user.id}:${role}`} page={page} role={role}/>}
    <p className="setup-note">Private staff workspace · Access follows your Supabase database permissions.</p></main><footer>Richmond Area Family Therapy <span>A space for care.</span></footer></div></div>;
}
function Brand() { return <div className="brand"><div className="brand-mark" aria-hidden="true">≈</div><div>RAFT<small>FAMILY THERAPY</small></div></div>; }
function Login({error, setError}) {
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { const { error } = await supabase.auth.signInWithPassword({ email: form.get('email').trim(), password: form.get('password') }); if (error) setError(error.message); }
    catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="login-page"><div className="login-story"><Brand/><div><div className="eyebrow">WELCOME TO YOUR SHARED WORKSPACE</div><h1>Thoughtful care.<br/>Connected people.</h1><p>A calmer space to support the people<br/>who count on you.</p></div><small>RICHMOND AREA FAMILY THERAPY</small></div><div className="login-form"><div><div className="eyebrow">RAFT FRONT DESK</div><h1>Welcome back.</h1><p className="subtitle">Sign in to your staff account to continue.</p>{!configured && <p className="notice">Connection setup is pending. Add the Supabase project URL and publishable key to your environment to enable sign-in.</p>}<form onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="username" placeholder="you@example.com" required disabled={!configured || busy}/></label><label>Password<input name="password" type="password" autoComplete="current-password" required disabled={!configured || busy}/></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={!configured || busy}>{busy ? 'Signing in…' : 'Sign in →'}</button></form><p className="muted">Access is limited to authorized RAFT staff.</p></div></div></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
