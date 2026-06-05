/**
 * iColors - Core App Utilities & Configuration
 */

const CONFIG = {
  // Replace with your Google Apps Script Web App URL once deployed, e.g. "https://script.google.com/macros/s/..."
  API_URL: "https://script.google.com/macros/s/AKfycbxpDOqcPrAvRU-9quoUC0NKgAcdURQi5XApWAO9NHJgivVS-ze2RPpbQtQLqZHfyrvO/exec",
  DEFAULT_ADMIN_PASSCODE: "admin123"
};

// Mock Database Initializer (for local preview/testing without Apps Script)
const MOCK_DB = {
  init() {
    if (!localStorage.getItem("icolors_leads")) {
      const defaultLeads = [
        {
          id: "L-101",
          timestamp: new Date(Date.now() - 3600000 * 24 * 3).toLocaleString(),
          name: "Alex Rivera",
          email: "alex@riveratech.io",
          phone: "+1 555-0199",
          company: "Rivera Tech",
          token: "8f7f3e5a-c9c2-4f65-bca2-9284b9f67f91",
          ip: "192.168.1.15",
          device: "Desktop",
          status: "Active"
        },
        {
          id: "L-102",
          timestamp: new Date(Date.now() - 3600000 * 8).toLocaleString(),
          name: "Sarah Chen",
          email: "sarah.c@designgrid.co",
          phone: "+65 9123 4567",
          company: "Design Grid",
          token: "bca2e5a9-2849-4f65-8f7f-9284b9f67f92",
          ip: "116.12.83.4",
          device: "Mobile",
          status: "Active"
        },
        {
          id: "L-103",
          timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString(),
          name: "Marc Dupont",
          email: "m.dupont@financeflow.eu",
          phone: "+33 6 1234 5678",
          company: "Finance Flow",
          token: "87f3-c9c2-4f65-bca2-mock-token-3",
          ip: "82.234.12.189",
          device: "Tablet",
          status: "Active"
        }
      ];
      localStorage.setItem("icolors_leads", JSON.stringify(defaultLeads));
    }

    if (!localStorage.getItem("icolors_docs")) {
      const defaultDocs = [
        {
          id: "doc-1",
          title: "Corporate Brand Guidelines 2026",
          description: "Official brand identity guidelines covering logo placement, typography, color palette, and voice tone guidelines.",
          fileUrl: "https://drive.google.com/file/d/1mock-drive-link-brand-guidelines/view",
          fileType: "PDF",
          addedDate: new Date(Date.now() - 3600000 * 24 * 10).toISOString().split('T')[0],
          status: "Active"
        },
        {
          id: "doc-2",
          title: "Lead Generation Masterclass Slides",
          description: "Exclusive presentation slides from our Q2 marketing campaign masterclass, detailing core funnel math and conversion hacks.",
          fileUrl: "https://docs.google.com/presentation/d/1mock-drive-link-presentation/view",
          fileType: "Presentation",
          addedDate: new Date(Date.now() - 3600000 * 24 * 8).toISOString().split('T')[0],
          status: "Active"
        },
        {
          id: "doc-3",
          title: "Financial Forecasting Template",
          description: "Interactive Excel/Google Sheet spreadsheet with formulas for 5-year startup runway projections and hiring plan models.",
          fileUrl: "https://docs.google.com/spreadsheets/d/1mock-drive-link-spreadsheet/view",
          fileType: "Spreadsheet",
          addedDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
          status: "Active"
        },
        {
          id: "doc-4",
          title: "Q3 Asset Resource Folder",
          description: "Branded graphic assets, raw high-res images, email templates, and typography packages for marketing assets.",
          fileUrl: "https://drive.google.com/drive/folders/1mock-drive-link-folder",
          fileType: "Folder",
          addedDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
          status: "Active"
        }
      ];
      localStorage.setItem("icolors_docs", JSON.stringify(defaultDocs));
    }

    if (!localStorage.getItem("icolors_logs")) {
      const defaultLogs = [
        {
          timestamp: new Date(Date.now() - 3600000 * 24 * 3).toLocaleString(),
          leadId: "L-101",
          token: "8f7f3e5a-c9c2-4f65-bca2-9284b9f67f91",
          docName: "Corporate Brand Guidelines 2026",
          action: "Opened Portal"
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 24 * 3 + 60000).toLocaleString(),
          leadId: "L-101",
          token: "8f7f3e5a-c9c2-4f65-bca2-9284b9f67f91",
          docName: "Corporate Brand Guidelines 2026",
          action: "Viewed File"
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 8).toLocaleString(),
          leadId: "L-102",
          token: "bca2e5a9-2849-4f65-8f7f-9284b9f67f92",
          docName: "Corporate Brand Guidelines 2026",
          action: "Opened Portal"
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 8 + 120000).toLocaleString(),
          leadId: "L-102",
          token: "bca2e5a9-2849-4f65-8f7f-9284b9f67f92",
          docName: "Financial Forecasting Template",
          action: "Viewed File"
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 8 + 300000).toLocaleString(),
          leadId: "L-102",
          token: "bca2e5a9-2849-4f65-8f7f-9284b9f67f92",
          docName: "Financial Forecasting Template",
          action: "Downloaded File"
        }
      ];
      localStorage.setItem("icolors_logs", JSON.stringify(defaultLogs));
    }
  }
};

