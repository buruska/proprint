import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kezdőlap",
};

export default function HomePage() {
  redirect("/books");
}
