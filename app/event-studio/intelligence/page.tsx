import { redirect } from "next/navigation";

export const metadata = {
  title: "Real-world Intelligence — V2.3",
  description: "실뉴스 기반 AI 시나리오 GM Preview (V1 RC 분리)",
};

export default function IntelligencePage() {
  redirect("/admin/intelligence");
}
