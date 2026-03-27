import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🇺🇸</div>
          <h1 className="text-2xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="text-slate-500 mt-1">
            Free access to veteran resources near you
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
