import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Icon } from "./Icon.jsx";
import { AuthPage } from "./AuthPage.jsx";
import {
  getSession, onAuthChange, signOut, loadAllData,
  upsertSeasonSetup, toggleChecklistItem, insertRecord,
  setActionDone, setRemindersEnabled,
} from "./dataLayer.js";

/* ─── Data ─────────────────────────────────────────────────────────── */

const cropOptions = ["Maize", "Beans", "Tomatoes", "Kale", "Potatoes", "Onions", "Coffee", "Dairy", "Other"];
const waterSources = ["Rainfed", "Borehole", "River", "Irrigation scheme", "Water harvesting", "Other"];
const challenges = ["Drought or long dry spell", "Heavy rain or flooding", "Pest or disease outbreak", "Price drop at harvest"];
const focusBase = ["Soil cover", "Early planting or timing adjustment", "Pest monitoring", "Water conservation"];

const focusPriority = {
  "Drought or long dry spell": ["Water conservation", "Soil cover", "Early planting or timing adjustment", "Pest monitoring"],
  "Heavy rain or flooding": ["Early planting or timing adjustment", "Soil cover", "Water conservation", "Pest monitoring"],
  "Pest or disease outbreak": ["Pest monitoring", "Soil cover", "Early planting or timing adjustment", "Water conservation"],
  "Price drop at harvest": ["Early planting or timing adjustment", "Pest monitoring", "Soil cover", "Water conservation"],
};

/* Risk drivers are computed from season setup data */
function computeRiskDrivers(setup) {
  if (!setup.crop && !setup.waterSource && !setup.challenge) return [];
  const drivers = [];
  const waterReliability = {
    Rainfed: { level: "high", status: "High" },
    "Water harvesting": { level: "medium", status: "Moderate" },
    Borehole: { level: "low", status: "Low" },
    River: { level: "medium", status: "Moderate" },
    "Irrigation scheme": { level: "low", status: "Low" },
    Other: { level: "medium", status: "Moderate" },
  };
  if (setup.waterSource) {
    const wr = waterReliability[setup.waterSource] || { level: "medium", status: "Moderate" };
    drivers.push({
      label: "Water source reliability",
      status: wr.status,
      level: wr.level,
      meaning: `Your water source (${setup.waterSource}) ${wr.level === "high" ? "is vulnerable to dry spells or outages." : wr.level === "medium" ? "has moderate reliability during extreme weather." : "is generally reliable even in dry periods."}`,
      action: wr.level === "high" ? "Confirm backup storage or harvesting for the next 2 weeks." : "Monitor water availability and maintain current infrastructure.",
    });
  }
  if (setup.crop) {
    const cropSensitivity = { Maize: "high", Tomatoes: "high", Beans: "medium", Kale: "medium", Potatoes: "medium", Onions: "low", Coffee: "medium", Dairy: "low", Other: "medium" };
    const cs = cropSensitivity[setup.crop] || "medium";
    drivers.push({
      label: "Crop sensitivity",
      status: cs === "high" ? "High" : cs === "medium" ? "Moderate" : "Low",
      level: cs,
      meaning: `${setup.crop} ${cs === "high" ? "reacts strongly to heat or delayed rains." : cs === "medium" ? "has moderate tolerance to weather stress." : "is relatively resilient to weather variations."}`,
      action: cs === "high" ? "Adjust planting window and monitor early stress signs." : "Maintain standard monitoring practices.",
    });
  }
  if (setup.size) {
    const size = Number(setup.size);
    const level = size < 1 ? "high" : size < 3 ? "medium" : "low";
    drivers.push({
      label: "Farm size buffer",
      status: level === "high" ? "Low" : level === "medium" ? "Moderate" : "Good",
      level,
      meaning: `${setup.size} ${setup.unit || "Acres"} ${level === "high" ? "gives less buffer when rainfall shifts." : level === "medium" ? "provides moderate buffer against weather shocks." : "provides good buffer against weather shocks."}`,
      action: level === "high" ? "Prioritize soil cover and moisture protection techniques." : "Diversify planting to spread risk.",
    });
  }
  if (setup.challenge) {
    drivers.push({
      label: "Last season shock",
      status: setup.challenge.includes("Drought") ? "Drought" : setup.challenge.includes("flood") ? "Flood" : setup.challenge.includes("Pest") ? "Pest" : "Price",
      level: "high",
      meaning: `Your last season challenge (${setup.challenge.toLowerCase()}) signals a recurring climate risk.`,
      action: "Track relevant indicators weekly and plan early interventions.",
    });
  }
  return drivers;
}

/* Week actions are computed from the focus list */
function computeWeekActions(focusList) {
  const actionMap = {
    "Soil cover": { title: "Apply soil cover on beds", why: "Reduces moisture loss during heat", icon: "leaf", priority: "High" },
    "Early planting or timing adjustment": { title: "Set planting window", why: "Avoids crop stress if rains delay", icon: "calendar", priority: "Medium" },
    "Pest monitoring": { title: "Start pest scouting twice a week", why: "Early detection reduces loss", icon: "bug", priority: "High" },
    "Water conservation": { title: "Set up water conservation measures", why: "Protects crops during dry periods", icon: "droplet", priority: "High" },
  };
  return focusList.map((f) => actionMap[f] || { title: f, why: "Recommended for your farm this season", icon: "check", priority: "Medium" });
}

const reminderChips = ["Morning", "Evening", "Weekly"];

const navItems = [
  { id: 0, label: "Home", icon: "home", group: "Start" },
  { id: 1, label: "Season Setup", icon: "leaf", group: "Plan" },
  { id: 2, label: "Climate Profile", icon: "droplet", group: "Plan" },
  { id: 3, label: "Season Plan", icon: "check", group: "Plan" },
  { id: 4, label: "Quick Record", icon: "note", group: "Track" },
  { id: 5, label: "Resilience Record", icon: "shield", group: "Track" },
];

