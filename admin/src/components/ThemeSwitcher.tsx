import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "../hooks/useTheme";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const change = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setTheme(e.target.value as Theme);

  return (
    <div className="row">
      <span className="muted">{t("theme")}:</span>
      <select value={theme} onChange={change} aria-label="theme">
        <option value="light">{t("light")}</option>
        <option value="dark">{t("dark")}</option>
        <option value="system">{t("system")}</option>
      </select>
    </div>
  );
}
