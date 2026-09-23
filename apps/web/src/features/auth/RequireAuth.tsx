/**
 * Route guard.
 *
 * Wraps the pages that need a signed-in user. It verifies the stored token
 * with the API rather than trusting its presence, so a token left over from
 * a previous run (the dev API keeps users in memory and forgets them on
 * restart) sends the user to sign in instead of leaving them on a page whose
 * every request 401s.
 */

import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { getCurrentUser } from "../../lib/auth";
import { listEstablishments } from "../../lib/establishments";
import { useEstablishment } from "../establishment/hooks/useEstablishment";

export function RequireAuth() {
  // null while the check is in flight; then true/false.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const location = useLocation();
  const { setEstablishments, setActiveEstablishmentId } = useEstablishment();

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(async (user) => {
        if (!active) return;
        if (user === null) {
          setAllowed(false);
          return;
        }
        // Load establishment here so that it survives page refresh
        const establishments = await listEstablishments().catch(() => []);
        if (!active) return;
        setEstablishments(establishments);
        setActiveEstablishmentId(establishments[0]?.id ?? null);
        setAllowed(true);
      })
      .catch(() => {
        if (active) setAllowed(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (allowed === null) return null; // brief blank frame while checking

  // Remember where they were headed so sign-in can return them there.
  return allowed ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
