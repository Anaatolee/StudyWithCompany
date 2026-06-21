import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthCard initialMode="signup" />
      </Suspense>
    </AuthShell>
  );
}
