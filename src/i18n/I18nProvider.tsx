import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";

const resources: Record<string, any> = { en, de, ru, es, fr, tr, uk };
type Lang = "en" | "de" | "ru" | "es" | "fr" | "tr" | "uk";
const SUPPORTED: Lang[] = ["en", "de", "ru", "es", "fr", "tr", "uk"];

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nContextType>({} as I18nContextType);
export const useI18n = () => useContext(Ctx);

// "auth.signIn" -> walks the nested json
function resolve(obj: any, key: string): string {
  return key.split(".").reduce((o, k) => o?.[k], obj) ?? key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const osLang = (Localization.getLocales()[0]?.languageCode ?? "en") as Lang;
  const [lang, setLangState] = useState<Lang>(
    resources[osLang] ? osLang : "en"     // fall back to en if OS lang unsupported
  );

  useEffect(() => {
    AsyncStorage.getItem("lang").then((v) => {
      if (v && SUPPORTED.includes(v as Lang)) setLangState(v as Lang);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem("lang", l);
  }, []);

  // Stable per-language so memoized consumers don't re-render on unrelated renders.
  const t = useCallback((key: string) => resolve(resources[lang], key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <Ctx.Provider value={value}>{children}</Ctx.Provider>
  );
}