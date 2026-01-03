import HomeClient from "./home-client";
import { createClient } from "@/lib/supabase/server";

type ReviewRow = {
  id: string;
  due_at: string;
  status: "pendente" | "concluida" | "adiada";
  completed_at: string | null;
  review_duration_seconds: number | null;
  study?: {
    topic?: string | null;
    studied_at?: string | null;
    notes?: string | null;
    questions_total?: number | null;
    questions_correct?: number | null;
    subject?: { name?: string | null } | null;
  } | null;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const fallbackName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0];

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      "id,due_at,status,completed_at,review_duration_seconds,study:studies(topic,studied_at,notes,questions_total,questions_correct,subject:subjects(name))"
    )
    .eq("user_id", user?.id ?? "")
    .order("due_at", { ascending: true });

  const initialReviews =
    (reviewsData as ReviewRow[] | null)?.map((review) => ({
      id: review.id,
      subject: review.study?.subject?.name ?? "Matéria não definida",
      topic: review.study?.topic ?? "Assunto não definido",
      notes: review.study?.notes ?? "",
      studiedAt: review.study?.studied_at
        ? toDateKey(new Date(review.study.studied_at))
        : toDateKey(new Date()),
      completedAt: review.completed_at,
      reviewDurationSeconds: review.review_duration_seconds ?? null,
      questionsTotal: review.study?.questions_total ?? null,
      questionsCorrect: review.study?.questions_correct ?? null,
      dueAt: review.due_at
        ? toDateKey(new Date(review.due_at))
        : toDateKey(new Date()),
      status: review.status ?? "pendente",
    })) ?? [];

  return (
    <HomeClient fullName={fallbackName} initialReviews={initialReviews} />
  );
}
