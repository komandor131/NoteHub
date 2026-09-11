const fs = require('fs');

const dbFile = 'server/database.ts';
let content = fs.readFileSync(dbFile, 'utf8');

// Replace the start of roadmap seeding inside seedIfEmpty
const oldStart = '    const tracks: Track[] = [];';
const newStart = `  const existingRoadmaps = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM roadmaps',
    [],
    (row) => ({ count: numberValue(row.count) }),
  );

  if (!existingRoadmaps || existingRoadmaps.count < 60) {
    run('DELETE FROM roadmaps');
    const tracks: Track[] = [];`;

if (content.includes(oldStart)) {
  content = content.replace(oldStart, newStart);
}

// Replace the end of roadmap seeding
const oldEnd = `      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });
  }
}`;

const newEnd = `      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });
  }
}`;

// Make sure `}` for if (existingRoadmaps...) is added right after the loop
const oldLoopEnd = `      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });`;

const newLoopEnd = `      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });
  }`;

if (content.includes(oldLoopEnd)) {
  content = content.replace(oldLoopEnd, newLoopEnd);
}

fs.writeFileSync(dbFile, content, 'utf8');
console.log('Successfully updated seedIfEmpty in database.ts!');
