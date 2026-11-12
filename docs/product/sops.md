# SOP's

`/admin/sops`: de afspraken en best practices van IKR, per categorie en doorzoekbaar. Voor het hele team. Iedereen mag altijd toevoegen, aanpassen, goedkeuren en verwijderen. Voorlopig enkel intern.

## Werking
- **Eén SOP = één kaart:** titel, afspraak, categorie, status en bron (bv. "Weekly 19/11" of het oude Drive-document).
- **Categorieën:** Draaidagen & content, Creatief & montage, Klanten & meetings, Freelancers, Sales & prijzen, Contracten & facturatie, Intern & tools, Overig.
- **Status:**
  - **afgesproken**: geldt;
  - **voorstel**: wacht op een vinkje of kruisje;
  - **verouderd**: blijft vindbaar, maar staat standaard verborgen.
- **Zoeken:** alle woorden moeten voorkomen in de titel of de tekst, ongeacht hoofdletters of accenten.

## SOP-voorstellen uit de weekly
Zeg tijdens de weekly letterlijk **"@grokbot nieuwe SOP"**, gevolgd door de afspraak.
1. Het Fireflies-transcript komt binnen via de webhook. De dagelijkse cron dient als vangnet.
2. Een AI-taak (`weekly_sops`) haalt er **enkel** de expliciet aangeduide SOP's uit.
3. Die verschijnen als **SOP-voorstel** op de weekly-pagina en op de SOP-pagina.
4. Vinkje = afgesproken, kruisje = weg.

Andere "@grokbot …"-vragen worden een opdracht op de werkplek van wie het vroeg (zie `werkplek.md`).

Zonder "SOP" of "grokbot" in het transcript draait er geen AI-taak.

## Grokbot (MCP)
| Tool | Doet |
|---|---|
| `sops_zoeken` | zoeken; standaard enkel afgesproken SOP's |
| `sop_aanmaken` | nieuwe SOP, standaard als voorstel |
| `sop_bijwerken` | titel, tekst, categorie of status aanpassen |
| `sop_voorstel_beslissen` | voorstel goedkeuren of afwijzen |
| `sop_verwijderen` | SOP verwijderen |

Vraagt iemand hoe iets bij IKR gaat, dan zoekt Grokbot eerst in de SOP's.

## Startinhoud
25 SOP's uit "IKR — losse afspraken / SOP's" en "SOP freelancer" in de Drive, zonder het oude tabblad over AI en automatisatie.
