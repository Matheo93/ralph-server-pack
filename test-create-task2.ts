import { query, queryOne, insert, setCurrentUser } from './src/lib/aws/database';
import { analyzeText, parseRelativeDate } from './src/lib/voice/semantic-analysis';

const TEST_USER_ID = 'e42864d8-5011-7067-cbae-68d6257f7d5d';

// Category code to UUID mapping
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

async function testCreateTask() {
  console.log('Setting current user...');
  await setCurrentUser(TEST_USER_ID);

  // Get household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = $1 AND is_active = true
  `, [TEST_USER_ID]);

  if (!membership) {
    console.log('ERROR: No household found');
    return;
  }

  console.log('Household ID:', membership.household_id);

  // Get children
  const children = await query<{ id: string; first_name: string }>(`
    SELECT id, first_name
    FROM children
    WHERE household_id = $1 AND is_active = true
  `, [membership.household_id]);

  console.log('Children:', children.map(c => c.first_name));

  // Test text
  const testText = 'Emmener Emma chez le medecin demain matin';
  console.log('\nAnalyzing:', testText);

  const result = await analyzeText(testText, {
    childrenNames: children.map(c => c.first_name),
    language: 'fr'
  });

  if (!result.success || !result.extraction) {
    console.log('Analysis failed:', result.error);
    return;
  }

  const extraction = result.extraction;
  console.log('\nExtraction:');
  console.log('  Action:', extraction.action);
  console.log('  Category:', extraction.category);
  console.log('  Child:', extraction.childName);
  console.log('  Date:', extraction.date);
  console.log('  Urgency:', extraction.urgency);

  // Match child
  let childId: string | null = null;
  if (extraction.childName) {
    const matched = children.find(
      c => c.first_name.toLowerCase() === extraction.childName?.toLowerCase()
    );
    if (matched) {
      childId = matched.id;
      console.log('  Matched child ID:', childId);
    }
  }

  // Parse due date
  const dueDate = extraction.date ? parseRelativeDate(extraction.date, 'fr') : null;
  console.log('  Parsed deadline:', dueDate ? dueDate.toISOString().split('T')[0] : null);

  // Get category_id
  const categoryId = categoryMapping[extraction.category] ?? categoryMapping['quotidien'];
  console.log('  Category ID:', categoryId);

  // Get assignment (parent with lowest load)
  const loads = await query<{ user_id: string; load: number }>(`
    SELECT
      hm.user_id,
      COALESCE(COUNT(t.id), 0)::int as load
    FROM household_members hm
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.status = 'pending'
    WHERE hm.household_id = $1 AND hm.is_active = true
    GROUP BY hm.user_id
    ORDER BY load ASC
    LIMIT 1
  `, [membership.household_id]);

  const assignedTo = loads.length > 0 ? loads[0]!.user_id : null;
  console.log('  Assigned to user:', assignedTo);

  // Create task with correct column names
  console.log('\nCreating task...');
  const task = await insert<{ id: string; title: string }>('tasks', {
    household_id: membership.household_id,
    title: extraction.action,
    description: testText,
    category_id: categoryId,
    priority: urgencyToPriorityText(extraction.urgency),
    deadline: dueDate ? dueDate.toISOString().split('T')[0] : null,
    assigned_to: assignedTo,
    child_id: childId,
    source: 'voice',
    status: 'pending',
    created_by: TEST_USER_ID,
  });

  if (task) {
    console.log('\n=== TASK CREATED SUCCESSFULLY! ===');
    console.log('  Task ID:', task.id);
    console.log('  Title:', task.title);

    // Verify in database
    const created = await queryOne<{
      id: string;
      title: string;
      category_id: string;
      child_id: string;
      assigned_to: string;
      deadline: string;
      priority: string;
    }>(`SELECT id, title, category_id, child_id, assigned_to, deadline, priority FROM tasks WHERE id = $1`, [task.id]);

    // Get category name
    const cat = await queryOne<{ name_fr: string }>(`SELECT name_fr FROM task_categories WHERE id = $1`, [created?.category_id]);

    // Get child name
    let childName = null;
    if (created?.child_id) {
      const child = await queryOne<{ first_name: string }>(`SELECT first_name FROM children WHERE id = $1`, [created.child_id]);
      childName = child?.first_name;
    }

    // Get assigned user email
    let assignedEmail = null;
    if (created?.assigned_to) {
      const user = await queryOne<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [created.assigned_to]);
      assignedEmail = user?.email;
    }

    console.log('\n=== VERIFICATION FROM DB ===');
    console.log('  Title:', created?.title);
    console.log('  Category:', cat?.name_fr);
    console.log('  Child:', childName);
    console.log('  Assigned to:', assignedEmail);
    console.log('  Deadline:', created?.deadline);
    console.log('  Priority:', created?.priority);
  } else {
    console.log('ERROR: Task creation failed');
  }
}

testCreateTask().catch(console.error);
