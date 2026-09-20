/**
 * Login page.
 *
 * Basic fields only — the visual design is a separate pass. Mirrors the
 * mockup's "Welcome Back" copy without committing to its styling.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { EnvelopeSimpleIcon, ArrowRightIcon } from "@phosphor-icons/react";

import styles from "./Auth.module.css";
import { login } from "../../lib/auth";
import { ApiError } from "../../lib/api";
import { PasswordField } from "./PasswordField";
import logo from "../../../public/images/watty-logo.svg";
import { AuthBackdrop } from "../../components/AuthBackdrop";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // RequireAuth stashes the page the user was trying to reach.
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details?.length ? err.details : [err.message]);
      } else {
        setErrors(["Something went wrong. Is the API running on :4000?"]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.Auth_page}>
      <AuthBackdrop />
      <div className={styles.Auth}>
        <img src={logo} alt="Watty" className={styles.Auth_logo} />
        <h1 className={styles.Auth_title}>Welcome back</h1>
        <p className={styles.Auth_subtitle}>
          Sign in to see your energy insights.
        </p>

        <form className={styles.Auth_form} onSubmit={handleSubmit}>
          <label className={styles.Auth_field}>
            <span className={styles.Auth_fieldLabel}>
              <EnvelopeSimpleIcon size={16} />
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {errors.length > 0 && (
            <ul className={styles.Auth_errors}>
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            className={styles.Auth_submit}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <ArrowRightIcon size={18} weight="bold" />}
          </button>
        </form>

        <p className={styles.Auth_alt}>
          No account yet? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
