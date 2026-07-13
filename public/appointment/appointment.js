const token = new URLSearchParams(location.search).get("token") || "";
const el = {
  title: document.querySelector("#appointmentTitle"),
  detail: document.querySelector("#appointmentDetail"),
  summary: document.querySelector("#appointmentSummary"),
  slotSelect: document.querySelector("#slotSelect"),
  rescheduleButton: document.querySelector("#rescheduleButton"),
  cancelButton: document.querySelector("#cancelButton"),
  message: document.querySelector("#appointmentMessage"),
};

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setMessage(text, error = false) {
  el.message.textContent = text;
  el.message.style.color = error ? "var(--danger)" : "";
}

function render(data) {
  el.title.textContent = data.business.name;
  el.detail.textContent = `${data.confirmationCode} - ${data.appointmentTime}`;
  el.summary.textContent = data.summary;
  el.slotSelect.innerHTML = "";
  for (const slot of data.slots || []) {
    const option = document.createElement("option");
    option.value = slot.start;
    option.textContent = slot.label;
    el.slotSelect.appendChild(option);
  }
  const inactive = data.appointment.status === "cancelled";
  el.rescheduleButton.disabled = inactive || !el.slotSelect.options.length;
  el.cancelButton.disabled = inactive;
  if (inactive) setMessage("This appointment is cancelled.");
}

async function load() {
  if (!token) throw new Error("Appointment link is missing");
  const data = await api(`/api/public/appointments/${encodeURIComponent(token)}`);
  render(data);
}

el.rescheduleButton.addEventListener("click", async () => {
  setMessage("Rescheduling appointment");
  try {
    const data = await api(`/api/public/appointments/${encodeURIComponent(token)}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: el.slotSelect.value }),
    });
    setMessage("Appointment updated. A new summary was sent.");
    await load();
  } catch (error) {
    setMessage(error.message, true);
  }
});

el.cancelButton.addEventListener("click", async () => {
  setMessage("Cancelling appointment");
  try {
    await api(`/api/public/appointments/${encodeURIComponent(token)}/cancel`, { method: "POST" });
    setMessage("Appointment cancelled. A confirmation was sent.");
    await load();
  } catch (error) {
    setMessage(error.message, true);
  }
});

window.lucide?.createIcons();
load().catch((error) => {
  el.title.textContent = "Appointment unavailable";
  el.detail.textContent = error.message;
  el.rescheduleButton.disabled = true;
  el.cancelButton.disabled = true;
});
