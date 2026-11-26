# KROX tööriistad

KROX OÜ äpp: tööpäevik, kulud ja tšekid (→ Merit Aktiva + Drive), lähetused, kalkulaatorid.
Lihtne HTML/JS (ilma build-sammuta) + Verceli serveri funktsioonid kaustas `api/`.

## Tšekkide seadistus (Vercel → Project → Settings → Environment Variables)

| Muutuja | Kust saab |
|---|---|
| `APP_PIN` | Mõtle ise välja (nt 6 numbrit). Sama PIN sisesta äpis ⚙ Seaded → Ühendused. |
| `MERIT_API_ID`, `MERIT_API_KEY` | Merit Aktiva → Seadistused → Ettevõtte andmed → API seadistused → uus API võti |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (tšekkide automaatne lugemine) |
| `MERIT_ITEM_CODE` (valikuline) | Meriti artikli kood kulude jaoks, vaikimisi `KULU` |

Pärast muutujate lisamist tee Vercelis uus deploy (Deployments → Redeploy).

Tšekid lähevad Meritisse **kinnitamist ootama** (`sendpurchorder`): firma kaardiga makstud ostuarvena,
oma rahaga makstud kuluaruandena. Tšeki pilt läheb kaasa PDF-ina.
