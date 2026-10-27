let plansAccent = "#8b5cf6", plansSurface = "#ffffff";
try { plansAccent = localStorage.getItem("nivli-custom-accent") || plansAccent; plansSurface = localStorage.getItem("nivli-custom-surface") || plansSurface; } catch {}
function applyPlansColors() {
  document.documentElement.style.setProperty("--custom-accent", plansAccent);
  document.documentElement.style.setProperty("--custom-surface", plansSurface);
  try { document.documentElement.style.setProperty("--custom-glow", localStorage.getItem("nivli-custom-glow") || plansAccent); } catch { document.documentElement.style.setProperty("--custom-glow", plansAccent); }
}
function setPlansTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.innerHTML = theme === "dark"
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>';
    const next = theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
    button.title = `Switch to ${next} mode`;
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#050407" : plansSurface;
}
let savedTheme = "light";
try { savedTheme = localStorage.getItem("luma-theme") || "light"; } catch {}
applyPlansColors();
setPlansTheme(savedTheme);
document.querySelectorAll("[data-theme-toggle]").forEach(button => button.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setPlansTheme(next);
  try { localStorage.setItem("luma-theme", next); } catch {}
}));

const checkoutStatus = document.getElementById("checkout-status");
const checkoutButtons = [...document.querySelectorAll("[data-plan-checkout]")];
function setCheckoutMessage(message, tone = "") {
  if (!checkoutStatus) return;
  checkoutStatus.textContent = message;
  checkoutStatus.className = `checkout-status${tone ? ` ${tone}` : ""}`;
}

const paymentReturn = new URLSearchParams(location.search).get("payment");
if (paymentReturn === "returned") setCheckoutMessage("You returned from PayFast Sandbox. Check the Sandbox dashboard for the test result; Nivli has not activated a plan.", "success");
else if (paymentReturn === "cancelled") setCheckoutMessage("The Sandbox checkout was cancelled. No plan was activated.");

fetch("/api/payfast/status", { cache: "no-store" }).then(response => response.json()).then(status => {
  if (!status.ready) {
    checkoutButtons.forEach(button => { button.disabled = true; button.textContent = "Sandbox setup needed"; });
    if (!paymentReturn) setCheckoutMessage("Sandbox checkout is not ready. Check the PayFast values in Nivli’s local .env.txt.", "error");
    return;
  }
  checkoutButtons.forEach(button => { button.disabled = false; button.textContent = `Test ${button.dataset.planCheckout === "pro" ? "Pro" : "Max"} checkout`; });
  if (!paymentReturn) setCheckoutMessage("PayFast Sandbox is ready. These are test subscriptions only; no real money or paid access is involved.");
}).catch(() => {
  checkoutButtons.forEach(button => { button.disabled = true; button.textContent = "Sandbox unavailable"; });
  if (!paymentReturn) setCheckoutMessage("Nivli could not check PayFast Sandbox setup. Make sure Nivli is running, then refresh this page.", "error");
});

checkoutButtons.forEach(button => button.addEventListener("click", async () => {
  const plan = button.dataset.planCheckout;
  button.disabled = true;
  button.textContent = "Preparing test checkout…";
  setCheckoutMessage("Preparing a signed PayFast Sandbox subscription request…");
  try {
    const response = await fetch("/api/payfast/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ plan })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const result = contentType.includes("application/json") ? await response.json() : {};
      if (response.status === 401) throw new Error("Sign in to Nivli first, then try the sandbox checkout again.");
      if (response.status === 403) throw new Error("Finish Nivli setup before starting the sandbox checkout.");
      throw new Error(result.error || "Nivli couldn't prepare the Sandbox checkout. Please try again.");
    }
    if (!contentType.includes("text/html")) throw new Error("Nivli received an unexpected Sandbox response. Please try again.");
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const sourceForm = parsed.querySelector("form#payfast-form");
    if (!sourceForm || sourceForm.action !== "https://sandbox.payfast.co.za/eng/process") throw new Error("Nivli did not receive the expected PayFast Sandbox form.");
    const form = document.createElement("form");
    form.method = "post";
    form.action = sourceForm.action;
    for (const sourceInput of sourceForm.querySelectorAll("input[type=hidden]")) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = sourceInput.name;
      input.value = sourceInput.value;
      form.append(input);
    }
    document.body.append(form);
    form.requestSubmit();
  } catch (error) {
    setCheckoutMessage(error.message || "Nivli couldn't prepare the Sandbox checkout. Please try again.", "error");
    button.disabled = false;
    button.textContent = `Retry ${plan === "pro" ? "Pro" : "Max"} Sandbox checkout`;
  }
}));
