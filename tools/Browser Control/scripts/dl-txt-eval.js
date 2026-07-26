// This runs inside the browser page
(async () => {
  // 1. Open Modal
  Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Download").click();
  await new Promise(r => setTimeout(r, 1000));
  
  // 2. Select TXT
  const select = document.querySelector('select');
  if (select) {
    select.value = 'txt';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await new Promise(r => setTimeout(r, 1000));
  
  // 3. Click Transcript Download
  const btn = document.querySelector('[data-testid="download-row-download-button-vtt"]');
  if (btn) btn.click();
  
  return "Clicked download button!";
})();
