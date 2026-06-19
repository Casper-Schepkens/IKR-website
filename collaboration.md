# Samenwerking & Git — richtlijnen voor mensen en AI-agents

> **Voor AI-agents:** Lees dit bestand aan het begin van elke sessie, samen met `progress.md`, `next_session.md`, `decisions.md` en `blockers.md`. Volg deze regels strikt — overschrijf geen secties van andere pagina's of andere developers.

---

## Repo-overzicht

| Item | Waarde |
|------|--------|
| GitHub | https://github.com/Casper-Schepkens/IKR-website |
| Hoofdbranch | `master` |
| App-map | `ikr-website/` |
| Lokaal starten | `cd ikr-website && npm run dev` |
| Deploy | Vercel — auto-deploy bij push naar `master` |

---

## Git in het kort

Drie stappen, altijd in deze volgorde:

1. **Lokaal werken** — bestanden aanpassen, verwijderen, toevoegen
2. **Commit** — snapshot opslaan in de git-geschiedenis (*"dit wil ik bewaren"*)
3. **Push** — die commits naar GitHub sturen (*"zet het online"*)

Een **Pull Request (PR)** is een extra laag bovenop push: een verzoek om jouw branch te mergen in `master`, zodat iemand anders kan reviewen voordat het live gaat.

```
lokaal werken  →  commit  →  push  →  (optioneel) PR  →  merge in master  →  Vercel deployt
```

---

## Wanneer commit + push op master, wanneer een PR?

| Situatie | Aanpak |
|----------|--------|
| Alleen jij, kleine wijziging (typfout, map opruimen, config-fix) | Commit + push direct op `master` |
| Samen met iemand anders | **Altijd** branch + PR — nooit direct op `master` |
| Grotere feature of refactor | Branch + PR |
| Meerdere mensen/agents werken tegelijk | Branch + PR, verdeeld per pagina/onderdeel |

**Vuistregel:** twijfel je? Maak een branch en PR. Conflicten zijn goedkoper dan iemand anders zijn werk overschrijven.

---

## Standaard workflow (samenwerken)

Voer dit uit vanuit de **repo-root** (`IKR/`, niet alleen `ikr-website/`):

```bash
# 1. Altijd eerst de nieuwste master binnenhalen
git pull origin master

# 2. Nieuwe branch voor jouw taak
git checkout -b feature/korte-naam

# 3. Werk, test lokaal
cd ikr-website && npm run dev

# 4. Alleen relevante bestanden stagen
git add pad/naar/bestanden

# 5. Commit met duidelijke boodschap
git commit -m "Korte beschrijving van wat en waarom"

# 6. Branch naar GitHub pushen
git push -u origin feature/korte-naam

# 7. PR aanmaken op GitHub (of via gh CLI)
gh pr create --title "Titel" --body "Wat, waarom, hoe testen"
```

Na merge: `git checkout master && git pull origin master` en eventueel je oude branch verwijderen.

---

## Branch-naming

Gebruik korte, beschrijvende namen:

- `feature/contact-form` — nieuwe functionaliteit
- `fix/pricing-layout` — bugfix
- `chore/remove-legacy-content` — opruimen, geen user-facing wijziging
- `content/homepage-copy` — tekst/copy-wijzigingen

Eén taak = één branch = één PR. Geen wekenlange mega-branches.

---

## Commits

- Commit alleen wat bij de taak hoort — geen per ongeluk gegenereerde bestanden (`next-env.d.ts`, `.env`, build-artifacts).
- Commit message: **wat** + **waarom**, niet alleen "fix" of "update".
- Goed: `Verwijder legacy-content map — niet meer nodig na audit`
- Slecht: `changes`, `wip`, `fix stuff`

Check vóór commit:

```bash
git status          # wat is gewijzigd?
git diff            # unstaged wijzigingen
git diff --staged   # wat gaat mee in de commit?
```

---

## Pull Requests

Elke PR moet minimaal bevatten:

