# Media-Interactions

NASA Neo-Sentinel: 70 Years of Planetary Defense

**Panoramica del Progetto**

Neo-Sentinel è una piattaforma web interattiva creata in occasione del 70° anniversario della NASA. Il progetto si propone di trasformare i dati scientifici complessi relativi ai Near-Earth Objects (NEO) in un'esperienza esplorativa immersiva.
Il sito funge da "Centro di Controllo" digitale, dove l'utente assume il ruolo di operatore per monitorare gli asteroidi che transitano vicino al nostro pianeta.


**Obiettivi Formativi (Media Interaction)**

Il progetto esplora diverse dinamiche di interazione uomo-macchina:

- Data Visualization: Traduzione dei dati numerici delle API NASA in forme geometriche e scale dimensionali intuitive.
- Feedback Visivo: Risposta immediata dell'interfaccia agli input dell'utente (hover, click, scroll).
- Storytelling Interattivo: Celebrazione dei 70 anni della NASA attraverso l'evoluzione del monitoraggio spaziale.


**Funzionalità Principali**

1. Radar Dinamico (Live Tracking)
- Sfruttando le API NeoWs (Near Earth Object Web Service), il sistema genera un radar interattivo che posiziona gli asteroidi di oggi in base alla loro distanza reale dalla Terra.
- Interazione: Ogni oggetto è cliccabile per rivelare dettagli tecnici avanzati.
- Codifica Colore: Uso di gradienti per indicare immediatamente la pericolosità (Hazardous vs Safe).

2. Comparative Scale (Quanto è grande?)
- Una sezione dedicata al confronto dimensionale. L'utente può confrontare il diametro stimato di un asteroide con strutture iconiche terrestri (Colosseo, Torre Eiffel, Burj Khalifa) tramite uno slider interattivo.

3. Emergency Protocol (UI Reattiva)
- In caso di rilevamento di un oggetto "Potenzialmente Pericoloso", l'intera interfaccia subisce una mutazione cromatica (Warning State), dimostrando la capacità del sistema di comunicare urgenza attraverso il design.


**Stack Tecnologico**

- Linguaggi: HTML5, JavaScript.
- Styling: Tailwind CSS per un'interfaccia responsive e moderna.
- Data Fetching: Fetch API per l'integrazione con i server NASA.
- Visualizzazione: Chart.js / SVG Dinamici per le rappresentazioni grafiche.


**Design System**

Il design è ispirato ai NASA Graphics Standards e ai centri di comando aerospaziali:
- Tipografia: Helvetica per la leggibilità e JetBrains Mono per i dati tecnici.

Palette Colori:
- #0A0A0A (Space Black - Sfondo)
- #00FF41 (Data Green - Stato Sicuro)
- #FF3E3E (Alert Red - Stato di Pericolo)
- #1E293B (Slate - Pannelli di Controllo)


**Integrazione API**

Il progetto interroga l'endpoint feed della NASA:

// Esempio di chiamata API
const API_URL = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${YOUR_KEY}`;
