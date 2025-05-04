// Test script for Gemini API
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the .env file in the server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function testGeminiApi() {
  console.log('Testing Gemini API connection...');
  
  if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
  }
  
  const prompt = 'Write a short paragraph about artificial intelligence.';
  
  try {
    console.log(`Making API request to: ${GEMINI_API_URL}`);
    
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log the response structure
    console.log('API Response structure:', JSON.stringify(response.data, null, 2));
    
    // Extract and log the text
    if (response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content && 
        response.data.candidates[0].content.parts && 
        response.data.candidates[0].content.parts.length > 0) {
      
      const text = response.data.candidates[0].content.parts[0].text;
      console.log('\nExtracted text from response:');
      console.log('------------------------');
      console.log(text);
      console.log('------------------------');
      console.log('\nAPI test successful!');
    } else {
      console.error('ERROR: Unexpected response format from Gemini API');
      console.log('Response data:', response.data);
    }
  } catch (error) {
    console.error('ERROR: Failed to call Gemini API');
    
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received from API');
      console.error(error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    console.error('\nFull error:', error);
  }
}

// Run the test
testGeminiApi(); 