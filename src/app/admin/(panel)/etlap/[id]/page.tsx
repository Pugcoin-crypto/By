import { notFound, redirect } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { currentStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

export default async function ProductEditPage({ params }: PageProps<"/admin/etlap/[id]">) {
  const staff = await currentStaff();
  if (staff?.role !== "admin") redirect("/admin/etlap");
  const { id } = await params;
  const catalog = await (await getStore()).getCatalog();
  const product = id === "uj" ? null : catalog.products.find((p) => p.id === id);
  if (product === undefined) notFound();
  return <ProductEditor catalog={catalog} product={product} />;
}
