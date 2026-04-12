import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import _ from "lodash";
import { supabase } from './supabase.js'

// ─── CONSTANTS & SEED DATA ───────────────────────────────────────────────────

const MASSAGE_TYPES = [
  { id: "descontracturante", name: "Descontracturante", category: "Terapéutico", basePrice: 8000 },
  { id: "relajante", name: "Relajante", category: "Bienestar", basePrice: 6500 },
  { id: "deportivo", name: "Deportivo", category: "Terapéutico", basePrice: 9000 },
  { id: "piedras_calientes", name: "Piedras Calientes", category: "Premium", basePrice: 11000 },
  { id: "linfatico", name: "Linfático", category: "Terapéutico", basePrice: 8500 },
  { id: "facial", name: "Facial", category: "Estética", basePrice: 5500 },
  { id: "cuerpo_completo", name: "Cuerpo Completo", category: "Premium", basePrice: 12000 },
  { id: "cuello_espalda", name: "Cuello y Espalda", category: "Express", basePrice: 5000 },
  { id: "piernas", name: "Piernas", category: "Express", basePrice: 4500 },
  { id: "otro", name: "Otro", category: "Otro", basePrice: 6000 },
];

const PAYMENT_METHODS = [
  { id: "efectivo", name: "Efectivo", icon: "💵" },
  { id: "transferencia", name: "Transferencia", icon: "🏦" },
  { id: "suscripcion", name: "Suscripción", icon: "🔄" },
];

const SERVICE_STATES = [
  { id: "realizado", name: "Realizado", color: "#22c55e" },
  { id: "pendiente", name: "Pendiente", color: "#f59e0b" },
  { id: "cancelado", name: "Cancelado", color: "#ef4444" },
  { id: "no_asistio", name: "No Asistió", color: "#94a3b8" },
];

const PAYMENT_STATES = [
  { id: "pagado", name: "Pagado", color: "#22c55e" },
  { id: "parcial", name: "Parcial", color: "#f59e0b" },
  { id: "pendiente", name: "Pendiente", color: "#ef4444" },
  { id: "anulado", name: "Anulado", color: "#94a3b8" },
];

const ROLES = [
  { id: "admin", name: "Administrador" },
  { id: "agenda", name: "Agenda" },
  { id: "masajista", name: "Masajista" },
];

const STAFF = [
  { id: "s1", name: "Flor", specialty: "Terapéutico" },
  { id: "s2", name: "Luciana", specialty: "Deportivo" },
  { id: "s3", name: "Mariela", specialty: "Relajante" },
  { id: "s4", name: "Gabriela", specialty: "Premium" },
  { id: "s5", name: "Rocio", specialty: "Estética" },
];

const ROOMS = ["Sala 1", "Sala 2", "Sala 3", "Sala VIP"];

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatCurrency = (n) => {
  if (n == null) return "$0";
  return "$" + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0 });
};

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const localDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = () => localDateStr(new Date());

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
};

const isToday = (dateStr) => dateStr === today();
const isThisWeek = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
};
const isThisMonth = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// ─── SUPABASE MAPPERS (snake_case ↔ camelCase) ──────────────────────────────

const mapService = (r) => ({
  id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time,
  duration: r.duration, massageTypeId: r.massage_type_id, description: r.description,
  staffId: r.staff_id, clientId: r.client_id, room: r.room, branch: r.branch,
  basePrice: r.base_price, discount: r.discount, surcharge: r.surcharge,
  finalPrice: r.final_price, state: r.state, observations: r.observations,
  createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapPayment = (r) => ({
  id: r.id, serviceId: r.service_id, date: r.date, time: r.time,
  amount: r.amount, pending: r.pending, state: r.state, method: r.method,
  destino: r.destino, reference: r.reference, observations: r.observations,
  registeredBy: r.registered_by, createdBy: r.created_by, createdAt: r.created_at,
});

const mapAppointment = (r) => ({
  id: r.id, date: r.date, time: r.time, clientId: r.client_id,
  massageTypeId: r.massage_type_id, staffId: r.staff_id, duration: r.duration,
  state: r.state, room: r.room, observations: r.observations,
});

// ─── STYLE CONSTANTS ────────────────────────────────────────────────────────

const COLORS = {
  bg: "#f8f6f3", bgDark: "#1a1a1f",
  surface: "#ffffff", surfaceDark: "#242429",
  card: "#ffffff", cardDark: "#2a2a30",
  border: "#e8e4df", borderDark: "#3a3a42",
  text: "#2d2926", textDark: "#e8e4df",
  textMuted: "#8a857e", textMutedDark: "#8a8590",
  primary: "#7c6a56", primaryLight: "#a08e76", primaryDark: "#c4a882",
  accent: "#b08d6a", accentLight: "#d4b896",
  success: "#5a8a5e", successDark: "#6aad70",
  warning: "#c49a3c", warningDark: "#dab04a",
  danger: "#b85450", dangerDark: "#d46a66",
  info: "#5a7a9a", infoDark: "#6a9aba",
};

const CHART_COLORS = ["#7c6a56", "#b08d6a", "#5a8a5e", "#c49a3c", "#5a7a9a", "#b85450", "#8b7ab0", "#6aada0"];

// ─── ICONS ──────────────────────────────────────────────────────────────────

const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Massage: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><path d="M12 11c-2.5 0-4.5 1.5-5.5 3.5L5 21h14l-1.5-6.5C16.5 12.5 14.5 11 12 11z"/></svg>,
  Payment: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Clients: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Reports: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><polyline points="17 2 17 8 23 8"/><line x1="9" y1="14" x2="9" y2="18"/><line x1="13" y1="11" x2="13" y2="18"/><line x1="17" y1="8" x2="17" y2="18"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Moon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Alert: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Playfair+Display:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --font-body: 'DM Sans', sans-serif; --font-display: 'Playfair Display', serif; --transition: 0.2s ease; }
  body { font-family: var(--font-body); }
  input, select, textarea, button { font-family: var(--font-body); }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c4b8a8; border-radius: 3px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .animate-fade { animation: fadeIn 0.35s ease forwards; }
  .animate-scale { animation: scaleIn 0.25s ease forwards; }
  .mobile-header { display: none; position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 150; background: #2d2926; color: #e8e4df; align-items: center; padding: 0 16px; gap: 12px; }
  .mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 190; }
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); transition: transform 0.3s ease !important; }
    .sidebar.open { transform: translateX(0); }
    .main-content { margin-left: 0 !important; padding: 72px 16px 16px !important; }
    .mobile-header { display: flex !important; }
    .mobile-overlay { display: block !important; }
  }
`;

// ─── REUSABLE COMPONENTS ────────────────────────────────────────────────────

const Badge = ({ children, color = "#7c6a56", style }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 10px",
    borderRadius: "20px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px",
    background: color + "18", color: color, whiteSpace: "nowrap", ...style,
  }}>{children}</span>
);

const StateBadge = ({ stateId, states }) => {
  const s = states.find(x => x.id === stateId);
  return s ? <Badge color={s.color}>{s.name}</Badge> : <Badge>{stateId}</Badge>;
};

const KPICard = ({ title, value, subtitle, icon, color, dark }) => (
  <div style={{
    background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "20px 22px",
    border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`,
    display: "flex", flexDirection: "column", gap: "6px",
    animation: "fadeIn 0.4s ease forwards",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "12px", fontWeight: 500, color: dark ? COLORS.textMutedDark : COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.8px" }}>{title}</span>
      {icon && <span style={{ fontSize: "20px", opacity: 0.6 }}>{icon}</span>}
    </div>
    <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-display)", color: color || (dark ? COLORS.textDark : COLORS.text), lineHeight: 1.1 }}>{value}</span>
    {subtitle && <span style={{ fontSize: "12px", color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>{subtitle}</span>}
  </div>
);

const Button = ({ children, onClick, variant = "primary", size = "md", icon, style, disabled }) => {
  const sizes = { sm: { p: "6px 12px", fs: "12px" }, md: { p: "9px 18px", fs: "13px" }, lg: { p: "12px 24px", fs: "14px" } };
  const variants = {
    primary: { bg: COLORS.primary, color: "#fff", border: "none" },
    secondary: { bg: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.border}` },
    danger: { bg: COLORS.danger, color: "#fff", border: "none" },
    ghost: { bg: "transparent", color: COLORS.textMuted, border: "none" },
    success: { bg: COLORS.success, color: "#fff", border: "none" },
  };
  const v = variants[variant]; const s = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: "6px", padding: s.p, fontSize: s.fs, fontWeight: 500,
      background: disabled ? "#ccc" : v.bg, color: disabled ? "#888" : v.color,
      border: v.border, borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
      transition: "all var(--transition)", whiteSpace: "nowrap", ...style,
    }}>{icon}{children}</button>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, options, required, style, dark, disabled, min, max, step, rows }) => {
  const baseStyle = {
    width: "100%", padding: rows ? "10px 12px" : "9px 12px", fontSize: "13px",
    border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", outline: "none",
    background: dark ? COLORS.surfaceDark : "#faf9f7", color: dark ? COLORS.textDark : COLORS.text,
    transition: "border var(--transition)", fontFamily: "var(--font-body)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", ...style }}>
      {label && <label style={{ fontSize: "12px", fontWeight: 500, color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>{label}{required && " *"}</label>}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...baseStyle, cursor: "pointer" }} disabled={disabled}>
          <option value="">{placeholder || "Seleccionar..."}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={baseStyle} disabled={disabled} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} required={required} disabled={disabled} min={min} max={max} step={step} />
      )}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, wide, dark }) => {
  const contentRef = useRef(null);
  
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", 
      top: 0, left: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 99999,
      padding: "20px",
    }} onClick={onClose}>
      <div className="animate-scale" onClick={e => e.stopPropagation()} style={{
        background: dark ? COLORS.surfaceDark : COLORS.surface, borderRadius: "16px",
        width: wide ? "min(900px, 92vw)" : "min(560px, 92vw)",
        maxHeight: "88vh",
        border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`,
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`,
          flexShrink: 0,
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? COLORS.textMutedDark : COLORS.textMuted, padding: "4px" }}><Icons.Close /></button>
        </div>
        <div ref={contentRef} style={{ padding: "24px", overflowY: "auto", flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
};

const Table = ({ columns, data, onRowClick, dark, actions }) => (
  <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{
              padding: "12px 14px", textAlign: "left", fontWeight: 600, fontSize: "11px",
              textTransform: "uppercase", letterSpacing: "0.6px",
              color: dark ? COLORS.textMutedDark : COLORS.textMuted,
              background: dark ? COLORS.cardDark : "#faf9f7",
              borderBottom: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`,
              whiteSpace: "nowrap",
            }}>{col.header}</th>
          ))}
          {actions && <th style={{
            padding: "12px 14px", textAlign: "center", fontWeight: 600, fontSize: "11px",
            textTransform: "uppercase", letterSpacing: "0.6px",
            color: dark ? COLORS.textMutedDark : COLORS.textMuted,
            background: dark ? COLORS.cardDark : "#faf9f7",
            borderBottom: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, width: "100px",
          }}>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: "40px", textAlign: "center", color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>No hay datos para mostrar</td></tr>
        ) : data.map((row, ri) => (
          <tr key={ri} onClick={() => onRowClick?.(row)} style={{
            cursor: onRowClick ? "pointer" : "default",
            transition: "background var(--transition)",
            background: ri % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"),
          }}
          onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(124,106,86,0.04)"}
          onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)")}
          >
            {columns.map((col, ci) => (
              <td key={ci} style={{
                padding: "11px 14px", color: dark ? COLORS.textDark : COLORS.text,
                borderBottom: `1px solid ${dark ? COLORS.borderDark + "60" : COLORS.border + "80"}`,
                whiteSpace: col.nowrap ? "nowrap" : "normal",
              }}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
            {actions && <td style={{
              padding: "8px 14px", textAlign: "center",
              borderBottom: `1px solid ${dark ? COLORS.borderDark + "60" : COLORS.border + "80"}`,
            }}>{actions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ConfirmDialog = ({ open, onConfirm, onCancel, message, dark }) => (
  <Modal open={open} onClose={onCancel} title="Confirmar" dark={dark}>
    <p style={{ marginBottom: "20px", color: dark ? COLORS.textDark : COLORS.text }}>{message}</p>
    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
      <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      <Button variant="danger" onClick={onConfirm}>Confirmar</Button>
    </div>
  </Modal>
);

const Tabs = ({ tabs, active, onChange, dark }) => (
  <div style={{ display: "flex", gap: "2px", background: dark ? COLORS.cardDark : "#f0ede8", borderRadius: "10px", padding: "3px" }}>
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} style={{
        padding: "8px 16px", fontSize: "12px", fontWeight: 500,
        border: "none", borderRadius: "8px", cursor: "pointer",
        background: active === tab.id ? COLORS.primary : "transparent",
        color: active === tab.id ? "#fff" : (dark ? COLORS.textMutedDark : COLORS.textMuted),
        transition: "all var(--transition)", fontFamily: "var(--font-body)",
      }}>{tab.label}</button>
    ))}
  </div>
);

// ─── LOGIN SCREEN ───────────────────────────────────────────────────────────

const LoginScreen = ({ onLogin, users }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const handleLogin = () => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) onLogin(user); else setError("Credenciales incorrectas");
  };
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f8f6f3 0%, #e8e0d4 50%, #d4c8b8 100%)",
      fontFamily: "var(--font-body)",
    }}>
      <div className="animate-fade" style={{
        background: "#fff", borderRadius: "20px", padding: "48px 40px",
        width: "min(420px, 90vw)", boxShadow: "0 20px 60px rgba(124,106,86,0.12)", textAlign: "center",
      }}>
        <div style={{ marginBottom: "8px", fontSize: "44px" }}>🧘</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 600, color: COLORS.text, marginBottom: "4px" }}>Tuina</h1>
        <p style={{ fontSize: "13px", color: COLORS.textMuted, marginBottom: "32px" }}>Panel de gestión de masajes</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
          <Input label="Usuario" value={username} onChange={setUsername} placeholder="admin" />
          <Input label="Contraseña" value={password} onChange={e => { setPassword(e); setError(""); }} type="password" placeholder="••••••" />
          {error && <span style={{ fontSize: "12px", color: COLORS.danger }}>{error}</span>}
          <Button onClick={handleLogin} style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "8px", fontSize: "14px" }}>
            Iniciar Sesión
          </Button>
        </div>
        
      </div>
    </div>
  );
};

// ─── SIDEBAR ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: <Icons.Dashboard />, roles: ["admin"] },
  { id: "services", label: "Masajes", icon: <Icons.Massage />, roles: ["admin", "agenda"] },
  { id: "payments", label: "Cobros", icon: <Icons.Payment />, roles: ["admin", "agenda", "masajista"] },
  { id: "clients", label: "Clientes", icon: <Icons.Clients />, roles: ["admin", "agenda"] },
  { id: "reports", label: "Reportes", icon: <Icons.Reports />, roles: ["admin"] },
  { id: "appointments", label: "Agenda", icon: <Icons.Calendar />, roles: ["admin", "agenda", "masajista"] },
  { id: "settings", label: "Config", icon: <Icons.Settings />, roles: ["admin", "agenda", "masajista"] },
];

