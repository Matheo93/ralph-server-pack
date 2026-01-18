import { analyzeText } from './src/lib/voice/semantic-analysis';

const tests = [
  { text: 'Inscrire Emma au cours de danse pour septembre', expected: 'activites' },
  { text: 'Emmener Johan au foot samedi matin', expected: 'logistique' },
  { text: 'Acheter des couches et du lait', expected: 'quotidien' },
];

async function runTests() {
  for (const test of tests) {
    console.log('\n--- Testing:', test.text);
    console.log('Expected category:', test.expected);
    
    const result = await analyzeText(test.text, { 
      childrenNames: ['Johan', 'Emma'], 
      language: 'fr' 
    });
    
    if (result.success && result.extraction) {
      console.log('Got category:', result.extraction.category);
      console.log('Match:', result.extraction.category === test.expected ? 'YES' : 'NO');
      console.log('Action:', result.extraction.action);
      console.log('Child:', result.extraction.childName);
      console.log('Urgency:', result.extraction.urgency);
    } else {
      console.log('Error:', result.error);
    }
    
    // Wait 21 seconds between requests to avoid rate limit
    if (tests.indexOf(test) < tests.length - 1) {
      console.log('Waiting 21s for rate limit...');
      await new Promise(r => setTimeout(r, 21000));
    }
  }
}

runTests();
