const parts = location.pathname.split("/").filter(Boolean);
const cacheKey = parts[1] || "";
const el = {
  title: document.querySelector("#reviewTitle"),
  detail: document.querySelector("#reviewDetail"),
  links: document.querySelector("#reviewLinks"),
  message: document.querySelector("#reviewMessage"),
};

async function load() {
  if (!cacheKey) throw new Error("Review page is missing");
  const response = await fetch(`/api/public/reviews/${encodeURIComponent(cacheKey)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Review page unavailable");
  el.title.textContent = `Review ${data.businessName}`;
  el.links.innerHTML = "";
  for (const link of data.links || []) {
    const anchor = document.createElement("a");
    anchor.className = "button-link review-service-button";
    anchor.href = link.reviewUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = link.serviceName;
    el.links.appendChild(anchor);
  }
  if (!data.links?.length) el.message.textContent = "No review links are available yet.";
}

window.lucide?.createIcons();
load().catch((error) => {
  el.title.textContent = "Review page unavailable";
  el.detail.textContent = error.message;
});
