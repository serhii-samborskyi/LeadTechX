const token = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) || "");
const source = new URLSearchParams(location.search).get("bookingSource") || "";
const state = { data: null, selectedDate: "", selectedStart: "", submitting: false, photos: [] };

function bookingApiUrl() {
  const query = new URLSearchParams();
  if (source) query.set("bookingSource", source);
  const suffix = query.toString();
  return `/api/public/booking/${encodeURIComponent(token)}${suffix ? `?${suffix}` : ""}`;
}

const el = {
  loading: document.querySelector("#loadingState"),
  error: document.querySelector("#errorState"),
  errorMessage: document.querySelector("#errorMessage"),
  retry: document.querySelector("#retryButton"),
  app: document.querySelector("#bookingApp"),
  businessName: document.querySelector("#businessName"),
  duration: document.querySelector("#durationLabel"),
  timezone: document.querySelector("#timezoneLabel"),
  form: document.querySelector("#bookingForm"),
  date: document.querySelector("#dateSelect"),
  slots: document.querySelector("#slotGrid"),
  noSlots: document.querySelector("#noSlotsMessage"),
  fields: document.querySelector("#intakeFields"),
  jobAttachments: document.querySelector("#jobAttachments"),
  jobNotes: document.querySelector("#jobNotes"),
  jobPhotos: document.querySelector("#jobPhotos"),
  photoLimitLabel: document.querySelector("#photoLimitLabel"),
  photoPreviewGrid: document.querySelector("#photoPreviewGrid"),
  photoError: document.querySelector("#photoError"),
  formError: document.querySelector("#formError"),
  submit: document.querySelector("#submitButton"),
  submitLabel: document.querySelector("#submitLabel"),
  success: document.querySelector("#successState"),
  successTitle: document.querySelector("#successTitle"),
  successSummary: document.querySelector("#successSummary"),
  manageLink: document.querySelector("#manageLink"),
  deliveryNote: document.querySelector("#deliveryNote"),
};

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function show(view) {
  el.loading.hidden = view !== "loading";
  el.error.hidden = view !== "error";
  el.app.hidden = view !== "app";
  el.success.hidden = view !== "success";
}

function dateLabel(dateKey) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`));
}

function timeLabel(value) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function timezoneLabel(value) {
  return String(value || "Local time").replaceAll("_", " ");
}

function slotsByDate() {
  const grouped = new Map();
  for (const slot of state.data?.slots || []) {
    const items = grouped.get(slot.date) || [];
    items.push(slot);
    grouped.set(slot.date, items);
  }
  return grouped;
}

function updateSubmitState() {
  el.submit.disabled = !state.selectedStart || state.submitting;
}

function renderSlots() {
  const slots = slotsByDate().get(state.selectedDate) || [];
  el.slots.replaceChildren();
  el.noSlots.hidden = slots.length > 0;
  for (const slot of slots) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot-button";
    button.dataset.start = slot.start;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(slot.start === state.selectedStart));
    button.textContent = timeLabel(slot.start);
    button.addEventListener("click", () => {
      state.selectedStart = slot.start;
      renderSlots();
      updateSubmitState();
    });
    el.slots.appendChild(button);
  }
}

function fieldInput(field) {
  const wrapper = document.createElement("label");
  wrapper.className = `dynamic-field${field.required ? " required" : ""}${field.type === "textarea" ? " wide" : ""}`;
  const label = document.createElement("span");
  label.textContent = field.label;
  wrapper.appendChild(label);

  let input;
  if (field.options?.length) {
    input = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = `Choose ${field.label.toLowerCase()}`;
    input.appendChild(blank);
    for (const value of field.options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      input.appendChild(option);
    }
  } else if (field.type === "textarea") {
    input = document.createElement("textarea");
  } else {
    input = document.createElement("input");
    input.type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  }
  input.name = field.key;
  input.required = Boolean(field.required);
  input.autocomplete = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.key === "name" ? "name" : "off";
  wrapper.appendChild(input);
  return wrapper;
}

function setPhotoError(message = "") {
  el.photoError.textContent = message;
  el.photoError.hidden = !message;
}

function clearPhotoPreviews() {
  for (const photo of state.photos) URL.revokeObjectURL(photo.url);
  state.photos = [];
  el.photoPreviewGrid.replaceChildren();
}

function renderPhotoPreviews() {
  el.photoPreviewGrid.replaceChildren();
  state.photos.forEach((photo, index) => {
    const preview = document.createElement("div");
    preview.className = "photo-preview";
    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = `Selected job photo ${index + 1}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-remove";
    remove.setAttribute("aria-label", `Remove ${photo.file.name}`);
    remove.innerHTML = '<i data-lucide="x"></i>';
    remove.addEventListener("click", () => {
      URL.revokeObjectURL(photo.url);
      state.photos.splice(index, 1);
      setPhotoError();
      renderPhotoPreviews();
    });
    preview.append(image, remove);
    el.photoPreviewGrid.appendChild(preview);
  });
  const maxFiles = state.data?.attachments?.maxFiles || 5;
  el.jobPhotos.disabled = state.photos.length >= maxFiles;
  window.lucide?.createIcons();
}

function addPhotos(files) {
  setPhotoError();
  const settings = state.data?.attachments || {};
  const maxFiles = settings.maxFiles || 5;
  const maxBytes = (settings.maxFileSizeMb || 4) * 1024 * 1024;
  const accepted = new Set(settings.acceptedTypes || ["image/jpeg", "image/png", "image/webp"]);
  for (const file of files) {
    if (state.photos.length >= maxFiles) {
      setPhotoError(`You can add up to ${maxFiles} photos.`);
      break;
    }
    if (!accepted.has(file.type)) {
      setPhotoError("Photos must be JPG, PNG, or WebP files.");
      continue;
    }
    if (file.size > maxBytes) {
      setPhotoError(`Each photo must be ${settings.maxFileSizeMb || 4} MB or smaller.`);
      continue;
    }
    state.photos.push({ file, url: URL.createObjectURL(file) });
  }
  el.jobPhotos.value = "";
  renderPhotoPreviews();
}

