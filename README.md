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

Admin belépés memória módban: `ADMIN_DEV_PASSWORD=titok npm run dev`, majd
http://localhost:3000/admin. Firebase módban a Firebase Auth fiókkal kell belépni.

## Élesítés (egyszer)

Parancssor nélkül, csak a Firebase és a Vercel weboldalán:

1. **Firebase projekt**: Firestore Database (Standard, `europe-west3`, production mode), Authentication → Email/Password bekapcsolva.
2. **Szabályok**: Firestore → Rules fül → a `firestore.rules` tartalmát bemásolni → Publish.
3. **Admin felhasználó**: Authentication → Users → Add user (a tulajdonos e-mail címe és jelszava).
   Utána Authentication → Settings → User actions → az „Enable create (sign-up)” kikapcsolása, hogy más ne tudjon fiókot nyitni.
4. **Vercel**: Add New → Project → a GitHub repó importálása, és az Environment Variables:
   - `FIREBASE_SERVICE_ACCOUNT_KEY` – a letöltött service account JSON teljes tartalma
   - `ADMIN_EMAIL` – a 3. pontban létrehozott e-mail cím (ez a fiók automatikusan admin)
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` – a Firebase web app configból
5. **Deploy**. Az első kérésnél az app magától feltölti az üres adatbázist a kezdő étlappal.
6. Firebase → Authentication → Settings → Authorized domains: a Vercel domain (és később az erdenskebap.hu) hozzáadása.

Parancssorból ugyanez: `npx firebase-tools deploy --only firestore`, `npm run seed` (felülírás: `-- --force`),
további admin/személyzet: `npm run create-admin -- email@pelda.hu [--staff]` vagy az admin Személyzet oldala.

## API

| Végpont | Leírás |
| --- | --- |
| `GET /api/menu` | Kategóriák, termékek, opciók, szállítási zónák, nyitva/zárva állapot |
| `GET /api/delivery-quote?zip=2200&city=Monor` | Szállítási díj, minimum, becsült idő |
| `POST /api/orders` | Rendelés leadása; az árat a szerver számolja újra |
| `GET /api/orders/track/{token}` | Rendeléskövetés (név, telefon, cím nélkül) |
| `/api/admin/*` | Admin API (bejelentkezés, rendelések, étlap, beállítások, statisztika, személyzet) |

## Admin (`/admin`)

- **Rendelések**: élő tábla (Új → Készül → Úton / Átvehető → Lezárva), hangjelzés új rendelésnél, becsült idő (20–90 perc), elutasítás indoklással, konyhai blokk nyomtatása (80 mm).
- **Étlap**: termékek, árak, „Elfogyott” kapcsoló, kategóriák; **Opciók**: feltét- és szószcsoportok.
- **Beállítások**: rendelésfogadás szüneteltetése üzenettel, nyitvatartás, szállítási zónák, minimum rendelés.
- **Statisztika**: mai és heti forgalom, rendelésszám, átlagkosár, legnépszerűbb termékek.
- **Személyzet** (csak admin, Firebase módban): új munkatárs hozzáadása `staff` szerepkörrel.

A `staff` szerepkör rendeléseket kezelhet, terméket elfogyottra állíthat és szüneteltetheti a rendelésfogadást; minden mást csak az `admin` módosíthat.

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
src/server/     csak szerver: adatréteg (Firestore / memória), rendelés leadás, admin auth, rate limit
src/app/admin/  admin felület
src/components/ rendelőfelület (order/) és admin (admin/) komponensek
src/app/api/    Route Handlerek
scripts/        seed, admin fiók létrehozása
firestore.rules Firestore jogosultságok
```
