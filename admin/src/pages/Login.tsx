import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { login } from "../api/client";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation() as any;

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => {
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow dark:bg-neutral-900">
      <h1 className="text-xl font-semibold mb-4">{t("login")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm">{t("email")}</span>
          <input
            className="w-full rounded border p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm">{t("password")}</span>
          <input
            className="w-full rounded border p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          className="w-full rounded bg-blue-600 p-2 text-white disabled:bg-gray-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? t("loading") : t("signIn")}
        </button>
        {error && (
          <div className="text-red-500 text-sm mt-2">
            {(error as any)?.response?.data?.message || "Login failed"}
          </div>
        )}
      </form>
    </div>
  );
}