const pageMeta = [
  { title: "Welcome to Plary", subtitle: "Climate-smart farming guidance, accessible to all" },
  { title: "Season Setup", subtitle: "Prepare your farm for this season" },
  { title: "Farm Climate Profile", subtitle: "Understand your risks and priorities" },
  { title: "Season Plan", subtitle: "Actions matched to your farm" },
  { title: "Quick Record", subtitle: "Log inputs and sales in seconds" },
  { title: "Resilience Record", subtitle: "Your season story and farm data" },
  { title: "USSD Quick Access", subtitle: "Use Plary from any mobile phone" },
];

const getToday = () => new Date().toISOString().slice(0, 10);
const formatKES = (n) => `${Number(n).toLocaleString()} KES`;

/* ─── Hooks ────────────────────────────────────────────────────────── */

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

/* ─── Shared Components ────────────────────────────────────────────── */

function Badge({ level, children }) {
  return <span className={`badge badge--${level || "default"}`}>{children}</span>;
}

function StatCard({ label, value, sub, trend, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        {icon && <span className="stat-card-icon"><Icon name={icon} size={18} /></span>}
        <span className="stat-card-label">{label}</span>
      </div>
      <span className="stat-card-value">{value}</span>
      {sub && <span className="stat-card-sub">{sub}</span>}
      {trend && (
        <span className={`stat-card-trend ${trend.dir}`}>
          <Icon name="trend" size={12} /> {trend.text}
        </span>
      )}
    </div>
  );
}

function RingGauge({ value, size = 120, sublabel }) {
  const v = useCountUp(value);
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (v / 100) * circ;
  return (
    <div className="ring-gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke="url(#ringGrad)" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--accent-teal)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-gauge-label">
        <span className="ring-gauge-value">{Math.round(v)}%</span>
        {sublabel && <span className="ring-gauge-sub">{sublabel}</span>}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.label} className="bar-chart-col">
          <div className="bar-chart-bar-wrap">
            <div className={`bar-chart-bar bar-chart-bar--${d.color || "brand"}`} style={{ height: `${(d.value / max) * 100}%` }}>
              <span className="bar-chart-value">{d.value}</span>
            </div>
          </div>
          <span className="bar-chart-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div className="toast">
      <Icon name="check" size={16} />
      {message}
    </div>
  );
}