const Sidebar = ({ active, onNavigate, user, onLogout, dark, onToggleDark, collapsed, onToggleCollapse, className }) => {
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
  return (
  <div className={className} style={{
    width: collapsed ? "64px" : "240px",
    height: "100vh", position: "fixed", top: 0, left: 0,
    background: dark ? "#1a1a1f" : "#2d2926",
    color: "#e8e4df", display: "flex", flexDirection: "column",
    transition: "width 0.3s ease, transform 0.3s ease", zIndex: 100, overflow: "hidden",
  }}>
    <div style={{ padding: collapsed ? "18px 14px" : "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={onToggleCollapse} style={{ background: "none", border: "none", color: "#e8e4df", cursor: "pointer", padding: "2px" }}><Icons.Menu /></button>
        {!collapsed && <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 600 }}>Tuina</span>}
      </div>
    </div>
    <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
      {visibleItems.map(item => (
        <button key={item.id} onClick={() => onNavigate(item.id)} style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: collapsed ? "11px 18px" : "11px 14px", borderRadius: "10px",
          background: active === item.id ? "rgba(176,141,106,0.2)" : "transparent",
          color: active === item.id ? "#d4b896" : "rgba(232,228,223,0.6)",
          border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
          transition: "all var(--transition)", width: "100%", textAlign: "left",
          fontFamily: "var(--font-body)", whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}
        >{item.icon}{!collapsed && item.label}</button>
      ))}
    </nav>
    <div style={{ padding: collapsed ? "12px 8px" : "16px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "8px" }}>
      <button onClick={onToggleDark} style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 12px", background: "rgba(255,255,255,0.06)", borderRadius: "8px",
        border: "none", color: "#e8e4df", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-body)", width: "100%",
      }}>{dark ? <Icons.Sun /> : <Icons.Moon />}{!collapsed && (dark ? "Modo Claro" : "Modo Oscuro")}</button>
      {!collapsed && (
        <div style={{ padding: "6px 4px", fontSize: "12px", color: "rgba(232,228,223,0.5)" }}>
          {user.name} · <span style={{ textTransform: "capitalize" }}>{ROLES.find(r => r.id === user.role)?.name || user.role}</span>
        </div>
      )}
      <button onClick={onLogout} style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 12px", background: "none", borderRadius: "8px",
        border: "none", color: "rgba(232,228,223,0.5)", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-body)", width: "100%",
      }}><Icons.Logout />{!collapsed && "Cerrar Sesión"}</button>
    </div>
  </div>
  );
};

// ─── SERVICE FORM ───────────────────────────────────────────────────────────

const ServiceForm = ({ service, onSave, onCancel, clients, dark }) => {
  const [form, setForm] = useState(service || {
    date: today(), startTime: "", endTime: "", duration: 60,
    massageTypeId: "", description: "", staffId: "", clientId: "",
    room: "", branch: "Central", basePrice: 0, discount: 0, surcharge: 0,
    finalPrice: 0, state: "realizado", observations: "",
  });
  const set = (k, v) => {
    const next = { ...form, [k]: v };
    if (k === "massageTypeId") {
      const mt = MASSAGE_TYPES.find(x => x.id === v);
      if (mt) { next.basePrice = mt.basePrice; next.finalPrice = mt.basePrice - (next.discount || 0) + (next.surcharge || 0); }
    }
    if (["basePrice", "discount", "surcharge"].includes(k)) {
      next.finalPrice = (Number(next.basePrice) || 0) - (Number(next.discount) || 0) + (Number(next.surcharge) || 0);
    }
    if (k === "startTime" && next.duration) {
      const [h, m] = v.split(":").map(Number);
      const end = h * 60 + m + Number(next.duration);
      next.endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    }
    if (k === "duration" && next.startTime) {
      const [h, m] = next.startTime.split(":").map(Number);
      const end = h * 60 + m + Number(v);
      next.endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    }
    setForm(next);
  };
  const handleSave = () => {
    if (!form.date || !form.massageTypeId || !form.clientId || !form.staffId) return alert("Completar campos obligatorios");
    if (form.finalPrice < 0) return alert("El precio final no puede ser negativo");
    onSave({ ...form, id: form.id || generateId(), finalPrice: Math.max(0, form.finalPrice) });
  };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={grid}>
        <Input label="Fecha" type="date" value={form.date} onChange={v => set("date", v)} required dark={dark} />
        <Input label="Hora Inicio" type="time" value={form.startTime} onChange={v => set("startTime", v)} dark={dark} />
        <Input label="Duración (min)" type="number" value={form.duration} onChange={v => set("duration", v)} min="15" step="15" dark={dark} />
        <Input label="Hora Fin" type="time" value={form.endTime} onChange={v => set("endTime", v)} dark={dark} disabled />
      </div>
      <div style={grid}>
        <Input label="Tipo de Masaje" value={form.massageTypeId} onChange={v => set("massageTypeId", v)} required dark={dark} options={MASSAGE_TYPES.map(t => ({ value: t.id, label: `${t.name} (${formatCurrency(t.basePrice)})` }))} />
        <Input label="Profesional" value={form.staffId} onChange={v => set("staffId", v)} required dark={dark} options={STAFF.map(s => ({ value: s.id, label: s.name }))} />
        <Input label="Cliente" value={form.clientId} onChange={v => set("clientId", v)} required dark={dark} options={clients.map(c => ({ value: c.id, label: c.name }))} />
        <Input label="Sala" value={form.room} onChange={v => set("room", v)} dark={dark} options={ROOMS.map(r => ({ value: r, label: r }))} />
      </div>
      <div style={grid}>
        <Input label="Precio Base" type="number" value={form.basePrice} onChange={v => set("basePrice", Number(v))} dark={dark} />
        <Input label="Descuento" type="number" value={form.discount} onChange={v => set("discount", Number(v))} dark={dark} min="0" />
        <Input label="Recargo" type="number" value={form.surcharge} onChange={v => set("surcharge", Number(v))} dark={dark} min="0" />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>Precio Final</label>
          <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: COLORS.primary, paddingTop: "4px" }}>{formatCurrency(form.finalPrice)}</div>
        </div>
      </div>
      <div style={grid}>
        <Input label="Estado" value={form.state} onChange={v => set("state", v)} dark={dark} options={SERVICE_STATES.map(s => ({ value: s.id, label: s.name }))} />
        <Input label="Sucursal" value={form.branch} onChange={v => set("branch", v)} dark={dark} placeholder="Central" />
      </div>
      <Input label="Observaciones" value={form.observations} onChange={v => set("observations", v)} dark={dark} rows={2} placeholder="Notas adicionales..." />
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "8px" }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>{service?.id ? "Guardar Cambios" : "Registrar Masaje"}</Button>
      </div>
    </div>
  );
};

// ─── PAYMENT FORM ───────────────────────────────────────────────────────────

const PaymentForm = ({ payment, serviceId, maxAmount, services, clients, registeredBy, onSave, onCancel, dark }) => {
  const [form, setForm] = useState(payment || {
    serviceId: serviceId || "", date: today(), time: new Date().toTimeString().slice(0, 5),
    amount: maxAmount || 0, pending: 0, state: "pagado", method: "efectivo",
    destino: "centro", reference: "", observations: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.serviceId) return alert("Seleccioná un servicio");
    if (!form.amount || form.amount <= 0) return alert("Monto debe ser mayor a 0");
    if (maxAmount != null && form.amount > maxAmount) {
      if (!window.confirm(`El monto ($${form.amount}) supera el saldo pendiente ($${maxAmount}). ¿Continuar?`)) return;
    }
    onSave({ ...form, id: form.id || generateId(), amount: Number(form.amount), registeredBy });
  };
  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const mainText = dark ? COLORS.textDark : COLORS.text;
  // Servicios realizados disponibles para cobrar (cuando se abre desde "Nuevo Cobro")
  const serviceOptions = services ? services.filter(s => s.state === "realizado").map(s => {
    const client = clients?.find(c => c.id === s.clientId);
    const mt = MASSAGE_TYPES.find(t => t.id === s.massageTypeId);
    return { value: s.id, label: `${formatDate(s.date)} — ${client?.name || "?"} — ${mt?.name || "?"}` };
  }) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {serviceOptions && (
        <Input label="Servicio" value={form.serviceId} onChange={v => set("serviceId", v)} dark={dark} required
          options={serviceOptions} />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Input label="Fecha" type="date" value={form.date} onChange={v => set("date", v)} dark={dark} />
        <Input label="Hora" type="time" value={form.time} onChange={v => set("time", v)} dark={dark} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Input label="Monto" type="number" value={form.amount} onChange={v => set("amount", v)} dark={dark} min="0" />
        <Input label="Método de Pago" value={form.method} onChange={v => set("method", v)} dark={dark} options={PAYMENT_METHODS.map(m => ({ value: m.id, label: `${m.icon} ${m.name}` }))} />
      </div>
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: dark ? COLORS.textMutedDark : COLORS.textMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Destino del dinero</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[{ id: "centro", label: "🏢 Centro", color: COLORS.primary }, { id: "masajista", label: "👐 Masajista", color: COLORS.success }].map(opt => (
            <button key={opt.id} onClick={() => set("destino", opt.id)} style={{
              flex: 1, padding: "10px", border: `2px solid ${form.destino === opt.id ? opt.color : borderC}`,
              borderRadius: "8px", background: form.destino === opt.id ? opt.color + "18" : "transparent",
              cursor: "pointer", fontSize: "13px", fontWeight: form.destino === opt.id ? 700 : 400,
              color: form.destino === opt.id ? opt.color : mainText, fontFamily: "var(--font-body)",
            }}>{opt.label}</button>
          ))}
        </div>
      </div>
      {maxAmount != null && (
        <div style={{ fontSize: "12px", color: COLORS.textMuted, padding: "8px 12px", background: dark ? "rgba(255,255,255,0.03)" : "#faf9f7", borderRadius: "8px" }}>
          Saldo pendiente: <strong>{formatCurrency(maxAmount)}</strong>
        </div>
      )}
      <Input label="Referencia / Comprobante" value={form.reference} onChange={v => set("reference", v)} dark={dark} placeholder="Nº de comprobante..." />
      <Input label="Observaciones" value={form.observations} onChange={v => set("observations", v)} dark={dark} rows={2} />
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant="success" onClick={handleSave}>{payment?.id ? "Actualizar Pago" : "Registrar Cobro"}</Button>
      </div>
    </div>
  );
};

// ─── CLIENT FORM ────────────────────────────────────────────────────────────

const ClientForm = ({ client, onSave, onCancel, dark }) => {
  const [form, setForm] = useState(client || { name: "", phone: "", email: "", birthdate: "", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name) return alert("El nombre es obligatorio");
    onSave({ ...form, id: form.id || generateId() });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Input label="Nombre Completo" value={form.name} onChange={v => set("name", v)} required dark={dark} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Input label="Teléfono" value={form.phone} onChange={v => set("phone", v)} dark={dark} />
        <Input label="Email" value={form.email} onChange={v => set("email", v)} type="email" dark={dark} />
      </div>
      <Input label="Fecha de Nacimiento" type="date" value={form.birthdate} onChange={v => set("birthdate", v)} dark={dark} />
      <Input label="Notas" value={form.notes} onChange={v => set("notes", v)} dark={dark} rows={2} />
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>{client?.id ? "Guardar" : "Crear Cliente"}</Button>
      </div>
    </div>
  );
};

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────────────

