"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(4, "Password is required")
});

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? "")
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete the form.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to sign in.");
      }

      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="editorCard" onSubmit={handleSubmit}>
      <div className="statusBanner">
        Demo login uses an HTTP-only session cookie. Change the environment
        values before public deployment.
      </div>

      <div className="formGrid" style={{ marginTop: 16 }}>
        <label className="field">
          <span>Username</span>
          <input
            className="textInput"
            name="username"
            defaultValue={process.env.DEMO_ADMIN_USERNAME ?? "demo-admin"}
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="textInput"
            name="password"
            type="password"
            placeholder="Enter the demo password"
            autoComplete="current-password"
          />
        </label>
      </div>

      <p className="formHint">
        The default demo credentials are documented in the README.
      </p>

      {error ? <p className="errorText">{error}</p> : null}

      <div className="formActions">
        <button className="buttonPrimary" type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}

