#!/bin/bash
cd /home/ubuntu/familyload
TASK=$(grep -m1 '^\- \[ \]' .bmad/TODO_CURRENT.md 2>/dev/null | sed 's/- \[ \] //')

if [ -n "$TASK" ]; then
    echo '{"decision": "block", "reason": "Tâche suivante: '"$TASK"'"}'
else
    echo '{"decision": "allow"}'
fi
