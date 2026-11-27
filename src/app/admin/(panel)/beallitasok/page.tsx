import { connection } from "next/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStore } from "@/server/store";

export default async function SettingsPage() {
  await connection();
  const store = await getStore();
  const [settings, zones] = await Promise.all([store.getSettings(), store.getZones()]);
  return <SettingsForm settings={settings} zones={zones} />;
}
