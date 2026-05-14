import { signInWithGoogle } from "@/features/auth/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-medium tracking-tight">log in</h1>
          <p className="text-sm text-foreground/60">
            sign in to start cataloging your stuff.
          </p>
        </div>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            continue with google
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </main>
  );
}
