import { useMemo, useState } from "react";

import type { Establishment } from "../lib/establishments";
import { EstablishmentContext } from "./establishmentContext";

export const EstablishmentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeEstablishmentId, setActiveEstablishmentId] = useState<
    string | null
  >(null);

  const activeEstablishment =
    establishments.find((est) => est.id === activeEstablishmentId) ?? null;

  const value = useMemo(
    () => ({
      establishments,
      activeEstablishmentId,
      setEstablishments,
      setActiveEstablishmentId,
      activeEstablishment,
    }),
    [establishments, activeEstablishmentId, activeEstablishment],
  );

  return (
    <EstablishmentContext.Provider value={value}>
      {children}
    </EstablishmentContext.Provider>
  );
};