const DashboardPage = ({ services, payments, clients, dark }) => {
  const realized = services.filter(s => s.state === "realizado");
  const todayS = realized.filter(s => isToday(s.date));
  const weekS = realized.filter(s => isThisWeek(s.date));
  const monthS = realized.filter(s => isThisMonth(s.date));
  const todayPayments = payments.filter(p => isToday(p.date) && p.state !== "anulado");
  const weekPayments = payments.filter(p => isThisWeek(p.date) && p.state !== "anulado");
  const monthPayments = payments.filter(p => isThisMonth(p.date) && p.state !== "anulado");
  const incomeToday = _.sumBy(todayPayments, "amount");
  const incomeWeek = _.sumBy(weekPayments, "amount");
  const incomeMonth = _.sumBy(monthPayments, "amount");
  const avgTicket = monthS.length > 0 ? Math.round(_.sumBy(monthS, "finalPrice") / monthS.length) : 0;
  const avgDuration = monthS.length > 0 ? Math.round(_.meanBy(monthS, "duration")) : 0;
  const topType = _(realized).countBy("massageTypeId").entries().maxBy(1);
  const topTypeName = topType ? MASSAGE_TYPES.find(t => t.id === topType[0])?.name : "—";
  const topMethod = _(payments).filter(p => p.state !== "anulado").countBy("method").entries().maxBy(1);
  const topMethodName = topMethod ? PAYMENT_METHODS.find(m => m.id === topMethod[0])?.name : "—";
  const unpaidServices = services.filter(s => {
    if (s.state !== "realizado") return false;
    const paid = _.sumBy(payments.filter(p => p.serviceId === s.id && p.state !== "anulado"), "amount");
    return paid < s.finalPrice;
  });
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i);
      const label = new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
      const daySvcs = realized.filter(s => s.date === d);
      const dayPays = payments.filter(p => p.date === d && p.state !== "anulado");
      days.push({ date: label, masajes: daySvcs.length, ingresos: _.sumBy(dayPays, "amount") });
    }
    return days;
  }, [realized, payments]);
  const typeDistribution = useMemo(() => {
    return _(realized).countBy("massageTypeId").entries().map(([id, count]) => ({
      name: MASSAGE_TYPES.find(t => t.id === id)?.name || id, value: count,
    })).orderBy("value", "desc").value();
  }, [realized]);
  const methodDistribution = useMemo(() => {
    return _(payments).filter(p => p.state !== "anulado").countBy("method").entries().map(([id, count]) => ({
      name: PAYMENT_METHODS.find(m => m.id === id)?.name || id, value: count,
    })).orderBy("value", "desc").value();
  }, [payments]);
  const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" };
  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text, marginBottom: "4px" }}>Dashboard</h2>
        <p style={{ fontSize: "13px", color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>Resumen general del negocio</p>
      </div>
      <div style={kpiGrid}>
        <KPICard title="Masajes Hoy" value={todayS.length} icon="🧖" dark={dark} />
        <KPICard title="Masajes Semana" value={weekS.length} icon="📅" dark={dark} />
        <KPICard title="Masajes Mes" value={monthS.length} icon="📊" dark={dark} />
        <KPICard title="Ingresos Hoy" value={formatCurrency(incomeToday)} icon="💰" color={COLORS.success} dark={dark} />
        <KPICard title="Ingresos Semana" value={formatCurrency(incomeWeek)} icon="📈" color={COLORS.success} dark={dark} />
        <KPICard title="Ingresos Mes" value={formatCurrency(incomeMonth)} icon="🏦" color={COLORS.success} dark={dark} />
        <KPICard title="Ticket Promedio" value={formatCurrency(avgTicket)} subtitle="Este mes" dark={dark} />
        <KPICard title="Duración Promedio" value={`${avgDuration} min`} subtitle="Este mes" dark={dark} />
        <KPICard title="Tipo Más Vendido" value={topTypeName} icon="⭐" dark={dark} />
        <KPICard title="Medio de Pago Top" value={topMethodName} icon="💳" dark={dark} />
        <KPICard title="Pendientes de Cobro" value={unpaidServices.length} color={unpaidServices.length > 0 ? COLORS.danger : COLORS.success} icon="⚠️" dark={dark} />
        <KPICard title="Total Clientes" value={clients.length} icon="👥" dark={dark} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", minHeight: 300 }}>
        <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "20px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text, marginBottom: "16px" }}>Evolución Diaria (14 días)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: dark ? COLORS.textMutedDark : COLORS.textMuted }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: dark ? COLORS.textMutedDark : COLORS.textMuted }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: dark ? COLORS.textMutedDark : COLORS.textMuted }} />
              <Tooltip contentStyle={{ background: dark ? COLORS.cardDark : "#fff", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", fontSize: "12px" }} />
              <Area yAxisId="left" type="monotone" dataKey="masajes" stroke={COLORS.primary} fill={COLORS.primary + "30"} strokeWidth={2} name="Masajes" />
              <Area yAxisId="right" type="monotone" dataKey="ingresos" stroke={COLORS.success} fill={COLORS.success + "20"} strokeWidth={2} name="Ingresos" />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "20px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text, marginBottom: "16px" }}>Distribución por Tipo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: "10px" }}>
                {typeDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: dark ? COLORS.cardDark : "#fff", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "20px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text, marginBottom: "16px" }}>Medios de Pago</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={methodDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: dark ? COLORS.textMutedDark : COLORS.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: dark ? COLORS.textMutedDark : COLORS.textMuted }} />
            <Tooltip contentStyle={{ background: dark ? COLORS.cardDark : "#fff", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="value" fill={COLORS.accent} radius={[6, 6, 0, 0]} name="Cantidad" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {unpaidServices.length > 0 && (
        <div style={{
          background: dark ? "rgba(184,84,80,0.08)" : "rgba(184,84,80,0.04)", borderRadius: "14px", padding: "20px",
          border: `1px solid ${dark ? "rgba(184,84,80,0.2)" : "rgba(184,84,80,0.15)"}`,
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: COLORS.danger, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Alert /> Servicios Pendientes de Cobro ({unpaidServices.length})
          </h3>
          {unpaidServices.slice(0, 5).map(s => {
            const client = clients.find(c => c.id === s.clientId);
            const mt = MASSAGE_TYPES.find(t => t.id === s.massageTypeId);
            const paid = _.sumBy(payments.filter(p => p.serviceId === s.id && p.state !== "anulado"), "amount");
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", padding: "6px 0", color: dark ? COLORS.textDark : COLORS.text }}>
                <span>{formatDate(s.date)} — {client?.name} — {mt?.name}</span>
                <span style={{ fontWeight: 600, color: COLORS.danger }}>Pendiente: {formatCurrency(s.finalPrice - paid)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── SERVICES PAGE ──────────────────────────────────────────────────────────

const ServicesPage = ({ services, setServices, payments, clients, user, dark }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const canEdit = ["admin", "agenda"].includes(user.role);
  const canDelete = user.role === "admin";
  const filtered = useMemo(() => {
    return services.filter(s => {
      const client = clients.find(c => c.id === s.clientId);
      const staff = STAFF.find(st => st.id === s.staffId);
      const mt = MASSAGE_TYPES.find(t => t.id === s.massageTypeId);
      const searchMatch = !search || [client?.name, staff?.name, mt?.name, s.date, s.id].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return searchMatch && (!filterType || s.massageTypeId === filterType) && (!filterState || s.state === filterState) && (!filterStaff || s.staffId === filterStaff) && (!filterDateFrom || s.date >= filterDateFrom) && (!filterDateTo || s.date <= filterDateTo);
    }).sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || "").localeCompare(a.startTime || ""));
  }, [services, clients, search, filterType, filterState, filterStaff, filterDateFrom, filterDateTo]);
  const handleSave = async (svc) => {
    const row = {
      id: svc.id, date: svc.date, start_time: svc.startTime, end_time: svc.endTime,
      duration: svc.duration, massage_type_id: svc.massageTypeId, description: svc.description,
      staff_id: svc.staffId, client_id: svc.clientId, room: svc.room, branch: svc.branch,
      base_price: svc.basePrice, discount: svc.discount, surcharge: svc.surcharge,
      final_price: svc.finalPrice, state: svc.state, observations: svc.observations,
      updated_at: new Date().toISOString(),
    };
    const exists = services.find(s => s.id === svc.id);
    if (exists) {
      await supabase.from('services').update(row).eq('id', svc.id);
    } else {
      await supabase.from('services').insert({ ...row, created_by: user.username, created_at: new Date().toISOString() });
    }
    const { data: updated } = await supabase.from('services').select('*');
    setServices((updated || []).map(mapService));
    setShowForm(false); setEditing(null);
  };
  const handleDelete = async (id) => {
    await supabase.from('services').delete().eq('id', id);
    const { data: updated } = await supabase.from('services').select('*');
    setServices((updated || []).map(mapService));
    setConfirmDelete(null); setDetail(null);
  };
  const getPaymentStatus = (svc) => {
    const paid = _.sumBy(payments.filter(p => p.serviceId === svc.id && p.state !== "anulado"), "amount");
    if (paid >= svc.finalPrice) return "pagado";
    return paid > 0 ? "parcial" : "pendiente";
  };
  const columns = [
    { header: "Fecha", nowrap: true, render: r => formatDate(r.date) },
    { header: "Hora", nowrap: true, render: r => r.startTime || "—" },
    { header: "Cliente", render: r => clients.find(c => c.id === r.clientId)?.name || "—" },
    { header: "Tipo", render: r => MASSAGE_TYPES.find(t => t.id === r.massageTypeId)?.name || "—" },
    { header: "Profesional", render: r => STAFF.find(s => s.id === r.staffId)?.name || "—" },
    { header: "Duración", nowrap: true, render: r => `${r.duration} min` },
    { header: "Precio", nowrap: true, render: r => formatCurrency(r.finalPrice) },
    { header: "Estado", nowrap: true, render: r => <StateBadge stateId={r.state} states={SERVICE_STATES} /> },
    { header: "Cobro", nowrap: true, render: r => r.state !== "realizado" ? <span style={{ color: COLORS.textMuted, fontSize: "11px" }}>N/A</span> : <StateBadge stateId={getPaymentStatus(r)} states={PAYMENT_STATES} /> },
  ];
  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text }}>Masajes Realizados</h2>
          <p style={{ fontSize: "13px", color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>{filtered.length} registros</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button variant="secondary" icon={<Icons.Filter />} onClick={() => setShowFilters(!showFilters)} size="sm">Filtros</Button>
          {canEdit && <Button icon={<Icons.Plus />} onClick={() => { setEditing(null); setShowForm(true); }} size="sm">Nuevo Masaje</Button>}
        </div>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, masajista, tipo..."
        style={{ maxWidth: "400px", padding: "9px 12px", fontSize: "13px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", background: dark ? COLORS.surfaceDark : "#faf9f7", color: dark ? COLORS.textDark : COLORS.text, outline: "none", fontFamily: "var(--font-body)" }} />
      {showFilters && (
        <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", padding: "16px", background: dark ? COLORS.cardDark : "#faf9f7", borderRadius: "12px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
          <Input label="Desde" type="date" value={filterDateFrom} onChange={setFilterDateFrom} dark={dark} />
          <Input label="Hasta" type="date" value={filterDateTo} onChange={setFilterDateTo} dark={dark} />
          <Input label="Tipo" value={filterType} onChange={setFilterType} dark={dark} options={MASSAGE_TYPES.map(t => ({ value: t.id, label: t.name }))} />
          <Input label="Estado" value={filterState} onChange={setFilterState} dark={dark} options={SERVICE_STATES.map(s => ({ value: s.id, label: s.name }))} />
          <Input label="Profesional" value={filterStaff} onChange={setFilterStaff} dark={dark} options={STAFF.map(s => ({ value: s.id, label: s.name }))} />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterType(""); setFilterState(""); setFilterStaff(""); }}>Limpiar</Button>
          </div>
        </div>
      )}
      <Table columns={columns} data={filtered} dark={dark} onRowClick={setDetail}
        actions={canEdit ? (row) => (
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
            <button onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.primary, padding: "4px" }}><Icons.Edit /></button>
            {canDelete && <button onClick={e => { e.stopPropagation(); setConfirmDelete(row.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.danger, padding: "4px" }}><Icons.Trash /></button>}
          </div>
        ) : null} />
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Editar Masaje" : "Registrar Masaje"} wide dark={dark}>
        <ServiceForm service={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} clients={clients} dark={dark} />
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle del Servicio" wide dark={dark}>
        {detail && (() => {
          const client = clients.find(c => c.id === detail.clientId);
          const staff = STAFF.find(s => s.id === detail.staffId);
          const mt = MASSAGE_TYPES.find(t => t.id === detail.massageTypeId);
          const sPayments = payments.filter(p => p.serviceId === detail.id && p.state !== "anulado");
          const paid = _.sumBy(sPayments, "amount");
          const pending = detail.finalPrice - paid;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                {[["Fecha", formatDate(detail.date)], ["Horario", `${detail.startTime} - ${detail.endTime}`], ["Duración", `${detail.duration} min`], ["Tipo", mt?.name], ["Profesional", staff?.name], ["Cliente", client?.name], ["Sala", detail.room || "—"]].map(([l, v]) => (
                  <div key={l}><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>{l}</span><strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{v}</strong></div>
                ))}
                <div><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>Estado</span><StateBadge stateId={detail.state} states={SERVICE_STATES} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", padding: "16px", background: dark ? "rgba(255,255,255,0.03)" : "#faf9f7", borderRadius: "10px" }}>
                <div><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>Precio Base</span><strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{formatCurrency(detail.basePrice)}</strong></div>
                <div><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>Descuento</span><strong style={{ color: COLORS.success }}>{formatCurrency(detail.discount)}</strong></div>
                <div><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>Recargo</span><strong style={{ color: COLORS.warning }}>{formatCurrency(detail.surcharge)}</strong></div>
                <div><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>Precio Final</span><strong style={{ fontSize: "18px", color: COLORS.primary, fontFamily: "var(--font-display)" }}>{formatCurrency(detail.finalPrice)}</strong></div>
              </div>
              {detail.state === "realizado" && (
                <div style={{ padding: "16px", background: dark ? "rgba(255,255,255,0.03)" : "#f5f3ef", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <strong style={{ fontSize: "13px", color: dark ? COLORS.textDark : COLORS.text }}>Pagos ({sPayments.length})</strong>
                    <span style={{ fontSize: "12px", color: pending > 0 ? COLORS.danger : COLORS.success, fontWeight: 600 }}>
                      {pending > 0 ? `Pendiente: ${formatCurrency(pending)}` : "Pagado"}
                    </span>
                  </div>
                  {sPayments.length > 0 ? sPayments.map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderTop: `1px solid ${dark ? COLORS.borderDark : COLORS.border}40`, color: dark ? COLORS.textDark : COLORS.text }}>
                      <span>{formatDate(p.date)} {p.time} — {PAYMENT_METHODS.find(m => m.id === p.method)?.name}</span>
                      <strong>{formatCurrency(p.amount)}</strong>
                    </div>
                  )) : <p style={{ fontSize: "12px", color: COLORS.textMuted }}>Sin pagos registrados</p>}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
      <ConfirmDialog open={!!confirmDelete} onConfirm={() => handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} message="¿Eliminar este servicio? No se puede deshacer." dark={dark} />
    </div>
  );
};

// ─── PAYMENTS PAGE ──────────────────────────────────────────────────────────

const PaymentsPage = ({ services, payments, setPayments, clients, user, staffFilter, dark }) => {
  const [showForm, setShowForm] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterDestino, setFilterDestino] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("payments");
  const canEdit = ["admin", "agenda", "masajista"].includes(user.role);
  const visibleServices = staffFilter ? services.filter(s => s.staffId === staffFilter) : services;
  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const cardBg = dark ? COLORS.cardDark : COLORS.card;
  const mainText = dark ? COLORS.textDark : COLORS.text;
  const mutedText = dark ? COLORS.textMutedDark : COLORS.textMuted;

  const realizedServices = visibleServices.filter(s => s.state === "realizado");
  const unpaidServices = useMemo(() => {
    return realizedServices.filter(s => {
      const paid = _.sumBy(payments.filter(p => p.serviceId === s.id && p.state !== "anulado"), "amount");
      return paid < s.finalPrice;
    }).map(s => {
      const paid = _.sumBy(payments.filter(p => p.serviceId === s.id && p.state !== "anulado"), "amount");
      return { ...s, paid, pending: s.finalPrice - paid };
    });
  }, [realizedServices, payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const svc = services.find(s => s.id === p.serviceId);
      if (staffFilter && svc?.staffId !== staffFilter) return false;
      const client = svc ? clients.find(c => c.id === svc.clientId) : null;
      const searchMatch = !search || [client?.name, p.reference, p.method].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const staffMatch = !filterStaff || svc?.staffId === filterStaff;
      const destinoMatch = !filterDestino || p.destino === filterDestino;
      return searchMatch && staffMatch && destinoMatch
        && (!filterMethod || p.method === filterMethod)
        && (!filterState || p.state === filterState)
        && (!filterDateFrom || p.date >= filterDateFrom)
        && (!filterDateTo || p.date <= filterDateTo);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, services, clients, search, filterMethod, filterState, filterStaff, filterDestino, filterDateFrom, filterDateTo, staffFilter]);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSavePayment = async (payment) => {
    const row = {
      id: payment.id, service_id: payment.serviceId, date: payment.date, time: payment.time,
      amount: payment.amount, pending: payment.pending, state: payment.state, method: payment.method,
      destino: payment.destino, reference: payment.reference, observations: payment.observations,
      registered_by: payment.registeredBy, created_by: user.username, created_at: new Date().toISOString(),
    };
    const exists = payments.find(p => p.id === payment.id);
    if (exists) {
      await supabase.from('payments').update(row).eq('id', payment.id);
    } else {
      await supabase.from('payments').insert(row);
    }
    const { data: updated } = await supabase.from('payments').select('*');
    setPayments((updated || []).map(mapPayment));
    setShowForm(false); setShowNewForm(false); setSelectedService(null);
  };

  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    await supabase.from('payments').delete().eq('id', deleteTarget.id);
    const { data: updated } = await supabase.from('payments').select('*');
    setPayments((updated || []).map(mapPayment));
    setDeleteTarget(null);
  };

  const totalFiltered = _.sumBy(filteredPayments.filter(p => p.state !== "anulado"), "amount");
  const totalCentro = _.sumBy(filteredPayments.filter(p => p.state !== "anulado" && p.destino === "centro"), "amount");
  const totalMasajista = _.sumBy(filteredPayments.filter(p => p.state !== "anulado" && p.destino === "masajista"), "amount");
  const totalSinDestino = _.sumBy(filteredPayments.filter(p => p.state !== "anulado" && !p.destino), "amount");
  const hasFilters = filterDateFrom || filterDateTo || filterMethod || filterState || filterStaff || filterDestino;

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: mainText }}>Cobros</h2>
          <p style={{ fontSize: "13px", color: mutedText }}>
            {viewMode === "payments" ? `${filteredPayments.length} pagos — Total: ${formatCurrency(totalFiltered)}` : `${unpaidServices.length} pendientes`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <Tabs tabs={[{ id: "payments", label: "Pagos" }, { id: "unpaid", label: `Pendientes (${unpaidServices.length})` }]} active={viewMode} onChange={setViewMode} dark={dark} />
          <Button variant="secondary" icon={<Icons.Filter />} onClick={() => setShowFilters(!showFilters)} size="sm">
            Filtros{hasFilters ? " ●" : ""}
          </Button>
          {canEdit && <Button icon={<Icons.Plus />} onClick={() => setShowNewForm(true)} size="sm">Nuevo Cobro</Button>}
        </div>
      </div>

      {showFilters && viewMode === "payments" && (
        <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", padding: "16px", background: dark ? COLORS.cardDark : "#faf9f7", borderRadius: "12px", border: `1px solid ${borderC}` }}>
          <Input label="Desde" type="date" value={filterDateFrom} onChange={setFilterDateFrom} dark={dark} />
          <Input label="Hasta" type="date" value={filterDateTo} onChange={setFilterDateTo} dark={dark} />
          <Input label="Masajista" value={filterStaff} onChange={setFilterStaff} dark={dark} options={STAFF.map(s => ({ value: s.id, label: s.name }))} />
          <Input label="Destino" value={filterDestino} onChange={setFilterDestino} dark={dark} options={[{ value: "centro", label: "🏢 Centro" }, { value: "masajista", label: "👐 Masajista" }]} />
          <Input label="Método" value={filterMethod} onChange={setFilterMethod} dark={dark} options={PAYMENT_METHODS.map(m => ({ value: m.id, label: m.name }))} />
          <Input label="Estado" value={filterState} onChange={setFilterState} dark={dark} options={PAYMENT_STATES.map(s => ({ value: s.id, label: s.name }))} />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterMethod(""); setFilterState(""); setFilterStaff(""); setFilterDestino(""); }}>Limpiar</Button>
          </div>
        </div>
      )}

      {viewMode === "payments" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total cobrado", value: totalFiltered, color: mainText },
            { label: "🏢 Al centro", value: totalCentro + totalSinDestino, color: COLORS.primary },
            { label: "👐 A masajistas", value: totalMasajista, color: COLORS.success },
          ].map(item => (
            <div key={item.label} style={{ background: cardBg, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${borderC}` }}>
              <div style={{ fontSize: "11px", color: mutedText, marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: item.color, fontFamily: "var(--font-display)" }}>{formatCurrency(item.value)}</div>
            </div>
          ))}
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
        style={{ maxWidth: "400px", padding: "9px 12px", fontSize: "13px", border: `1px solid ${borderC}`, borderRadius: "8px", background: dark ? COLORS.surfaceDark : "#faf9f7", color: mainText, outline: "none", fontFamily: "var(--font-body)" }} />

      {viewMode === "payments" ? (
        <Table columns={[
          { header: "Fecha", nowrap: true, render: r => formatDate(r.date) },
          { header: "Hora", nowrap: true, render: r => r.time || "—" },
          { header: "Cliente", render: r => { const svc = services.find(s => s.id === r.serviceId); return clients.find(c => c.id === svc?.clientId)?.name || "—"; }},
          { header: "Masajista", render: r => { const svc = services.find(s => s.id === r.serviceId); return STAFF.find(s => s.id === svc?.staffId)?.name || "—"; }},
          { header: "Monto", nowrap: true, render: r => <strong style={{ color: COLORS.success }}>{formatCurrency(r.amount)}</strong> },
          { header: "Método", render: r => { const m = PAYMENT_METHODS.find(pm => pm.id === r.method); return m ? `${m.icon} ${m.name}` : r.method; }},
          { header: "Destino", render: r => r.destino === "masajista" ? <span style={{ color: COLORS.success, fontWeight: 600 }}>👐 Masajista</span> : <span style={{ color: COLORS.primary, fontWeight: 600 }}>🏢 Centro</span> },
          { header: "Estado", nowrap: true, render: r => <StateBadge stateId={r.state} states={PAYMENT_STATES} /> },
          { header: "Registró", render: r => r.registeredBy || r.createdBy || "—" },
        ]} data={filteredPayments} dark={dark}
          actions={canEdit ? (row) => (
            <button onClick={e => { e.stopPropagation(); setDeleteTarget(row); }} title="Eliminar cobro"
              style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.danger, padding: "4px", opacity: 0.7, transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}>
              <Icons.Trash />
            </button>
          ) : null} />
      ) : (
        <Table columns={[
          { header: "Fecha", nowrap: true, render: r => formatDate(r.date) },
          { header: "Cliente", render: r => clients.find(c => c.id === r.clientId)?.name || "—" },
          { header: "Masajista", render: r => STAFF.find(s => s.id === r.staffId)?.name || "—" },
          { header: "Tipo", render: r => MASSAGE_TYPES.find(t => t.id === r.massageTypeId)?.name || "—" },
          { header: "Total", nowrap: true, render: r => formatCurrency(r.finalPrice) },
          { header: "Pagado", nowrap: true, render: r => formatCurrency(r.paid) },
          { header: "Pendiente", nowrap: true, render: r => <strong style={{ color: COLORS.danger }}>{formatCurrency(r.pending)}</strong> },
        ]} data={unpaidServices} dark={dark}
          actions={canEdit ? (row) => <Button size="sm" variant="success" onClick={e => { e.stopPropagation(); setSelectedService(row); setShowForm(true); }}>Cobrar</Button> : null} />
      )}

      {/* Modal cobro desde Pendientes */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setSelectedService(null); }} title="Registrar Cobro" dark={dark}>
        {selectedService && <PaymentForm serviceId={selectedService.id} maxAmount={selectedService.pending} registeredBy={user.name} onSave={handleSavePayment} onCancel={() => { setShowForm(false); setSelectedService(null); }} dark={dark} />}
      </Modal>

      {/* Modal nuevo cobro libre */}
      <Modal open={showNewForm} onClose={() => setShowNewForm(false)} title="Nuevo Cobro" dark={dark}>
        <PaymentForm services={services} clients={clients} registeredBy={user.name} onSave={handleSavePayment} onCancel={() => setShowNewForm(false)} dark={dark} />
      </Modal>

      {/* Confirmar eliminación */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleteTarget(null)}
        message={deleteTarget ? `¿Eliminar el cobro de ${formatCurrency(deleteTarget.amount)} del ${formatDate(deleteTarget.date)}? Esta acción no se puede deshacer.` : ""}
        dark={dark}
      />
    </div>
  );
};

// ─── CLIENTS PAGE ───────────────────────────────────────────────────────────

const ClientsPage = ({ clients, setClients, services, payments, user, dark }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const canEdit = ["admin", "agenda"].includes(user.role);
  const filtered = clients.filter(c => !search || [c.name, c.phone, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const handleSave = async (client) => {
    const exists = clients.find(c => c.id === client.id);
    if (exists) {
      await supabase.from('clients').update(client).eq('id', client.id);
    } else {
      await supabase.from('clients').insert(client);
    }
    const { data: updated } = await supabase.from('clients').select('*');
    setClients(updated || []);
    setShowForm(false); setEditing(null);
  };
  // Memoizado para no recalcular en cada celda de cada render
  const statsMap = useMemo(() => {
    const map = {};
    for (const client of clients) {
      const cSvcs = services.filter(s => s.clientId === client.id && s.state === "realizado");
      const cPays = payments.filter(p => {
        const svc = services.find(s => s.id === p.serviceId);
        return svc?.clientId === client.id && p.state !== "anulado";
      });
      map[client.id] = {
        visits: cSvcs.length,
        totalSpent: _.sumBy(cPays, "amount"),
        lastVisit: cSvcs.length > 0 ? _.maxBy(cSvcs, "date")?.date : null,
      };
    }
    return map;
  }, [clients, services, payments]);
  const getStats = (id) => statsMap[id] || { visits: 0, totalSpent: 0, lastVisit: null };
  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text }}>Clientes</h2>
          <p style={{ fontSize: "13px", color: dark ? COLORS.textMutedDark : COLORS.textMuted }}>{filtered.length} clientes</p>
        </div>
        {canEdit && <Button icon={<Icons.Plus />} onClick={() => { setEditing(null); setShowForm(true); }} size="sm">Nuevo Cliente</Button>}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
        style={{ maxWidth: "400px", padding: "9px 12px", fontSize: "13px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", background: dark ? COLORS.surfaceDark : "#faf9f7", color: dark ? COLORS.textDark : COLORS.text, outline: "none", fontFamily: "var(--font-body)" }} />
      <Table columns={[
        { header: "Nombre", render: r => <strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{r.name}</strong> },
        { header: "Teléfono", key: "phone" },
        { header: "Email", key: "email" },
        { header: "Visitas", nowrap: true, render: r => getStats(r.id).visits },
        { header: "Total Gastado", nowrap: true, render: r => formatCurrency(getStats(r.id).totalSpent) },
        { header: "Última Visita", nowrap: true, render: r => { const lv = getStats(r.id).lastVisit; return lv ? formatDate(lv) : "—"; }},
      ]} data={filtered} dark={dark} onRowClick={setDetail}
        actions={canEdit ? (row) => <button onClick={e => { e.stopPropagation(); setEditing(row); setShowForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.primary, padding: "4px" }}><Icons.Edit /></button> : null} />
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Editar Cliente" : "Nuevo Cliente"} dark={dark}>
        <ClientForm client={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} dark={dark} />
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle del Cliente" wide dark={dark}>
        {detail && (() => {
          const stats = getStats(detail.id);
          const cServices = services.filter(s => s.clientId === detail.id).sort((a, b) => b.date.localeCompare(a.date));
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                {[["Nombre", detail.name], ["Teléfono", detail.phone || "—"], ["Email", detail.email || "—"], ["Nacimiento", detail.birthdate ? formatDate(detail.birthdate) : "—"]].map(([l, v]) => (
                  <div key={l}><span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>{l}</span><strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{v}</strong></div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <KPICard title="Visitas" value={stats.visits} dark={dark} />
                <KPICard title="Total Gastado" value={formatCurrency(stats.totalSpent)} dark={dark} />
                <KPICard title="Última Visita" value={stats.lastVisit ? formatDate(stats.lastVisit) : "—"} dark={dark} />
              </div>
              {detail.notes && <div style={{ padding: "12px", background: dark ? "rgba(255,255,255,0.03)" : "#faf9f7", borderRadius: "8px", fontSize: "13px", color: dark ? COLORS.textDark : COLORS.text }}><strong>Notas:</strong> {detail.notes}</div>}
              <h4 style={{ fontSize: "14px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text }}>Historial</h4>
              {cServices.slice(0, 10).map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontSize: "12px", background: dark ? "rgba(255,255,255,0.02)" : "#faf9f7", borderRadius: "8px", color: dark ? COLORS.textDark : COLORS.text }}>
                  <span>{formatDate(s.date)} — {MASSAGE_TYPES.find(t => t.id === s.massageTypeId)?.name}</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}><span>{formatCurrency(s.finalPrice)}</span><StateBadge stateId={s.state} states={SERVICE_STATES} /></div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

// ─── REPORTS PAGE ───────────────────────────────────────────────────────────

const ReportsPage = ({ services, payments, setPayments, clients, user, dark }) => {
  const [tab, setTab] = useState("masajes");
  const [periodo, setPeriodo] = useState("mensual");

  // ── Rango de fechas según período ──
  // dateRange se recalcula en cada render para que nunca quede stale
  const dateRange = (() => {
    const now = new Date();
    let from;
    if (periodo === "semanal") { from = new Date(now); from.setDate(now.getDate() - 7); }
    else if (periodo === "mensual") { from = new Date(now); from.setMonth(now.getMonth() - 1); }
    else if (periodo === "trimestral") { from = new Date(now); from.setMonth(now.getMonth() - 3); }
    else { from = new Date(now); from.setFullYear(now.getFullYear() - 1); }
    return { from: localDateStr(from), to: localDateStr(now) };
  })();

  const realized = useMemo(() => {
    const { from, to } = dateRange;
    return services.filter(s => s.state === "realizado" && s.date >= from && s.date <= to);
  }, [services, periodo]);

  const validPay = useMemo(() => {
    const { from, to } = dateRange;
    return payments.filter(p => p.state !== "anulado" && p.date >= from && p.date <= to);
  }, [payments, periodo]);

  // KPIs resumen
  const totalMasajes = realized.length;
  const totalIngresos = _.sumBy(validPay, "amount");
  const ticketPromedio = totalMasajes > 0 ? Math.round(totalIngresos / totalMasajes) : 0;

  const byType = useMemo(() => _(realized).countBy("massageTypeId").entries().map(([id, count]) => ({
    name: MASSAGE_TYPES.find(t => t.id === id)?.name || id, count,
    revenue: _.sumBy(realized.filter(s => s.massageTypeId === id), "finalPrice"),
  })).orderBy("count", "desc").value(), [realized]);

  const byStaff = useMemo(() => _(realized).countBy("staffId").entries().map(([id, count]) => ({
    name: STAFF.find(s => s.id === id)?.name || id, count,
    revenue: _.sumBy(validPay.filter(p => { const svc = realized.find(s => s.id === p.serviceId); return svc?.staffId === id; }), "amount"),
  })).orderBy("count", "desc").value(), [realized, validPay]);

  const topClients = useMemo(() => _(realized).countBy("clientId").entries().map(([id, count]) => ({
    name: clients.find(c => c.id === id)?.name || id, visits: count,
    spent: _.sumBy(validPay.filter(p => { const svc = services.find(s => s.id === p.serviceId); return svc?.clientId === id; }), "amount"),
  })).orderBy("visits", "desc").take(10).value(), [realized, validPay, clients, services]);

  const incomeByMethod = useMemo(() => _(validPay).groupBy("method").entries().map(([id, pays]) => ({
    name: PAYMENT_METHODS.find(m => m.id === id)?.name || id, total: _.sumBy(pays, "amount"), count: pays.length,
  })).orderBy("total", "desc").value(), [validPay]);

  // Evolución en el tiempo (segmentos según período)
  const evolutionData = useMemo(() => {
    const result = [];
    const now = new Date();
    if (periodo === "semanal") {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        result.push({
          name: d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
          masajes: realized.filter(s => s.date === ds).length,
          ingresos: _.sumBy(validPay.filter(p => p.date === ds), "amount"),
        });
      }
    } else if (periodo === "mensual") {
      // Últimas 4 semanas
      for (let w = 3; w >= 0; w--) {
        const start = new Date(now); start.setDate(now.getDate() - w * 7 - 6);
        const end = new Date(now); end.setDate(now.getDate() - w * 7);
        const sStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}`;
        const eStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`;
        result.push({
          name: `${start.getDate()}/${start.getMonth()+1}`,
          masajes: realized.filter(s => s.date >= sStr && s.date <= eStr).length,
          ingresos: _.sumBy(validPay.filter(p => p.date >= sStr && p.date <= eStr), "amount"),
        });
      }
    } else if (periodo === "trimestral") {
      // Últimos 3 meses
      for (let m = 2; m >= 0; m--) {
        const d = new Date(now); d.setMonth(now.getMonth() - m);
        const y = d.getFullYear(); const mo = d.getMonth();
        const sStr = `${y}-${String(mo+1).padStart(2,"0")}-01`;
        const eStr = `${y}-${String(mo+1).padStart(2,"0")}-31`;
        result.push({
          name: d.toLocaleDateString("es-AR", { month: "short" }),
          masajes: realized.filter(s => s.date >= sStr && s.date <= eStr).length,
          ingresos: _.sumBy(validPay.filter(p => p.date >= sStr && p.date <= eStr), "amount"),
        });
      }
    } else {
      // Último año — por mes
      for (let m = 11; m >= 0; m--) {
        const d = new Date(now); d.setMonth(now.getMonth() - m);
        const y = d.getFullYear(); const mo = d.getMonth();
        const sStr = `${y}-${String(mo+1).padStart(2,"0")}-01`;
        const eStr = `${y}-${String(mo+1).padStart(2,"0")}-31`;
        result.push({
          name: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
          masajes: realized.filter(s => s.date >= sStr && s.date <= eStr).length,
          ingresos: _.sumBy(validPay.filter(p => p.date >= sStr && p.date <= eStr), "amount"),
        });
      }
    }
    return result;
  }, [realized, validPay, periodo]);

  // Días más concurridos (lunes=1 ... domingo=0)
  const busyDays = useMemo(() => {
    const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const counts = Array(7).fill(0);
    realized.forEach(s => { const d = new Date(s.date + "T12:00:00"); counts[d.getDay()]++; });
    return DIAS.map((name, i) => ({ name, count: counts[i] }));
  }, [realized]);

  // Horas pico
  const peakHours = useMemo(() => {
    const h = {};
    realized.forEach(s => {
      const time = s.startTime || s.time;
      if (time) { const hr = parseInt(time.split(":")[0]); h[hr] = (h[hr] || 0) + 1; }
    });
    return Object.entries(h).map(([hr, count]) => ({ hour: `${hr}:00`, count })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [realized]);

  const chartStyle = { background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "20px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` };
  const ttStyle = { background: dark ? COLORS.cardDark : "#fff", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", fontSize: "12px" };
  const tickStyle = { fontSize: 10, fill: dark ? COLORS.textMutedDark : COLORS.textMuted };
  const mainText = dark ? COLORS.textDark : COLORS.text;
  const mutedText = dark ? COLORS.textMutedDark : COLORS.textMuted;
  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const cardBg = dark ? COLORS.cardDark : COLORS.card;

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header + selector de período */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: mainText }}>Reportes</h2>
          <p style={{ fontSize: "13px", color: mutedText }}>Análisis detallado del negocio</p>
        </div>
        <Tabs tabs={[{ id: "semanal", label: "Semana" }, { id: "mensual", label: "Mes" }, { id: "trimestral", label: "Trimestre" }, { id: "anual", label: "Año" }]} active={periodo} onChange={setPeriodo} dark={dark} />
      </div>

      {/* KPIs resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "Masajes", value: totalMasajes, format: v => v },
          { label: "Ingresos", value: totalIngresos, format: formatCurrency },
          { label: "Ticket promedio", value: ticketPromedio, format: formatCurrency },
        ].map(k => (
          <div key={k.label} style={{ background: cardBg, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${borderC}` }}>
            <div style={{ fontSize: "11px", color: mutedText, marginBottom: "4px" }}>{k.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: mainText, fontFamily: "var(--font-display)" }}>{k.format(k.value)}</div>
          </div>
        ))}
      </div>

      <Tabs tabs={[{ id: "masajes", label: "Masajes" }, { id: "cobros", label: "Cobros" }, { id: "cruzados", label: "Cruzados" }, { id: "liquidaciones", label: "💰 Liquidaciones" }]} active={tab} onChange={setTab} dark={dark} />

      {tab === "masajes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Por Tipo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byType} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis type="number" tick={tickStyle} /><YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: mutedText }} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]} name="Cantidad" /></BarChart>
              </ResponsiveContainer>
            </div>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Por Profesional</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byStaff}><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: mutedText }} angle={-20} textAnchor="end" height={60} /><YAxis tick={tickStyle} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="count" fill={COLORS.accent} radius={[6, 6, 0, 0]} name="Servicios" /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Días más concurridos */}
          <div style={chartStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Días más concurridos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={busyDays}><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: mutedText }} /><YAxis tick={tickStyle} allowDecimals={false} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="count" name="Masajes" radius={[6, 6, 0, 0]}>{busyDays.map((entry, i) => <Cell key={i} fill={entry.count === Math.max(...busyDays.map(d => d.count)) ? COLORS.primary : COLORS.accent + "99"} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
          {/* Horas pico */}
          <div style={chartStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Horas pico</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHours}><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis dataKey="hour" tick={{ fontSize: 11, fill: mutedText }} /><YAxis tick={tickStyle} allowDecimals={false} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="count" fill={COLORS.info} radius={[6, 6, 0, 0]} name="Masajes" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "cobros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Ingresos por Método</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={incomeByMethod} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: "10px" }}>{incomeByMethod.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={v => formatCurrency(v)} contentStyle={ttStyle} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Evolución</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolutionData}><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: mutedText }} /><YAxis tick={tickStyle} /><Tooltip formatter={(v, name) => name === "ingresos" ? formatCurrency(v) : v} contentStyle={ttStyle} /><Line type="monotone" dataKey="ingresos" stroke={COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} name="Ingresos" /><Legend wrapperStyle={{ fontSize: "11px" }} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={chartStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Detalle por Método</h3>
            <Table columns={[{ header: "Método", render: r => r.name }, { header: "Cantidad", render: r => r.count }, { header: "Total", render: r => <strong>{formatCurrency(r.total)}</strong> }, { header: "Promedio", render: r => formatCurrency(r.count > 0 ? Math.round(r.total / r.count) : 0) }]} data={incomeByMethod} dark={dark} />
          </div>
        </div>
      )}

      {tab === "cruzados" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Tipo Más Rentable</h3>
              <Table columns={[{ header: "Tipo", render: r => r.name }, { header: "Servicios", render: r => r.count }, { header: "Ingresos", render: r => <strong>{formatCurrency(r.revenue)}</strong> }, { header: "Promedio", render: r => formatCurrency(r.count > 0 ? Math.round(r.revenue / r.count) : 0) }]} data={byType} dark={dark} />
            </div>
            <div style={chartStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Por Profesional</h3>
              <Table columns={[{ header: "Profesional", render: r => r.name }, { header: "Servicios", render: r => r.count }, { header: "Ingresos", render: r => <strong>{formatCurrency(r.revenue)}</strong> }]} data={byStaff} dark={dark} />
            </div>
          </div>
          <div style={chartStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Top 10 Clientes</h3>
            <Table columns={[{ header: "#", render: (r, i) => i + 1 }, { header: "Cliente", render: r => <strong>{r.name}</strong> }, { header: "Visitas", render: r => r.visits }, { header: "Total", render: r => <strong style={{ color: COLORS.success }}>{formatCurrency(r.spent)}</strong> }]} data={topClients} dark={dark} />
          </div>
          <div style={chartStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Masajes vs Ingresos</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={evolutionData}><CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: mutedText }} /><YAxis yAxisId="left" tick={tickStyle} /><YAxis yAxisId="right" orientation="right" tick={tickStyle} /><Tooltip contentStyle={ttStyle} /><Bar yAxisId="left" dataKey="masajes" fill={COLORS.primary} radius={[6, 6, 0, 0]} name="Masajes" /><Bar yAxisId="right" dataKey="ingresos" fill={COLORS.success} radius={[6, 6, 0, 0]} name="Ingresos" /><Legend wrapperStyle={{ fontSize: "11px" }} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "liquidaciones" && <LiquidacionesTab validPay={validPay} allPayments={payments} setPayments={setPayments} services={services} allRealized={services.filter(s => s.state === "realizado")} realized={realized} clients={clients} user={user} dark={dark} chartStyle={chartStyle} mainText={mainText} mutedText={mutedText} borderC={borderC} cardBg={cardBg} />}
    </div>
  );
};

// ─── LIQUIDACIONES TAB ───────────────────────────────────────────────────────

const LiquidacionesTab = ({ validPay, allPayments, setPayments, services, allRealized, realized, clients, user, dark, chartStyle, mainText, mutedText, borderC, cardBg }) => {
  const [pct, setPct] = useState(50);
  const [selectedStaff, setSelectedStaff] = useState(null); // masajista seleccionada para el modal
  const [showPayForm, setShowPayForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const liquidaciones = useMemo(() => {
    return STAFF.map(staff => {
      // Usamos allRealized para mostrar TODOS los servicios de la masajista sin filtro de período
      // pero para el resumen del período usamos realized (filtrado)
      const svcIdsPeriod = realized.filter(s => s.staffId === staff.id).map(s => s.id);
      const totalServicio = _.sumBy(realized.filter(s => s.staffId === staff.id), "finalPrice");

      const pagosStaff = validPay.filter(p => svcIdsPeriod.includes(p.serviceId));
      const cobradoPorMasajista = _.sumBy(pagosStaff.filter(p => p.destino === "masajista"), "amount");
      const cobradoPorCentro = _.sumBy(pagosStaff.filter(p => !p.destino || p.destino === "centro"), "amount");
      const totalCobrado = cobradoPorMasajista + cobradoPorCentro;
      const corresponde = Math.round(totalServicio * pct / 100);
      const saldo = corresponde - cobradoPorMasajista;

      return {
        id: staff.id, name: staff.name,
        servicios: svcIdsPeriod.length,
        totalServicio, cobradoPorMasajista, cobradoPorCentro, totalCobrado, corresponde, saldo,
      };
    }).filter(r => r.servicios > 0);
  }, [validPay, realized, pct]);

  const totales = useMemo(() => ({
    totalServicio: _.sumBy(liquidaciones, "totalServicio"),
    cobradoPorMasajista: _.sumBy(liquidaciones, "cobradoPorMasajista"),
    cobradoPorCentro: _.sumBy(liquidaciones, "cobradoPorCentro"),
    totalCobrado: _.sumBy(liquidaciones, "totalCobrado"),
    corresponde: _.sumBy(liquidaciones, "corresponde"),
  }), [liquidaciones]);

  // Detalle del modal — respeta el período seleccionado (usa realized y validPay, ya filtrados)
  const getStaffDetail = useCallback((staffId) => {
    const svcs = realized.filter(s => s.staffId === staffId).sort((a, b) => b.date.localeCompare(a.date));
    const svcIds = svcs.map(s => s.id);
    const pagos = validPay.filter(p => svcIds.includes(p.serviceId));

    return svcs.map(svc => {
      const client = clients.find(c => c.id === svc.clientId);
      const mt = MASSAGE_TYPES.find(t => t.id === svc.massageTypeId);
      const svcPagos = pagos.filter(p => p.serviceId === svc.id);
      const totalPagado = _.sumBy(svcPagos, "amount");
      const cobradoMasajista = _.sumBy(svcPagos.filter(p => p.destino === "masajista"), "amount");
      const cobradoCentro = _.sumBy(svcPagos.filter(p => !p.destino || p.destino === "centro"), "amount");
      const pendiente = Math.max(0, svc.finalPrice - totalPagado);
      return { ...svc, clientName: client?.name || "—", typeName: mt?.name || "—", totalPagado, cobradoMasajista, cobradoCentro, pendiente, pagos: svcPagos };
    });
  }, [realized, validPay, clients]);

  const handleSavePago = async (payment) => {
    const row = {
      id: payment.id, service_id: payment.serviceId, date: payment.date, time: payment.time,
      amount: payment.amount, pending: payment.pending, state: payment.state, method: payment.method,
      destino: payment.destino, reference: payment.reference, observations: payment.observations,
      registered_by: payment.registeredBy, created_by: user?.username || "admin", created_at: new Date().toISOString(),
    };
    const exists = allPayments.find(p => p.id === payment.id);
    if (exists) {
      await supabase.from('payments').update(row).eq('id', payment.id);
    } else {
      await supabase.from('payments').insert(row);
    }
    const { data: updated } = await supabase.from('payments').select('*');
    setPayments((updated || []).map(mapPayment));
    setShowPayForm(false);
    setSelectedService(null);
  };

  const rowStyle = (i, clickable) => ({
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr 1.2fr",
    gap: "8px", padding: "10px 14px",
    background: i % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#faf9f7") : "transparent",
    borderRadius: "6px", fontSize: "13px", alignItems: "center",
    cursor: clickable ? "pointer" : "default",
    transition: "background 0.15s",
  });

  const headerStyle = {
    display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1fr 1.2fr",
    gap: "8px", padding: "8px 14px", fontSize: "11px", fontWeight: 600,
    color: mutedText, textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: `1px solid ${borderC}`, marginBottom: "6px",
  };

  // Detalle del modal: servicios de la masajista seleccionada
  const staffDetail = useMemo(() => selectedStaff ? getStaffDetail(selectedStaff.id) : [], [selectedStaff, getStaffDetail]);
  const staffLiq = liquidaciones.find(l => l.id === selectedStaff?.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Config porcentaje */}
      <div style={{ ...chartStyle, display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "12px", color: mutedText, marginBottom: "4px", fontWeight: 500 }}>% que le corresponde a la masajista sobre el total del servicio</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="range" min="10" max="90" step="5" value={pct} onChange={e => setPct(Number(e.target.value))}
              style={{ width: "180px", accentColor: COLORS.primary, cursor: "pointer" }} />
            <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "var(--font-display)", color: COLORS.primary, minWidth: "48px" }}>{pct}%</span>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: mutedText, maxWidth: "360px", lineHeight: 1.6, padding: "10px 14px", background: dark ? "rgba(255,255,255,0.03)" : "#f3f0ec", borderRadius: "8px" }}>
          <strong style={{ color: mainText }}>Hacé click en una fila</strong> para ver el detalle completo de servicios y cobros de esa masajista, y registrar cobros faltantes.
        </div>
      </div>

      {/* KPIs globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
        {[
          { label: "Total Facturado", value: formatCurrency(totales.totalServicio), color: mainText },
          { label: "Cobró la Masajista", value: formatCurrency(totales.cobradoPorMasajista), color: COLORS.success },
          { label: "Cobró el Centro", value: formatCurrency(totales.cobradoPorCentro), color: COLORS.primary },
          { label: "Total Cobrado", value: formatCurrency(totales.totalCobrado), color: COLORS.info },
          { label: `Corresponde (${pct}%)`, value: formatCurrency(totales.corresponde), color: COLORS.accent },
        ].map(k => (
          <div key={k.label} style={{ background: cardBg, borderRadius: "12px", padding: "14px 16px", border: `1px solid ${borderC}` }}>
            <div style={{ fontSize: "11px", color: mutedText, marginBottom: "4px" }}>{k.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: k.color, fontFamily: "var(--font-display)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla por masajista — clickeable */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "4px" }}>Liquidación por Masajista</h3>
        <p style={{ fontSize: "12px", color: mutedText, marginBottom: "16px" }}>Hacé click en una fila para ver el detalle completo 👆</p>
        <div style={headerStyle}>
          <span>Masajista</span>
          <span style={{ textAlign: "right" }}>Facturado</span>
          <span style={{ textAlign: "right" }}>Cobró ella</span>
          <span style={{ textAlign: "right" }}>Cobró centro</span>
          <span style={{ textAlign: "right" }}>Le corresponde</span>
          <span style={{ textAlign: "right" }}>Saldo</span>
          <span style={{ textAlign: "center" }}>Estado</span>
        </div>
        {liquidaciones.map((r, i) => {
          const debeAlCentro = r.saldo < 0;
          const saldoAbs = Math.abs(r.saldo);
          const staff = STAFF.find(s => s.id === r.id);
          return (
            <div key={r.id}
              style={rowStyle(i, true)}
              onClick={() => setSelectedStaff(staff)}
              onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(124,106,86,0.12)" : "rgba(124,106,86,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? (dark ? "rgba(255,255,255,0.02)" : "#faf9f7") : "transparent"}
            >
              <span style={{ fontWeight: 600, color: COLORS.primary, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: mutedText, fontWeight: 400 }}>ver detalle →</span>
                👐 {r.name}
              </span>
              <span style={{ textAlign: "right", color: mutedText }}>{formatCurrency(r.totalServicio)}</span>
              <span style={{ textAlign: "right", color: COLORS.success, fontWeight: 600 }}>{formatCurrency(r.cobradoPorMasajista)}</span>
              <span style={{ textAlign: "right", color: COLORS.primary, fontWeight: 600 }}>{formatCurrency(r.cobradoPorCentro)}</span>
              <span style={{ textAlign: "right", color: COLORS.accent, fontWeight: 600 }}>{formatCurrency(r.corresponde)}</span>
              <span style={{ textAlign: "right", fontWeight: 700, color: r.saldo === 0 ? COLORS.success : debeAlCentro ? COLORS.danger : COLORS.info }}>
                {r.saldo === 0 ? "—" : (debeAlCentro ? "-" : "+")}{formatCurrency(saldoAbs)}
              </span>
              <div style={{ textAlign: "center" }}>
                {r.saldo === 0 ? <Badge color={COLORS.success}>✓ Saldada</Badge>
                  : debeAlCentro ? <Badge color={COLORS.danger}>Debe al centro</Badge>
                  : <Badge color={COLORS.info}>Centro le debe</Badge>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico comparativo */}
      <div style={chartStyle}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "16px" }}>Comparativo por Masajista</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={liquidaciones} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#3a3a42" : "#e8e4df"} />
            <XAxis type="number" tick={{ fontSize: 10, fill: mutedText }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: mutedText }} />
            <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: dark ? COLORS.cardDark : "#fff", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}`, borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="cobradoPorMasajista" name="Cobró la masajista" fill={COLORS.success} radius={[0, 4, 4, 0]} stackId="a" />
            <Bar dataKey="cobradoPorCentro" name="Cobró el centro" fill={COLORS.primary} radius={[0, 4, 4, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── MODAL DETALLE MASAJISTA ── */}
      <Modal open={!!selectedStaff} onClose={() => { setSelectedStaff(null); setShowPayForm(false); setSelectedService(null); }} title={`Detalle — ${selectedStaff?.name}`} wide dark={dark}>
        {selectedStaff && (() => {
          const liq = staffLiq;
          const saldoAbs = liq ? Math.abs(liq.saldo) : 0;
          const debeAlCentro = liq && liq.saldo < 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Resumen de la masajista */}
              {liq && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                  {[
                    { label: "Facturado", value: formatCurrency(liq.totalServicio), color: mainText },
                    { label: "Cobró ella", value: formatCurrency(liq.cobradoPorMasajista), color: COLORS.success },
                    { label: "Cobró centro", value: formatCurrency(liq.cobradoPorCentro), color: COLORS.primary },
                    { label: `Le corresponde (${pct}%)`, value: formatCurrency(liq.corresponde), color: COLORS.accent },
                    { label: liq.saldo === 0 ? "Saldada ✓" : debeAlCentro ? "Debe al centro" : "Centro le debe", value: liq.saldo === 0 ? "—" : (debeAlCentro ? "-" : "+") + formatCurrency(saldoAbs), color: liq.saldo === 0 ? COLORS.success : debeAlCentro ? COLORS.danger : COLORS.info },
                  ].map(k => (
                    <div key={k.label} style={{ background: dark ? "rgba(255,255,255,0.03)" : "#faf9f7", borderRadius: "10px", padding: "12px 14px", border: `1px solid ${borderC}` }}>
                      <div style={{ fontSize: "11px", color: mutedText, marginBottom: "3px" }}>{k.label}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: k.color, fontFamily: "var(--font-display)" }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabla de servicios con sus cobros */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: mainText, marginBottom: "12px" }}>
                  Servicios en el período ({staffDetail.length})
                </h4>
                {staffDetail.length === 0 ? (
                  <p style={{ fontSize: "13px", color: mutedText }}>Sin servicios registrados.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {staffDetail.map((svc, i) => (
                      <div key={svc.id} style={{
                        border: `1px solid ${borderC}`, borderRadius: "10px", overflow: "hidden",
                        background: dark ? "rgba(255,255,255,0.02)" : "#fff",
                      }}>
                        {/* Cabecera del servicio */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: "10px", padding: "10px 14px", alignItems: "center", borderBottom: svc.pagos.length > 0 ? `1px solid ${borderC}` : "none" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px", color: mainText }}>{svc.clientName}</div>
                            <div style={{ fontSize: "11px", color: mutedText }}>{formatDate(svc.date)} · {svc.typeName}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "11px", color: mutedText }}>Total</div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: mainText }}>{formatCurrency(svc.finalPrice)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "11px", color: mutedText }}>Cobró ella</div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.success }}>{formatCurrency(svc.cobradoMasajista)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "11px", color: mutedText }}>Cobró centro</div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.primary }}>{formatCurrency(svc.cobradoCentro)}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {svc.pendiente > 0 ? (
                              <Badge color={COLORS.danger}>Debe ${svc.pendiente.toLocaleString("es-AR")}</Badge>
                            ) : (
                              <Badge color={COLORS.success}>Cobrado</Badge>
                            )}
                            <button
                              onClick={() => { setSelectedService(svc); setShowPayForm(true); }}
                              title="Registrar cobro"
                              style={{ background: COLORS.success + "18", border: `1px solid ${COLORS.success}40`, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: COLORS.success, fontFamily: "var(--font-body)" }}
                            >+ Cobro</button>
                          </div>
                        </div>

                        {/* Cobros del servicio */}
                        {svc.pagos.length > 0 && (
                          <div style={{ padding: "6px 14px 8px" }}>
                            {svc.pagos.map(p => {
                              const m = PAYMENT_METHODS.find(pm => pm.id === p.method);
                              return (
                                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${borderC}30`, fontSize: "12px", color: mutedText }}>
                                  <span>{formatDate(p.date)} · {m ? `${m.icon} ${m.name}` : p.method}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontWeight: 600, color: mainText }}>{formatCurrency(p.amount)}</span>
                                    <span style={{ color: p.destino === "masajista" ? COLORS.success : COLORS.primary, fontWeight: 600 }}>
                                      {p.destino === "masajista" ? "👐 Ella" : "🏢 Centro"}
                                    </span>
                                    <StateBadge stateId={p.state} states={PAYMENT_STATES} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {svc.pagos.length === 0 && (
                          <div style={{ padding: "6px 14px 8px", fontSize: "12px", color: mutedText, fontStyle: "italic" }}>Sin cobros registrados para este servicio</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini formulario de cobro embebido */}
              {showPayForm && selectedService && (
                <div style={{ border: `2px solid ${COLORS.success}40`, borderRadius: "12px", padding: "16px", background: dark ? "rgba(90,138,94,0.05)" : "rgba(90,138,94,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: mainText }}>
                      Registrar cobro — {selectedService.clientName} ({formatDate(selectedService.date)})
                    </h4>
                    <button onClick={() => { setShowPayForm(false); setSelectedService(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: mutedText, padding: "4px" }}><Icons.Close /></button>
                  </div>
                  <PaymentForm
                    serviceId={selectedService.id}
                    maxAmount={selectedService.pendiente > 0 ? selectedService.pendiente : undefined}
                    registeredBy={user?.name || "admin"}
                    onSave={handleSavePago}
                    onCancel={() => { setShowPayForm(false); setSelectedService(null); }}
                    dark={dark}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

// ─── APPOINTMENTS PAGE ──────────────────────────────────────────────────────


const STAFF_COLORS = ["#7c6a56", "#5a8a5e", "#5a7a9a", "#b85450", "#8b7ab0", "#c49a3c", "#6aada0"];
const APPT_STATES = [
  { id: "reservado", name: "Reservado", color: "#5a7a9a" },
  { id: "confirmado", name: "Confirmado", color: "#5a8a5e" },
  { id: "realizado", name: "Realizado", color: "#22c55e" },
  { id: "cancelado", name: "Cancelado", color: "#ef4444" },
  { id: "no_asistio", name: "No Asistió", color: "#94a3b8" },
];
const getStaffColor = (staffId) => {
  const idx = STAFF.findIndex(s => s.id === staffId);
  return STAFF_COLORS[idx >= 0 ? idx % STAFF_COLORS.length : 0];
};

const HOUR_H = 42;
const CAL_START = 8;

function timeToMin(t) {
  const [h, m] = (t || "08:00").split(":").map(Number);
  return h * 60 + m;
}

function overlaps(startA, durationA, startB, durationB) {
  const a1 = timeToMin(startA);
  const a2 = a1 + Number(durationA || 60);
  const b1 = timeToMin(startB);
  const b2 = b1 + Number(durationB || 60);

  return a1 < b2 && a2 > b1;
}

function calcApptTop(a) {
  return ((timeToMin(a.time) - CAL_START * 60) / 60) * HOUR_H;
}

function calcApptHeight(a) {
  return Math.max(((a.duration || 60) / 60) * HOUR_H - 3, 18);
}

// Detecta superposiciones y asigna columna a cada turno
function calcColumns(appts) {
  if (appts.length === 0) return [];

  const items = [...appts]
    .map(a => ({
      appt: a,
      start: timeToMin(a.time),
      end: timeToMin(a.time) + (a.duration || 60),
      col: 0,
      totalCols: 1,
      group: -1,
    }))
    .sort((a, b) => a.start - b.start);

  let currentGroup = [];
  let currentGroupEnd = -1;
  let groupIndex = 0;

  for (const item of items) {
    if (currentGroup.length === 0 || item.start < currentGroupEnd) {
      currentGroup.push(item);
      currentGroupEnd = Math.max(currentGroupEnd, item.end);
    } else {
      assignGroup(currentGroup, groupIndex++);
      currentGroup = [item];
      currentGroupEnd = item.end;
    }
  }

  if (currentGroup.length) {
    assignGroup(currentGroup, groupIndex++);
  }

  return items.map(({ appt, col, totalCols }) => ({ appt, col, totalCols }));

  function assignGroup(group, gIndex) {
    const colEnds = [];

    for (const item of group) {
      let placed = false;

      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= item.start) {
          item.col = c;
          colEnds[c] = item.end;
          placed = true;
          break;
        }
      }

      if (!placed) {
        item.col = colEnds.length;
        colEnds.push(item.end);
      }

      item.group = gIndex;
    }

    const totalCols = colEnds.length;
    for (const item of group) {
      item.totalCols = totalCols;
    }
  }
}

  


const WeekView = ({ weekDays, appointments, clients, dark, onClickAppt, todayStr }) => {
  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const cardBg = dark ? COLORS.cardDark : COLORS.card;
  const mutedText = dark ? COLORS.textMutedDark : COLORS.textMuted;
  const mainText = dark ? COLORS.textDark : COLORS.text;

  const toDateStr = (d) => localDateStr(d);
  const getAppts = (ds) => appointments.filter(a => a.date === ds).sort((a, b) => a.time.localeCompare(b.time));

  // Calcular hasta qué hora mostrar (mínimo 19, máximo 23)
  const lastHour = (() => {
    const all = weekDays.flatMap(d => getAppts(toDateStr(d)));
    if (all.length === 0) return 19;
    const maxEnd = Math.max(...all.map(a => timeToMin(a.time) + (a.duration || 60)));
    return Math.min(Math.max(Math.ceil(maxEnd / 60) + 1, 19), 23);
  })();

  const hours = Array.from({ length: lastHour - CAL_START }, (_, i) => i + CAL_START);
  const totalH = hours.length * HOUR_H;

  return (
    <div style={{ border: `1px solid ${borderC}`, borderRadius: "12px", overflow: "hidden" }}>
      {/* Encabezado días */}
      <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", background: dark ? COLORS.cardDark : "#faf9f7", borderBottom: `1px solid ${borderC}` }}>
        <div style={{ borderRight: `1px solid ${borderC}` }} />
        {weekDays.map((d, i) => {
          const ds = toDateStr(d);
          const isNow = ds === todayStr;
          const dayName = d.toLocaleDateString("es-AR", { weekday: "short" });
          return (
            <div key={i} style={{ padding: "10px 4px", textAlign: "center", borderRight: i < 6 ? `1px solid ${borderC}` : "none" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: mutedText, textTransform: "capitalize" }}>{dayName}</div>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", margin: "2px auto 0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: isNow ? 700 : 400,
                background: isNow ? COLORS.primary : "transparent",
                color: isNow ? "#fff" : mainText,
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Cuerpo scrollable */}
      <div style={{ display: "flex", overflowY: "auto", maxHeight: "560px" }}>
        {/* Columna horas */}
        <div style={{ width: "48px", flexShrink: 0, borderRight: `1px solid ${borderC}`, position: "relative", height: `${totalH}px` }}>
          {hours.map(h => (
            <div key={h} style={{
              position: "absolute", top: `${(h - CAL_START) * HOUR_H}px`,
              width: "100%", height: `${HOUR_H}px`,
              borderBottom: `1px solid ${borderC}40`,
              display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
              paddingRight: "6px", paddingTop: "2px",
            }}>
              <span style={{ fontSize: "10px", color: mutedText }}>{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>

        {/* Columnas días */}
        {weekDays.map((d, di) => {
          const ds = toDateStr(d);
          const dayAppts = getAppts(ds);
          const positioned = calcColumns(dayAppts);
          return (
            <div key={di} style={{
              flex: 1, position: "relative", height: `${totalH}px`,
              borderRight: di < 6 ? `1px solid ${borderC}` : "none",
              background: ds === todayStr ? (dark ? "rgba(124,106,86,0.06)" : "rgba(124,106,86,0.03)") : cardBg,
            }}>
              {/* Líneas de hora */}
              {hours.map(h => (
                <div key={h} style={{
                  position: "absolute", top: `${(h - CAL_START) * HOUR_H}px`,
                  width: "100%", height: `${HOUR_H}px`,
                  borderBottom: `1px solid ${borderC}40`,
                }} />
              ))}

              {/* Turnos */}
              {positioned.map(({ appt: a, col, totalCols }) => {
                const sc = getStaffColor(a.staffId);
                const clientName = clients.find(c => c.id === a.clientId)?.name || "—";
                const mtName = MASSAGE_TYPES.find(t => t.id === a.massageTypeId)?.name || "";
                const top = calcApptTop(a);
                const height = calcApptHeight(a);
                const wPct = 100 / totalCols;
                return (
                  <div
  key={a.id}
  data-appt="true"
  onClick={() => onClickAppt(a)}
  style={{
    position: "absolute",
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${col * wPct}% + 2px)`,
    width: `calc(${wPct}% - 4px)`,
    background: sc,
    color: "#fff",
    borderRadius: "4px",
    padding: "3px 5px",
    cursor: "pointer",
    overflow: "hidden",
    zIndex: 10 + col,
    boxSizing: "border-box",
    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    fontSize: "10px",
    lineHeight: 1.15,
  }}
>
  <div style={{
    fontSize: "9px",
    fontWeight: 700,
    opacity: 0.95,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }}>
    {a.time} – {(() => {
      const end = timeToMin(a.time) + (a.duration || 60);
      return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    })()}
  </div>

  <div style={{
    fontSize: "10px",
    fontWeight: 600,
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }}>
    {clientName}
  </div>

  {height > 32 && (
    <div style={{
      fontSize: "9px",
      opacity: 0.9,
      marginTop: "1px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}>
      {mtName}
    </div>
  )}

  {height > 48 && a.observations && (
    <div style={{
      fontSize: "8px",
      opacity: 0.85,
      marginTop: "2px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}>
      {a.observations}
    </div>
  )}
</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MonthView = ({ year, month, appointments, clients, dark, onClickAppt, todayStr }) => {
  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const cardBg = dark ? COLORS.cardDark : COLORS.card;
  const mutedText = dark ? COLORS.textMutedDark : COLORS.textMuted;
  const mainText = dark ? COLORS.textDark : COLORS.text;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const getAppts = (ds) => appointments.filter(a => a.date === ds).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div style={{ border: `1px solid ${borderC}`, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: dark ? COLORS.cardDark : "#faf9f7" }}>
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
          <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: mutedText, borderBottom: `1px solid ${borderC}` }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {week.map((day, di) => {
            const ds = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
            const isNow = ds === todayStr;
            const appts = ds ? getAppts(ds) : [];
            return (
              <div key={di} style={{
                minHeight: "90px", padding: "5px 4px",
                background: !day ? (dark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)") : cardBg,
                borderBottom: wi < weeks.length - 1 ? `1px solid ${borderC}` : "none",
                borderRight: di < 6 ? `1px solid ${borderC}` : "none",
              }}>
                {day && (
                  <>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%", marginBottom: "3px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: isNow ? 700 : 400,
                      background: isNow ? COLORS.primary : "transparent",
                      color: isNow ? "#fff" : mainText,
                    }}>{day}</div>
                    {appts.slice(0, 3).map(a => {
                      const sc = getStaffColor(a.staffId);
                      const clientName = clients.find(c => c.id === a.clientId)?.name || "—";
                      return (
                        <div key={a.id} onClick={() => onClickAppt(a)} style={{
                          background: sc + "22", borderLeft: `3px solid ${sc}`,
                          borderRadius: "3px", padding: "2px 4px", marginBottom: "2px",
                          fontSize: "10px", color: mainText, cursor: "pointer",
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }}>
                          <span style={{ color: sc, fontWeight: 700 }}>{a.time}</span> {clientName}
                        </div>
                      );
                    })}
                    {appts.length > 3 && (
                      <div style={{ fontSize: "10px", color: mutedText, paddingLeft: "2px" }}>+{appts.length - 3} más</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const AppointmentsPage = ({ appointments, setAppointments, clients, user, staffFilter, dark }) => {
  const visibleAppointments = staffFilter ? appointments.filter(a => a.staffId === staffFilter) : appointments;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [calView, setCalView] = useState("week");
  const [notifAppt, setNotifAppt] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [listFilter, setListFilter] = useState({ staff: "", showPast: false });

  const todayStr = today();

  const emptyForm = { date: today(), time: "10:00", clientId: "", massageTypeId: "", staffId: staffFilter || "", duration: 60, state: "reservado", room: "", observations: "" };
  const [form, setForm] = useState(emptyForm);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Semana actual (lunes a domingo)
  const weekStart = useMemo(() => {
    const dt = new Date(currentDate);
    const day = dt.getDay();
    dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, [currentDate]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const weekLabel = useMemo(() => {
    const from = weekDays[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    const to = weekDays[6].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
    return `${from} – ${to}`;
  }, [weekDays]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (calView === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (calView === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleSave = async () => {
    if (!form.date || !form.clientId || !form.massageTypeId || !form.staffId) {
      return alert("Completar campos obligatorios");
    }
    const conflict = appointments.some(a => {
      if (editing && a.id === editing.id) return false;
      return a.date === form.date && a.staffId === form.staffId && overlaps(form.time, form.duration, a.time, a.duration);
    });
    if (conflict) return alert("Esa profesional ya tiene un turno en ese horario");

    if (form.room) {
      const roomConflict = appointments.some(a => {
        if (editing && a.id === editing.id) return false;
        return a.date === form.date && a.room === form.room && overlaps(form.time, form.duration, a.time, a.duration);
      });
      if (roomConflict) return alert(`La ${form.room} ya está ocupada en ese horario`);
    }

    const row = {
      date: form.date, time: form.time, client_id: form.clientId,
      massage_type_id: form.massageTypeId, staff_id: form.staffId,
      duration: form.duration, state: form.state, room: form.room,
      observations: form.observations,
    };

    if (editing) {
      await supabase.from('appointments').update(row).eq('id', editing.id);
      setNotifAppt({ ...form, id: editing.id, _action: "modificado" });
    } else {
      const newId = generateId();
      await supabase.from('appointments').insert({ ...row, id: newId });
      setNotifAppt({ ...form, id: newId, _action: "agendado" });
    }
    const { data: updated } = await supabase.from('appointments').select('*');
    setAppointments((updated || []).map(mapAppointment));
    setShowForm(false); setEditing(null); setForm(emptyForm);
  };

  const handleEdit = (appt) => { setEditing(appt); setForm(appt); setSelectedAppt(null); setShowForm(true); };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const appt = appointments.find(a => a.id === deleteTarget);
    await supabase.from('appointments').delete().eq('id', deleteTarget);
    const { data: updated } = await supabase.from('appointments').select('*');
    setAppointments((updated || []).map(mapAppointment));
    setSelectedAppt(null); setDeleteTarget(null);
    if (appt) setNotifAppt({ ...appt, _action: "eliminado" });
  };

  const handleChangeState = async (apptId, newState) => {
    await supabase.from('appointments').update({ state: newState }).eq('id', apptId);
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, state: newState } : a));
    setSelectedAppt(prev => prev?.id === apptId ? { ...prev, state: newState } : prev);
  };

  // Calcular precio estimado de un turno
  const apptPrice = (appt) => {
    const mt = MASSAGE_TYPES.find(t => t.id === appt.massageTypeId);
    return mt?.basePrice || 0;
  };

  // Turnos visibles en la lista (con filtros)
  const listAppointments = useMemo(() => {
    return visibleAppointments.filter(a => {
      if (!listFilter.showPast && a.date < todayStr) return false;
      if (listFilter.staff && a.staffId !== listFilter.staff) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [visibleAppointments, listFilter, todayStr]);

  // Turnos del día para la masajista seleccionada en el formulario (para mostrar disponibilidad)
  const sameDayAppts = useMemo(() => {
    if (!form.date || !form.staffId) return [];
    return appointments.filter(a =>
      a.date === form.date && a.staffId === form.staffId && (!editing || a.id !== editing.id)
    ).sort((a, b) => a.time.localeCompare(b.time));
  }, [form.date, form.staffId, appointments, editing]);

  const borderC = dark ? COLORS.borderDark : COLORS.border;
  const mainText = dark ? COLORS.textDark : COLORS.text;
  const mutedText = dark ? COLORS.textMutedDark : COLORS.textMuted;

  const NavBtn = ({ onClick, children }) => (
    <button onClick={onClick} style={{
      background: "none", border: `1px solid ${borderC}`, borderRadius: "8px",
      cursor: "pointer", padding: "6px 10px", color: mainText,
      display: "flex", alignItems: "center", fontFamily: "var(--font-body)",
    }}>{children}</button>
  );

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: mainText }}>Agenda</h2>
          <p style={{ fontSize: "13px", color: mutedText }}>{visibleAppointments.filter(a => a.date >= todayStr).length} turnos próximos</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Tabs tabs={[{ id: "week", label: "Semana" }, { id: "month", label: "Mes" }, { id: "list", label: "Lista" }]} active={calView} onChange={setCalView} dark={dark} />
          <Button icon={<Icons.Plus />} onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} size="sm">Nuevo Turno</Button>
        </div>
      </div>

      {/* Leyenda masajistas */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {STAFF.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: mutedText }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: STAFF_COLORS[i % STAFF_COLORS.length], display: "inline-block", flexShrink: 0 }} />
            {s.name}
          </div>
        ))}
      </div>

      {/* Navegación semana/mes */}
      {calView !== "list" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <NavBtn onClick={prevPeriod}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </NavBtn>
          <span style={{ flex: 1, textAlign: "center", fontSize: "15px", fontWeight: 600, color: mainText, fontFamily: "var(--font-display)", textTransform: "capitalize" }}>
            {calView === "week" ? weekLabel : monthName}
          </span>
          <NavBtn onClick={() => setCurrentDate(new Date())}>
            <span style={{ fontSize: "12px" }}>Hoy</span>
          </NavBtn>
          <NavBtn onClick={nextPeriod}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </NavBtn>
        </div>
      )}

      {/* Vistas */}
      {calView === "week" && (
        <WeekView
          weekDays={weekDays}
          appointments={visibleAppointments}
          clients={clients}
          dark={dark}
          onClickAppt={setSelectedAppt}
          todayStr={todayStr}
        />
      )}

      {calView === "month" && (
        <MonthView
          year={year}
          month={month}
          appointments={visibleAppointments}
          clients={clients}
          dark={dark}
          onClickAppt={setSelectedAppt}
          todayStr={todayStr}
        />
      )}

      {calView === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Filtros lista */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <Input label="" value={listFilter.staff} onChange={v => setListFilter(f => ({ ...f, staff: v }))} dark={dark}
              options={STAFF.map(s => ({ value: s.id, label: s.name }))} placeholder="Todas las profesionales" style={{ minWidth: "200px" }} />
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: mutedText, cursor: "pointer" }}>
              <input type="checkbox" checked={listFilter.showPast} onChange={e => setListFilter(f => ({ ...f, showPast: e.target.checked }))} />
              Mostrar turnos pasados
            </label>
            <span style={{ fontSize: "12px", color: mutedText, marginLeft: "auto" }}>{listAppointments.length} turno{listAppointments.length !== 1 ? "s" : ""}</span>
          </div>
          <Table columns={[
            { header: "Fecha", nowrap: true, render: r => {
              const isPast = r.date < todayStr;
              return <span style={{ color: isPast ? mutedText : mainText }}>{formatDate(r.date)}</span>;
            }},
            { header: "Hora", render: r => r.time },
            { header: "Cliente", render: r => clients.find(c => c.id === r.clientId)?.name || "—" },
            { header: "Tipo", render: r => MASSAGE_TYPES.find(t => t.id === r.massageTypeId)?.name || "—" },
            { header: "Profesional", render: r => {
              const s = STAFF.find(x => x.id === r.staffId);
              if (!s) return "—";
              return <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: getStaffColor(r.staffId), display: "inline-block" }} />{s.name}</span>;
            }},
            { header: "Sala", render: r => r.room || "—" },
            { header: "Precio est.", nowrap: true, render: r => <span style={{ color: COLORS.success, fontWeight: 600 }}>{formatCurrency(apptPrice(r))}</span> },
            { header: "Estado", nowrap: true, render: r => <StateBadge stateId={r.state} states={APPT_STATES} /> },
          ]} data={listAppointments} dark={dark} onRowClick={setSelectedAppt}
            actions={row => (
              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                <button onClick={e => { e.stopPropagation(); handleEdit(row); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.primary, padding: "4px" }}><Icons.Edit /></button>
                <button onClick={e => { e.stopPropagation(); setDeleteTarget(row.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.danger, padding: "4px" }}><Icons.Trash /></button>
              </div>
            )}
          />
        </div>
      )}

      {/* Modal detalle turno */}
      <Modal open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Detalle del turno" dark={dark}>
        {selectedAppt && (() => {
          const staff = STAFF.find(s => s.id === selectedAppt.staffId);
          const client = clients.find(c => c.id === selectedAppt.clientId);
          const mt = MASSAGE_TYPES.find(t => t.id === selectedAppt.massageTypeId);
          const sc = getStaffColor(selectedAppt.staffId);
          const price = apptPrice(selectedAppt);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Cabecera */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: sc, display: "inline-block", flexShrink: 0 }} />
                <strong style={{ fontSize: "15px", color: mainText }}>{staff?.name}</strong>
                <StateBadge stateId={selectedAppt.state} states={APPT_STATES} />
              </div>
              {/* Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  ["Fecha", formatDate(selectedAppt.date)],
                  ["Hora", selectedAppt.time],
                  ["Cliente", client?.name || "—"],
                  ["Tipo", mt?.name || "—"],
                  ["Duración", `${selectedAppt.duration} min`],
                  ["Sala", selectedAppt.room || "—"],
                  ["Precio estimado", formatCurrency(price)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <span style={{ fontSize: "11px", color: COLORS.textMuted, display: "block" }}>{l}</span>
                    <strong style={{ color: l === "Precio estimado" ? COLORS.success : mainText }}>{v}</strong>
                  </div>
                ))}
              </div>
              {selectedAppt.observations && (
                <p style={{ fontSize: "13px", color: mutedText, padding: "8px 12px", background: dark ? "rgba(255,255,255,0.03)" : "#faf9f7", borderRadius: "8px" }}>{selectedAppt.observations}</p>
              )}
              {/* Cambio rápido de estado */}
              <div>
                <div style={{ fontSize: "11px", color: mutedText, marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cambiar estado</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {APPT_STATES.map(s => (
                    <button key={s.id} onClick={() => handleChangeState(selectedAppt.id, s.id)} style={{
                      padding: "5px 12px", borderRadius: "20px", border: `2px solid ${selectedAppt.state === s.id ? s.color : borderC}`,
                      background: selectedAppt.state === s.id ? s.color + "20" : "transparent",
                      color: selectedAppt.state === s.id ? s.color : mutedText,
                      cursor: "pointer", fontSize: "12px", fontWeight: selectedAppt.state === s.id ? 700 : 400,
                      fontFamily: "var(--font-body)", transition: "all 0.15s",
                    }}>{s.name}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button size="sm" variant="secondary" onClick={() => handleEdit(selectedAppt)}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => { setDeleteTarget(selectedAppt.id); setSelectedAppt(null); }}>Eliminar</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal nuevo/editar turno */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Editar Turno" : "Nuevo Turno"} dark={dark}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Input label="Fecha" type="date" value={form.date} onChange={v => setF("date", v)} required dark={dark} />
            <Input label="Hora" type="time" value={form.time} onChange={v => setF("time", v)} dark={dark} />
          </div>
          <Input label="Cliente" value={form.clientId} onChange={v => setF("clientId", v)} required dark={dark} options={clients.map(c => ({ value: c.id, label: c.name }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Input label="Tipo de Masaje" value={form.massageTypeId} onChange={v => setF("massageTypeId", v)} required dark={dark} options={MASSAGE_TYPES.map(t => ({ value: t.id, label: t.name }))} />
            <Input label="Profesional" value={form.staffId} onChange={v => setF("staffId", v)} required dark={dark} options={STAFF.map(s => ({ value: s.id, label: s.name }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <Input label="Duración (min)" type="number" value={form.duration} onChange={v => setF("duration", Number(v))} dark={dark} />
            <Input label="Sala" value={form.room} onChange={v => setF("room", v)} dark={dark} options={ROOMS.map(r => ({ value: r, label: r }))} />
            <Input label="Estado" value={form.state} onChange={v => setF("state", v)} dark={dark} options={APPT_STATES.map(s => ({ value: s.id, label: s.name }))} />
          </div>
          {/* Panel de disponibilidad */}
          {form.staffId && form.date && (
            <div style={{ background: dark ? "rgba(255,255,255,0.03)" : "#f8f6f3", borderRadius: "10px", padding: "12px 14px", border: `1px solid ${borderC}` }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: mutedText, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {STAFF.find(s => s.id === form.staffId)?.name} — {formatDate(form.date)}
              </div>
              {sameDayAppts.length === 0 ? (
                <p style={{ fontSize: "12px", color: COLORS.success, margin: 0 }}>✓ Sin turnos ese día — disponible todo el día</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {sameDayAppts.map(a => {
                    const endMin = timeToMin(a.time) + (a.duration || 60);
                    const endStr = `${String(Math.floor(endMin/60)).padStart(2,"0")}:${String(endMin%60).padStart(2,"0")}`;
                    const clash = form.time && overlaps(form.time, form.duration, a.time, a.duration);
                    const client = clients.find(c => c.id === a.clientId);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: clash ? COLORS.danger + "15" : "transparent", border: clash ? `1px solid ${COLORS.danger}40` : "1px solid transparent" }}>
                        <span style={{ fontWeight: 700, color: clash ? COLORS.danger : mutedText, minWidth: "90px" }}>{a.time} – {endStr}</span>
                        <span style={{ color: clash ? COLORS.danger : mainText }}>{client?.name || "—"} · {MASSAGE_TYPES.find(t => t.id === a.massageTypeId)?.name || "—"}</span>
                        {clash && <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: COLORS.danger }}>⚠ CONFLICTO</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <Input label="Observaciones" value={form.observations} onChange={v => setF("observations", v)} dark={dark} rows={2} placeholder="Notas..." />
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar Cambios" : "Crear Turno"}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm eliminar */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
        message="¿Eliminar este turno? Esta acción no se puede deshacer."
        dark={dark}
      />

      {/* Modal notificación WhatsApp */}
      {notifAppt && (() => {
        const action = notifAppt._action || "agendado";
        const staff = STAFF.find(s => s.id === notifAppt.staffId);
        const client = clients.find(c => c.id === notifAppt.clientId);
        const mt = MASSAGE_TYPES.find(t => t.id === notifAppt.massageTypeId);
        const emoji = action === "eliminado" ? "❌" : action === "modificado" ? "✏️" : "📅";
        const getPhone = (sid) => { try { return JSON.parse(localStorage.getItem("zen_staff_phones") || "{}")[sid] || ""; } catch { return ""; } };
        const phone = getPhone(notifAppt.staffId);
        const msg = encodeURIComponent(`Hola ${staff?.name?.split(" ")[0] || ""}! Tu turno fue ${action}:\n${emoji} ${action.charAt(0).toUpperCase()+action.slice(1)}\n📅 Fecha: ${formatDate(notifAppt.date)}\n🕐 Hora: ${notifAppt.time}\n👤 Cliente: ${client?.name || "—"}\n💆 Tipo: ${mt?.name || "—"}\n⏱ Duración: ${notifAppt.duration} min`);
        const waUrl = phone ? `https://wa.me/${phone.replace(/\D/g,"")}?text=${msg}` : `https://wa.me/?text=${msg}`;
        const titleMap = { agendado: "Turno creado ✓", modificado: "Turno editado ✓", eliminado: "Turno eliminado" };
        return (
          <Modal open={true} onClose={() => setNotifAppt(null)} title={titleMap[action] || "Turno"} dark={dark}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: dark ? "rgba(255,255,255,0.03)" : "#f8f6f3", borderRadius: "10px", padding: "14px", fontSize: "13px", color: dark ? COLORS.textDark : COLORS.text, lineHeight: 1.8 }}>
                <div>{emoji} <strong>{action.charAt(0).toUpperCase()+action.slice(1)}</strong></div>
                <div>📅 <strong>{formatDate(notifAppt.date)}</strong> a las <strong>{notifAppt.time}</strong></div>
                <div>👤 {client?.name || "—"}</div>
                <div>💆 {mt?.name || "—"} · {notifAppt.duration} min</div>
                <div>👐 {staff?.name || "—"}</div>
              </div>
              <p style={{ fontSize: "13px", color: dark ? COLORS.textMutedDark : COLORS.textMuted, margin: 0 }}>¿Notificar a la masajista por WhatsApp?</p>
              {!phone && <p style={{ fontSize: "12px", color: COLORS.warning, margin: 0 }}>⚠️ {staff?.name} no tiene teléfono cargado. Podés agregarlo en Configuración.</p>}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setNotifAppt(null)}>Omitir</Button>
                <button onClick={() => { window.open(waUrl, "_blank"); setNotifAppt(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "8px", border: "none", background: "#25D366", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-body)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.5l5.797-1.522A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.933 0-3.742-.524-5.291-1.437l-.379-.225-3.44.902.918-3.352-.247-.389A9.943 9.943 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Enviar WhatsApp
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ─── SETTINGS PAGE ──────────────────────────────────────────────────────────

const SettingsPage = ({ user, dark, data }) => {
  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 600, color: dark ? COLORS.textDark : COLORS.text }}>Configuración</h2>
      </div>
      <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "24px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: dark ? COLORS.textDark : COLORS.text }}>Usuario Actual</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          <div><span style={{ fontSize: "11px", color: COLORS.textMuted }}>Nombre</span><br /><strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{user.name}</strong></div>
          <div><span style={{ fontSize: "11px", color: COLORS.textMuted }}>Usuario</span><br /><strong style={{ color: dark ? COLORS.textDark : COLORS.text }}>{user.username}</strong></div>
          <div><span style={{ fontSize: "11px", color: COLORS.textMuted }}>Rol</span><br /><Badge color={COLORS.primary}>{ROLES.find(r => r.id === user.role)?.name}</Badge></div>
        </div>
      </div>
      <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "24px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: dark ? COLORS.textDark : COLORS.text }}>Permisos</h3>
        {[["Ver Dashboard", ["admin"]], ["Registrar Masajes", ["admin", "agenda"]], ["Eliminar Masajes", ["admin"]], ["Registrar Cobros", ["admin", "agenda", "masajista"]], ["Ver Reportes", ["admin"]], ["Gestionar Clientes", ["admin", "agenda"]]].map(([perm, roles]) => (
          <div key={perm} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: dark ? "rgba(255,255,255,0.02)" : "#faf9f7", borderRadius: "8px", marginBottom: "4px", fontSize: "13px" }}>
            <span style={{ color: dark ? COLORS.textDark : COLORS.text }}>{perm}</span>
            {roles.includes(user.role) ? <span style={{ color: COLORS.success }}><Icons.Check /></span> : <span style={{ color: COLORS.textMuted }}>—</span>}
          </div>
        ))}
      </div>
      <div style={{ background: dark ? COLORS.cardDark : COLORS.card, borderRadius: "14px", padding: "24px", border: `1px solid ${dark ? COLORS.borderDark : COLORS.border}` }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: dark ? COLORS.textDark : COLORS.text }}>Datos</h3>
        <p style={{ fontSize: "13px", color: COLORS.textMuted }}>Servicios: {data.services?.length || 0} · Pagos: {data.payments?.length || 0} · Clientes: {data.clients?.length || 0}</p>
      </div>
    </div>
  );
};

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [data, setData] = useState({ clients: [], services: [], payments: [], appointments: [], users: [] });
  const [loading, setLoading] = useState(true);

  // Cargar todos los datos desde Supabase al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clients, services, payments, appointments, users] = await Promise.all([
          supabase.from('clients').select('*'),
          supabase.from('services').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('appointments').select('*'),
          supabase.from('users').select('*'),
        ]);
        setData({
          clients: clients.data || [],
          services: (services.data || []).map(mapService),
          payments: (payments.data || []).map(mapPayment),
          appointments: (appointments.data || []).map(mapAppointment),
          users: users.data || [],
        });
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const updateField = useCallback((field) => async (updater) => {
    setData(prev => {
      const newVal = typeof updater === "function" ? updater(prev[field]) : updater;
      return { ...prev, [field]: newVal };
    });
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, fontFamily: "var(--font-body)" }}>
      <style>{globalCSS}</style>
      <div style={{ textAlign: "center", animation: "pulse 1.5s infinite" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🧘</div>
        <p style={{ color: COLORS.textMuted }}>Cargando Tuina...</p>
      </div>
    </div>
  );

  if (!currentUser) return (<><style>{globalCSS}</style><LoginScreen onLogin={setCurrentUser} users={data.users} /></>);

  const bg = dark ? COLORS.bgDark : COLORS.bg;
  const ml = sidebarCollapsed ? "64px" : "240px";
  const role = currentUser.role;
  const staffId = currentUser.staff_id;

  const renderPage = () => {
    const allowed = NAV_ITEMS.filter(i => i.roles.includes(role)).map(i => i.id);
    if (allowed.length === 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "16px", color: COLORS.textMuted }}>Tu usuario no tiene acceso a ninguna sección.</p>
          <p style={{ fontSize: "13px", color: COLORS.textMuted }}>Contactá al administrador. (Rol: {role})</p>
        </div>
      );
    }
    if (!allowed.includes(activePage)) {
      setTimeout(() => setActivePage(allowed[0]), 0);
      return null;
    }
    switch (activePage) {
      case "dashboard": return <DashboardPage services={data.services} payments={data.payments} clients={data.clients} dark={dark} />;
      case "services": return <ServicesPage services={data.services} setServices={updateField("services")} payments={data.payments} clients={data.clients} user={currentUser} dark={dark} />;
      case "payments": return <PaymentsPage services={data.services} payments={data.payments} setPayments={updateField("payments")} clients={data.clients} user={currentUser} staffFilter={role === "masajista" ? staffId : null} dark={dark} />;
      case "clients": return <ClientsPage clients={data.clients} setClients={updateField("clients")} services={data.services} payments={data.payments} user={currentUser} dark={dark} />;
      case "reports": return <ReportsPage services={data.services} payments={data.payments} setPayments={updateField("payments")} clients={data.clients} user={currentUser} dark={dark} />;
      case "appointments": return <AppointmentsPage appointments={data.appointments || []} setAppointments={updateField("appointments")} clients={data.clients} user={currentUser} staffFilter={role === "masajista" ? staffId : null} dark={dark} />;
      case "settings": return <SettingsPage user={currentUser} dark={dark} data={data} />;
      default: return null;
    }
  };

  const handleMobileNav = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ minHeight: "100vh", background: bg, color: dark ? COLORS.textDark : COLORS.text, fontFamily: "var(--font-body)", transition: "background 0.3s ease" }}>
        {/* Mobile header */}
        <div className="mobile-header">
          <button onClick={() => setMobileMenuOpen(true)} style={{ background: "none", border: "none", color: "#e8e4df", cursor: "pointer", padding: "4px" }}>
            <Icons.Menu />
          </button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 600 }}>Tuina</span>
        </div>
        {/* Mobile overlay */}
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}
        {/* Sidebar */}
        <Sidebar className={`sidebar${mobileMenuOpen ? " open" : ""}`} active={activePage} onNavigate={handleMobileNav} user={currentUser} onLogout={() => { setCurrentUser(null); setMobileMenuOpen(false); }} dark={dark} onToggleDark={() => setDark(!dark)} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="main-content" style={{ marginLeft: ml, padding: "28px 32px", transition: "margin-left 0.3s ease", minHeight: "100vh" }}>{renderPage()}</main>
      </div>
    </>
  );
}
