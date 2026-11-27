import type { z } from "zod";

/** Parses a JSON body against a schema; returns the data or a 400 Response. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Hibás kérés." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: `${issue?.path.join(".") || "adat"}: ${issue?.message ?? "hibás érték"}` }, { status: 400 });
  }
  return parsed.data;
}

export function checkRefs(
  product: { categoryId: string; modifierGroupIds: string[] },
  catalog: { categories: { id: string }[]; modifierGroups: { id: string }[] },
): string | null {
  if (!catalog.categories.some((c) => c.id === product.categoryId)) return "Ismeretlen kategória.";
  const missing = product.modifierGroupIds.find((g) => !catalog.modifierGroups.some((m) => m.id === g));
  return missing ? `Ismeretlen opciócsoport: ${missing}.` : null;
}
