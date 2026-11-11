import { LoginForm } from "@/components/auth/LoginForm";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Sign In",
    "Sign in to NextSITREP to find and save nearby VA facilities and manage your resource notes.",
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3" aria-hidden="true">
            🇺🇸
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-600 mt-1">
            Sign in to your NextSITREP account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