// Check if Apps Script is configured
function isMockMode() {
  return !CONFIG.API_URL || CONFIG.API_URL.trim() === "";
}

// Global API Request Handler
async function apiRequest(action, data = {}, method = "POST") {
  // Automatically inject device fingerprint for client actions
  if (action !== "get-admin-data" && !data.fingerprint) {
    data.fingerprint = generateDeviceFingerprint();
  }

  if (isMockMode()) {
    return handleMockRequest(action, data);
  }

  try {
    const url = new URL(CONFIG.API_URL);
    let options = {
      method: method,
      mode: 'cors'
    };

    if (method === "POST") {
      // Bypassing CORS Preflight by sending payload as text/plain
      options.headers = {
        'Content-Type': 'text/plain;charset=utf-8'
      };
      options.body = JSON.stringify({ action, ...data });
    } else {
      url.searchParams.append("action", action);
      for (const [key, val] of Object.entries(data)) {
        url.searchParams.append(key, val);
      }
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API Request Failed:", error);
    showToast("Network Error: Failed to communicate with server.", "error");
    throw error;
  }
}

// Simulated Backend Logic for local demonstration
function handleMockRequest(action, data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      MOCK_DB.init();

      const leads = JSON.parse(localStorage.getItem("icolors_leads") || "[]");
      const docs = JSON.parse(localStorage.getItem("icolors_docs") || "[]");
      const logs = JSON.parse(localStorage.getItem("icolors_logs") || "[]");

      switch (action) {
        case "capture-lead":
          // Validate required fields
          if (!data.name || data.name.length < 3) {
            return resolve({ success: false, error: "Name must be at least 3 characters." });
          }
          if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            return resolve({ success: false, error: "Invalid email format." });
          }
          if (!data.phone || data.phone.length < 5) {
            return resolve({ success: false, error: "Invalid phone number." });
          }

          const token = 'mock-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
          const newLead = {
            id: "L-" + (100 + leads.length + 1),
            timestamp: new Date().toLocaleString(),
            name: data.name,
            email: data.email,
            phone: data.phone,
            company: data.company || "",
            token: token,
            ip: data.fingerprint || "", // Use IP column to store registered fingerprints in mock mode
            device: getDeviceType(),
            status: "Pending"
          };

          leads.push(newLead);
          localStorage.setItem("icolors_leads", JSON.stringify(leads));

          // Log Portal Open automatically
          const openLog = {
            timestamp: new Date().toLocaleString(),
            leadId: newLead.id,
            token: newLead.token,
            docName: "Document Access Portal",
            action: "Opened Portal"
          };
          logs.push(openLog);
          localStorage.setItem("icolors_logs", JSON.stringify(logs));

          resolve({ success: true, token: token, name: data.name });
          break;

        case "validate-token":
          const leadRecord = leads.find(l => l.token === data.token);
          if (leadRecord) {
            if (leadRecord.status === "Active") {
              // Enforce device lock limit of 2 fingerprints
              let fps = leadRecord.ip ? leadRecord.ip.split(",") : [];
              if (data.fingerprint && !fps.includes(data.fingerprint)) {
                if (fps.length < 2) {
                  fps.push(data.fingerprint);
                  leadRecord.ip = fps.join(",");
                  localStorage.setItem("icolors_leads", JSON.stringify(leads));
                } else {
                  return resolve({ success: false, error: "Security Limit Exceeded: This access link has been used on too many different devices." });
                }
              }
              resolve({ success: true, name: leadRecord.name, leadId: leadRecord.id });
            } else if (leadRecord.status === "Pending") {
              resolve({ 
                success: false, 
                isPending: true, 
                error: "Pending Payment Activation. Please pay the representative on-spot to unlock access." 
              });
            } else {
              resolve({ success: false, error: "Access token is invalid or inactive." });
            }
          } else {
            resolve({ success: false, error: "Access token is invalid or expired." });
          }
          break;

        case "request-download-token":
          const dlLead = leads.find(l => l.token === data.token && l.status === "Active");
          if (!dlLead) {
            return resolve({ success: false, error: "Unauthorized access token." });
          }
          // Validate fingerprint belongs to lead
          let dlFps = dlLead.ip ? dlLead.ip.split(",") : [];
          if (data.fingerprint && !dlFps.includes(data.fingerprint)) {
            return resolve({ success: false, error: "Unauthorized device." });
          }

          const dlToken = 'mock-dl-' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("mock_dl_" + dlToken, JSON.stringify({
            docId: data.docId,
            timestamp: Date.now()
          }));
          resolve({ success: true, dlToken: dlToken });
          break;

        case "retrieve-file":
          const ticketDataStr = localStorage.getItem("mock_dl_" + data.dlToken);
          if (!ticketDataStr) {
            return resolve({ success: false, error: "Download link is invalid or has already been used." });
          }
          // Immediately delete (single-use)
          localStorage.removeItem("mock_dl_" + data.dlToken);
          
          const ticket = JSON.parse(ticketDataStr);
          if (Date.now() - ticket.timestamp > 60000) {
            return resolve({ success: false, error: "Download ticket has expired (valid for 60s)." });
          }

          const targetDoc = docs.find(d => d.id === ticket.docId);
          if (!targetDoc) {
            return resolve({ success: false, error: "Document not found." });
          }

          // Return base64 text payload representing the file content
          let extension = "zip";
          let mime = "application/zip";
          if (targetDoc.fileType === "PDF") { extension = "pdf"; mime = "application/pdf"; }
          else if (targetDoc.fileType === "Spreadsheet") { extension = "xlsx"; mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; }
          else if (targetDoc.fileType === "Presentation") { extension = "pptx"; mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"; }

          const sampleText = `This is a secure, authenticated download for: ${targetDoc.title}.\nRetrieved via direct download proxy from iColors.`;
          const base64Content = btoa(unescape(encodeURIComponent(sampleText)));
          
          resolve({
            success: true,
            data: `data:${mime};base64,${base64Content}`,
            filename: `${targetDoc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`
          });
          break;

        case "get-documents":
          const validLead = leads.find(l => l.token === data.token && l.status === "Active");
          if (!validLead) {
            resolve({ success: false, error: "Unauthorized." });
          } else {
            const activeDocs = docs.filter(d => d.status === "Active");
            resolve({ success: true, documents: activeDocs });
          }
          break;

        case "log-access":
          const loggingLead = leads.find(l => l.token === data.token);
          if (loggingLead) {
            const newLog = {
              timestamp: new Date().toLocaleString(),
              leadId: loggingLead.id,
              token: data.token,
              docName: data.docName,
              action: data.actionType
            };
            logs.push(newLog);
            localStorage.setItem("icolors_logs", JSON.stringify(logs));
            resolve({ success: true });
          } else {
            resolve({ success: false, error: "Unauthorized token." });
          }
          break;

        case "get-admin-data":
          if (data.passcode !== CONFIG.DEFAULT_ADMIN_PASSCODE) {
            resolve({ success: false, error: "Invalid admin passcode." });
          } else {
            resolve({
              success: true,
              leads: leads,
              logs: logs,
              documents: docs
            });
          }
          break;

        case "add-document":
          if (data.passcode !== CONFIG.DEFAULT_ADMIN_PASSCODE) {
            resolve({ success: false, error: "Unauthorized." });
          } else {
            const newDoc = {
              id: "doc-" + (docs.length + 1),
              title: data.title,
              description: data.description,
              fileUrl: data.fileUrl,
              fileType: data.fileType,
              addedDate: new Date().toISOString().split('T')[0],
              status: "Active"
            };
            docs.push(newDoc);
            localStorage.setItem("icolors_docs", JSON.stringify(docs));
            resolve({ success: true, document: newDoc });
          }
          break;

        case "update-document":
          if (data.passcode !== CONFIG.DEFAULT_ADMIN_PASSCODE) {
            resolve({ success: false, error: "Unauthorized." });
          } else {
            const docIdx = docs.findIndex(d => d.id === data.id);
            if (docIdx > -1) {
              docs[docIdx] = {
                ...docs[docIdx],
                title: data.title,
                description: data.description,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                status: data.status || docs[docIdx].status
              };
              localStorage.setItem("icolors_docs", JSON.stringify(docs));
              resolve({ success: true });
            } else {
              resolve({ success: false, error: "Document not found." });
            }
          }
          break;

        case "delete-document":
          if (data.passcode !== CONFIG.DEFAULT_ADMIN_PASSCODE) {
            resolve({ success: false, error: "Unauthorized." });
          } else {
            const updatedDocs = docs.filter(d => d.id !== data.id);
            localStorage.setItem("icolors_docs", JSON.stringify(updatedDocs));
            resolve({ success: true });
          }
          break;

        case "activate-lead":
          if (data.passcode !== CONFIG.DEFAULT_ADMIN_PASSCODE) {
            resolve({ success: false, error: "Unauthorized." });
          } else {
            const leadIdx = leads.findIndex(l => l.id === data.leadId);
            if (leadIdx > -1) {
              leads[leadIdx].status = "Active";
              localStorage.setItem("icolors_leads", JSON.stringify(leads));
              resolve({ success: true });
            } else {
              resolve({ success: false, error: "Lead not found." });
            }
          }
          break;

        default:
          reject(new Error("Unknown Mock Action: " + action));
      }
    }, 400); // Simulate network latency
  });
}

