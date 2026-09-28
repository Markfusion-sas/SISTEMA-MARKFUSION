import { PageTransition } from "@/components/shared/page-transition";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
