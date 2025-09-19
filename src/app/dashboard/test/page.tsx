import { notFound } from "next/navigation";

export default function Page() {
  // 旧路由保护：直接 404，防止线上误访问 /dashboard/test
  return notFound();
}


