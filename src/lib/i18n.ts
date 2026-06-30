import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en/translation.json";
import zhCN from "../locales/zh-CN/translation.json";

// ── Initialise i18next globally so useTranslation() works everywhere ──────
void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, "zh-CN": { translation: zhCN } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "tomato-language",
      caches: ["localStorage"],
    },
  });

export default i18next;
