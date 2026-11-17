import React from "react";

export function Icon({ name, size = 20 }) {
  const icons = {
    home: <path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H10v7H6a2 2 0 0 1-2-2z" />,
    phone: <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .56 3.5 1 1 0 0 1-.24 1z" />,
    leaf: <path d="M5 19c7-1 11-5 14-12 0-1-1-2-2-2C10 6 6 10 5 17M5 17c3-2 6-3 9-4" />,
    droplet: <path d="M12 3c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11z" />,
    check: <path d="M6 12l4 4 8-8" />,
    note: <path d="M6 4h9l3 3v13H6zM9 11h6M9 15h6" />,
    shield: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
    calendar: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
    bug: <path d="M8 9a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0zM4 11h4M16 11h4M4 16h4M16 16h4M6 7l2 2M18 7l-2 2M12 9v8" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    back: <path d="M15 6l-6 6 6 6" />,
    download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />,
    plus: <path d="M12 5v14M5 12h14" />,
    alert: <path d="M12 3l9 16H3zM12 10v4M12 17v.5" />,
    sun: <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />,
    cloud: <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.7 1.8 3.5 3.5 0 0 1-1.7 6.2z" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    trend: <path d="M3 17l6-6 4 4 7-7M21 7v5M21 7h-5" />,
    chart: <path d="M3 3v18h18M7 16v-5M12 16v-8M17 16v-3" />,
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
