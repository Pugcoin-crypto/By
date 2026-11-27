import { connection } from "next/server";
import { MenuManager } from "@/components/admin/menu-manager";
import { getStore } from "@/server/store";

export default async function MenuAdminPage() {
  await connection();
  const catalog = await (await getStore()).getCatalog();
  return <MenuManager catalog={catalog} />;
}
