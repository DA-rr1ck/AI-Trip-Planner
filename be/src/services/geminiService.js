// be/src/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate trip using Gemini AI
 * @param {string} prompt - The AI prompt for trip generation
 * @returns {Promise<Object>} - Parsed trip data
 */
async function generateTripWithGemini(prompt) {
    try {
        console.log('Calling Gemini API...');

        // Use gemini-1.5-flash model
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-pro'
        });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('Raw Gemini response length:', text.length);

        // Clean and parse JSON
        let cleanedText = text.trim();

        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Remove any leading/trailing text that's not JSON
        const jsonStart = cleanedText.indexOf('[');
        const jsonEnd = cleanedText.lastIndexOf(']');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
        }

        // Parse JSON
        const parsedData = JSON.parse(cleanedText);

        console.log('Successfully parsed Gemini response');

        return parsedData;

    } catch (error) {
        console.error('Error generating trip with Gemini:', error);
        
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse AI response. The AI returned invalid data.');
        }
        
        throw new Error('Failed to generate trip with AI: ' + error.message);
    }
}

module.exports = {
    generateTripWithGemini
};