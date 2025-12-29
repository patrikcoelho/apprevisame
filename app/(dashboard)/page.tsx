import HomeClient from "./home-client";
import { createClient } from "@/lib/supabase/server";

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

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      "id,due_at,study:studies(topic,studied_at,subject:subjects(name))"
    )
    .eq("status", "pendente")
    .order("due_at", { ascending: true });

  const initialReviews =
    reviewsData?.map((review) => ({
      id: review.id,
      subject: review.study?.subject?.name ?? "Matéria não definida",
      topic: review.study?.topic ?? "Assunto não definido",
      studiedAt: review.study?.studied_at
        ? toDateKey(new Date(review.study.studied_at))
        : toDateKey(new Date()),
      dueAt: review.due_at ? toDateKey(new Date(review.due_at)) : toDateKey(new Date()),
    })) ?? [];

  return (
    <HomeClient fullName={profile?.full_name} initialReviews={initialReviews} />
  );
}
