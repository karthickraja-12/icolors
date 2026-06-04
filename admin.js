/**
 * iColors - Admin Dashboard Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Navigation elements
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  const loginForm = document.getElementById("admin-login-form");
  const logoutBtn = document.getElementById("admin-logout-btn");
  
  // Data lists (hydrated from API)
  let leadsData = [];
  let logsData = [];
  let docsData = [];
  
  // Authentication status
  let adminPasscode = sessionStorage.getItem("icolors_admin_passcode") || "";
  
  // UI Tabs Router
  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-target]");
  const sections = document.querySelectorAll(".dashboard-section");
  
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      const targetSecId = link.getAttribute("data-target");
      
      // Update sidebar links active class
      sidebarLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      
      // Update sections active class
      sections.forEach(sec => sec.classList.remove("active"));
      document.getElementById(targetSecId).classList.add("active");
    });
  });

  // Logout Handler
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("icolors_admin_passcode");
    adminPasscode = "";
    showToast("Logged out from admin panel", "info");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  });

  // Login Form Submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passcodeVal = document.getElementById("passcode").value.trim();
    
    try {
      const response = await apiRequest("get-admin-data", { passcode: passcodeVal });
      
      if (response && response.success) {
        sessionStorage.setItem("icolors_admin_passcode", passcodeVal);
        adminPasscode = passcodeVal;
        showToast("Authenticated successfully!", "success");
        
        // Hydrate data and transition view
        leadsData = response.leads || [];
        logsData = response.logs || [];
        docsData = response.documents || [];
        
        loginSection.style.display = "none";
        dashboardSection.style.display = "grid";
        
        renderAllDashboard();
      } else {
        showToast(response.error || "Authentication failed. Invalid passcode.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Could not authenticate. Check API config.", "error");
    }
  });

  // Auto-Login if passcode is saved
  if (adminPasscode) {
    (async () => {
      try {
        const response = await apiRequest("get-admin-data", { passcode: adminPasscode });
        if (response && response.success) {
          leadsData = response.leads || [];
          logsData = response.logs || [];
          docsData = response.documents || [];
          
          loginSection.style.display = "none";
          dashboardSection.style.display = "grid";
          
          renderAllDashboard();
        } else {
          sessionStorage.removeItem("icolors_admin_passcode");
        }
      } catch (err) {
        console.error("Auto login error:", err);
      }
    })();
  }

  // Reload dashboard data helper
  async function refreshData() {
    try {
      const response = await apiRequest("get-admin-data", { passcode: adminPasscode });
      if (response && response.success) {
        leadsData = response.leads || [];
        logsData = response.logs || [];
        docsData = response.documents || [];
        renderAllDashboard();
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    }
  }

  // Main Render router
  function renderAllDashboard() {
    renderAnalytics();
    initLeadsTab();
    initLogsTab();
    renderDocumentsTab();
  }

  /* ==========================================================================
     1. ANALYTICS RENDER
     ========================================================================== */
  function renderAnalytics() {
    // Stat 1: Total Leads
    document.getElementById("stat-total-leads").textContent = leadsData.length;
    
    // Compute date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    
    let todayLeads = 0;
    let weeklyLeads = 0;
    let monthlyLeads = 0;
    
    leadsData.forEach(lead => {
      const leadTime = new Date(lead.timestamp).getTime();
      if (isNaN(leadTime)) return;
      
      if (leadTime >= todayStart) todayLeads++;
      if (leadTime >= sevenDaysAgo) weeklyLeads++;
      if (leadTime >= thirtyDaysAgo) monthlyLeads++;
    });

    document.getElementById("stat-today-leads").textContent = todayLeads;
    document.getElementById("stat-weekly-leads").textContent = weeklyLeads;
    document.getElementById("stat-monthly-leads").textContent = monthlyLeads;

    // Conversion Calculations: leads who did Viewed or Downloaded actions
    const convertedLeadIds = new Set();
    logsData.forEach(log => {
      if (log.action === "Viewed File" || log.action === "Downloaded File") {
        convertedLeadIds.add(log.leadId);
      }
    });

    const conversionRate = leadsData.length > 0 
      ? Math.round((convertedLeadIds.size / leadsData.length) * 100) 
      : 0;

    document.getElementById("analytics-conversion-rate").textContent = `${conversionRate}%`;
    document.getElementById("analytics-conversion-fraction").textContent = `${convertedLeadIds.size} out of ${leadsData.length} Leads`;
    document.getElementById("analytics-conversion-bar").style.width = `${conversionRate}%`;

    // Top Accessed Documents Aggregation
    const fileAccessCounts = {};
    logsData.forEach(log => {
      if (log.action === "Viewed File" || log.action === "Downloaded File") {
        fileAccessCounts[log.docName] = (fileAccessCounts[log.docName] || 0) + 1;
      }
    });

    const sortedDocs = Object.entries(fileAccessCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDocsContainer = document.getElementById("analytics-top-docs");
    topDocsContainer.innerHTML = "";

    if (sortedDocs.length === 0) {
      topDocsContainer.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">
          No document access events logged yet.
        </div>
      `;
      return;
    }

    const maxCount = sortedDocs[0].count;
    sortedDocs.forEach(item => {
      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
      
      const docItem = document.createElement("div");
      docItem.className = "top-doc-item";
      docItem.innerHTML = `
        <div class="top-doc-info">
          <div class="top-doc-meta">
            <span>${item.name}</span>
            <span class="top-doc-count">${item.count} hits</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
      topDocsContainer.appendChild(docItem);
    });
  }

  /* ==========================================================================
     2. LEADS TAB
     ========================================================================== */
  let leadsPage = 1;
  const leadsPerPage = 10;
  let filteredLeads = [];

  function initLeadsTab() {
    const searchInput = document.getElementById("leads-search");
    const deviceSelect = document.getElementById("leads-filter-device");
    const prevBtn = document.getElementById("leads-prev-btn");
    const nextBtn = document.getElementById("leads-next-btn");
    const exportBtn = document.getElementById("leads-export-btn");

    const applyFilters = () => {
      const searchVal = searchInput.value.toLowerCase().trim();
      const deviceVal = deviceSelect.value;
      
      filteredLeads = leadsData.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchVal) || 
                              lead.email.toLowerCase().includes(searchVal) || 
                              (lead.company && lead.company.toLowerCase().includes(searchVal)) || 
                              lead.token.toLowerCase().includes(searchVal);
        
        const matchesDevice = deviceVal === "all" || lead.device === deviceVal;
        
        return matchesSearch && matchesDevice;
      });

      leadsPage = 1;
      renderLeadsTable();
    };

    // Listeners
    searchInput.addEventListener("input", applyFilters);
    deviceSelect.addEventListener("change", applyFilters);
    
    prevBtn.onclick = () => {
      if (leadsPage > 1) {
        leadsPage--;
        renderLeadsTable();
      }
    };
    
    nextBtn.onclick = () => {
      if (leadsPage < Math.ceil(filteredLeads.length / leadsPerPage)) {
        leadsPage++;
        renderLeadsTable();
      }
    };

    exportBtn.onclick = downloadLeadsCSV;

    // Run first filter render
    applyFilters();
  }

  function renderLeadsTable() {
    const tableBody = document.getElementById("leads-table-body");
    const pageInfo = document.getElementById("leads-pagination-info");
    const prevBtn = document.getElementById("leads-prev-btn");
    const nextBtn = document.getElementById("leads-next-btn");

    tableBody.innerHTML = "";

    const startIndex = (leadsPage - 1) * leadsPerPage;
    const endIndex = Math.min(startIndex + leadsPerPage, filteredLeads.length);
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    if (paginatedLeads.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No leads matching criteria.</td></tr>`;
      pageInfo.textContent = "Showing 0-0 of 0 leads";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    paginatedLeads.forEach(lead => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="white-space: nowrap; font-size: 0.8rem;">${lead.timestamp}</td>
        <td style="font-weight: 600;">${lead.id}</td>
        <td style="color: var(--text-primary); font-weight: 500;">${lead.name}</td>
        <td>${lead.email}</td>
        <td style="white-space: nowrap;">${lead.phone}</td>
        <td>${lead.company || '<span style="color: var(--text-muted); font-style: italic;">None</span>'}</td>
        <td><span style="font-size: 0.8rem; background: var(--bg-tertiary); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">${lead.device}</span></td>
        <td style="font-family: monospace; font-size: 0.75rem;" title="${lead.token}">${lead.token.substring(0, 12)}...</td>
      `;
      tableBody.appendChild(row);
    });

    pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredLeads.length} leads`;
    prevBtn.disabled = leadsPage === 1;
    nextBtn.disabled = leadsPage >= Math.ceil(filteredLeads.length / leadsPerPage);
  }

  function downloadLeadsCSV() {
    if (leadsData.length === 0) {
      showToast("No lead data to export.", "error");
      return;
    }

    const headers = ["Lead ID", "Timestamp", "Name", "Email", "Phone", "Company", "Token", "Device Type", "IP Address", "Status"];
    const rows = leadsData.map(lead => [
      lead.id,
      `"${lead.timestamp}"`,
      `"${lead.name}"`,
      `"${lead.email}"`,
      `"${lead.phone}"`,
      `"${lead.company || ""}"`,
      `"${lead.token}"`,
      lead.device || "",
      lead.ip || "",
      lead.status || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `icolors_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Leads CSV exported successfully.", "success");
  }

  /* ==========================================================================
     3. ACCESS LOGS TAB
     ========================================================================== */
  let logsPage = 1;
  const logsPerPage = 10;
  let filteredLogs = [];

  function initLogsTab() {
    const searchInput = document.getElementById("logs-search");
    const actionSelect = document.getElementById("logs-filter-action");
    const prevBtn = document.getElementById("logs-prev-btn");
    const nextBtn = document.getElementById("logs-next-btn");

    const applyFilters = () => {
      const searchVal = searchInput.value.toLowerCase().trim();
      const actionVal = actionSelect.value;

      filteredLogs = logsData.filter(log => {
        // Find corresponding lead name for full search support
        const lead = leadsData.find(l => l.id === log.leadId || l.token === log.token);
        const leadName = lead ? lead.name.toLowerCase() : "";
        
        const matchesSearch = leadName.includes(searchVal) || 
                              log.docName.toLowerCase().includes(searchVal) || 
                              log.token.toLowerCase().includes(searchVal);
        
        const matchesAction = actionVal === "all" || log.action === actionVal;
        
        return matchesSearch && matchesAction;
      });

      logsPage = 1;
      renderLogsTable();
    };

    searchInput.addEventListener("input", applyFilters);
    actionSelect.addEventListener("change", applyFilters);
    
    prevBtn.onclick = () => {
      if (logsPage > 1) {
        logsPage--;
        renderLogsTable();
      }
    };
    
    nextBtn.onclick = () => {
      if (logsPage < Math.ceil(filteredLogs.length / logsPerPage)) {
        logsPage++;
        renderLogsTable();
      }
    };

    applyFilters();
  }

  function renderLogsTable() {
    const tableBody = document.getElementById("logs-table-body");
    const pageInfo = document.getElementById("logs-pagination-info");
    const prevBtn = document.getElementById("logs-prev-btn");
    const nextBtn = document.getElementById("logs-next-btn");

    tableBody.innerHTML = "";

    const startIndex = (logsPage - 1) * logsPerPage;
    const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    if (paginatedLogs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No logs matching criteria.</td></tr>`;
      pageInfo.textContent = "Showing 0-0 of 0 logs";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    paginatedLogs.forEach(log => {
      const lead = leadsData.find(l => l.id === log.leadId || l.token === log.token);
      const leadName = lead ? lead.name : `<span style="color: var(--text-muted); font-style: italic;">Unknown Lead</span>`;
      
      // Style badge based on action
      let badgeStyle = "background: rgba(99,102,241,0.1); color: var(--accent-light);";
      if (log.action === "Viewed File") {
        badgeStyle = "background: rgba(245,158,11,0.1); color: var(--warning);";
      } else if (log.action === "Downloaded File") {
        badgeStyle = "background: rgba(16,185,129,0.1); color: var(--success);";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="white-space: nowrap; font-size: 0.8rem;">${log.timestamp}</td>
        <td style="font-weight: 500; color: var(--text-primary);">${leadName}</td>
        <td style="font-family: monospace; font-size: 0.75rem;" title="${log.token}">${log.token.substring(0, 12)}...</td>
        <td style="font-weight: 500;">${log.docName}</td>
        <td><span style="font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); ${badgeStyle}">${log.action}</span></td>
      `;
      tableBody.appendChild(row);
    });

    pageInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredLogs.length} logs`;
    prevBtn.disabled = logsPage === 1;
    nextBtn.disabled = logsPage >= Math.ceil(filteredLogs.length / logsPerPage);
  }

  /* ==========================================================================
     4. DOCUMENTS TAB & CRUD OPERATIONS
     ========================================================================== */
  const docModal = document.getElementById("doc-modal");
  const addDocBtn = document.getElementById("add-doc-modal-btn");
  const cancelDocBtn = document.getElementById("doc-modal-cancel");
  const closeDocBtn = document.getElementById("doc-modal-close");
  const docForm = document.getElementById("doc-form");
  const modalTitle = document.getElementById("modal-title");

  // Modal open/close controls
  const toggleModal = (show) => {
    if (show) {
      docModal.classList.add("active");
    } else {
      docModal.classList.remove("active");
      docForm.reset();
      document.getElementById("edit-doc-id").value = "";
    }
  };

  addDocBtn.onclick = () => {
    modalTitle.textContent = "Add Document";
    document.getElementById("doc-modal-submit-btn").textContent = "Add Document";
    toggleModal(true);
  };
  
  cancelDocBtn.onclick = () => toggleModal(false);
  closeDocBtn.onclick = () => toggleModal(false);

  // Helper to extract Google Drive File ID from standard sharing or direct links
  function extractGoogleDriveId(url) {
    if (!url) return "";
    
    // Match standard file link: /file/d/FILE_ID
    const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(fileIdRegex);
    if (match && match[1]) return match[1];
    
    // Match direct download link: ?id=FILE_ID
    const idRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
    const matchId = url.match(idRegex);
    if (matchId && matchId[1]) return matchId[1];
    
    // Return original string if it is already the raw ID
    return url.trim();
  }

  // Submit Modal Handler (Add or Update)
  docForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const docId = document.getElementById("edit-doc-id").value;
    const titleVal = document.getElementById("doc-title").value.trim();
    const descVal = document.getElementById("doc-desc").value.trim();
    const urlVal = document.getElementById("doc-url").value.trim();
    const typeVal = document.getElementById("doc-type").value;
    const statusVal = document.getElementById("doc-status").value;

    // Automatically extract Google Drive File ID
    const driveFileId = extractGoogleDriveId(urlVal);
    if (urlVal !== driveFileId && urlVal.includes("drive.google.com")) {
      showToast("Extracted Google Drive File ID for secure storage.", "info");
    }

    const payload = {
      passcode: adminPasscode,
      title: titleVal,
      description: descVal,
      fileUrl: driveFileId,
      fileType: typeVal,
      status: statusVal
    };

    try {
      let response;
      if (docId) {
        // Edit action
        payload.id = docId;
        response = await apiRequest("update-document", payload);
      } else {
        // Add action
        response = await apiRequest("add-document", payload);
      }

      if (response && response.success) {
        showToast(docId ? "Document updated successfully." : "Document added successfully.", "success");
        toggleModal(false);
        await refreshData();
      } else {
        showToast(response.error || "Action failed.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Error processing document request.", "error");
    }
  });

  // Render Documents List
  function renderDocumentsTab() {
    const tableBody = document.getElementById("docs-table-body");
    tableBody.innerHTML = "";

    if (docsData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No documents in the system database.</td></tr>`;
      return;
    }

    docsData.forEach(doc => {
      const statusClass = doc.status === "Active" ? "active" : "inactive";
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="color: var(--text-primary); font-weight: 600;">${doc.title}</td>
        <td><span style="font-size: 0.8rem; font-weight: 500; background: var(--bg-tertiary); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">${doc.fileType}</span></td>
        <td style="font-size: 0.85rem;">${doc.addedDate}</td>
        <td><span class="status-badge ${statusClass}">${doc.status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary edit-btn" data-id="${doc.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; margin-right: 0.5rem;">Edit</button>
          <button class="btn btn-danger delete-btn" data-id="${doc.id}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; box-shadow: none;">Delete</button>
        </td>
      `;

      // Event delegation inside loop for quick actions
      row.querySelector(".edit-btn").onclick = () => openEditModal(doc);
      row.querySelector(".delete-btn").onclick = () => deleteDocument(doc.id, doc.title);

      tableBody.appendChild(row);
    });
  }

  function openEditModal(doc) {
    modalTitle.textContent = "Edit Document";
    document.getElementById("doc-modal-submit-btn").textContent = "Save Changes";
    
    document.getElementById("edit-doc-id").value = doc.id;
    document.getElementById("doc-title").value = doc.title;
    document.getElementById("doc-desc").value = doc.description;
    document.getElementById("doc-url").value = doc.fileUrl;
    document.getElementById("doc-type").value = doc.fileType;
    document.getElementById("doc-status").value = doc.status;

    toggleModal(true);
  }

  async function deleteDocument(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiRequest("delete-document", { passcode: adminPasscode, id: id });
      if (response && response.success) {
        showToast(`Deleted document "${title}"`, "success");
        await refreshData();
      } else {
        showToast(response.error || "Failed to delete document.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error processing delete.", "error");
    }
  }
});
