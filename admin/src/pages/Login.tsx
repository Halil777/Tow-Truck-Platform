import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { login } from "../api/client";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const isValidPassword = useMemo(() => password.length >= 6, [password]);
  const canSubmit = isValidEmail && isValidPassword;

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => {
      const redirectTo = location.state?.from?.pathname || "/";
      navigate(redirectTo, { replace: true });
    },
  });

  useEffect(() => {
    if (error) return;
    if (formError) setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError(
        !isValidEmail ? t("Enter a valid email") : t("Password must be at least 6 characters")
      );
      return;
    }
    reset();
    mutate();
  };

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border bg-white p-6 shadow dark:bg-neutral-900">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">{t("login")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Sign in to continue")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1 block text-sm">{t("email")}</span>
          <input
            className="w-full rounded-md border p-2 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="block">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{t("password")}</span>
            <button
              type="button"
              className="text-blue-600 hover:underline"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? t("Hide") : t("Show")}
            </button>
          </div>

          <input
            className="w-full rounded-md border p-2 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
          />
        </label>

        <button
          className="mt-2 w-full rounded-md bg-blue-600 p-2 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !canSubmit}
          type="submit"
        >
          {isPending ? t("loading") : t("signIn")}
        </button>

        {(formError || error) && (
          <div className="mt-2 text-sm text-red-600">
            {formError || (error as any)?.response?.data?.message || t("Login failed")}
          </div>
        )}
      </form>
    </div>
  );
}
