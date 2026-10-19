import type { Metadata } from "next";
import { ProjectShell } from "@/components/project/shell";

export const metadata: Metadata = { title: "Projeto" };

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <ProjectShell>{children}</ProjectShell>;
}
