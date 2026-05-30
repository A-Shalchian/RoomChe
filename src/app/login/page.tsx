import { LoginShell } from "@/features/auth/login-shell";
import { DotBloomLogin } from "@/features/auth/dot-bloom-login";

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
