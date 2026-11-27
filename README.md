# Erden's Kebab · Monor – online rendelés

Next.js 16 (App Router) + Tailwind CSS v4 + Firebase (Firestore, Auth), Vercelre.

A megvalósítás három lépésben készül:

1. **Adatmodell és backend** – típusok, árszámítás, étlap seed, Firestore szabályok, rendelési API.
2. **Publikus rendelőfelület** – étlap, testreszabás, kosár, pénztár, rendeléskövetés.
3. **Admin dashboard** (`/admin`) – élő rendelések, étlapkezelés, beállítások, statisztika.

## Helyi futtatás

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run typecheck
```

Firebase kulcsok nélkül az app **memóriában** fut a seed étlappal: kipróbálható, de
újraindításkor a rendelések elvesznek. Élesben a `.env.example` szerinti
`FIREBASE_*` változók kellenek (Vercel → Project Settings → Environment Variables).

## Firebase beállítás (egyszer)

1. Firebase projekt → Firestore Database (Native mode, `eur3` vagy `europe-west`), Authentication → Email/Password.
2. Project settings → Service accounts → új privát kulcs → a JSON tartalmát a `FIREBASE_SERVICE_ACCOUNT_KEY` változóba.
3. Szabályok és indexek: `npx firebase-tools deploy --only firestore`.
4. Étlap feltöltése: `npm run seed` (felülírás: `npm run seed -- --force`).
5. Admin fiók: `npm run create-admin -- email@pelda.hu` (személyzet: `--staff`).

## API

| Végpont | Leírás |
| --- | --- |
| `GET /api/menu` | Kategóriák, termékek, opciók, szállítási zónák, nyitva/zárva állapot |
| `GET /api/delivery-quote?zip=2200&city=Monor` | Szállítási díj, minimum, becsült idő |
| `POST /api/orders` | Rendelés leadása; az árat a szerver számolja újra |
| `GET /api/orders/track/{token}` | Rendeléskövetés (név, telefon, cím nélkül) |

## Üzleti szabályok (2026-11-27)

- Nyitvatartás minden nap 10:30–20:00 (Europe/Budapest).
- Szállítás: Monor ingyenes; Monorierdő, Vasad, Csévharaszt, Péteri, Gomba, Bénye 800 Ft. Minimum rendelés nincs (állítható).
- Borjúhús +500 Ft; extra csirkehús +990 Ft, extra borjúhús +1 200 Ft.
- Zöldség (saláta, répa, lilakáposzta, hagyma) és alap szósz (fokhagymás, csípős) alapból benne, egyenként kivehető.
- Extra szósz +380 Ft (Andalouse, Hannibal, Curry, Samurai, Tartár), Cheddar +480 Ft.
- Fizetés: készpénz vagy bankkártya a futárnál.

## Felépítés

```
src/lib/        közös kód (kliens + szerver): típusok, árszámítás, seed, telefonszám, nyitvatartás
src/server/     csak szerver: adatréteg (Firestore / memória), rendelés leadás, rate limit
src/app/api/    Route Handlerek
scripts/        seed, admin fiók létrehozása
firestore.rules Firestore jogosultságok
```
