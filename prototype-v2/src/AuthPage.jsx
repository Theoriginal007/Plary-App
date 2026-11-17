import React, { useState } from "react";
import { Icon } from "./Icon.jsx";
import { signUp, signIn } from "./dataLayer.js";

export function AuthPage({ onAuthed }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setError("");
      setLoading(false);
      setMode("signin");
      setEmail("");
      setPassword("");
      setFullName("");
      alert("Account created! Please check your email for a confirmation link, then sign in.");
    } else {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      onAuthed(data.user);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Icon name="leaf" size={28} />
        </div>
        <h1>Plary</h1>
        <p className="auth-tagline">Climate-Smart Farming</p>

        <div className="segmented segmented--lg auth-toggle">
          <button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign In</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="field">
              <span className="field-label">Full name</span>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Farmer Joseph"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
          )}
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              className="field-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error && <div className="field-error"><Icon name="alert" size={14} /> {error}</div>}

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            className="btn-text"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
