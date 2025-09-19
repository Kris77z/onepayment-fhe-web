import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

// 本地开发专用页：动态导入以避免沉重组件进入 SSR 包
const TestPage = dynamic(() => import("../../dashboard/components/test-page"), { ssr: false });

export default function Page() {
  if (process.env.NODE_ENV !== 'development') {
    return notFound();
  }
  return <TestPage />;
}


