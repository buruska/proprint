# Pro-Print Next.js projekt

Ez a projekt egy Next.js 16 alapú Pro-Print weboldal admin felülettel, MongoDB adattárolással, NextAuth alapú admin belépéssel és GridFS alapú fájlkezeléssel.

## Vercel telepítés

1. Töltsd fel a projektet egy Git repositoryba.
2. Importáld a repositoryt a Vercelbe új projektként.
3. Framework presetnek maradhat a `Next.js`.
4. Add meg az alábbi Environment Variables értékeket a Vercel Project Settings alatt.
5. Deploy után ellenőrizd az admin belépést, a MongoDB kapcsolatot, a könyvborítók és szolgáltatásképek betöltését, valamint az email küldést.

## Szükséges environment változók

A `.env.example` fájl mintaként szolgál. Vercelben ezeket állítsd be:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM`
- `ORDER_EMAIL_TO`
- `CONTACT_EMAIL_TO`

## Megjegyzések Vercelhez

- A projekt MongoDB-t használ, a kapcsolat a `MONGODB_URI` változóból jön.
- A feltöltött könyvborítók, szolgáltatásképek, tartalomképek és ebook fájlok MongoDB GridFS-ben tárolódnak, ezért nem igényelnek lokális perzisztens fájlrendszert.
- Az admin oldalak védelmét NextAuth és a `proxy.ts` biztosítja.
- A `.vercelignore` kizárja a lokális dokumentációt, migrációs scripteket és ideiglenes logokat a feltöltési kontextusból.

## Lokális ellenőrzés deploy előtt

```bash
npm install
npm run lint
npm run build
```

## Jelenlegi állapot

A projekt jelenleg sikeresen buildel, és a Vercel deployhoz szükséges alap konfiguráció készen áll.
