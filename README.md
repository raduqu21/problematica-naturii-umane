# Problematica naturii umane

**Live: [raduqu21.github.io/problematica-naturii-umane](https://raduqu21.github.io/problematica-naturii-umane/)**

Site-proiect pentru disciplina **Filosofie** — clasa a XII-a.
Conținutul urmează paginile **6–8** din manualul *Filosofie* (Ioan N. Roșca — coordonator, Codruța Sorina Missbach, Gabriel Ion, Editura Corint): „Problema filosofică a omului" și „Esența omului".

**Prin ce se remarcă:** o lectură vizuală de tip *scrollytelling* — scenă cosmică 3D în WebGL, tabloul lui Gauguin în hero, o galerie orizontală cu portretele filosofilor (Aristotel → Descartes → Hume → Kant), o axă verticală „nimic ↔ tot" pentru Pascal, globele *Eu/Tu* pentru alteritate și un quiz de verificare.

Textul urmează un **fir narativ** (definiții → disproporție → devenire → persoană): fiecare secțiune se încheie cu o verigă de tranziție care duce firesc în subiectul următor, iar portretele sunt integrate în pagină (note în margine, carduri, medalioane).

## Stack tehnologic

| Scop | Tehnologie | Unde se vede |
|---|---|---|
| Randare 3D în browser | **Three.js** (module ES) + scena de particule cu shadere proprii | hero-ul (praful cosmic) |
| Shadere personalizate | **GLSL** (vertex + fragment: puncte, twinkle, voal FBM) | `assets/js/main.js`, secțiunea 1 |
| Animații pe scroll | **GSAP + ScrollTrigger** (pin, scrub, stagger, reveal) | galeria orizontală, scena Pascal, restul paginii |
| Derulare fluidă | **Lenis** | tot site-ul |
| Stilizare | **Tailwind CSS v4** (reset + utilitare) + stiluri proprii cu tokeni | `assets/src/input.css` → build în `assets/css/main.css` |
| Tipografie | **Fonturi variabile** auto-găzduite: *Fraunces* (opsz/wght), *Newsreader* (opsz/wght), *Instrument Sans* (wdth/wght) | tot site-ul |

Toate librăriile și fonturile sunt **auto-găzduite** în `assets/vendor/` și `assets/fonts/` — site-ul nu depinde de niciun CDN și funcționează complet offline (servit local).

## Rulare locală

Browserele nu încarcă module ES direct de pe `file://`, deci e nevoie de un server simplu:

```bash
# variantă (orice dintre ele)
npm run serve          # → http://localhost:4173
python -m http.server 4173
npx serve .
```

Apoi deschide <http://localhost:4173>.

## Structura proiectului

```
├── index.html              # tot conținutul (secțiunile sunt comentate)
├── favicon.svg
├── assets/
│   ├── css/
│   │   ├── fonts.css       # @font-face pentru fonturile auto-găzduite
│   │   └── main.css        # CSS compilat (nu edita direct!)
│   ├── fonts/              # fonturi variabile .woff2 (latin + latin-ext)
│   ├── img/                # portretele filosofilor + tabloul Gauguin (domeniu public)
│   ├── js/
│   │   └── main.js         # animații, scena 3D, quiz, setări
│   ├── src/
│   │   └── input.css       # SURSA stilurilor (aici se editează designul)
│   └── vendor/             # three.js, GSAP, ScrollTrigger, Lenis (auto-găzduite)
└── package.json
```

## Cum modifici

- **Textul** — direct în `index.html` (fiecare secțiune are comentariu propriu).
- **Designul** (culori, spațieri, tipografie) — în `assets/src/input.css`, apoi `npm run build:css`.
- **Animațiile** — în `assets/js/main.js` (numerotat pe secțiuni).
- **Tema / mișcarea / mărimea textului** — butoanele din colțul dreapta-sus; se salvează în browser.

## Accesibilitate & robustețe

- Conținutul e lizibil și **fără JavaScript** (animațiile sunt strict o îmbunătățire).
- `prefers-reduced-motion` este respectat; există și comutator manual de animații.
- Contrast verificat pentru text; stare de focus vizibilă; quiz cu `aria-live`.
- Pagina funcționează și dacă WebGL lipsește (rămâne fundalul gradat).

## Surse

- Ioan N. Roșca (coord.), Codruța Sorina Missbach, Gabriel Ion — *Filosofie*, manual pentru clasa a XII-a, Editura Corint: pp. 6–8. Textele au fost condensate pentru formatul web; citatele aparțin autorilor menționați (Socrate, Aristotel, Pascal, Descartes, Hume, Kant, Sartre, Blaga, Noica, Temple).
- Citatele și conceptele: conform manualului; secțiunea de quiz pornește din aceleași pagini.

## Licențe

- **Codul acestui proiect:** MIT.
- **three.js** (MIT), **GSAP/ScrollTrigger** (licența standard GreenSock — utilizare gratuită), **Lenis** (MIT) — copii minificate în `assets/vendor/`.
- **Fonturile** Fraunces, Newsreader, Instrument Sans — licență SIL Open Font License (Google Fonts).
- **Imaginile** din `assets/img/` — tabloul lui Paul Gauguin și portretele (Socrate, Aristotel, Descartes — Frans Hals, Hume — Allan Ramsay, Kant, Pascal): domeniu public, via [Wikimedia Commons](https://commons.wikimedia.org).
