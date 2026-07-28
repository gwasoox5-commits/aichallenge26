import { redirect } from "next/navigation";

export const metadata = {
  title: "Event Scenario Studio — V2.1",
  description: "AI-assisted event scenario draft for instructors (separate from V1 GA game ops)",
};

export default function EventStudioPage() {
  redirect("/admin/event-studio");
}
