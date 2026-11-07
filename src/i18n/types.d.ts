import type en from "../../messages/en.json";
import type { Locale } from "./config";

// Type-checks every t("…") key against the English messages
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
