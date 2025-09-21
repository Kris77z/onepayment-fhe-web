"use client";

import React from "react";
import { HistoryPage as History } from "../components/history-page";

export const dynamic = "force-static";

export default function Page() {
  return <History />;
}



