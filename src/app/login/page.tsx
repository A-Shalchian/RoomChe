import type { Metadata } from "next";
import { LoginShell } from "@/features/auth/login-shell";
import { DotBloomLogin } from "@/features/auth/dot-bloom-login";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  return (
    <LoginShell>
      <DotBloomLogin error={error} />
    </LoginShell>
  );
}