function BottomSheet({ driver, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>{driver.label}</h3>
          <Badge level={driver.level}>{driver.status}</Badge>
        </div>
        <p>{driver.meaning}</p>
        <div className="sheet-action">
          <span className="sheet-action-label">Recommended action</span>
          <p>{driver.action}</p>
        </div>
        <button className="btn btn--primary btn--full" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function Modal({ title, body, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <button className="btn btn--primary btn--full" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────── */

function Sidebar({ current, onNavigate, open, onClose, onSignOut, userName }) {
  const groups = ["Start", "Plan", "Track"];
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><Icon name="leaf" size={20} /></div>
          <div>
            <div className="sidebar-brand">Plary</div>
            <div className="sidebar-tagline">Climate-Smart Farming</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div key={group} className="sidebar-group">
              <span className="sidebar-group-label">{group}</span>
              {navItems.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-link ${current === item.id ? "active" : ""}`}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar"><Icon name="user" size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{userName || "Farmer"}</div>
            </div>
            <button className="btn-icon sidebar-signout" onClick={onSignOut} aria-label="Sign out" title="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Top Bar ──────────────────────────────────────────────────────── */

function TopBar({ onMenu, page }) {
  return (
    <header className="topbar">
      <button className="btn-icon topbar-menu" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" size={22} />
      </button>
      <div className="topbar-title">
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
      </div>
      <div className="topbar-actions">
        <button className="btn-icon topbar-bell" aria-label="Notifications">
          <Icon name="bell" size={20} />
          <span className="topbar-bell-dot" />
        </button>
      </div>
    </header>
  );
}

/* ─── Page: Home ───────────────────────────────────────────────────── */

function PageHome({ onNavigate, seasonSetup, records, checklist, timeline }) {
  const inputsCount = records.filter((r) => r.type === "input").length;
  const salesCount = records.filter((r) => r.type === "sale").length;
  const totalInput = records.filter((r) => r.type === "input").reduce((s, r) => s + r.amount, 0);
  const totalSale = records.filter((r) => r.type === "sale").reduce((s, r) => s + r.amount, 0);
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;
  const hasSetup = seasonSetup.crop || seasonSetup.waterSource || seasonSetup.challenge;
  const riskLevel = (() => {
    if (!hasSetup) return { value: "—", sub: "Complete setup to assess" };
    const drivers = computeRiskDrivers(seasonSetup);
    const highCount = drivers.filter((d) => d.level === "high").length;
    if (highCount >= 3) return { value: "High", sub: "Based on farm profile" };
    if (highCount >= 1) return { value: "Medium", sub: "Based on farm profile" };
    return { value: "Low", sub: "Based on farm profile" };
  })();

  return (
    <div className="page">
      <div className="hero-banner">
        <div className="hero-banner-content">
          <span className="hero-banner-eyebrow">Welcome back</span>
          <h2>Climate-smart guidance for your farm</h2>
          <p>Plary helps you plan your season, track risks, record activities, and build a resilience story — all from one place.</p>
          <div className="hero-banner-actions">
            <button className="btn btn--primary" onClick={() => onNavigate(1)}>
              {hasSetup ? "Update season setup" : "Start season setup"}
              <Icon name="chevron" size={18} />
            </button>
            <button className="btn btn--secondary" onClick={() => onNavigate(5)}>
              <Icon name="shield" size={18} /> View resilience record
            </button>
          </div>
        </div>
        <div className="hero-banner-visual">
          <RingGauge value={checklistDone / checklistTotal * 100} sublabel="Ready" size={140} />
        </div>
      </div>

      <div className="stats-row">
        <StatCard label="Climate Risk" value={riskLevel.value} sub={riskLevel.sub} icon="cloud" />
        <StatCard label="Checklist" value={`${checklistDone}/${checklistTotal}`} sub="Season tasks done" icon="check" />
        <StatCard label="Records" value={inputsCount + salesCount} sub="Inputs & sales logged" icon="note" />
        <StatCard label="Net Revenue" value={records.length ? formatKES(totalSale - totalInput) : "—"} sub={records.length ? "This season so far" : "No records yet"} icon="trend" />
      </div>

      <div className="content-grid content-grid--2">
        <div className="card">
          <div className="card-header"><h3>Quick Actions</h3></div>
          <div className="quick-actions">
            <button className="quick-action" onClick={() => onNavigate(4, { nextMode: "input" })}>
              <span className="quick-action-icon quick-action-icon--green"><Icon name="plus" size={20} /></span>
              <div><strong>Log Input</strong><span>Seeds, fertilizer, labor</span></div>
            </button>
            <button className="quick-action" onClick={() => onNavigate(4, { nextMode: "sale" })}>
              <span className="quick-action-icon quick-action-icon--amber"><Icon name="plus" size={20} /></span>
              <div><strong>Log Sale</strong><span>Crops sold, revenue</span></div>
            </button>
            <button className="quick-action" onClick={() => onNavigate(2)}>
              <span className="quick-action-icon quick-action-icon--teal"><Icon name="droplet" size={20} /></span>
              <div><strong>View Risk Profile</strong><span>Check your climate risks</span></div>
            </button>
            <button className="quick-action" onClick={() => onNavigate(3)}>
              <span className="quick-action-icon quick-action-icon--coral"><Icon name="calendar" size={20} /></span>
              <div><strong>Season Plan</strong><span>This week's actions</span></div>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Recent Activity</h3><button className="btn-text" onClick={() => onNavigate(5)}>View all</button></div>
          {timeline.length ? (
            <div className="timeline">
              {timeline.slice(0, 5).map((t, i) => (
                <div key={t.id} className="timeline-item">
                  <span className={`timeline-dot ${i === 0 ? "latest" : ""}`} />
                  <span className="timeline-label">{t.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"><Icon name="note" size={28} /></span>
              <p>No activity yet. Start by completing your season setup.</p>
              <button className="btn btn--secondary btn--sm" onClick={() => onNavigate(1)}>Get started</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>USSD Quick Access</h3><Badge level="low">No smartphone needed</Badge></div>
        <div className="ussd-cta">
          <div className="ussd-cta-info">
            <p>Dial <strong>*789#</strong> from any mobile phone to access Plary's climate menu — season setup, risk snapshot, records, and more.</p>
          </div>
          <button className="btn btn--secondary" onClick={() => onNavigate(6)}>
            <Icon name="phone" size={18} /> View USSD menu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page: USSD Intake ────────────────────────────────────────────── */

function PageUSSD({ onNavigate }) {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const lines = ["Plary Climate Menu", "1. Season setup", "2. Risk snapshot", "3. Season plan", "4. Quick record", "5. Resilience record", "0. Exit"];
    const text = lines.join("\n");
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) { setTyped(text.slice(0, i)); i++; } else { clearInterval(interval); }
    }, 35);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = Number(choice.trim());
    if ([1, 2, 3, 4, 5].includes(v)) { setError(""); onNavigate(v); return; }
    setError("Enter 1–5 to continue.");
  };

  return (
    <div className="page">
      <div className="content-grid content-grid--2">
        <div>
          <div className="hero--compact">
            <div className="hero-icon hero-icon--lg"><Icon name="phone" size={28} /></div>
            <h2>Dial *789# to start</h2>
            <p>USSD quick access for climate guidance — works on any mobile phone, no internet required.</p>
          </div>

          <div className="ussd-terminal">
            <div className="ussd-terminal-bar">
              <span className="ussd-terminal-dot" />
              <span className="ussd-terminal-dot" />
              <span className="ussd-terminal-dot" />
              <span className="ussd-terminal-title">USSD Session</span>
            </div>
            <pre className="ussd-terminal-body">{typed}<span className="ussd-cursor" /></pre>
          </div>

          <form className="card" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Enter USSD response</span>
              <div className="ussd-input-row">
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 1" value={choice} onChange={(e) => setChoice(e.target.value)} className="field-input" />
                <button className="btn btn--primary" type="submit">Send</button>
              </div>
            </label>
            {error && <div className="field-error"><Icon name="alert" size={14} /> {error}</div>}
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h3>USSD Menu Guide</h3></div>
          <div className="ussd-guide">
            {[
              { num: "1", label: "Season setup", desc: "Configure your crop, farm size, water source" },
              { num: "2", label: "Risk snapshot", desc: "View climate risks and priority actions" },
              { num: "3", label: "Season plan", desc: "Weekly action plan and reminders" },
              { num: "4", label: "Quick record", desc: "Log inputs and sales quickly" },
              { num: "5", label: "Resilience record", desc: "View your season summary and support" },
              { num: "0", label: "Exit", desc: "End the session" },
            ].map((item) => (
              <div key={item.num} className="ussd-guide-item">
                <span className="ussd-guide-num">{item.num}</span>
                <div><strong>{item.label}</strong><p>{item.desc}</p></div>
              </div>
            ))}
          </div>
          <button className="btn btn--secondary btn--full" onClick={() => onNavigate(1)}>
            Continue to web setup <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page: Season Setup ───────────────────────────────────────────── */

function PageSetup({ seasonSetup, setSeasonSetup, showFocus, setShowFocus, focusExpanded, setFocusExpanded, focusList, formError, onSubmit, onContinue }) {
  return (
    <div className="page">
      <div className="content-grid content-grid--2-1">
        <div>
          <div className="card">
            <div className="card-header"><h3>Farm Details</h3><Badge level="default">Step 1 of 5</Badge></div>

            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field-label">Crop type</span>
                <select className="field-input field-select" value={seasonSetup.crop} onChange={(e) => setSeasonSetup((p) => ({ ...p, crop: e.target.value }))}>
                  <option value="">Select crop</option>
                  {cropOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="field-helper">Your main crop this season</span>
              </label>

              <label className="field">
                <span className="field-label">Farm size</span>
                <div className="inline-row">
                  <input type="number" min="0" placeholder="0" className="field-input" value={seasonSetup.size} onChange={(e) => setSeasonSetup((p) => ({ ...p, size: e.target.value }))} />
                  <div className="segmented">
                    {["Acres", "Hectares"].map((u) => (
                      <button key={u} className={seasonSetup.unit === u ? "active" : ""} type="button" onClick={() => setSeasonSetup((p) => ({ ...p, unit: u }))}>{u}</button>
                    ))}
                  </div>
                </div>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Water source</span>
              <div className="chip-row">
                {waterSources.map((s) => (
                  <button key={s} className={`chip ${seasonSetup.waterSource === s ? "active" : ""}`} type="button" onClick={() => setSeasonSetup((p) => ({ ...p, waterSource: s }))}>{s}</button>
                ))}
              </div>
            </label>

            <label className="field">
              <span className="field-label">Last season's main challenge</span>
              <div className="card-grid card-grid--2">
                {challenges.map((c) => (
                  <button key={c} className={`mini-card ${seasonSetup.challenge === c ? "active" : ""}`} type="button" onClick={() => setSeasonSetup((p) => ({ ...p, challenge: c }))}>
                    <span className="mini-card-radio" />
                    {c}
                  </button>
                ))}
              </div>
            </label>

            {formError && <div className="field-error"><Icon name="alert" size={14} /> {formError}</div>}

            {!showFocus && <button className="btn btn--primary btn--full" onClick={onSubmit}>Get my seasonal focus</button>}
          </div>

          {showFocus && (
            <div className="card card--accent">
              <div className="card-badge"><Icon name="sun" size={16} /> Season Focus</div>
              <p>Based on your last season challenge, prioritize:</p>
              <div className="focus-list">
                {focusList.map((item, i) => (
                  <div key={item} className="focus-item">
                    <span className="focus-number">{i + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
              <button className="btn-text" onClick={() => setFocusExpanded(!focusExpanded)}>
                Why this helps <Icon name="chevronDown" size={16} />
              </button>
              {focusExpanded && (
                <div className="expand">
                  <ul>
                    <li>Soil cover reduces heat stress and nutrient loss.</li>
                    <li>Timing shifts protect crops from delayed rains.</li>
                    <li>Early pest checks stop outbreaks from spreading.</li>
                  </ul>
                </div>
              )}
              <button className="btn btn--secondary btn--full" onClick={onContinue}>Continue to climate profile <Icon name="chevron" size={18} /></button>
            </div>
          )}
        </div>

        <div className="card card--side">
          <div className="card-header"><h3>Why Setup Matters</h3></div>
          <div className="side-info">
            <div className="side-info-item">
              <span className="side-info-icon"><Icon name="droplet" size={20} /></span>
              <div><strong>Water planning</strong><p>Know your water risks before the season starts.</p></div>
            </div>
            <div className="side-info-item">
              <span className="side-info-icon"><Icon name="leaf" size={20} /></span>
              <div><strong>Crop matching</strong><p>Get guidance tailored to your specific crop.</p></div>
            </div>
            <div className="side-info-item">
              <span className="side-info-icon"><Icon name="shield" size={20} /></span>
              <div><strong>Resilience building</strong><p>Learn from last season to adapt this one.</p></div>
            </div>
          </div>
          <div className="callout">
            <Icon name="alert" size={20} />
            <p>Takes 2 minutes. You can update anytime during the season.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page: Climate Profile ────────────────────────────────────────── */

function PageProfile({ checklist, onChecklist, onOpenSheet, onPrimary, onEdit, seasonSetup, focusList }) {
  const riskDrivers = computeRiskDrivers(seasonSetup);
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;
  const hasSetup = seasonSetup.crop || seasonSetup.waterSource || seasonSetup.challenge;
  const topFocus = focusList[0] || "—";

  return (
    <div className="page">
      <div className="stats-row">
        <StatCard label="Climate Risk" value={hasSetup ? (riskDrivers.filter((d) => d.level === "high").length >= 3 ? "High" : riskDrivers.filter((d) => d.level === "high").length >= 1 ? "Medium" : "Low") : "—"} sub={hasSetup ? "Based on farm profile" : "Complete setup first"} icon="cloud" />
        <StatCard label="Priority Focus" value={hasSetup ? topFocus : "—"} sub={hasSetup ? "Next 4 weeks" : "Complete setup first"} icon="droplet" />
        <StatCard label="Checklist" value={`${checklistDone}/${checklistTotal}`} sub="Season tasks" icon="check" />
        <StatCard label="Risk Drivers" value={riskDrivers.length || "—"} sub={riskDrivers.length ? "Identified" : "Complete setup"} icon="alert" />
      </div>

      <div className="content-grid content-grid--2">
        <div className="card">
          <div className="card-header"><h3>Risk Drivers</h3></div>
          {riskDrivers.length ? (
            <div className="risk-table">
              {riskDrivers.map((d) => (
                <button key={d.label} className="risk-row" onClick={() => onOpenSheet(d)}>
                  <span className="risk-row-label">{d.label}</span>
                  <Badge level={d.level}>{d.status}</Badge>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"><Icon name="alert" size={28} /></span>
              <p>No risk drivers yet. Complete your season setup to see personalized risks.</p>
              <button className="btn btn--secondary btn--sm" onClick={onEdit}>Go to setup</button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Seasonal Checklist</h3></div>
          <div className="checklist">
            {[
              { key: "mulch", label: "Mulch or soil cover started" },
              { key: "water", label: "Water plan set (source + storage)" },
              { key: "pest", label: "Pest scouting schedule set" },
              { key: "inputPlan", label: "Input plan saved" },
            ].map((item) => (
              <label key={item.key} className={`checklist-item ${checklist[item.key] ? "checked" : ""}`}>
                <input type="checkbox" checked={checklist[item.key]} onChange={() => onChecklist(item.key)} />
                <span className="checklist-box">{checklist[item.key] && <Icon name="check" size={14} />}</span>
                {item.label}
              </label>
            ))}
          </div>
          <div className="btn-row">
            <button className="btn btn--primary btn--full" onClick={onPrimary}>Build season plan <Icon name="chevron" size={18} /></button>
          </div>
          <button className="btn-text" onClick={onEdit}>Edit season setup</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page: Season Plan ────────────────────────────────────────────── */

function PagePlan({ actionsDone, onActionDone, remindersOn, setRemindersOn, onLogInput, onLogSale, onPrimary, weekActions, hasSetup }) {
  const doneCount = Object.values(actionsDone).filter(Boolean).length;
  const actionCount = weekActions.length;
  return (
    <div className="page">
      <div className="stats-row">
        <StatCard label="Actions Done" value={actionCount ? `${doneCount}/${actionCount}` : "—"} sub={actionCount ? "This week" : "No actions yet"} icon="check" />
        <StatCard label="Reminders" value={remindersOn ? "On" : "Off"} sub="Morning, Evening, Weekly" icon="bell" />
        <StatCard label="Next Review" value={actionCount ? "3 days" : "—"} sub={actionCount ? "Auto-scheduled" : "No plan yet"} icon="calendar" />
      </div>

      <div className="card">
        <div className="card-header"><h3>This Week's Actions</h3>{actionCount > 0 && <Badge level="medium">{doneCount} of {actionCount} done</Badge>}</div>
        {actionCount ? (
          <div className="action-grid action-grid--3">
            {weekActions.map((a, i) => (
              <div key={a.title} className={`action-card ${actionsDone[i] ? "done" : ""}`}>
                <div className="action-card-top">
                  <span className="action-icon"><Icon name={a.icon} size={20} /></span>
                  <Badge level={a.priority === "High" ? "high" : "medium"}>{a.priority}</Badge>
                </div>
                <h4>{a.title}</h4>
                <p>{a.why}</p>
                <button
                  className={actionsDone[i] ? "btn btn--done btn--sm btn--full" : "btn btn--secondary btn--sm btn--full"}
                  onClick={() => onActionDone(i)}
                  disabled={actionsDone[i]}
                >
                  {actionsDone[i] ? <><Icon name="check" size={14} /> Done</> : "Mark done"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="calendar" size={28} /></span>
            <p>{hasSetup ? "No actions generated yet. Build your plan to see tasks." : "Complete your season setup to get personalized weekly actions."}</p>
            <button className="btn btn--secondary btn--sm" onClick={onPrimary}>{hasSetup ? "Build plan" : "Go to setup"}</button>
          </div>
        )}
      </div>

      <div className="content-grid content-grid--2">
        <div className="card">
          <div className="toggle-row">
            <div className="toggle-row-text">
              <h3>Reminders</h3>
              <p>Get notifications for your scheduled actions</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={remindersOn} onChange={() => setRemindersOn(!remindersOn)} />
              <span className="slider" />
            </label>
          </div>
          {remindersOn && (
            <div className="chip-row" style={{ marginTop: "14px" }}>
              {reminderChips.map((c) => <span key={c} className="chip chip--solid">{c}</span>)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Quick Record</h3></div>
          <p>Log inputs and sales so Plary can learn what works in your conditions.</p>
          <div className="btn-row">
            <button className="btn btn--secondary btn--full" onClick={onLogInput}><Icon name="plus" size={16} /> Input</button>
            <button className="btn btn--secondary btn--full" onClick={onLogSale}><Icon name="plus" size={16} /> Sale</button>
          </div>
        </div>
      </div>

      <button className="btn btn--primary btn--full" onClick={onPrimary}>View my resilience record <Icon name="chevron" size={18} /></button>
    </div>
  );
}

/* ─── Page: Quick Record ───────────────────────────────────────────── */

function PageRecord({ mode, setMode, inputForm, setInputForm, saleForm, setSaleForm, seasonSetup, records, confirmSave, setConfirmSave, onSave, onBack }) {
  return (
    <div className="page">
      <div className="content-grid content-grid--2-1">
        <div>
          <div className="segmented segmented--lg">
            <button className={mode === "input" ? "active" : ""} onClick={() => setMode("input")}>Log Input</button>
            <button className={mode === "sale" ? "active" : ""} onClick={() => setMode("sale")}>Log Sale</button>
          </div>

          <div className="card">
            {mode === "input" ? (
              <div className="form-grid form-grid--2">
                <label className="field">
                  <span className="field-label">Date</span>
                  <input type="date" className="field-input" value={inputForm.date} onChange={(e) => setInputForm((p) => ({ ...p, date: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Input type</span>
                  <select className="field-input field-select" value={inputForm.type} onChange={(e) => setInputForm((p) => ({ ...p, type: e.target.value }))}>
                    {["Seed", "Fertilizer", "Pesticide", "Mulch", "Irrigation", "Labor", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Amount spent (KES)</span>
                  <input type="number" placeholder="0" className="field-input" value={inputForm.amount} onChange={(e) => setInputForm((p) => ({ ...p, amount: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Notes (optional)</span>
                  <input type="text" placeholder="e.g. mulch after dry spell" className="field-input" value={inputForm.notes} onChange={(e) => setInputForm((p) => ({ ...p, notes: e.target.value }))} />
                </label>
              </div>
            ) : (
              <div className="form-grid form-grid--2">
                <label className="field">
                  <span className="field-label">Date</span>
                  <input type="date" className="field-input" value={saleForm.date} onChange={(e) => setSaleForm((p) => ({ ...p, date: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Crop sold</span>
                  <select className="field-input field-select" value={saleForm.crop} onChange={(e) => setSaleForm((p) => ({ ...p, crop: e.target.value }))}>
                    <option value="">Select crop</option>
                    {[seasonSetup.crop || "Maize", "Beans", "Tomatoes"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Quantity (kg or bunches)</span>
                  <input type="number" placeholder="0" className="field-input" value={saleForm.quantity} onChange={(e) => setSaleForm((p) => ({ ...p, quantity: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="field-label">Amount received (KES)</span>
                  <input type="number" placeholder="0" className="field-input" value={saleForm.amount} onChange={(e) => setSaleForm((p) => ({ ...p, amount: e.target.value }))} />
                </label>
                <div className="field field--full">
                  <span className="field-label">Buyer type</span>
                  <div className="chip-row">
                    {["Broker", "Market", "Cooperative", "Direct customer"].map((b) => (
                      <button key={b} className={`chip ${saleForm.buyer === b ? "active" : ""}`} type="button" onClick={() => setSaleForm((p) => ({ ...p, buyer: b }))}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button className="btn btn--primary btn--full" onClick={onSave}><Icon name="check" size={18} /> Save record</button>
          </div>

          {confirmSave && (
            <div className="card card--success">
              <div className="success-icon"><Icon name="check" size={24} /></div>
              <h3>Saved to your resilience record.</h3>
              <p>This helps track costs under weather changes and helps partners support you fairly during shocks.</p>
              <div className="btn-row">
                <button className="btn btn--secondary btn--full" onClick={() => setConfirmSave(false)}>Log another</button>
                <button className="btn btn--primary btn--full" onClick={onBack}>Back to plan</button>
              </div>
            </div>
          )}
        </div>

        <div className="card card--side">
          <div className="card-header"><h3>Recent Records</h3></div>
          {records.length ? (
            <div className="list">
              {records.slice(0, 6).map((r) => (
                <div key={r.id} className="list-row list-row--static">
                  <span className="list-row-label">
                    <span className={`record-tag record-tag--${r.type}`}>{r.type === "input" ? "Input" : "Sale"}</span>
                    {r.label}
                  </span>
                  <div className="list-row-meta">
                    <span className="list-row-amount">{formatKES(r.amount)}</span>
                    <span className="list-row-date">{r.date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"><Icon name="note" size={24} /></span>
              <p>No records yet. Log your first input or sale above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page: Resilience Record ──────────────────────────────────────── */

function PageResilience({ seasonSetup, records, checklist, timeline, onDownload, onRequestSupport, onBack }) {
  const inputsCount = records.filter((r) => r.type === "input").length;
  const salesCount = records.filter((r) => r.type === "sale").length;
  const totalInput = records.filter((r) => r.type === "input").reduce((s, r) => s + r.amount, 0);
  const totalSale = records.filter((r) => r.type === "sale").reduce((s, r) => s + r.amount, 0);
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;
  const readiness = Math.round((checklistDone / checklistTotal) * 100);
  const hasSetup = seasonSetup.crop || seasonSetup.waterSource || seasonSetup.challenge;
  const riskDrivers = computeRiskDrivers(seasonSetup);
  const completedActions = Object.entries(checklist).filter(([k, v]) => v).map(([k]) => k);

  const chartData = records.map((r) => ({
    label: r.label,
    value: r.amount,
    color: r.type === "input" ? "amber" : "green",
  }));

  return (
    <div className="page">
      <div className="content-grid content-grid--2-1">
        <div>
          <div className="card card--hero">
            <RingGauge value={readiness} sublabel="Ready" size={130} />
            <div>
              <h3>Season Readiness</h3>
              <p>Based on your checklist completion and records logged. Keep updating to improve your score.</p>
            </div>
          </div>

          <div className="stats-row">
            <StatCard label="Inputs Logged" value={inputsCount} icon="note" />
            <StatCard label="Sales Logged" value={salesCount} icon="trend" />
            <StatCard label="Net Revenue" value={records.length ? formatKES(totalSale - totalInput) : "—"} icon="chart" />
          </div>

          <div className="card">
            <div className="card-header"><h3>Financial Summary</h3></div>
            {chartData.length ? (
              <>
                <BarChart data={chartData} />
                <div className="chart-legend">
                  <span className="chart-legend-item"><span className="chart-legend-dot chart-legend-dot--amber" /> Inputs</span>
                  <span className="chart-legend-item"><span className="chart-legend-dot chart-legend-dot--green" /> Sales</span>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="chart" size={28} /></span>
                <p>No financial data yet. Log inputs and sales to see your summary.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>Activity Timeline</h3></div>
            {timeline.length ? (
              <div className="timeline">
                {timeline.map((t, i) => (
                  <div key={t.id} className="timeline-item">
                    <span className={`timeline-dot ${i === 0 ? "latest" : ""}`} />
                    <span className="timeline-label">{t.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="note" size={24} /></span>
                <p>No activity recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="callout">
            <Icon name="shield" size={20} />
            <p>If a drought or heavy rain hits, this record helps you get faster support and better decisions.</p>
          </div>

          <div className="card">
            <div className="card-header"><h3>Summary for Partners</h3></div>
            <div className="summary-block">
              <p><strong>Farm profile:</strong> {hasSetup ? `${seasonSetup.crop || "—"}, ${seasonSetup.size || "—"} ${seasonSetup.unit || ""}, ${seasonSetup.waterSource || "—"}` : "Not configured"}</p>
              {riskDrivers.length > 0 && (
                <>
                  <p className="summary-section-label">Top risks:</p>
                  <ul>
                    {riskDrivers.slice(0, 3).map((d) => <li key={d.label}>{d.label} — {d.status}</li>)}
                  </ul>
                </>
              )}
              {completedActions.length > 0 && (
                <>
                  <p className="summary-section-label">Actions taken:</p>
                  <ul>
                    {completedActions.map((k) => <li key={k}>{k === "mulch" ? "Soil cover started" : k === "water" ? "Water plan set" : k === "pest" ? "Pest scouting set" : "Input plan saved"}</li>)}
                  </ul>
                </>
              )}
              <p><strong>Records:</strong> {inputsCount} inputs, {salesCount} sales</p>
            </div>
            <button className="btn btn--secondary btn--full" onClick={onDownload} disabled={!hasSetup && !records.length}><Icon name="download" size={16} /> Download summary</button>
          </div>

          <div className="card">
            <h3>Need Help?</h3>
            <p>Request a support call from a partner organization.</p>
            <button className="btn btn--primary btn--full" onClick={onRequestSupport}>Request support call</button>
          </div>

          <button className="btn btn--secondary btn--full" onClick={onBack}>Back to season plan</button>
        </div>
      </div>
    </div>
  );
}

/* --- Main App ------------------------------------------------------- */

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState(0);
  const [mode, setMode] = useState("input");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [seasonSetup, setSeasonSetup] = useState({ crop: "", size: "", unit: "Acres", waterSource: "", challenge: "" });
  const [showFocus, setShowFocus] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [formError, setFormError] = useState("");

  const [checklist, setChecklist] = useState({ mulch: false, water: false, pest: false, inputPlan: false });
  const [toast, setToast] = useState("");

  const [actionsDone, setActionsDone] = useState({});
  const [remindersOn, setRemindersOn] = useState(true);

  const [records, setRecords] = useState([]);
  const [confirmSave, setConfirmSave] = useState(false);

  const [sheet, setSheet] = useState(null);
  const [modal, setModal] = useState(null);

  const [inputForm, setInputForm] = useState({ date: getToday(), type: "Seed", amount: "", notes: "" });
  const [saleForm, setSaleForm] = useState({ date: getToday(), crop: "", quantity: "", amount: "", buyer: "" });

  useEffect(() => {
    let unsub;
    (async () => {
      const session = await getSession();
      if (session?.user) {
        setUser(session.user);
        await loadData(session.user.id);
      }
      setLoading(false);
      unsub = onAuthChange((newSession) => {
        if (newSession?.user) {
          setUser(newSession.user);
          loadData(newSession.user.id);
        } else {
          setUser(null);
        }
      });
    })();
    return () => { if (unsub) unsub.data.subscription.unsubscribe(); };
  }, []);

  const loadData = useCallback(async (userId) => {
    const result = await loadAllData(userId);
    if (result.seasonSetup) {
      const s = result.seasonSetup;
      setSeasonSetup({
        crop: s.crop || "",
        size: s.farm_size || s.size || "",
        unit: s.unit || "Acres",
        waterSource: s.water_source || s.waterSource || "",
        challenge: s.challenge || "",
      });
      setShowFocus(s.show_focus || false);
    }
    if (result.checklist) setChecklist(result.checklist);
    if (result.records) setRecords(result.records);
    if (result.actionsDone) setActionsDone(result.actionsDone);
    setRemindersOn(result.remindersOn !== false);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  useEffect(() => {
    const sync = () => {
      const url = new URL(window.location.href);
      const sp = Number(url.searchParams.get("screen"));
      setScreen(Number.isFinite(sp) ? sp : 0);
      setMode(url.searchParams.get("mode") || "input");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const focusList = useMemo(() => {
    if (!seasonSetup.challenge) return focusBase;
    return focusPriority[seasonSetup.challenge] || focusBase;
  }, [seasonSetup.challenge]);

  const weekActions = useMemo(() => computeWeekActions(focusList), [focusList]);

  const timeline = useMemo(() => {
    // Records (newest date first), then undated milestones (most recent step first).
    const recordItems = [...records]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((r) => ({ id: r.id, label: `${r.type === "input" ? "Input logged" : "Sale logged"}: ${r.label}` }));
    const milestones = [];
    if (checklist.inputPlan) milestones.push({ id: "inputPlan", label: "Input plan saved" });
    if (checklist.water) milestones.push({ id: "water", label: "Water plan set" });
    if (checklist.pest) milestones.push({ id: "pest", label: "Pest scouting set" });
    if (checklist.mulch) milestones.push({ id: "mulch", label: "Soil cover started" });
    if (seasonSetup.crop || seasonSetup.waterSource || seasonSetup.challenge) {
      milestones.push({ id: "setup", label: "Season setup completed" });
    }
    return [...recordItems, ...milestones];
  }, [seasonSetup, checklist, records]);

  const navigateTo = (next, options = {}) => {
    const { nextMode } = options;
    const modeValue = nextMode || mode;
    const url = new URL(window.location.href);
    url.searchParams.set("screen", String(next));
    url.searchParams.set("mode", modeValue);
    window.history.pushState({}, "", url);
    setScreen(next);
    setMode(modeValue);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChecklist = async (key) => {
    const newValue = !checklist[key];
    setChecklist((p) => ({ ...p, [key]: newValue }));
    setToast("Logged. This improves your resilience record.");
    if (user) {
      const { error } = await toggleChecklistItem(user.id, key, newValue);
      if (error) setToast("Failed to save. Please try again.");
    }
  };

  const handleActionDone = async (i) => {
    setActionsDone((p) => ({ ...p, [i]: true }));
    if (user) await setActionDone(user.id, i, true);
  };

  const handleRemindersToggle = async () => {
    const next = !remindersOn;
    setRemindersOn(next);
    if (user) await setRemindersEnabled(user.id, next);
  };

  const handleSaveRecord = async () => {
    const newRec = mode === "input"
      ? { type: "input", label: inputForm.type, amount: Number(inputForm.amount) || 0, date: inputForm.date, notes: inputForm.notes }
      : { type: "sale", label: saleForm.crop || seasonSetup.crop || "Crop", amount: Number(saleForm.amount) || 0, date: saleForm.date, quantity: saleForm.quantity, buyer: saleForm.buyer };

    if (user) {
      const { data, error } = await insertRecord(user.id, newRec);
      if (error) { setToast("Failed to save record."); return; }
      setRecords((p) => [data, ...p]);
    } else {
      setRecords((p) => [{ ...newRec, id: `local-${Date.now()}` }, ...p]);
    }

    setConfirmSave(true);
    setToast("Record saved to your resilience file.");
    if (mode === "input") {
      setInputForm({ date: getToday(), type: "Seed", amount: "", notes: "" });
    } else {
      setSaleForm({ date: getToday(), crop: "", quantity: "", amount: "", buyer: "" });
    }
  };

  const validateSeasonSetup = () => {
    if (!seasonSetup.crop) return "Please select your crop type.";
    if (!seasonSetup.size || Number(seasonSetup.size) <= 0) return "Farm size must be greater than 0.";
    if (!seasonSetup.waterSource) return "Choose a water source.";
    if (!seasonSetup.challenge) return "Select last season's main challenge.";
    return "";
  };

  const handleSeasonSubmit = async () => {
    const err = validateSeasonSetup();
    if (err) { setFormError(err); return; }
    setFormError("");
    setShowFocus(true);
    if (user) {
      const { error } = await upsertSeasonSetup(user.id, {
        crop: seasonSetup.crop,
        farm_size: seasonSetup.size,
        unit: seasonSetup.unit,
        water_source: seasonSetup.waterSource,
        challenge: seasonSetup.challenge,
        show_focus: true,
      });
      if (error) setToast("Failed to save season setup. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-logo"><Icon name="leaf" size={28} /></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthed={(u) => { setUser(u); loadData(u.id); }} />;
  }

  const page = pageMeta[screen] || pageMeta[0];

  const renderPage = () => {
    switch (screen) {
      case 0: return <PageHome onNavigate={navigateTo} seasonSetup={seasonSetup} records={records} checklist={checklist} timeline={timeline} />;
      case 1: return <PageSetup seasonSetup={seasonSetup} setSeasonSetup={setSeasonSetup} showFocus={showFocus} setShowFocus={setShowFocus} focusExpanded={focusExpanded} setFocusExpanded={setFocusExpanded} focusList={focusList} formError={formError} onSubmit={handleSeasonSubmit} onContinue={() => navigateTo(2)} />;
      case 2: return <PageProfile checklist={checklist} onChecklist={handleChecklist} onOpenSheet={setSheet} onPrimary={() => navigateTo(3)} onEdit={() => navigateTo(1)} seasonSetup={seasonSetup} focusList={focusList} />;
      case 3: return <PagePlan actionsDone={actionsDone} onActionDone={handleActionDone} remindersOn={remindersOn} setRemindersOn={handleRemindersToggle} onLogInput={() => navigateTo(4, { nextMode: "input" })} onLogSale={() => navigateTo(4, { nextMode: "sale" })} onPrimary={() => navigateTo(5)} weekActions={weekActions} hasSetup={!!(seasonSetup.crop || seasonSetup.waterSource || seasonSetup.challenge)} />;
      case 4: return <PageRecord mode={mode} setMode={setMode} inputForm={inputForm} setInputForm={setInputForm} saleForm={saleForm} setSaleForm={setSaleForm} seasonSetup={seasonSetup} records={records} confirmSave={confirmSave} setConfirmSave={setConfirmSave} onSave={handleSaveRecord} onBack={() => navigateTo(3)} />;
      case 5: return <PageResilience seasonSetup={seasonSetup} records={records} checklist={checklist} timeline={timeline} onDownload={() => setModal("download")} onRequestSupport={() => setModal("support")} onBack={() => navigateTo(3)} />;
      case 6: return <PageUSSD onNavigate={navigateTo} />;
      default: return <PageHome onNavigate={navigateTo} seasonSetup={seasonSetup} records={records} checklist={checklist} timeline={timeline} />;
    }
  };

  return (
    <div className="app">
      <Sidebar current={screen} onNavigate={navigateTo} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSignOut={handleSignOut} userName={user.user_metadata?.full_name || user.email} />
      <div className="main">
        <TopBar onMenu={() => setSidebarOpen(true)} page={page} />
        <div className="main-content">
          {renderPage()}
        </div>
      </div>

      <nav className="mobile-nav">
        {[1, 2, 3, 4, 5].map((id) => {
          const item = navItems.find((n) => n.id === id);
          return (
            <button key={id} className={screen === id ? "active" : ""} onClick={() => navigateTo(id)}>
              <Icon name={item.icon} size={20} />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>

      {toast && <Toast message={toast} />}
      {sheet && <BottomSheet driver={sheet} onClose={() => setSheet(null)} />}
      {modal && <Modal title={modal === "download" ? "Download Summary" : "Support Request"} body={modal === "download" ? "PDF summary downloads are coming soon. For now, you can screenshot the summary on this page." : "Partner support calls are coming soon. We'll let you know when this feature is live."} onClose={() => setModal(null)} />}
    </div>
  );
}

export default App;
