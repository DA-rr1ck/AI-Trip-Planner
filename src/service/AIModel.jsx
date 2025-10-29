import { GoogleGenAI } from '@google/genai';

export async function generateTrip(prompt) {
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GOOGLE_GEMINI_AI_API_KEY,
  });

  const config = {
    responseMimeType: "application/json"
  };

  const model = 'gemini-2.0-flash';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });

  let fullText = '';
  for await (const chunk of response) {
    fullText += chunk.text;
  }

  try {
    const json = JSON.parse(fullText);
    return json;
  } catch (e) {
    console.error('Failed to parse JSON:', e, fullText);
    throw new Error('Failed to parse response as JSON');
  }
}