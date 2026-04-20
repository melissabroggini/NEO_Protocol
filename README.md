SUPSI 2026  
Corso d’interaction design, CV429.01  
Docenti: A. Gysin, G. Profeta  

Progetto 1: La conquista dello spazio

# NASA Neo-Sentinel
Autore: Melissa Broggini \
[NASA Neo-Sentinel](https://github.com/melissabroggini/Media-Interactions)


## Introduzione e tema
Neo-Sentinel è una piattaforma web interattiva creata in occasione del 70° anniversario della NASA. Il progetto si propone di trasformare i dati scientifici complessi relativi ai Near-Earth Objects (NEO) in un'esperienza esplorativa immersiva. 
Il sito funge da "Centro di Controllo" digitale, dove l'utente assume il ruolo di operatore per monitorare gli asteroidi che transitano vicino al nostro pianeta.


## Riferimenti progettuali
Il design system del progetto trae forte ispirazione dai rigorosi NASA Graphics Standards e dalle sofisticate interfacce dei centri di comando aerospaziali reali. L'obiettivo visivo è quello di combinare l'estetica tecnica (utilizzando font come JetBrains Mono per i dati e Helvetica per la leggibilità generale) con un'esperienza utente immersiva e drammatica tipica dell'immaginario sci-fi per trasmettere senso di urgenza e richiamare la scala cosmica.


## Design dell’interfaccia e modalità di interazione
L'applicazione si struttura come una console interattiva di live tracking:

- **Radar Dinamico (Live Tracking):** L'elemento centrale è un radar interattivo che posiziona gli asteroidi in tempo reale in base alla loro distanza effettiva dalla Terra. Ogni corpo celeste è cliccabile, rivelandone un pannello laterale con dettagli e specifiche tecniche avanzate. 
- **Codifica Visiva per la Sicurezza:** È in uso uno schema di gradienti e colorazioni specifiche per identificare l'indice di pericolosità. Il verde (Data Green) segnala uno "Stato Sicuro", mentre l'uso del rosso (Alert Red) segnala un pericolo.
- **Comparative Scale:** L'interfaccia include una funzionalità "Quanto è grande?" per convertire le grandezze degli oggetti spaziali in riferimenti concreti, confrontandoli (tramite slider interattivi) con strutture monumentali terrestri come il Colosseo, la Torre Eiffel e il Burj Khalifa.
- **Emergency Protocol (UI Reattiva):** Se l'operatore seleziona un oggetto catalogato come `Potenzialmente Pericoloso`, l'integrità del design reagisce modificando brutalmente la color palette globale in un severo stato di Allarme Rosso (Warning State).


## Tecnologia usata
Il frontend è avvalso di tecnologie native per garantire performance della visualizzazione e personalizzazione del layout:

- **Linguaggi:** HTML5 e JavaScript.
- **Styling:** CSS con integrazione di Tailwind CSS per implementare rapidamente i design system dark e la UI reattiva.
- **Data Fetching:** Le informazioni esposte provengono direttamente in live streaming tramite la Fetch API nativa. Il server contattato è il noto NASA NeoWs (Near Earth Object Web Service).
- **Visualizzazione dati:** Strumenti in canvas come Chart.js o grafiche generabili nativamente per la visualizzazione tecnica, l'uso di dinamismi al caricamento per le disposizioni nello spazio radar.

```JavaScript
// Esempio della chiamata Fetch all'API pubblica della NASA
// per popolare dinamicamente il radar con i dati dei NEO odierni
const API_URL = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&api_key=${YOUR_KEY}`;

fetch(API_URL)
  .then(response => response.json())
  .then(data => elaboraRisultatiRadar(data));
```


## Target e contesto d’uso
Pensato per appassionati dello spazio, istituti di educazione scientifica o navigatori web curiosi, Neo-Sentinel si propone principalmente per la fruizione desktop, affinché lo schermo grande restituisca la sensazione di un display di un centro di monitoraggio. 
Adatto anche per installazioni stand-out in contesti museali o per la divulgazione interattiva giovanile, poiché mira a tradurre aridi o complessi flussi di dati in un'esperienza d'intrattenimento educativo intuitivo e accattivante.
