import { connection } from "next/server";
import { redirect } from "next/navigation";
import { formatHuf } from "@/lib/pricing";
import { buildStats, type PeriodStats } from "@/lib/stats";
import { currentStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

const dayFmt = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });

export default async function StatsPage() {
  await connection();
  if ((await currentStaff())?.role !== "admin") redirect("/admin");
  const now = new Date();
  const orders = await (await getStore()).listOrdersSince(new Date(now.getTime() - 8 * 86_400_000).toISOString());
  const s = buildStats(orders, now);
  const max = Math.max(1, ...s.byDay.map((d) => d.revenue));

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">Statisztika</h1>
      <p className="mt-1 text-sm text-text-custom-2">Bevétel = lezárt (teljesített) rendelések. Rendelésszám = minden nem elutasított rendelés.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <PeriodCard title="Ma" p={s.today} />
        <PeriodCard title="Utolsó 7 nap" p={s.week} />
      </div>

      <section className="mt-6 rounded-card bg-surface p-4">
        <h2 className="font-bold">Napi bevétel</h2>
        <ul className="mt-4 grid gap-2">
          {s.byDay.map((d) => (
            <li key={d.date} className="grid grid-cols-[7rem_1fr_6.5rem] items-center gap-3 text-sm">
              <span className="text-text-custom-2">{dayFmt.format(new Date(`${d.date}T12:00:00Z`))}</span>
              <span className="h-3 rounded-full bg-surface-2">
                <span className="block h-3 rounded-full bg-secondary" style={{ width: `${(d.revenue / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">
                {formatHuf(d.revenue)} <span className="text-text-custom-2">· {d.orders}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-card bg-surface p-4">
        <h2 className="font-bold">Legnépszerűbb tételek (7 nap)</h2>
        {s.topItems.length === 0 ? (
          <p className="mt-3 text-white/50">Még nincs adat.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-text-custom-2">
              <tr>
                <th className="py-1 font-normal">Tétel</th>
                <th className="py-1 text-right font-normal">Darab</th>
                <th className="py-1 text-right font-normal">Forgalom</th>
              </tr>
            </thead>
            <tbody>
              {s.topItems.map((i) => (
                <tr key={i.name} className="border-t border-white/10">
                  <td className="py-2">{i.name}</td>
                  <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{formatHuf(i.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function PeriodCard({ title, p }: { title: string; p: PeriodStats }) {
  return (
    <section className="rounded-card bg-surface p-4">
      <h2 className="text-text-custom-2">{title}</h2>
      <p className="mt-1 text-3xl font-bold tabular-nums">{formatHuf(p.revenue)}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-text-custom-2">Rendelés</dt>
          <dd className="text-lg font-bold tabular-nums">{p.orderCount}</dd>
        </div>
        <div>
          <dt className="text-text-custom-2">Átlag kosár</dt>
          <dd className="text-lg font-bold tabular-nums">{formatHuf(p.averageBasket)}</dd>
        </div>
        <div>
          <dt className="text-text-custom-2">Elutasítva</dt>
          <dd className="text-lg font-bold tabular-nums">{p.rejectedCount}</dd>
        </div>
      </dl>
    </section>
  );
}