function render(data, { preserveForm = false } = {}) {
  const preservedValues = preserveForm ? Object.fromEntries(new FormData(el.form).entries()) : {};
  const preservedNotes = preserveForm ? el.jobNotes.value : "";
  state.data = data;
  document.title = `Book with ${data.business.name} | RingPort`;
  el.businessName.textContent = data.business.name;
  el.duration.textContent = `${data.durationMinutes} minute appointment`;
  el.timezone.textContent = timezoneLabel(data.timezone);
  el.submitLabel.textContent = data.appointmentMode === "instant" ? "Book appointment" : "Request appointment";

  const grouped = slotsByDate();
  const dates = [...grouped.keys()];
  state.selectedDate = dates[0] || "";
  state.selectedStart = "";
  el.date.replaceChildren();
  for (const date of dates) {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = `${dateLabel(date)} (${grouped.get(date).length} times)`;
    el.date.appendChild(option);
  }
  if (!dates.length) {
    const option = document.createElement("option");
    option.textContent = "No available dates";
    el.date.appendChild(option);
    el.date.disabled = true;
  } else {
    el.date.disabled = false;
  }
  el.fields.replaceChildren(...data.intakeFields.map(fieldInput));
  const initialValues = preserveForm ? preservedValues : data.prefill || {};
  for (const [name, value] of Object.entries(initialValues)) {
    const input = el.fields.querySelector(`[name="${CSS.escape(name)}"]`);
    if (input) input.value = value;
  }
  if (!preserveForm) {
    clearPhotoPreviews();
  }
  const attachmentsEnabled = data.attachments?.enabled === true;
  el.jobAttachments.hidden = !attachmentsEnabled;
  if (attachmentsEnabled) {
    el.jobNotes.value = preserveForm ? preservedNotes : "";
    el.photoLimitLabel.textContent = `Up to ${data.attachments.maxFiles} photos, ${data.attachments.maxFileSizeMb} MB each`;
  }
  renderSlots();
  updateSubmitState();
  show("app");
  window.lucide?.createIcons();
}

async function load() {
  if (!token) throw new Error("The booking link is missing.");
  show("loading");
  const data = await api(bookingApiUrl());
  render(data);
}

function setFormError(message = "") {
  el.formError.textContent = message;
  el.formError.hidden = !message;
}

function successRow(label, value) {
  const row = document.createElement("div");
  const name = document.createElement("span");
  const content = document.createElement("strong");
  name.textContent = label;
  content.textContent = value;
  row.append(name, content);
  return row;
}

function renderSuccess(data) {
  el.successTitle.textContent = data.appointment.status === "confirmed" ? "Your appointment is confirmed" : "Your request was sent";
  el.successSummary.replaceChildren(
    successRow("Business", data.business.name),
    successRow("When", data.appointmentTime),
    successRow("Confirmation", data.confirmationCode),
  );
  el.manageLink.href = data.manageUrl;
  el.deliveryNote.textContent = data.summaryDelivery.textSent || data.summaryDelivery.emailSent
    ? "We also sent your appointment details and management link."
    : "Save this page or use the management link for your appointment details.";
  if (data.appointment.attachmentCount) {
    el.deliveryNote.textContent += ` ${data.appointment.attachmentCount} ${data.appointment.attachmentCount === 1 ? "photo was" : "photos were"} attached.`;
  }
  clearPhotoPreviews();
  show("success");
  window.lucide?.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

el.date.addEventListener("change", () => {
  state.selectedDate = el.date.value;
  state.selectedStart = "";
  renderSlots();
  updateSubmitState();
});

el.jobPhotos.addEventListener("change", () => addPhotos([...el.jobPhotos.files]));

el.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormError();
  if (!state.selectedStart) return setFormError("Choose an appointment time first.");
  if (!el.form.reportValidity()) return;
  const formValues = new FormData(el.form);
  const intakeData = Object.fromEntries((state.data?.intakeFields || []).map((field) => [field.key, formValues.get(field.key) || ""]));
  state.submitting = true;
  el.submitLabel.textContent = "Booking appointment";
  updateSubmitState();
  try {
    const payload = new FormData();
    payload.append("start", state.selectedStart);
    payload.append("intakeData", JSON.stringify(intakeData));
    payload.append("bookingSource", source);
    if (state.data?.attachments?.enabled) payload.append("jobNotes", el.jobNotes.value.trim());
    for (const photo of state.photos) payload.append("photos", photo.file, photo.file.name);
    const data = await api(`/api/public/booking/${encodeURIComponent(token)}`, {
      method: "POST",
      body: payload,
    });
    renderSuccess(data);
  } catch (error) {
    setFormError(error.message);
    if (/not available|just booked/i.test(error.message)) {
      try {
        const data = await api(bookingApiUrl());
        render(data, { preserveForm: true });
        setFormError("That time was just booked. Please choose another available time.");
      } catch {
        // Keep the original error visible if refreshing availability fails.
      }
    }
  } finally {
    state.submitting = false;
    if (!el.success.hidden) return;
    el.submitLabel.textContent = state.data?.appointmentMode === "instant" ? "Book appointment" : "Request appointment";
    updateSubmitState();
  }
});

el.retry.addEventListener("click", () => load().catch(showError));

function showError(error) {
  el.errorMessage.textContent = error.message;
  show("error");
  window.lucide?.createIcons();
}

window.lucide?.createIcons();
load().catch(showError);
