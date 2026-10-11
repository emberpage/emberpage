import "./browser.js";
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.target !== "node" || sender.id !== chrome.runtime.id) return;
  const allowed = [
    "start",
    "add",
    "get",
    "pin",
    "dial",
    "stop",
    "info",
    "privateAdd",
    "serve",
    "revoke",
    "policyInfo",
  ];
  if (!allowed.includes(message.action)) return;
  Promise.resolve()
    .then(() => window.spike[message.action](...(message.args || [])))
    .then(
      (data) => respond({ ok: true, data }),
      (error) => respond({ ok: false, error: error.message }),
    );
  return true;
});
