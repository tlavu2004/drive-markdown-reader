import { requireElement } from '../shared/dom';
import { errorMessage, isRenderResponse } from '../shared/messages';
import { CONTENT_SCRIPT_FILES } from '../shared/paths';

requireElement('btn-render').addEventListener('click', async () => {
  const status = requireElement('status');
  status.textContent = "Connecting...";
  status.style.color = "#666";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || tab.id === undefined || !tab.url || !tab.url.includes('drive.google.com')) {
      status.textContent = "Not Google Drive (or permission denied)!";
      status.style.color = "red";
      return;
    }

    const tabId = tab.id;

    // Helper to send message
    const sendMessage = async () => {
      return await chrome.tabs.sendMessage(tabId, { action: "RENDER_NOW" });
    };

    try {
      const response = await sendMessage();
      handleResponse(response);
    } catch (err) {
      console.log("Message failed, attempting injection...", err);
      status.textContent = "Injecting script...";

      // Script not ready? Try to inject it.
      // Requires "scripting" permission
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [...CONTENT_SCRIPT_FILES]
        });

        // Wait a tiny bit for script to init
        setTimeout(async () => {
          try {
            const response = await sendMessage();
            handleResponse(response);
          } catch (e2) {
            status.textContent = "Injection failed. Refresh page.";
            status.style.color = "red";
          }
        }, 500);
      } catch (injectErr) {
        console.error(injectErr);
        status.textContent = "Cannot inject. Refresh page.";
        status.style.color = "red";
      }
    }
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + errorMessage(err);
    status.style.color = "red";
  }

  function handleResponse(response: unknown) {
    if (isRenderResponse(response) && response.success) {
      status.textContent = "Render triggered!";
      status.style.color = "green";
    } else {
      status.textContent = (isRenderResponse(response) && !response.success ? response.reason : "Failed.");
      status.style.color = "orange";
    }
  }
});
