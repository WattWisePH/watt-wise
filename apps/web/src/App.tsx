import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { logout } from "./lib/auth";
import { supabase } from "./lib/supabase";
import logo from "../public/images/watty-logo.svg";
import styles from "./App.module.css";

/**
 * App shell: the Watty header plus an Outlet for whichever page matched.
 * The header also carries the sign-out control, since it's the one element
 * present on every screen.
 */
function App() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  // Subscribe to Supabase's auth state. It's an external system, which is
  // what effects are for: the callback fires on sign-in, sign-out and token
  // refresh, keeping the header correct without polling for a token.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.App}>
      <header className={styles.App_header}>
        <button
          onClick={() => {
            navigate("/");
          }}
          className={styles.App_brand}
        >
          <img src={logo} alt="Logo" className={styles.App_logo} />
          Watty
        </button>
        {signedIn && (
          <button
            type="button"
            className={styles.App_signout}
            onClick={handleSignOut}
          >
            Sign out
          </button>
        )}
      </header>
      <main className={styles.App_main}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
