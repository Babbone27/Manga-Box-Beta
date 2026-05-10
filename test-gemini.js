import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('FAKE_KEY');
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }]
});
console.log(model);
