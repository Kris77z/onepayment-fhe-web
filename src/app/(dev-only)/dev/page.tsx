import { notFound } from "next/navigation";
import ClientTest from "./client-test";

export default function Page() {
  if (process.env.NODE_ENV !== 'development') {
    return notFound();
  }
  return <ClientTest />;
}

