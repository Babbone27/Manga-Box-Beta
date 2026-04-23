# Manga Box - Manga Collection Manager

Benvenuto in **Manga Box**, il gestionale definitivo per tracciare la tua collezione di manga in modo semplice, veloce e graficamente accattivante.

## 🌟 Caratteristiche Principali

- **Visualizzazione Flessibile**: Scegli tra modalità Griglia, Lista o Tabella.
- **Statistiche Avanzate**: Analizza la tua collezione con grafici dinamici su editori, target, spese e andamento nel tempo.
- **Sincronizzazione Cloud**: Integrazione completa con Google Drive per dati e copertine.
- **Multi-Piattaforma**: Funziona su PC (Windows/Mac/Linux) e Mobile via browser (PWA).
- **Esportazione Grafica**: Genera report HTML interattivi da condividere o conservare.

---

## 🚀 Come Iniziare

### Esecuzione Locale (PC)
1.  **Requisito**: Assicurati di avere **Python** installato ([scaricalo qui](https://www.python.org/downloads/)).
2.  **Avvio Windows**: Fai doppio clic su `start_app.bat`.
3.  **Avvio Linux/Mac**: Apri il terminale dentro la cartella Manga Box e digita `./start_app.sh`. Premi invio.
    - A volte il sistema blocca i file .sh per sicurezza. Per sbloccarlo, digita questo comando sul terminale e premi Invio: `chmod +x start_app.sh`
4.  L'app si aprirà automaticamente nel tuo browser predefinito all'indirizzo `http://localhost:8000`. 
    - **Nota**: Usiamo una porta fissa per garantire che il browser mantenga i tuoi dati salvati (IndexedDB). Se la porta è occupata da una vecchia sessione dell'app, lo script proverà a resettarla automaticamente.

### Utilizzo su Smartphone/Tablet
Per avere Manga Box sempre con te senza configurare server locali:
1.  Apri la versione hostata da GitHub ([Link](https://babbone27.github.io/Manga-Box/)).
2.  Seleziona **"Aggiungi a Home"** dal menu del browser per installarla come App.
**Nota sui Dati**: Quando usi la versione su GitHub Pages, i dati sono separati da quelli che hai sul PC (perché ogni browser ha la sua memoria locale). Ti basterà collegare importare il backup locale o di Google Drive dalle impostazioni!
---

## 💾 Gestione Dati e Backup

L'app salva i dati localmente nel browser (`manga-box-db`).

- **Per cambiare dispositivo**: Esporta il backup `.json` o `.html` dalle Impostazioni e importalo sul nuovo dispositivo.

- **Backup cloud con Google Drive**: Vai in **Impostazioni** ed esegui l'accesso a Google. Una volta connesso, potrai caricare o scaricare i tuoi dati e le tue copertine con un clic. I dati verranno salvati sul tuo archivio G-Drive.

---

## ⌨️ Scorciatoie Rapide

- `Ctrl + M`: Cambia visualizzazione (Griglia, Lista, Tabella).
- `Ctrl + L`: Vai direttamente alla barra di ricerca.
- `Ctrl + 1-5`: Naviga rapidamente tra le tab principali.

---

Per segnalare Bug o altro, su Telegram: @mamboleiro