1. **Wat** is er veranderd
2. **Waarom** (link naar taak/pagina indien relevant)
3. **Hoe te testen** (stappen of URL's)
4. **Welke pagina/sectie** — belangrijk bij parallel werk

Voorbeeld PR-body:

```markdown
## Summary
- Contactformulier: Turnstile-validatie toegevoegd
- Alleen `src/app/contact/` en `src/components/ikr/ContactForm.tsx`

## Test plan
- [ ] `npm run dev`, ga naar /contact
- [ ] Formulier versturen met geldig e-mailadres
- [ ] Turnstile-fout toont foutmelding
```

Review elkaars PR's vóór merge. Bij merge-conflicten: degene die de PR opent lost ze op (of vraag hulp).

---

## Pagina's verdelen (parallel agents)

Casper werkt vaak per pagina met meerdere AI-agents tegelijk. Verdeel werk expliciet:

| Pagina | Route | Map (indicatief) |
|--------|-------|------------------|
| Homepage | `/` | `src/app/page.tsx`, homepage-secties |
| Aanpak | `/aanpak` | `src/app/aanpak/` |
| Pricing | `/pricing` | `src/app/pricing/` |
| Contact | `/contact` | `src/app/contact/` |
| Cases | `/cases` | `src/app/cases/` |
| Algemeen | infra, deploy, shared | `src/components/`, config, `globals.css` |

**Regels voor agents:**

1. Werk **alleen aan de pagina/sectie** die in de opdracht staat.
2. Update **alleen jouw sectie** in `progress.md`, `next_session.md`, `blockers.md` en `decisions.md` — overschrijf andere secties nooit.
3. Raak gedeelde bestanden (`layout.tsx`, `globals.css`, navigatie) alleen aan als de taak dat expliciet vraagt — anders eerst afstemmen.
4. Weet je niet welke pagina? **Vraag** — niet gokken en het hele bestand overschrijven.

---

## Contextbestanden — altijd lezen en bijwerken

Deze bestanden staan in de repo-root en zijn de bron van waarheid tussen sessies en tussen developers:

| Bestand | Doel |
|---------|------|
| `big_idea.md` | Visie en scope per pagina |
| `progress.md` | Huidige stand per pagina |
| `next_session.md` | Volgende concrete stap per pagina |
| `decisions.md` | Gemaakte keuzes (stack, copy, design) |
| `blockers.md` | Openstaande blokkades per pagina |
| `collaboration.md` | Dit bestand — git & samenwerk-regels |

**Start van sessie:** lees `progress.md` + `next_session.md` voor jouw pagina.

**Einde van sessie (close procedure):** werk alleen jouw pagina-sectie bij in `progress.md`, `next_session.md`, `blockers.md` en eventueel `decisions.md`.

---

## Conflicten voorkomen

1. **Pull vóór je begint** — `git pull origin master`
2. **Kleine, frequente PR's** — niet dagen wachten met pushen
3. **Eén pagina per branch** waar mogelijk
4. **Geen direct pushen op `master`** als er een tweede developer actief is
5. **Communiceer** wie aan welke pagina werkt (Notion, Discord, of een regel in `next_session.md`)

Optioneel op GitHub: **branch protection** op `master` — merge alleen via PR, geen direct push.

---

## Veelvoorkomende commando's

```bash
# Status bekijken
git status

# Wijzigingen ongedaan maken (niet gecommit)
git restore bestand.tsx

# Bestand uit staging halen
git restore --staged bestand.tsx

# Verwijderde bestanden meenemen in commit
git add -u pad/naar/map/

# Laatste commits bekijken
git log --oneline -10

# Branch wisselen
git checkout master
git checkout feature/mijn-branch

# Master bijwerken na merge van PR
git checkout master
git pull origin master
```

**Nooit doen zonder expliciete opdracht:** `git push --force`, `git reset --hard`, git config wijzigen.

---

## Secrets en gevoelige bestanden

Commit **nooit**:

- `.env`, `.env.local`
- API-keys, tokens, wachtwoorden
- `node_modules/`

Environment variables horen in Vercel (of lokaal in `.env.local` die in `.gitignore` staat).

---

## Checklist voor elke sessie

**Start:**
- [ ] `git pull origin master`
- [ ] `progress.md` + `next_session.md` gelezen voor jouw pagina
- [ ] `decisions.md` gecheckt als je twijfelt over eerdere keuzes
- [ ] Duidelijk welke pagina/branch van jou is

**Tijdens:**
- [ ] Alleen relevante bestanden gewijzigd
- [ ] Lokaal getest (`npm run dev` / `npm run build`)

**Einde:**
- [ ] Commit met duidelijke message
- [ ] Push naar branch (of PR aangemaakt)
- [ ] Jouw secties bijgewerkt in `progress.md` en `next_session.md`
- [ ] Blockers toegevoegd/verwijderd in `blockers.md` indien nodig
