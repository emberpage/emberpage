let creating;
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    message.target !== "controller" ||
    sender.id !== chrome.runtime.id ||
    !sender.url?.startsWith(chrome.runtime.getURL(""))
  )
    return;
  (async () => {
    if (message.action === "closeOffscreen") {
      if (
        (
          await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT"],
          })
        ).length
      )
        await chrome.offscreen.closeDocument();
      return { ok: true, data: true };
    }
    if (
      !(
        await chrome.runtime.getContexts({
          contextTypes: ["OFFSCREEN_DOCUMENT"],
        })
      ).length
    ) {
      creating ||= chrome.offscreen
        .createDocument({
          url: "offscreen.html",
          reasons: ["WEB_RTC"],
          justification:
            "Test explicit IPFS peer serving in an isolated experiment.",
        })
        .finally(() => {
          creating = undefined;
        });
      await creating;
    }
    return chrome.runtime.sendMessage({ ...message, target: "node" });
  })().then(respond, (error) => respond({ ok: false, error: error.message }));
  return true;
});
