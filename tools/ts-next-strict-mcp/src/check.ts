import { runTSC, runESLint } from "./run.js";

async function main() {
  const command = process.argv[2];
  const cwd = process.argv[3] || ".";
  
  try {
    let result;
    
    if (command === "tsc") {
      result = await runTSC(cwd);
    } else if (command === "eslint") {
      const pattern = process.argv[4] || "**/*.{ts,tsx}";
      const fix = process.argv[5] === "true";
      result = await runESLint(cwd, pattern, fix);
    } else {
      console.error("Usage: node check.js <tsc|eslint> [cwd] [pattern] [fix]");
      process.exit(1);
    }
    
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
