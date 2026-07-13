import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { createContext, useContext, useEffect, useState } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";

const resources: Record<string, any> = { en, de };
type Lang = "en" | "de";

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
      if (v === "en" || v === "de") setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem("lang", l);
  };

  const t = (key: string) => resolve(resources[lang], key);

  return (
    <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
  );
}