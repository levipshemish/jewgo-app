const fs = require('fs');

// Read the file
const filePath = 'app/eatery/EateryPageClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of the old modal (after the ModernFilterPopup)
const modernPopupEnd = content.indexOf('      />', content.indexOf('<ModernFilterPopup'));
const oldModalStart = content.indexOf('        <div className="fixed inset-0', modernPopupEnd);

if (oldModalStart !== -1) {
  // Find the end of the old modal
  const oldModalEnd = content.indexOf('      )}', oldModalStart) + 7;
  
  if (oldModalEnd !== -1) {
    // Remove the old modal
    const beforeOldModal = content.substring(0, oldModalStart);
    const afterOldModal = content.substring(oldModalEnd);
    content = beforeOldModal + afterOldModal;
  }
}

// Write the updated content back
fs.writeFileSync(filePath, content);
console.log('Fixed eatery page filters');
