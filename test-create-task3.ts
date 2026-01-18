import { query, queryOne, insert, setCurrentUser } from './src/lib/aws/database';
import { analyzeText, parseRelativeDate } from './src/lib/voice/semantic-analysis';

const TEST_USER_ID = 'e42864d8-5011-7067-cbae-68d6257f7d5d';

const categoryMapping: Record<string, string> = {
  ecole: '60ae000a-8e58-441f-92cb-4503bed6c6b3',
  sante: 'd831e1cf-e49a-4df0-9d95-6153817030fb',
  administratif: '6915a31f-f273-462c-8fb5-f26ef0936515',
  quotidien: '2270840f-b227-461d-b240-bc2f9107bdf3',
  social: 'af34fb25-ebf4-4983-a3cf-4befe79e312d',
  activites: 'c9277092-0088-4082-bee0-fb2c211d4410',
  logistique: '37a4de4b-6ce9-4b17-9d40-2313b9f0bdf3',
};

function urgencyToPriorityText(urgency: string): string {
  switch (urgency) {
    case 'haute': return 'high';
    case 'basse': return 'low';
    default: return 'normal';
  }
}

async function test() {
  await setCurrentUser(TEST_USER_ID);

  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id FROM household_members WHERE user_id = $1 AND is_active = true
  `, [TEST_USER_ID]);

  const children = await query<{ id: string; first_name: string }>(`
    SELECT id, first_name FROM children WHERE household_id = $1 AND is_active = true
  `, [membership!.household_id]);

  const testText = 'Inscrire Johan au cours de natation pour septembre';
  console.log('Testing:', testText);

  const result = await analyzeText(testText, {
    childrenNames: children.map(c => c.first_name),
    language: 'fr'
  });

  if (!result.success) {
    console.log('Error:', result.error);
    return;
  }

  const e = result.extraction!;
  console.log('Category:', e.category, '-> Expected: activites');
  console.log('Child:', e.childName);
  console.log('Action:', e.action);

  // Match child
  let childId = null;
  if (e.childName) {
    const matched = children.find(c => c.first_name.toLowerCase() === e.childName?.toLowerCase());
    if (matched) childId = matched.id;
  }

  // Create task
  const task = await insert<{ id: string; title: string }>('tasks', {
    household_id: membership!.household_id,
    title: e.action,
    description: testText,
    category_id: categoryMapping[e.category] ?? categoryMapping['quotidien'],
    priority: urgencyToPriorityText(e.urgency),
    deadline: e.date ? parseRelativeDate(e.date, 'fr')?.toISOString().split('T')[0] : null,
    assigned_to: TEST_USER_ID,
    child_id: childId,
    source: 'voice',
    status: 'pending',
    created_by: TEST_USER_ID,
  });

  if (task) {
    console.log('\nTASK CREATED:', task.id);
    
    // Verify
    const created = await queryOne<any>(`
      SELECT t.*, tc.name_fr as category_name, c.first_name as child_name
      FROM tasks t
      LEFT JOIN task_categories tc ON tc.id = t.category_id
      LEFT JOIN children c ON c.id = t.child_id
      WHERE t.id = $1
    `, [task.id]);
    
    console.log('Title:', created.title);
    console.log('Category:', created.category_name);
    console.log('Child:', created.child_name);
    console.log('Priority:', created.priority);
    console.log('Deadline:', created.deadline);
  }
}

test();
