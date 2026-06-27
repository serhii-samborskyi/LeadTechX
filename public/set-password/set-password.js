const token = new URLSearchParams(location.search).get("token") || "";
const form = document.querySelector("#passwordForm");
const title = document.querySelector("#setupTitle");
const detail = document.querySelector("#setupDetail");
const message = document.querySelector("#setupMessage");

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function initialize() {
  try {
    const claim = await api(`/api/onboarding/claim?token=${encodeURIComponent(token)}`);
    title.textContent = `Keep ${claim.businessName}`;
    detail.textContent = `Create the password for ${claim.email}.`;
    form.hidden = false;
  } catch (error) {
    title.textContent = "Setup link unavailable";
    detail.textContent = error.message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#newPassword").value;
  if (password !== document.querySelector("#confirmPassword").value) {
    message.textContent = "Passwords do not match";
    return;
  }
  const button = form.querySelector("button");
  button.disabled = true;
  message.textContent = "Creating account";
  try {
    await api("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, name: document.querySelector("#ownerName").value }),
    });
    location.assign("/");
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
});

window.lucide?.createIcons();
initialize();
