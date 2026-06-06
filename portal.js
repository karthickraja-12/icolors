/**
 * iColors - Document Portal Logic
 */

document.addEventListener("DOMContentLoaded", async () => {
  const portalContent = document.getElementById("portal-content");
  const portalDenied = document.getElementById("portal-denied");
  const portalLoading = document.getElementById("portal-loading");
  const portalFooter = document.getElementById("portal-footer");
  const userGreeting = document.getElementById("user-greeting");
  const welcomeTitle = document.getElementById("welcome-title");
  const logoutBtn = document.getElementById("logout-btn");
  const documentGrid = document.getElementById("document-grid");
  const searchBar = document.getElementById("search-bar");
  const filterTabsContainer = document.getElementById("filter-tabs");
  const deniedMessage = document.getElementById("denied-message");

  let token = "";
  let userDisplayName = "";
  let documentList = [];
  let activeFilter = "all";
  let activeSearch = "";

  // 1. Get Token from URL or Local Storage
  const urlParams = new URLSearchParams(window.location.search);
  token = urlParams.get("token");

  if (!token) {
    token = localStorage.getItem("icolors_access_token");
  }

  if (!token) {
    showDenied("A valid security access token is required to enter this portal. Please register on our landing page.");
    return;
  }

  // 2. Validate Token
  showLoading(true);
  try {
    // Note: apiRequest auto-injects device fingerprint via generateDeviceFingerprint()
    const response = await apiRequest("validate-token", { token });
    
    if (response && response.success) {
      userDisplayName = response.name;
      localStorage.setItem("icolors_access_token", token);
      localStorage.setItem("icolors_user_name", userDisplayName);
      
      // Initialize Dashboard
      setupPortalUI();
      await loadDocuments();
      
      // Log Portal Access Action
      await apiRequest("log-access", {
        token: token,
        docName: "Document Access Portal",
        actionType: "Opened Portal"
      });
    } else if (response && response.isPending) {
      // Distinguish between expired and pending-payment states
      const isExpired = response.error && response.error.toLowerCase().includes("expired");
      if (isExpired) {
        showExpired(response.error);
      } else {
        showPendingVerification(response.error || "Pending Payment Activation. Please pay the representative on-spot to unlock access.");
      }
    } else {
      localStorage.removeItem("icolors_access_token");
      localStorage.removeItem("icolors_user_name");
      showDenied(response.error || "The access token provided is invalid or has expired.");
    }
  } catch (error) {
    console.error("Token validation error:", error);
    showDenied("A network error occurred while validating your token. Please try again.");
  } finally {
    showLoading(false);
  }

  // Set up Portal UI Elements
  function setupPortalUI() {
    portalContent.style.display = "block";
    portalFooter.style.display = "block";
    portalDenied.style.display = "none";
    
    userGreeting.textContent = `Welcome, ${userDisplayName}`;
    userGreeting.style.display = "block";
    
    welcomeTitle.innerHTML = `Welcome to <span style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">iColors</span>, ${userDisplayName.split(" ")[0]}`;
    
    logoutBtn.style.display = "block";
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("icolors_access_token");
      localStorage.removeItem("icolors_user_name");
      showToast("Logged out successfully.", "info");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    });

    // Add search and filter listeners
    searchBar.addEventListener("input", (e) => {
      activeSearch = e.target.value.toLowerCase().trim();
      renderDocuments();
    });

    filterTabsContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-tab")) {
        // Toggle Active Tab class
        document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
        e.target.classList.add("active");
        
        activeFilter = e.target.getAttribute("data-type");
        renderDocuments();
      }
    });
  }

  // Load Documents from API
  async function loadDocuments() {
    try {
      const response = await apiRequest("get-documents", { token });
      if (response && response.success) {
        documentList = response.documents || [];
        renderDocuments();
      } else {
        showToast(response.error || "Failed to retrieve documents list.", "error");
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
      showToast("Error loading documents list.", "error");
    }
  }

  // Render document grid with filters
  function renderDocuments() {
    documentGrid.innerHTML = "";
    
    // Filter documents
    const filteredDocs = documentList.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(activeSearch) || 
                            doc.description.toLowerCase().includes(activeSearch);
      
      const matchesFilter = activeFilter === "all" || doc.fileType === activeFilter;
      
      return matchesSearch && matchesFilter;
    });

    if (filteredDocs.length === 0) {
      documentGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 20 20" fill="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.5;">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
          </svg>
          <h3>No Documents Found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">Try adjusting your search criteria or category filter.</p>
        </div>
      `;
      return;
    }

    // Render Cards
    filteredDocs.forEach(doc => {
      const card = document.createElement("div");
      card.className = `doc-card ${doc.unlocked === false ? 'doc-card-locked' : ''}`;
      
      // Get Icon and color theme based on file type
      const iconDetails = getFileTypeDetails(doc.fileType);
      
      let actionsHtml = "";
      let lockedOverlayHtml = "";
      
      if (doc.unlocked === false) {
        lockedOverlayHtml = `
          <div class="locked-badge">
            <svg viewBox="0 0 20 20" fill="currentColor" style="width: 14px; height: 14px;"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
            Locked
          </div>
        `;
        actionsHtml = `
          <button class="btn btn-secondary locked-btn" style="width: 100%; cursor: not-allowed; opacity: 0.65; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" disabled>
            <svg viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
            Purchase to Unlock
          </button>
        `;
      } else {
        actionsHtml = `
          <button class="btn btn-secondary view-btn" data-id="${doc.id}">View</button>
          <button class="btn btn-primary download-btn" data-id="${doc.id}">Download</button>
        `;
      }
      
      card.innerHTML = `
        <div class="doc-thumbnail" style="background: ${iconDetails.bgGradient}">
          <div class="doc-badge">${doc.fileType}</div>
          ${lockedOverlayHtml}
          <div class="doc-icon-overlay" style="background: ${iconDetails.iconBg}">
            ${iconDetails.svg}
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-meta">
            <h3 class="doc-title">${doc.title}</h3>
            <p class="doc-desc">${doc.description}</p>
          </div>
          <div class="doc-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
      
      // Attach click listeners to active buttons
      if (doc.unlocked !== false) {
        card.querySelector(".view-btn").addEventListener("click", () => {
          handleDocumentAction(doc, "Viewed File");
        });
        card.querySelector(".download-btn").addEventListener("click", () => {
          handleDocumentAction(doc, "Downloaded File");
        });
      }

      documentGrid.appendChild(card);
    });
  }

  // Handle Document Log and Forwarding via Single-Use Download Tokens & Proxy
  async function handleDocumentAction(doc, actionType) {
    try {
      showLoading(true);
      showToast(`${actionType === "Viewed File" ? "Requesting access to" : "Preparing download of"} ${doc.title}...`, "info");
      
      // Step 1: Request temporary single-use download token
      const tokenRes = await apiRequest("request-download-token", {
        token: token,
        docId: doc.id
      });
      
      if (!tokenRes || !tokenRes.success) {
        showToast(tokenRes.error || "Access denied. Cannot generate download ticket.", "error");
        showLoading(false);
        return;
      }
      
      // Step 2: Retrieve the file content proxy stream (Base64)
      const fileRes = await apiRequest("retrieve-file", {
        dlToken: tokenRes.dlToken
      });
      
      if (!fileRes || !fileRes.success) {
        showToast(fileRes.error || "Failed to download file.", "error");
        showLoading(false);
        return;
      }
      
      // Step 3: Trigger browser download using temporary anchor link
      const a = document.createElement("a");
      a.href = fileRes.data;
      a.download = fileRes.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Step 4: Log action on server
      apiRequest("log-access", {
        token: token,
        docName: doc.title,
        actionType: actionType
      }).catch(err => console.error("Access logging failed:", err));
      
      showToast(`${doc.title} downloaded successfully!`, "success");
    } catch (e) {
      console.error(e);
      showToast("An error occurred during file transfer.", "error");
    } finally {
      showLoading(false);
    }
  }

  // Return SVG icon, overlay backgrounds based on doc type
  function getFileTypeDetails(fileType) {
    let svg = "";
    let iconBg = "";
    let bgGradient = "";

    switch (fileType) {
      case "PDF":
        // Red Theme
        svg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`;
        iconBg = "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)";
        bgGradient = "radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)";
        break;
      case "Spreadsheet":
        // Green Theme
        svg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
        iconBg = "linear-gradient(135deg, #10b981 0%, #047857 100%)";
        bgGradient = "radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)";
        break;
      case "Presentation":
        // Amber/Orange Theme
        svg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21h8M12 17V3"></path></svg>`;
        iconBg = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        bgGradient = "radial-gradient(circle, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)";
        break;
      case "Folder":
        // Indigo Theme
        svg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>`;
        iconBg = "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";
        bgGradient = "radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.02) 100%)";
        break;
      default:
        // Grey Theme
        svg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`;
        iconBg = "linear-gradient(135deg, #6b7280 0%, #374151 100%)";
        bgGradient = "radial-gradient(circle, rgba(107,114,128,0.1) 0%, rgba(107,114,128,0.02) 100%)";
    }

    return { svg, iconBg, bgGradient };
  }

  // Display Controllers
  function showPendingVerification(message) {
    portalDenied.style.display = "flex";
    portalContent.style.display = "none";
    portalFooter.style.display = "none";
    
    deniedMessage.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(245,158,11,0.15); border: 2px solid var(--warning); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="34" height="34">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h3 style="margin-bottom: 0.5rem; color: var(--warning); font-size: 1.35rem;">Payment Activation Required</h3>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.25rem; line-height: 1.6;">${message}</p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin-bottom: 1.5rem; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 100px; padding: 0.5rem 1.25rem;">
          <span id="portal-polling-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block; animation: portalPulse 2s ease-in-out infinite;"></span>
          <span id="portal-polling-text" style="font-size: 0.82rem; font-weight: 500; color: #10b981;">Checking activation status automatically...</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 1.5rem;">You'll be redirected automatically once the representative confirms your payment.</p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 280px; margin: 0 auto;">
          <a href="index.html" class="btn" style="font-size: 0.85rem; color: var(--text-muted); text-decoration: none; padding: 0.4rem;">← Back to Registration</a>
        </div>
      </div>
      <style>
        @keyframes portalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
      </style>
    `;
    userGreeting.style.display = "none";
    logoutBtn.style.display = "none";

    // Auto-poll every 6 seconds to detect admin approval
    let pollCount = 0;
    const pendingPollInterval = setInterval(async () => {
      pollCount++;
      const dot = document.getElementById("portal-polling-dot");
      const txt = document.getElementById("portal-polling-text");
      try {
        if (dot) { dot.style.opacity = "0.3"; setTimeout(() => { if (dot) dot.style.opacity = "1"; }, 500); }
        if (txt) txt.textContent = `Checking activation status... (${pollCount})`;

        const res = await apiRequest("validate-token", { token });
        if (res && res.success) {
          clearInterval(pendingPollInterval);
          if (txt) txt.textContent = "✓ Access Activated! Loading dashboard...";
          showToast("🎉 Access Activated! Loading your dashboard...", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (e) { /* Silently ignore */ }
    }, 6000);
  }

  function showExpired(message) {
    portalDenied.style.display = "flex";
    portalContent.style.display = "none";
    portalFooter.style.display = "none";
    localStorage.removeItem("icolors_access_token");
    localStorage.removeItem("icolors_user_name");
    
    deniedMessage.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239,68,68,0.12); border: 2px solid var(--danger); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="34" height="34">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="margin-bottom: 0.5rem; color: var(--danger); font-size: 1.35rem;">15-Day Access Expired</h3>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.75rem; line-height: 1.6;">${message}</p>
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.5rem; text-align: left;">
          <p style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">How to Reactivate:</p>
          <ol style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; padding-left: 1.25rem; line-height: 1.8;">
            <li>Visit the iColors representative on-spot</li>
            <li>Make your payment for a new 15-day cycle</li>
            <li>Register again using the same email</li>
            <li>The representative will approve your access</li>
          </ol>
        </div>
        <a href="index.html" class="btn btn-primary" style="padding: 0.7rem 2rem; display: inline-block;">Re-Register Now</a>
      </div>
    `;
    userGreeting.style.display = "none";
    logoutBtn.style.display = "none";
  }

  function showDenied(message) {
    portalDenied.style.display = "flex";
    portalContent.style.display = "none";
    portalFooter.style.display = "none";
    deniedMessage.textContent = message;
    userGreeting.style.display = "none";
    logoutBtn.style.display = "none";
  }

  function showLoading(isLoading) {
    portalLoading.style.display = isLoading ? "flex" : "none";
  }
});
