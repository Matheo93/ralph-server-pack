import { query, queryOne, insert, setCurrentUser } from "./src/lib/aws/database";
import { analyzeText, parseRelativeDate } from "./src/lib/voice/semantic-analysis";

const TEST_USER_ID = "e42864d8-5011-7067-cbae-68d6257f7d5d";

const categoryMapping: Record<string, string> = {
  ecole: "60ae000a-8e58-441f-92cb-4503bed6c6b3",
  sante: "d831e1cf-e49a-4df0-9d95-6153817030fb",
  administratif: "6915a31f-f273-462c-8fb5-f26ef0936515",
  quotidien: "2270840f-b227-461d-b240-bc2f9107bdf3",
  social: "af34fb25-ebf4-4983-a3cf-4befe79e312d",
  activites: "c9277092-0088-4082-bee0-fb2c211d4410",
  logistique: "37a4de4b-6ce9-4b17-9d40-2313b9f0bdf3",
  autre: "2270840f-b227-461d-b240-bc2f9107bdf3",
};

function urgencyToPriorityText(u: string): string {
  return u === "haute" ? "high" : u === "basse" ? "low" : "normal";
}

async function test() {
  await setCurrentUser(TEST_USER_ID);

  const membership = await queryOne<{ household_id: string }>(
    "SELECT household_id FROM household_members WHERE user_id = $1 AND is_active = true",
    [TEST_USER_ID]
  );
  
  const children = await query<{ id: string; first_name: string }>(
    "SELECT id, first_name FROM children WHERE household_id = $1 AND is_active = true",
    [membership.household_id]
  );

  const tests = [
    { text: "Johan doit faire ses devoirs de maths", expectedFor: "child" },
    { text: "Prendre rdv dentiste pour Johan", expectedFor: "parent" },
  ];

  for (const t of tests) {
    console.log("\n========================================");
    console.log("TEXT:", t.text);
    console.log("Expected taskFor:", t.expectedFor);
    
    const result = await analyzeText(t.text, {
      childrenNames: children.map(c => c.first_name),
      language: "fr"
    });

    if (!result.success) {
      console.log("ERROR:", result.error);
      await new Promise(r => setTimeout(r, 22000));
      continue;
    }

    const e = result.extraction!;
    console.log("Got taskFor:", e.taskFor);
    console.log("Action:", e.action);
    
    let childId: string | null = null;
    if (e.childName) {
      const matched = children.find(c => c.first_name.toLowerCase() === e.childName?.toLowerCase());
      if (matched) childId = matched.id;
    }
    
    const isTaskForChild = e.taskFor === "child";
    let assignedTo: string | null = null;
    
    if (!isTaskForChild) {
      assignedTo = TEST_USER_ID;
    }

    const task = await insert<{ id: string }>("tasks", {
      household_id: membership.household_id,
      title: e.action,
      description: t.text,
      category_id: categoryMapping[e.category] ?? categoryMapping["quotidien"],
      priority: urgencyToPriorityText(e.urgency),
      deadline: e.date ? parseRelativeDate(e.date, "fr")?.toISOString().split("T")[0] : null,
      assigned_to: assignedTo,
      child_id: childId,
      source: "voice",
      status: "pending",
      created_by: TEST_USER_ID,
    });

    const created = await queryOne<{title: string; assigned_to: string; child_id: string; child_name: string; assigned_email: string}>(
      "SELECT t.title, t.assigned_to, t.child_id, c.first_name as child_name, u.email as assigned_email FROM tasks t LEFT JOIN children c ON c.id = t.child_id LEFT JOIN users u ON u.id = t.assigned_to WHERE t.id = $1",
      [task!.id]
    );

    console.log("\nRESULT:");
    console.log("  Title:", created?.title);
    console.log("  Child (concerné):", created?.child_name || "none");
    console.log("  Assigned to:", created?.assigned_email || "NONE (child task)");
    console.log("  Correct:", 
      (t.expectedFor === "child" && !created?.assigned_email) ||
      (t.expectedFor === "parent" && created?.assigned_email) ? "YES" : "NO"
    );
    
    await new Promise(r => setTimeout(r, 22000));
  }
}

test();
