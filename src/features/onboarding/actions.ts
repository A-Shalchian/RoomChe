"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const surveySchema = z.object({
  reason: z.enum(["declutter", "catalogue", "valuables", "moving"]),
  volume: z.enum(["little", "room", "home", "lots"]),
  hardest: z.enum(["sentimental", "mightneed", "cost", "notime"]),
  goal: z.string().trim().max(280).optional(),
});

export type SurveyAnswers = z.infer<typeof surveySchema>;

export async function completeOnboarding(answers: SurveyAnswers) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = surveySchema.safeParse(answers);
  if (!parsed.success) {
    throw new Error("please answer every question");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      survey: parsed.data,
      onboarded_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/app");
}
