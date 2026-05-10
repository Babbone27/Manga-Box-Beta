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
    - Editore: estrapola dal campo "Disponibilità". Tale campo spesso contiene l'editore seguito da una nota tra parentesi (es. "J-Pop (acquista su Amazon)"). Rimuovi SEMPRE il contenuto tra parentesi e le parentesi stesse, restituendo solo il nome pulito dell'editore (es. "J-Pop").
    - Target: estrapola dal campo "Categoria" (es. Shonen, Seinen, Shojo, Josei, Kodomo).
    - Stato: estrapola dal campo "Stato in Italia".
    
    Restituisci i dati nel seguente formato JSON valido:
    {
        "description": "Trama (in italiano, possibilmente quella riportata su animeclick.it)",
        "author": "Autore/i (segui la regola di Storia/Disegni)",
        "publisher": "Editore (pulito dalle parentesi, segui la regola di Disponibilità)",
        "target": "Target (dal campo Categoria)",
        "status": "Stato in Italia"
    }
    Se non è edito in Italia o non esiste la scheda su animeclick.it, cerca comunque le informazioni più accurate possibili sul web traducendole in italiano.
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


