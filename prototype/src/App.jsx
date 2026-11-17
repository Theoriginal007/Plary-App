
import React, { useEffect, useMemo, useState } from "react";

const cropOptions = [
  "Maize",
  "Beans",
  "Tomatoes",
  "Kale",
  "Potatoes",
  "Onions",
  "Coffee",
  "Dairy",
  "Other",
];

const waterSources = [
  "Rainfed",
  "Borehole",
  "River",
  "Irrigation scheme",
  "Water harvesting",
  "Other",
];

const challenges = [
  "Drought or long dry spell",
  "Heavy rain or flooding",
  "Pest or disease outbreak",
  "Price drop at harvest",
];

const focusBase = [
  "Soil cover",
  "Early planting or timing adjustment",
  "Pest monitoring",
  "Water conservation",
];

const focusPriority = {
  "Drought or long dry spell": [
    "Water conservation",
    "Soil cover",
    "Early planting or timing adjustment",
    "Pest monitoring",
  ],
  "Heavy rain or flooding": [
    "Early planting or timing adjustment",
    "Soil cover",
    "Water conservation",
    "Pest monitoring",
  ],
  "Pest or disease outbreak": [
    "Pest monitoring",
    "Soil cover",
    "Early planting or timing adjustment",
    "Water conservation",
  ],
  "Price drop at harvest": [
    "Early planting or timing adjustment",
    "Pest monitoring",
    "Soil cover",
    "Water conservation",
  ],
};

const riskDrivers = [
  {
    label: "Water source reliability",
    status: "Moderate",
    meaning:
      "Your main water source is vulnerable to dry spells or outages.",
    action: "Confirm backup storage or harvesting for the next 2 weeks.",
  },
  {
    label: "Crop sensitivity",
    status: "High",
    meaning: "Your selected crop reacts strongly to heat or delayed rains.",
    action: "Adjust planting window and monitor early stress signs.",
  },
  {
    label: "Farm size buffer",
    status: "Low",
    meaning:
      "Smaller plots have less buffer when rainfall shifts unexpectedly.",
    action: "Prioritize soil cover and moisture protection techniques.",
  },
  {
    label: "Last season shock",
    status: "Drought",
    meaning: "Your last season challenge signals a recurring climate risk.",
    action: "Track water needs weekly and plan early interventions.",
  },
];

const weekActionsSeed = [
  {
    title: "Apply soil cover on beds",
    why: "reduces moisture loss during heat",
  },
  {
    title: "Set planting window",
    why: "avoids crop stress if rains delay",
  },
  {
    title: "Start pest scouting twice a week",
    why: "early detection reduces loss",
  },
];

const seedRecords = [
  {
    id: "r1",
    type: "input",
    label: "Mulch",
    amount: "1,200 KES",
    date: "2026-02-18",
  },
  {
    id: "r2",
    type: "input",
    label: "Seed",
    amount: "2,800 KES",
    date: "2026-02-14",
  },
  {
    id: "r3",
    type: "sale",
    label: "Beans",
    amount: "4,500 KES",
    date: "2026-02-10",
  },
];

const timelineSeed = [
  "Season setup completed",
  "Soil cover started",
  "Input logged: mulch",
  "Pest scouting set",
  "Sale logged",
];

const reminderChips = ["Morning", "Evening", "Weekly"];

const screenMeta = {
  0: { name: "USSD Intake" },
  1: { name: "Season Setup" },
  2: { name: "Farm Climate Profile" },
  3: { name: "Season Plan" },
  4: { name: "Quick Record" },
  5: { name: "Resilience Record" },
};

const getToday = () => new Date().toISOString().slice(0, 10);

