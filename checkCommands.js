const fs = require("fs");
const path = require("path");

const commandFolder = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandFolder).filter(f => f.endsWith(".js"));

console.log("🔍 Checking commands...");

let hasErrors = false;

for (const file of commandFiles) {
  const filePath = path.join(commandFolder, file);
  try {
    const command = require(filePath);
    
    if (!command.data || !command.data.name) {
      console.log(`❌ ${file} is missing "data.name"`);
      hasErrors = true;
    }

    if (typeof command.execute !== "function") {
      console.log(`❌ ${file} is missing "execute" function`);
      hasErrors = true;
    }

    if (!hasErrors) {
      console.log(`✅ ${file} looks good`);
    }

  } catch (err) {
    console.log(`❌ Failed to load ${file}:`, err.message);
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log("🎉 All commands are valid!");
} else {
  console.log("⚠️ Some commands have issues. Fix them before running the bot.");
}
