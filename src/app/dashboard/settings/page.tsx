"use client";

import React from "react";
import { SettingsPage as Settings } from "../components/settings-page";

export const dynamic = "force-static";

export default function Page() {
  return <Settings />;
}



