import { query, queryOne, insert, setCurrentUser } from './src/lib/aws/database';
import { analyzeText, parseRelativeDate, urgencyToPriority } from './src/lib/voice/semantic-analysis';

const TEST_USER_ID = 'e42864d8-5011-7067-cbae-68d6257f7d5d';

async function testCreateTask() {
  console.log('Setting current user...');
  await setCurrentUser(TEST_USER_ID);

  // Get household
  const membership = await queryOne<{ household_id: string }>(`
    SELECT household_id
    FROM household_members
    WHERE user_id = \$1 AND is_active = true
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
    WHERE household_id = \$1 AND is_active = true
  `, [membership.household_id]);

  console.log('Children:', children.map(c => c.first_name));

  // Test text
  const testText = 'Johan doit faire ses devoirs de francais pour lundi';
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
  console.log('  Parsed due date:', dueDate);

  // Get assignment (parent with lowest load)
  const loads = await query<{ user_id: string; load: number }>(`
    SELECT
      hm.user_id,
      COALESCE(COUNT(t.id), 0)::int as load
    FROM household_members hm
    LEFT JOIN tasks t ON t.assigned_to = hm.user_id
      AND t.status = 'pending'
    WHERE hm.household_id = \$1 AND hm.is_active = true
    GROUP BY hm.user_id
    ORDER BY load ASC
    LIMIT 1
  `, [membership.household_id]);

  const assignedTo = loads.length > 0 ? loads[0]!.user_id : null;
  console.log('  Assigned to user:', assignedTo);

  // Create task
  console.log('\nCreating task...');
  const task = await insert<{ id: string; title: string }>('tasks', {
    household_id: membership.household_id,
    title: extraction.action,
    description: testText,
    category: extraction.category,
    priority: urgencyToPriority(extraction.urgency),
    due_date: dueDate?.toISOString() ?? null,
    assigned_to: assignedTo,
    child_id: childId,
    source: 'voice',
    status: 'pending',
    created_by: TEST_USER_ID,
  });

  if (task) {
    console.log('\nTASK CREATED SUCCESSFULLY!');
    console.log('  Task ID:', task.id);
    console.log('  Title:', task.title);

    // Verify in database
    const created = await queryOne<{
      id: string;
      title: string;
      category: string;
      child_id: string;
      assigned_to: string;
      due_date: string;
    }>(`SELECT id, title, category, child_id, assigned_to, due_date FROM tasks WHERE id = \$1`, [task.id]);

    console.log('\nVerification from DB:');
    console.log('  Title:', created?.title);
    console.log('  Category:', created?.category);
    console.log('  Child ID:', created?.child_id);
    console.log('  Assigned to:', created?.assigned_to);
    console.log('  Due date:', created?.due_date);
  } else {
    console.log('ERROR: Task creation failed');
  }
}

testCreateTask().catch(console.error);
