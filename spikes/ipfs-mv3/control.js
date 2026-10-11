window.callNode = async (action, ...args) => {
  const result = await Promise.race([
    chrome.runtime.sendMessage({ target: "controller", action, args }),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error("Spike node operation timed out after 25 seconds")),
        25000,
      ),
    ),
  ]);
  document.querySelector("#result").textContent = JSON.stringify(
    result,
    null,
    2,
  );
  if (!result?.ok) throw new Error(result?.error || "No response");
  return result.data;
};
document.querySelector("#status").onclick = () => window.callNode("info");
