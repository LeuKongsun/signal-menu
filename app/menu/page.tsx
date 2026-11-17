import type { Metadata } from "next";
import { BrowseMenu } from "@/components/BrowseMenu";

export const metadata: Metadata = {
  title: "SIGNAL Cafe | In-store Menu (ម៉ឺនុយ)",
  description:
    "Browse the SIGNAL Cafe drink menu in store: Khmer coffee, iced espresso, matcha, teas, frappés, and sodas.",
};

export default function MenuPage() {
  return <BrowseMenu />;
}
