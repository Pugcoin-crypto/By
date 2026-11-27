import { connection } from "next/server";
import { GroupsEditor } from "@/components/admin/groups-editor";
import { getStore } from "@/server/store";

export default async function OptionsPage() {
  await connection();
  const catalog = await (await getStore()).getCatalog();
  return <GroupsEditor groups={catalog.modifierGroups} products={catalog.products} />;
}