// Device Detection Helper
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

// Toast Notifications System
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Icon based on type
  let icon = "";
  if (type === "success") {
    icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
  } else if (type === "error") {
    icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
  } else {
    icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.animation = "slideInRight 0.3s ease reverse forwards";
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 4000);
}

// Light / Dark Theme Switcher Initializer
function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  if (!toggleBtn) return;

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", currentTheme);

  toggleBtn.addEventListener("click", () => {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = activeTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    showToast(`Switched to ${newTheme} mode`, "info");
  });
}

// Display Setup Banner if in Mock Mode
function initSetupBanner() {
  if (isMockMode()) {
    const banner = document.createElement("div");
    banner.className = "setup-mode-banner active";
    banner.innerHTML = `
      <span>Running in Local Preview Mode. To connect a live Google Sheet and automate emails, read the 
      <a href="README.md" target="_blank">setup instructions</a>.</span>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }
}

// Document Load Events
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSetupBanner();
});

// Stable browser fingerprint utility
function generateDeviceFingerprint() {
  const ua = navigator.userAgent;
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const language = navigator.language || "en";
  
  // Create a combined string of browser attributes
  const rawString = `${ua}|${screenWidth}x${screenHeight}|${language}`;
  
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "fp-" + Math.abs(hash).toString(36);
}
