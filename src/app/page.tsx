import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-4">
          <p className="font-mono text-xs tracking-widest text-foreground/50 uppercase">
            roomche
          </p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            make your room a database.
          </h1>
          <p className="text-base text-foreground/60">
            an inventory of every thing you own. photographed, named, placed.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            get started
          </Link>
          <Link
            href="/login"
            className="text-sm text-foreground/60 underline-offset-4 hover:underline"
          >
            i already have an account
          </Link>
        </div>
      </div>
    </main>
  );
}
