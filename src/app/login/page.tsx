import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthCard initialMode="login" />
      </Suspense>
    </AuthShell>
  );
}
