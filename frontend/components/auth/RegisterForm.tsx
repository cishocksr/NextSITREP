"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import type { BranchOfService } from "@/lib/types";
import { BRANCH_LABELS } from "@/lib/types";

const branchOptions = (Object.keys(BRANCH_LABELS) as BranchOfService[]).map(
  (key) => ({
    value: key,
    label: BRANCH_LABELS[key],
  }),
);

export function RegisterForm() {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    branchOfService: "" as BranchOfService | "",
    zipCode: "",
    password: "",
    confirmPassword: "",
    acceptsLegal: false,
  });

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.branchOfService) {
      setError("Please select your branch of service.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.acceptsLegal) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        branchOfService: form.branchOfService,
        zipCode: form.zipCode,
        password: form.password,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          autoComplete="given-name"
          required
          value={form.firstName}
          onChange={(e) => update("firstName", e.target.value)}
          placeholder="John"
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          required
          value={form.lastName}
          onChange={(e) => update("lastName", e.target.value)}
          placeholder="Smith"
        />
      </div>

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        required
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="you@example.com"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Branch of service"
          required
          options={branchOptions}
          placeholder="Select branch"
          value={form.branchOfService}
          onChange={(e) => update("branchOfService", e.target.value)}
        />
        <Input
          label="Zip code"
          required
          maxLength={5}
          pattern="[0-9]{5}"
          value={form.zipCode}
          onChange={(e) => update("zipCode", e.target.value)}
          placeholder="90210"
          hint="Used for nearby searches"
        />
      </div>

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        placeholder="Min. 8 characters"
      />

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        value={form.confirmPassword}
        onChange={(e) => update("confirmPassword", e.target.value)}
        placeholder="Re-enter your password"
      />

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.acceptsLegal}
          onChange={(e) => update("acceptsLegal", e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="leading-6">
          I agree to the{" "}
          <Link
            href="/terms"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Terms
          </Link>
          ,{" "}
          <Link
            href="/privacy"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Privacy Policy
          </Link>
          , and{" "}
          <Link
            href="/disclaimer"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Disclaimer
          </Link>
          .
        </span>
      </label>

      <Button
        type="submit"
        size="lg"
        isLoading={isLoading}
        disabled={!form.acceptsLegal}
        className="w-full mt-1"
      >
        Create Account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
