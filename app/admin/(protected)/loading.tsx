import { PageLoading } from "@/app/_components/page-loading";

export default function ProtectedAdminLoading() {
  return (
    <PageLoading
      compact
      label="Admin adatok betöltése folyamatban"
      hint="A vezérlőpult tartalma hamarosan megjelenik."
    />
  );
}
