"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PROPERTY, cleanProperty } from "@/lib/cardText";

/*
 * One property name, for every card on the site.
 *
 * A general manager types his hotel once and then watches his own card travel
 * the whole page: onto the card in the input, onto the photographed card in
 * the type slab, into the canvas texture the 3D card is printed from, and
 * therefore onto every one of the eighteen instanced cards in the corridor
 * and the fan, because they all sample that same texture.
 *
 * ── In memory, and nowhere else ──────────────────────────────────────────
 * This is a useState in a provider. Not localStorage, not sessionStorage, not
 * a cookie, not a query parameter, and nothing is sent anywhere. Close the
 * tab and it is gone. That is a property worth being able to state plainly,
 * and the way to state it plainly is to build it so it is true rather than to
 * promise it in a paragraph.
 *
 * ── Raw and clean, kept apart ────────────────────────────────────────────
 * The context exposes both. `raw` is what the input is controlled by, so a
 * trailing space someone is in the middle of typing does not disappear from
 * under their cursor. `name` is what every card draws: cleaned, capped, and
 * falling back to the placeholder when the field is empty, so no card is ever
 * blank and nothing untypeable ever reaches a canvas.
 */

type PropertyValue = {
  /** What every card should print. Never empty. */
  name: string;
  /** What the input is controlled by. May be empty; may have trailing space. */
  raw: string;
  setRaw: (value: string) => void;
};

const PropertyContext = createContext<PropertyValue | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [raw, setRawState] = useState("");

  // Cleaned on the way in as well as on the way out, so the field itself
  // visibly refuses a pasted newline rather than silently dropping it
  // somewhere between the input and the card.
  const setRaw = useCallback((value: string) => {
    setRawState(cleanProperty(value));
  }, []);

  const value = useMemo<PropertyValue>(() => {
    const trimmed = raw.trim();
    return {
      name: trimmed === "" ? DEFAULT_PROPERTY : trimmed,
      raw,
      setRaw,
    };
  }, [raw, setRaw]);

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

/**
 * The current property name.
 *
 * Falls back to the placeholder rather than throwing when there is no
 * provider. A card is a presentational thing and should render wherever it is
 * put; a missing provider is a wiring mistake that should show up as the
 * default name on a card, not as a blank page.
 */
export function useProperty(): PropertyValue {
  const ctx = useContext(PropertyContext);
  return (
    ctx ?? {
      name: DEFAULT_PROPERTY,
      raw: "",
      setRaw: () => {},
    }
  );
}
