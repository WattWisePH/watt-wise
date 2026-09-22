/**
 * The icon shown for an establishment, based on its type. Shared between
 * Profile's establishment list and Dashboard's selector.
 */

import { useEffect, useState } from "react";
import {
  BuildingOfficeIcon,
  CoffeeIcon,
  ForkKnifeIcon,
  HouseIcon,
  StorefrontIcon,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

import {
  listEstablishmentTypes,
  type Establishment,
} from "../../lib/establishments";

// Keyed by establishment_types.name (supabase/migrations/20260814000200_lookup_tables.sql).
// A type added later just falls back to HouseIcon below.
const TYPE_ICONS: Record<string, Icon> = {
  Household: HouseIcon,
  Cafe: CoffeeIcon,
  Restaurant: ForkKnifeIcon,
  "Retail Store": StorefrontIcon,
  Office: BuildingOfficeIcon,
};

/** typeId -> type name, loaded once and shared by every caller. */
function useEstablishmentTypeNames(): Record<string, string> {
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    listEstablishmentTypes()
      .then((types) =>
        setTypeNames(Object.fromEntries(types.map((t) => [t.id, t.name]))),
      )
      .catch(() => {}); // icons just fall back to HouseIcon
  }, []);

  return typeNames;
}

export function EstablishmentIcon({
  establishment,
  ...iconProps
}: { establishment: Pick<Establishment, "typeId"> } & IconProps) {
  const typeNames = useEstablishmentTypeNames();
  const Icon = TYPE_ICONS[typeNames[establishment.typeId]] ?? HouseIcon;
  return <Icon {...iconProps} />;
}
