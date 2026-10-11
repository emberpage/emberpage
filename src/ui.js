export async function send(action, fields = {}) {
  const response = await chrome.runtime.sendMessage({
    target: 'background',
    action,
    ...fields
  });
  if (!response?.ok)
    throw new Error(
      response?.error ||
        'Ember Page did not respond. Reopen the extension and try again.'
    );
  return response.data;
}
export function status(text, error = false) {
  const element = document.querySelector('#status');
  element.textContent = text;
  element.classList.toggle('error', error);
}
export async function busy(button, task, loading) {
  const label = button.textContent;
  button.disabled = true;
  if (loading) button.textContent = loading;
  try {
    await task();
  } catch (error) {
    status(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}
export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Article';
  }
}
