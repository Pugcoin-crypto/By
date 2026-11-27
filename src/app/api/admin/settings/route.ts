import { settingsPatchSchema, STAFF_SETTINGS_FIELDS } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { parseBody } from "../_util";

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  return Response.json(await (await getStore()).getSettings());
}

/** Staff may only pause/resume ordering; everything else needs admin. */
export async function PATCH(request: Request) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const patch = await parseBody(request, settingsPatchSchema);
  if (patch instanceof Response) return patch;
  if (auth.role !== "admin" && Object.keys(patch).some((k) => !(STAFF_SETTINGS_FIELDS as readonly string[]).includes(k))) {
    return Response.json({ error: "Ehhez admin jogosultság kell." }, { status: 403 });
  }
  return Response.json(await (await getStore()).updateSettings(patch));
}
