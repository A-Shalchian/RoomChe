import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function originOf(request: NextRequest): string {
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto");
  if (fwdHost) return `${fwdProto ?? "https"}://${fwdHost}`;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = originOf(request);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, is_allowed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=closed", origin));
  }

  const next = profile.onboarded_at ? "/app" : "/onboarding";
  return NextResponse.redirect(new URL(next, origin));
}
