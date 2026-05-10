import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSettings } from '../settings.js';

export async function fetchMangaDetails(title) {
    const settings = getSettings();
    const apiKey = settings.geminiApiKey ? settings.geminiApiKey.trim() : '';
    if (!apiKey) {
        throw new Error('API Key mancante. Inseriscila nelle Impostazioni.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }]
    });

    const prompt = `Effettua una ricerca sul web per il manga "${title}", utilizzando come fonte principale e prioritaria il sito animeclick.it.
    In base a quanto riportato sulla scheda del manga su animeclick.it, estrapola i dati seguendo ESATTAMENTE queste regole:
    - Autore: estrapola dai campi "Storia" e "Disegni". Se lo stesso nome è in entrambi, scrivilo una sola volta. Se sono due persone diverse, inseriscile entrambe separate da una virgola.
    - Editore: estrapola dal campo "Disponibilità". Tale campo spesso contiene l'editore seguito da una nota tra parentesi. Rimuovi SEMPRE il contenuto tra parentesi e le parentesi stesse. IMPORTANTE: se l'editore risultante è "Panini Comics", trasformalo SEMPRE in "Planet Manga".
    - Target: estrapola dal campo "Categoria". Riconduci il valore trovato a ESATTAMENTE uno di questi 4 valori: "Shonen", "Seinen", "Shojo", "Josei".
    - Stato: estrapola dal campo "Stato in Italia". Riconduci il valore trovato a ESATTAMENTE uno di questi 3 valori: "Serie in corso", "Serie completa", "Volume unico". Sii elastico nell'interpretare la dicitura sul sito (es. se leggi "in corso" capisci che è "Serie in corso"). ATTENZIONE: Se il manga è concluso e ha 1 solo volume in totale, scrivi "Volume unico". Se è concluso ma ha più volumi (es. "Completato (17 volumi)"), scrivi "Serie completa".

    REGOLA SUI DATI MANCANTI O NON CLASSIFICABILI:
    L'output testuale finale per "target" e "status" deve essere strettamente una delle stringhe elencate sopra. Se sei in grado di dedurre logicamente la corrispondenza, fallo. Se invece l'informazione è del tutto assente o la classificazione è assolutamente impossibile, lascia il campo in bianco (stringa vuota ""). Fai lo stesso per gli altri campi in caso di totale assenza di dati.

    Restituisci i dati nel seguente formato JSON valido:
    {
        "description": "Trama in italiano (o stringa vuota se non trovata)",
        "author": "Autore/i (o stringa vuota se non trovati o incerti)",
        "publisher": "Editore pulito (o stringa vuota se non trovato)",
        "target": "Valore esatto tra i 4 ammessi (o stringa vuota se impossibile da dedurre)",
        "status": "Valore esatto tra i 3 ammessi (o stringa vuota se impossibile da dedurre)"
    }
    Rispondi SOLO con il JSON, senza markdown o altro testo.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`Errore Gemini: ${error.message || error}\n\nVerifica che la tua API Key sia corretta.`);
    }
}


