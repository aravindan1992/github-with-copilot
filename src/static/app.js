document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const confirmModal = document.getElementById("confirmModal");

  // Add a small helper to sanitize participant names
  function escapeHtml(text) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = details.participants || [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants list markup
        const participantsItems = participants.length
          ? participants
              .map(
                (p) =>
                  `<li><span class="participant-email">${escapeHtml(p)}</span><button class="participant-remove" data-activity="${escapeHtml(
                    name
                  )}" data-email="${escapeHtml(p)}" title="Remove participant">✕</button></li>`
              )
              .join("")
          : '<li class="no-participants">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <h5 class="participants-title">Participants</h5>
            <ul class="participants-list">
              ${participantsItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach click handler for remove buttons (delegation)
        const participantsListEl = activityCard.querySelector(".participants-list");
        participantsListEl.addEventListener("click", async (ev) => {
          const btn = ev.target.closest(".participant-remove");
          if (!btn) return;

          const activityName = btn.dataset.activity;
          const email = btn.dataset.email;

          if (!activityName || !email) return;

          // Show custom confirmation modal
          confirmModal.querySelector(".modal-content").textContent = 
            `Are you sure you want to unregister ${email} from ${activityName}?`;
          
          // Show modal and handle confirmation
          confirmModal.classList.remove("hidden");
          
          // Show confirmation modal and wait for user choice
          const confirmed = await new Promise((resolve) => {
            const handleModalClick = (event) => {
              const action = event.target.dataset.action;
              if (action === "confirm" || action === "cancel") {
                confirmModal.classList.add("hidden");
                confirmModal.removeEventListener("click", handleModalClick);
                resolve(action === "confirm");
              }
            };
            confirmModal.addEventListener("click", handleModalClick);
          });
          
          if (!confirmed) return;
          
          try {
            const res = await fetch(
              `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(
                email
              )}`,
              { method: "DELETE" }
            );

            const result = await res.json();

            if (res.ok) {
              messageDiv.textContent = result.message || "Participant removed";
              messageDiv.className = "success";
              messageDiv.classList.remove("hidden");

              // Refresh the activities list to show updated participants
              fetchActivities();
            } else {
              messageDiv.textContent = result.detail || "Failed to remove participant";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }

            setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          } catch (err) {
            console.error("Error removing participant:", err);
            messageDiv.textContent = "Network error when removing participant";
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
