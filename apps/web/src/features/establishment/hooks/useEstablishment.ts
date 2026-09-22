import { useContext } from "react";
import { EstablishmentContext } from "../../../providers/establishmentContext";

export const useEstablishment = () => {
  const context = useContext(EstablishmentContext);
  if (!context)
    throw new Error(
      "useEstablishment must be used within EstablishmentProvider",
    );
  return context;
};