function App() {
  const [route, setRoute] = useState("app");
  const [screen, setScreen] = useState(0);
  const [mode, setMode] = useState("input");
  const [cleanMode, setCleanMode] = useState(false);
  const [navStack, setNavStack] = useState([0]);

  const [seasonSetup, setSeasonSetup] = useState({
    crop: "",
    size: "",
    unit: "Acres",
    waterSource: "",
    challenge: "",
  });
  const [showFocus, setShowFocus] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [formError, setFormError] = useState("");

  const [checklist, setChecklist] = useState({
    mulch: false,
    water: false,
    pest: false,
    inputPlan: false,
  });
  const [toast, setToast] = useState("");

  const [actionsDone, setActionsDone] = useState({
    0: false,
    1: false,
    2: false,
  });
  const [remindersOn, setRemindersOn] = useState(true);

  const [records, setRecords] = useState(seedRecords);
  const [confirmSave, setConfirmSave] = useState(false);

  const [sheet, setSheet] = useState(null);
  const [modal, setModal] = useState(null);

  const [inputForm, setInputForm] = useState({
    date: getToday(),
    type: "Seed",
    amount: "",
    notes: "",
  });
  const [saleForm, setSaleForm] = useState({
    date: getToday(),
    crop: "",
    quantity: "",
    amount: "",
    buyer: "",
  });

  useEffect(() => {
    const syncFromLocation = () => {
      const url = new URL(window.location.href);
      const screenParam = Number(url.searchParams.get("screen"));
      const safeScreen = Number.isFinite(screenParam) ? screenParam : 0;
      const modeParam = url.searchParams.get("mode") || "input";
      const cleanParam = url.searchParams.get("clean") === "1";
      const path = url.pathname;
      setRoute(path === "/gallery" ? "gallery" : "app");
      setScreen(safeScreen);
      setMode(modeParam);
      setCleanMode(cleanParam);
      setNavStack([safeScreen]);
      if (!saleForm.crop && seasonSetup.crop) {
        setSaleForm((prev) => ({ ...prev, crop: seasonSetup.crop }));
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [saleForm.crop, seasonSetup.crop]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const focusList = useMemo(() => {
    if (!seasonSetup.challenge) return focusBase;
    return focusPriority[seasonSetup.challenge] || focusBase;
  }, [seasonSetup.challenge]);

  const isClean = cleanMode;

  const updateUrl = ({
    nextScreen = screen,
    nextMode = mode,
    nextClean = cleanMode,
    path = route === "gallery" ? "/gallery" : "/",
    replace = false,
  } = {}) => {
    const url = new URL(window.location.href);
    url.pathname = path;
    url.searchParams.set("screen", String(nextScreen));
    if (nextMode) {
      url.searchParams.set("mode", nextMode);
    } else {
      url.searchParams.delete("mode");
    }
    if (nextClean) {
      url.searchParams.set("clean", "1");
    } else {
      url.searchParams.delete("clean");
    }
    if (replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
  };

  const navigateTo = (nextScreen, options = {}) => {
    const { nextMode, replace } = options;
    const modeValue = nextMode || mode;
    updateUrl({ nextScreen, nextMode: modeValue, replace });
    setScreen(nextScreen);
    setMode(modeValue);
    if (!replace) {
      setNavStack((prev) => [...prev, nextScreen]);
    }
  };

  const navigateGallery = () => {
    updateUrl({ path: "/gallery", replace: false });
    setRoute("gallery");
  };

  const handleBack = () => {
    if (navStack.length > 1) {
      const nextStack = navStack.slice(0, -1);
      const prevScreen = nextStack[nextStack.length - 1];
      setNavStack(nextStack);
      navigateTo(prevScreen, { replace: true });
      return;
    }
    navigateTo(1, { replace: true });
  };

  const toggleClean = () => {
    const next = !cleanMode;
    setCleanMode(next);
    updateUrl({ nextClean: next, replace: true });
  };

  const handleChecklist = (key) => {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    setToast("Logged. This improves your resilience record.");
  };

  const handleActionDone = (index) => {
    setActionsDone((prev) => ({ ...prev, [index]: true }));
  };

  const handleSaveRecord = () => {
    const newRecord =
      mode === "input"
        ? {
            id: `r-${Date.now()}`,
            type: "input",
            label: inputForm.type,
            amount: `${inputForm.amount || "0"} KES`,
            date: inputForm.date,
          }
        : {
            id: `r-${Date.now()}`,
            type: "sale",
            label: saleForm.crop || seasonSetup.crop || "Crop",
            amount: `${saleForm.amount || "0"} KES`,
            date: saleForm.date,
          };

    setRecords((prev) => [newRecord, ...prev]);
    setConfirmSave(true);
  };

  const validateSeasonSetup = () => {
    if (!seasonSetup.crop) return "Please select your crop type.";
    if (!seasonSetup.size || Number(seasonSetup.size) <= 0)
      return "Farm size must be greater than 0.";
    if (!seasonSetup.waterSource) return "Choose a water source.";
    if (!seasonSetup.challenge) return "Select last season's main challenge.";
    return "";
  };

  const handleSeasonSubmit = () => {
    const error = validateSeasonSetup();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setShowFocus(true);
  };

  const mainContent = () => {
    if (route === "gallery") {
      return (
        <Gallery
          onExit={() => {
            updateUrl({ path: "/", replace: true });
            setRoute("app");
          }}
        />
      );
    }

    switch (screen) {
      case 0:
        return <Screen0 onSelect={(next) => navigateTo(next)} />;
      case 1:
        return (
          <Screen1
            seasonSetup={seasonSetup}
            setSeasonSetup={setSeasonSetup}
            showFocus={showFocus}
            setShowFocus={setShowFocus}
            focusExpanded={focusExpanded}
            setFocusExpanded={setFocusExpanded}
            focusList={focusList}
            formError={formError}
            onSubmit={handleSeasonSubmit}
            onContinue={() => navigateTo(2)}
          />
        );
      case 2:
        return (
          <Screen2
            checklist={checklist}
            onChecklist={handleChecklist}
            onOpenSheet={(driver) => setSheet(driver)}
            onPrimary={() => navigateTo(3)}
            onEdit={() => navigateTo(1)}
          />
        );
      case 3:
        return (
          <Screen3
            actionsDone={actionsDone}
            onActionDone={handleActionDone}
            remindersOn={remindersOn}
            setRemindersOn={setRemindersOn}
            onLogInput={() => navigateTo(4, { nextMode: "input" })}
            onLogSale={() => navigateTo(4, { nextMode: "sale" })}
            onPrimary={() => navigateTo(5)}
          />
        );
      case 4:
        return (
          <Screen4
            mode={mode}
            inputForm={inputForm}
            setInputForm={setInputForm}
            saleForm={saleForm}
            setSaleForm={setSaleForm}
            seasonSetup={seasonSetup}
            records={records}
            confirmSave={confirmSave}
            setConfirmSave={setConfirmSave}
            onSave={handleSaveRecord}
            onBack={() => navigateTo(3)}
          />
        );
      case 5:
        return (
          <Screen5
            seasonSetup={seasonSetup}
            records={records}
            onDownload={() => setModal("download")}
            onRequestSupport={() => setModal("support")}
            onBack={() => navigateTo(3)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`app ${isClean ? "clean" : ""}`}>
      {!isClean && (
        <div className="dev-bar">
          <div className="dev-left">
            <span className="dev-title">Plary v2 Prototype</span>
            <button className="ghost" onClick={navigateGallery}>
              Open Gallery
            </button>
          </div>
          <div className="dev-controls">
            <label className="toggle">
              <input
                type="checkbox"
                checked={cleanMode}
                onChange={toggleClean}
              />
              <span>Screenshot Mode</span>
            </label>
            <label className="select">
              <span>Screen</span>
              <select
                value={screen}
                onChange={(event) =>
                  navigateTo(Number(event.target.value), { replace: true })
                }
              >
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}. {screenMeta[value].name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="canvas">
        {route === "app" && (
          <PhoneFrame
            showProgress={screen > 0 && screen !== 4}
            current={screen}
            onBack={screen <= 1 ? null : handleBack}
            title={screenMeta[screen].name}
            subtitle={
              screen === 0
                ? "USSD-style entry"
                : screen === 1
                ? "Climate readiness setup"
                : screen === 2
                  ? "Risk snapshot"
                  : screen === 3
                    ? "Actions matched to your farm"
                    : screen === 4
                      ? "Fast records"
                      : "Your season story"
            }
          >
            {mainContent()}
            {route === "app" && screen !== 0 && (
              <BottomNav current={screen} onNavigate={navigateTo} />
            )}
          </PhoneFrame>
        )}
        {route === "gallery" && mainContent()}
      </div>

      {toast && <Toast message={toast} />}
      {sheet && (
        <BottomSheet
          title={sheet.label}
          status={sheet.status}
          meaning={sheet.meaning}
          action={sheet.action}
          onClose={() => setSheet(null)}
        />
      )}
      {modal && (
        <Modal
          title={modal === "download" ? "Summary" : "Support Request"}
          body={
            modal === "download"
              ? "PDF will be generated."
              : "A partner will contact you within 24 hours."
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function PhoneFrame({
  children,
  showProgress,
  current,
  onBack,
  title,
  subtitle,
}) {
  return (
    <div className="phone">
      <div className="phone-inner">
        <div className="phone-notch" />
        <header className="phone-header">
          <div className="header-row">
            {onBack ? (
              <button className="back" onClick={onBack}>
                Back
              </button>
            ) : (
              <div className="back-placeholder" />
            )}
            <div className="header-text">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          {showProgress && <ProgressHeader current={current} total={5} />}
        </header>
        <main className="phone-screen">{children}</main>
      </div>
    </div>
  );
}

function ProgressHeader({ current, total }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label">Step {current} of {total}</div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function BottomNav({ current, onNavigate }) {
  const items = [
    { id: 1, label: "Setup", icon: "leaf" },
    { id: 2, label: "Profile", icon: "droplet" },
    { id: 3, label: "Plan", icon: "check" },
    { id: 4, label: "Record", icon: "note" },
    { id: 5, label: "Summary", icon: "shield" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={current === item.id ? "active" : ""}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{renderNavIcon(item.icon)}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function renderNavIcon(type) {
  switch (type) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 19c7-1 11-5 14-12 0-1-1-2-2-2C10 6 6 10 5 17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 17c3-2 6-3 9-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "droplet":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 12l4 4 8-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="3"
            ry="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      );
    case "note":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 4h9l3 3v13H6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9 11h6M9 15h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

function Screen0({ onSelect }) {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = Number(choice.trim());
    if ([1, 2, 3, 4, 5].includes(value)) {
      setError("");
      onSelect(value);
      return;
    }
    setError("Enter 1-5 to continue.");
  };

  return (
    <div className="screen">
      <section className="hero ussd-hero">
        <h2>Dial *789# to start</h2>
        <p>USSD quick access for climate guidance.</p>
      </section>

      <div className="card ussd">
        <div className="ussd-screen">
          <p className="ussd-line">Plary Climate Menu</p>
          <p className="ussd-line">1. Season setup</p>
          <p className="ussd-line">2. Risk snapshot</p>
          <p className="ussd-line">3. Season plan</p>
          <p className="ussd-line">4. Quick record</p>
          <p className="ussd-line">5. Resilience record</p>
          <p className="ussd-line">0. Exit</p>
          <p className="ussd-input">
            Enter choice: <span className="cursor">|</span>
          </p>
        </div>
        <form className="ussd-form" onSubmit={handleSubmit}>
          <label>
            USSD response
            <div className="ussd-input-row">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 1"
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
              />
              <button className="primary" type="submit">
                Send
              </button>
            </div>
          </label>
          {error && <div className="error">{error}</div>}
        </form>
      </div>

      <button className="primary" onClick={() => onSelect(1)}>
        Continue to setup
      </button>
    </div>
  );
}

function Screen1({
  seasonSetup,
  setSeasonSetup,
  showFocus,
  setShowFocus,
  focusExpanded,
  setFocusExpanded,
  focusList,
  formError,
  onSubmit,
  onContinue,
}) {
  return (
    <div className="screen">
      <section className="hero">
        <div className="hero-icons">
          <span className="icon droplet" />
          <span className="icon leaf" />
          <span className="icon shield" />
        </div>
        <h2>Prepare Your Farm for This Season</h2>
        <p>Quick setup so Plary can give you seasonal guidance and risk support.</p>
      </section>

      <div className="card">
        <label>
          Crop type
          <select
            value={seasonSetup.crop}
            onChange={(event) =>
              setSeasonSetup((prev) => ({ ...prev, crop: event.target.value }))
            }
          >
            <option value="">Select crop</option>
            {cropOptions.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
          <span className="helper">Choose your main crop this season.</span>
        </label>

        <label>
          Farm size
          <div className="inline-row">
            <input
              type="number"
              min="0"
              placeholder="0"
              value={seasonSetup.size}
              onChange={(event) =>
                setSeasonSetup((prev) => ({
                  ...prev,
                  size: event.target.value,
                }))
              }
            />
            <div className="segmented">
              {["Acres", "Hectares"].map((unit) => (
                <button
                  key={unit}
                  className={seasonSetup.unit === unit ? "active" : ""}
                  onClick={() =>
                    setSeasonSetup((prev) => ({ ...prev, unit }))
                  }
                  type="button"
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </label>

        <label>
          Water source
          <div className="chip-row">
            {waterSources.map((source) => (
              <button
                key={source}
                className={
                  seasonSetup.waterSource === source ? "chip active" : "chip"
                }
                onClick={() =>
                  setSeasonSetup((prev) => ({ ...prev, waterSource: source }))
                }
                type="button"
              >
                {source}
              </button>
            ))}
          </div>
        </label>

        <label>
          Last season main challenge
          <div className="card-grid">
            {challenges.map((challenge) => (
              <button
                key={challenge}
                className={
                  seasonSetup.challenge === challenge ? "mini-card active" : "mini-card"
                }
                onClick={() =>
                  setSeasonSetup((prev) => ({ ...prev, challenge }))
                }
                type="button"
              >
                {challenge}
              </button>
            ))}
          </div>
        </label>

        {formError && <div className="error">{formError}</div>}

        {!showFocus && (
          <button className="primary" onClick={onSubmit}>
            Get my seasonal focus
          </button>
        )}
      </div>

      {showFocus && (
        <div className="card focus">
          <h3>Season Focus</h3>
          <p>Based on your last season challenge, this season focus on:</p>
          <ul>
            {focusList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            className="link"
            onClick={() => setFocusExpanded(!focusExpanded)}
          >
            Why this helps
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
          <button className="secondary" onClick={onContinue}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function Screen2({ checklist, onChecklist, onOpenSheet, onPrimary, onEdit }) {
  return (
    <div className="screen">
      <section className="summary-grid">
        <div className="summary-card">
          <span className="label">Climate risk</span>
          <h3>Medium</h3>
          <p>Updates as you add records.</p>
        </div>
        <div className="summary-card">
          <span className="label">Priority focus</span>
          <h3>Water conservation</h3>
          <p>Focus for the next 4 weeks.</p>
        </div>
        <div className="summary-card">
          <span className="label">Next 14 days</span>
          <h3>Watch for dry spell</h3>
          <p>Stay ready to adjust.</p>
        </div>
      </section>

      <div className="card">
        <h3>Risk drivers</h3>
        <div className="list">
          {riskDrivers.map((driver) => (
            <button
              key={driver.label}
              className="list-row"
              onClick={() => onOpenSheet(driver)}
            >
              <span>{driver.label}</span>
              <span className="chip solid">{driver.status}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Seasonal checklist</h3>
        <div className="checklist">
          <label>
            <input
              type="checkbox"
              checked={checklist.mulch}
              onChange={() => onChecklist("mulch")}
            />
            Mulch or soil cover started
          </label>
          <label>
            <input
              type="checkbox"
              checked={checklist.water}
              onChange={() => onChecklist("water")}
            />
            Water plan set (source + storage)
          </label>
          <label>
            <input
              type="checkbox"
              checked={checklist.pest}
              onChange={() => onChecklist("pest")}
            />
            Pest scouting schedule set
          </label>
          <label>
            <input
              type="checkbox"
              checked={checklist.inputPlan}
              onChange={() => onChecklist("inputPlan")}
            />
            Input plan saved
          </label>
        </div>
      </div>

      <button className="primary" onClick={onPrimary}>
        Build my season plan
      </button>
      <button className="link" onClick={onEdit}>
        Edit season setup
      </button>
    </div>
  );
}

function Screen3({
  actionsDone,
  onActionDone,
  remindersOn,
  setRemindersOn,
  onLogInput,
  onLogSale,
  onPrimary,
}) {
  return (
    <div className="screen">
      <div className="card">
        <h3>This week actions</h3>
        <div className="action-grid">
          {weekActionsSeed.map((action, index) => (
            <div key={action.title} className="mini-card">
              <h4>{action.title}</h4>
              <p>Why: {action.why}</p>
              <button
                className={actionsDone[index] ? "done" : "secondary"}
                onClick={() => onActionDone(index)}
                disabled={actionsDone[index]}
              >
                {actionsDone[index] ? "Done" : "Mark done"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="toggle-row">
          <div>
            <h3>Reminders</h3>
            <p>Send me reminders</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={remindersOn}
              onChange={() => setRemindersOn(!remindersOn)}
            />
            <span className="slider" />
          </label>
        </div>
        {remindersOn && (
          <div className="chip-row">
            {reminderChips.map((chip) => (
              <span key={chip} className="chip solid">
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card compact">
        <h3>What to record</h3>
        <p>
          When you record inputs and sales, Plary learns what works in your
          conditions.
        </p>
        <div className="inline-row">
          <button className="secondary" onClick={onLogInput}>
            Log input
          </button>
          <button className="secondary" onClick={onLogSale}>
            Log sale
          </button>
        </div>
      </div>

      <button className="primary" onClick={onPrimary}>
        View my resilience record
      </button>
    </div>
  );
}

function Screen4({
  mode,
  inputForm,
  setInputForm,
  saleForm,
  setSaleForm,
  seasonSetup,
  records,
  confirmSave,
  setConfirmSave,
  onSave,
  onBack,
}) {
  return (
    <div className="screen">
      <section className="hero compact">
        <h2>{mode === "input" ? "Log an input" : "Log a sale"}</h2>
        <p>Takes 30 seconds. Builds your season record.</p>
      </section>

      <div className="card">
        {mode === "input" ? (
          <>
            <label>
              Date
              <input
                type="date"
                value={inputForm.date}
                onChange={(event) =>
                  setInputForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Input type
              <select
                value={inputForm.type}
                onChange={(event) =>
                  setInputForm((prev) => ({
                    ...prev,
                    type: event.target.value,
                  }))
                }
              >
                {[
                  "Seed",
                  "Fertilizer",
                  "Pesticide",
                  "Mulch",
                  "Irrigation",
                  "Labor",
                  "Other",
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount spent (KES)
              <input
                type="number"
                placeholder="0"
                value={inputForm.amount}
                onChange={(event) =>
                  setInputForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Notes (optional)
              <input
                type="text"
                placeholder="mulch after dry spell"
                value={inputForm.notes}
                onChange={(event) =>
                  setInputForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Date
              <input
                type="date"
                value={saleForm.date}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Crop sold
              <select
                value={saleForm.crop}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    crop: event.target.value,
                  }))
                }
              >
                <option value="">Select crop</option>
                {[seasonSetup.crop || "Maize", "Beans", "Tomatoes"].map(
                  (crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  )
                )}
              </select>
            </label>
            <label>
              Quantity (kg or bunches)
              <input
                type="number"
                placeholder="0"
                value={saleForm.quantity}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Amount received (KES)
              <input
                type="number"
                placeholder="0"
                value={saleForm.amount}
                onChange={(event) =>
                  setSaleForm((prev) => ({
                    ...prev,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Buyer type
              <div className="chip-row">
                {[
                  "Broker",
                  "Market",
                  "Cooperative",
                  "Direct customer",
                ].map((buyer) => (
                  <button
                    key={buyer}
                    className={saleForm.buyer === buyer ? "chip active" : "chip"}
                    onClick={() =>
                      setSaleForm((prev) => ({ ...prev, buyer }))
                    }
                    type="button"
                  >
                    {buyer}
                  </button>
                ))}
              </div>
            </label>
          </>
        )}

        <button className="primary" onClick={onSave}>
          Save
        </button>
      </div>

      {confirmSave && (
        <div className="card confirm">
          <h3>Saved to your resilience record.</h3>
          <p>This helps track costs under weather changes.</p>
          <p>It also helps partners support you fairly during shocks.</p>
          <div className="inline-row">
            <button className="secondary" onClick={() => setConfirmSave(false)}>
              Log another
            </button>
            <button className="primary" onClick={onBack}>
              Back to plan
            </button>
          </div>
        </div>
      )}

      <div className="card compact">
        <h3>Recent records</h3>
        <div className="list">
          {records.slice(0, 3).map((record) => (
            <div key={record.id} className="list-row">
              <span>
                {record.type === "input" ? "Input" : "Sale"}: {record.label}
              </span>
              <span className="muted">{record.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screen5({ seasonSetup, records, onDownload, onRequestSupport, onBack }) {
  const inputsCount = records.filter((rec) => rec.type === "input").length;
  const salesCount = records.filter((rec) => rec.type === "sale").length;
  return (
    <div className="screen">
      <div className="card">
        <div className="ring-wrap">
          <div className="ring" style={{ "--value": 60 }}>
            <span>60%</span>
          </div>
          <div>
            <h3>Season readiness</h3>
            <p>Based on checklist and records</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Actions completed</h3>
        <div className="timeline">
          {timelineSeed.map((item) => (
            <div key={item} className="timeline-item">
              <span className="dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="callout">
        If a drought or heavy rain hits, this record helps you get faster support
        and better decisions.
      </div>

      <div className="card">
        <h3>Summary for partners</h3>
        <div className="summary-block">
          <p>
            <strong>Farm profile:</strong> {seasonSetup.crop || "Maize"},
            {" "}
            {seasonSetup.size || "2"} {seasonSetup.unit || "Acres"},
            {" "}
            {seasonSetup.waterSource || "Rainfed"}
          </p>
          <p>
            <strong>Top risks:</strong>
          </p>
          <ul>
            <li>Water reliability</li>
            <li>Heat sensitivity</li>
          </ul>
          <p>
            <strong>Actions taken:</strong>
          </p>
          <ul>
            <li>Soil cover started</li>
            <li>Pest scouting set</li>
          </ul>
          <p>
            <strong>Records count:</strong> {inputsCount} inputs logged, {salesCount}
            {" "}
            sales logged
          </p>
        </div>
        <button className="secondary" onClick={onDownload}>
          Download summary
        </button>
      </div>

      <div className="inline-row">
        <button className="primary" onClick={onRequestSupport}>
          Request support call
        </button>
        <button className="secondary" onClick={onBack}>
          Back to season plan
        </button>
      </div>
    </div>
  );
}

function Gallery({ onExit }) {
  const sampleSetup = {
    crop: "Maize",
    size: "2",
    unit: "Acres",
    waterSource: "Rainfed",
    challenge: "Drought or long dry spell",
  };
  const sampleChecklist = {
    mulch: true,
    water: false,
    pest: true,
    inputPlan: false,
  };
  const sampleActionsDone = { 0: true, 1: false, 2: false };
  const sampleFocusList = focusPriority[sampleSetup.challenge] || focusBase;

  const previewScreens = {
    0: <Screen0 onSelect={() => {}} />,
    1: (
      <Screen1
        seasonSetup={sampleSetup}
        setSeasonSetup={() => {}}
        showFocus={true}
        setShowFocus={() => {}}
        focusExpanded={false}
        setFocusExpanded={() => {}}
        focusList={sampleFocusList}
        formError=""
        onSubmit={() => {}}
        onContinue={() => {}}
      />
    ),
    2: (
      <Screen2
        checklist={sampleChecklist}
        onChecklist={() => {}}
        onOpenSheet={() => {}}
        onPrimary={() => {}}
        onEdit={() => {}}
      />
    ),
    3: (
      <Screen3
        actionsDone={sampleActionsDone}
        onActionDone={() => {}}
        remindersOn={true}
        setRemindersOn={() => {}}
        onLogInput={() => {}}
        onLogSale={() => {}}
        onPrimary={() => {}}
      />
    ),
    4: (
      <Screen4
        mode="input"
        inputForm={{ date: getToday(), type: "Seed", amount: "", notes: "" }}
        setInputForm={() => {}}
        saleForm={{ date: getToday(), crop: "", quantity: "", amount: "", buyer: "" }}
        setSaleForm={() => {}}
        seasonSetup={sampleSetup}
        records={seedRecords}
        confirmSave={false}
        setConfirmSave={() => {}}
        onSave={() => {}}
        onBack={() => {}}
      />
    ),
    5: (
      <Screen5
        seasonSetup={sampleSetup}
        records={seedRecords}
        onDownload={() => {}}
        onRequestSupport={() => {}}
        onBack={() => {}}
      />
    ),
  };

  return (
    <div className="gallery">
      <div className="gallery-header">
        <div>
          <h2>Screenshot Gallery</h2>
          <p>Open each screen in clean view for polished screenshots.</p>
        </div>
        <button className="secondary" onClick={onExit}>
          Back to prototype
        </button>
      </div>
      <div className="gallery-grid">
        {[0, 1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="gallery-card">
            <div className="gallery-title">
              {num}. {screenMeta[num].name}
            </div>
            <div className="gallery-phone">
              <div className="gallery-preview">
                <PhoneFrame
                  showProgress={num > 0 && num !== 4}
                  current={num}
                  onBack={null}
                  title={screenMeta[num].name}
                  subtitle="Clean preview"
                >
                  {previewScreens[num]}
                  {num !== 0 && (
                    <BottomNav current={num} onNavigate={() => {}} />
                  )}
                </PhoneFrame>
              </div>
            </div>
            <a className="secondary" href={`/?screen=${num}&clean=1`}>
              Open clean view
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toast({ message }) {
  return <div className="toast">{message}</div>;
}

function BottomSheet({ title, status, meaning, action, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div>
            <h3>{title}</h3>
            <span className="chip solid">{status}</span>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p>{meaning}</p>
        <div className="sheet-action">
          <strong>Action:</strong> {action}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, body, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <button className="primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default App;
