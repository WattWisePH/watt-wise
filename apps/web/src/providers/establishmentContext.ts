import { createContext } from "react";

import type { Establishment } from "../lib/establishments";

interface EstablishmentContextValue {
  establishments: Establishment[];
  setEstablishments: React.Dispatch<React.SetStateAction<Establishment[]>>;
  activeEstablishmentId: string | null;
  setActiveEstablishmentId: React.Dispatch<React.SetStateAction<string | null>>;
  activeEstablishment: Establishment | null;
}

export const EstablishmentContext = createContext<
  EstablishmentContextValue | undefined
>(undefined);
