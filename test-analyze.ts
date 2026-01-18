import { analyzeText } from './src/lib/voice/semantic-analysis';

const tests = [
  { text: 'Il faut que Johan fasse ses devoirs de maths pour demain', expected: 'ecole' },
  { text: 'Prendre rendez-vous chez le dentiste pour Emma la semaine prochaine', expected: 'sante' },
  { text: 'Renouveler la carte d identite de Johan', expected: 'administratif' },
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
      console.log('Confidence:', result.extraction.confidence);
    } else {
      console.log('Error:', result.error);
    }
  }
}

runTests();
