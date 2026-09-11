const fs = require('fs');

function main() {
  const dbFile = 'server/database.ts';
  let content = fs.readFileSync(dbFile, 'utf8');

  // 1. Recover the tracksMetadata array string from our recovered file
  const metadataContent = fs.readFileSync('C:\\Users\\Олександр\\.gemini\\antigravity\\brain\\fe898e34-bf50-4dfe-b56b-90eeee0e6e6b\\scratch\\metadata_only.ts', 'utf8');
  
  const newGeneratorLoop = `
    tracks.forEach((track, trackIdx) => {
      const nodes: any[] = [];
      const edges: any[] = [];

      const trackNumber = trackIdx + 1;
      const trackTitleWithoutNumber = track.title.substring(track.title.indexOf(' ') + 1);
      const dynamicTrackTitle = trackNumber + ". " + trackTitleWithoutNumber + " для Data Science/Analytics/Engineering/ML Engineer/MLops";

      // 1. Add root node for this roadmap
      nodes.push({
        id: "root",
        x: 800,
        y: 50,
        type: "text",
        title: dynamicTrackTitle,
        text: track.text
      });

      // 2. Iterate track steps
      track.steps.forEach((step, idx) => {
        const stepX = 800;
        const stepY = 250 + idx * 650;
        const stepNumber = idx + 1;
        const stepTitleWithoutNumber = step.title.substring(step.title.indexOf(' ') + 1);
        const dynamicStepTitle = trackNumber + "." + stepNumber + " " + stepTitleWithoutNumber;

        nodes.push({
          id: step.id,
          x: stepX,
          y: stepY,
          type: "text",
          title: dynamicStepTitle,
          text: step.text
        });
        
        // Connect to parent step
        if (idx === 0) {
          edges.push({ from: "root", to: step.id });
        } else {
          edges.push({ from: track.steps[idx - 1].id, to: step.id });
        }
        
        // Iterate substeps
        step.substeps.forEach((sub, subIdx) => {
          const subNumber = subIdx + 1;
          const subTitleWithoutNumber = sub.title.substring(sub.title.indexOf(' ') + 1);
          const dynamicSubTitle = trackNumber + "." + stepNumber + "." + subNumber + " " + subTitleWithoutNumber;

          // Layout substeps symmetrically on left and right sides
          let subX = 800;
          if (subIdx === 0) subX = 800 - 560;
          else if (subIdx === 1) subX = 800 - 280;
          else if (subIdx === 2) subX = 800 + 280;
          else if (subIdx === 3) subX = 800 + 560;
          else if (subIdx === 4) subX = 800 - 560;
          else if (subIdx === 5) subX = 800 - 280;
          else if (subIdx === 6) subX = 800 + 280;
          else if (subIdx === 7) subX = 800 + 560;

          // Symmetrical Row Y coordinate (4 in top row, 4 in bottom row)
          const isSecondRow = subIdx >= 4;
          const subY = stepY + (isSecondRow ? 100 : -100);

          nodes.push({
            id: sub.id,
            x: subX,
            y: subY,
            type: "text",
            title: dynamicSubTitle,
            text: sub.text
          });
          
          // Connect substep to the main step
          edges.push({ from: step.id, to: sub.id });
        });
      });

      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });
  }
}
`;

  // Combine them
  const completeReplacementBlock = metadataContent + "\n" + newGeneratorLoop;

  // Let's replace from `const tracks: Track[] = [` to the end of the `if` block.
  const startKey = 'const tracks: Track[] = [';
  const endKey = 'function mapTask(row: Row): TaskRecord {';

  const startIndex = content.indexOf(startKey);
  const endIndex = content.indexOf(endKey);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Keys not found!', startIndex, endIndex);
    process.exit(1);
  }

  // The text between startIndex and endIndex should be replaced
  const beforeText = content.substring(0, startIndex);
  const afterText = content.substring(endIndex);

  content = beforeText + completeReplacementBlock + "\n" + afterText;

  fs.writeFileSync(dbFile, content, 'utf8');
  console.log('Database file successfully patched with hyper-specific math substeps!');
}

main();
