/**
 * iColors - Google Apps Script Web App Backend
 * Paste this code into your Google Apps Script editor.
 * Attach this script to the Google Sheet you wish to use as a database.
 */

// --- CONFIGURATION ---
var ADMIN_PASSCODE = "admin123";
var SUPPORT_EMAIL = "support@icolors.com";
// Replace this with your actual hosted website URL (e.g. Vercel or Netlify URL)
var FRONTEND_PORTAL_URL = "https://icolors-one.vercel.app/portal.html";

/**
 * Handles browser GET requests
 */
function doGet(e) {
  var action = e.parameter.action;
  
  try {
    if (action === "validate-token") {
      return handleValidateToken(e.parameter.token, e.parameter.fingerprint);
    } 
    else if (action === "get-documents") {
      return handleGetDocuments(e.parameter.token, e.parameter.fingerprint);
    }
    else if (action === "get-admin-data") {
      return handleGetAdminData(e.parameter.passcode);
    }
    else {
      return makeResponse({ success: false, error: "Invalid GET Action: " + action });
    }
  } catch (error) {
    return makeResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handles browser POST requests
 * Sends data as text/plain from frontend to bypass CORS preflight limitations
 */
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    
    if (action === "capture-lead") {
      return handleCaptureLead(requestData);
    }
    else if (action === "validate-token") {
      return handleValidateToken(requestData.token, requestData.fingerprint);
    }
    else if (action === "get-documents") {
      return handleGetDocuments(requestData.token, requestData.fingerprint);
    }
    else if (action === "get-admin-data") {
      return handleGetAdminData(requestData.passcode);
    }
    else if (action === "log-access") {
      return handleLogAccess(requestData);
    }
    else if (action === "add-document") {
      return handleAddDocument(requestData);
    }
    else if (action === "activate-lead") {
      return handleActivateLead(requestData);
    }
    else if (action === "update-lead-access") {
      return handleUpdateLeadAccess(requestData);
    }
    else if (action === "update-document") {
      return handleUpdateDocument(requestData);
    }
    else if (action === "delete-document") {
      return handleDeleteDocument(requestData);
    }
    else if (action === "request-download-token") {
      return handleRequestDownloadToken(requestData);
    }
    else if (action === "retrieve-file") {
      return handleRetrieveFile(requestData);
    }
    else {
      return makeResponse({ success: false, error: "Invalid POST Action: " + action });
    }
  } catch (error) {
    return makeResponse({ success: false, error: error.toString() });
  }
}

/**
 * Helper to build JSON responses with CORS headers
 */
function makeResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==========================================================================
   DATABASE / SHEET INITIALIZATION
   ========================================================================== */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Leads Sheet
  var leadsSheet = ss.getSheetByName("Leads");
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet("Leads");
    leadsSheet.appendRow([
      "Lead ID", "Timestamp", "Name", "Email", "Phone", "Company", "Access Token", "IP Address", "Device Type", "Status", "Expiry Date", "Unlocked Documents"
    ]);
    // Format headers
    leadsSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#f1f5f9");
  } else {
    // Auto-migrate: check if "Unlocked Documents" column exists, if not add it
    var lastCol = leadsSheet.getLastColumn();
    var headers = leadsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf("Unlocked Documents") === -1) {
      leadsSheet.getRange(1, lastCol + 1).setValue("Unlocked Documents").setFontWeight("bold").setBackground("#f1f5f9");
    }
  }
  
  // 2. Access Logs Sheet
  var logsSheet = ss.getSheetByName("Access Logs");
  if (!logsSheet) {
    logsSheet = ss.insertSheet("Access Logs");
    logsSheet.appendRow([
      "Timestamp", "Lead ID", "Access Token", "Document Name", "Action"
    ]);
    logsSheet.getRange("A1:E1").setFontWeight("bold").setBackground("#f1f5f9");
  }
  
  // 3. Documents Sheet
  var docsSheet = ss.getSheetByName("Documents");
  if (!docsSheet) {
    docsSheet = ss.insertSheet("Documents");
    docsSheet.appendRow([
      "ID", "Title", "Description", "FileURL", "FileType", "AddedDate", "Status"
    ]);
    docsSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f1f5f9");
    
    // Add default documents so it works immediately
    docsSheet.appendRow([
      "doc-1", 
      "Corporate Brand Guidelines 2026", 
      "Official brand identity guidelines covering logo placement, typography, color palette, and voice tone guidelines.",
      "https://drive.google.com/file/d/1mock-drive-link-brand-guidelines/view",
      "PDF",
      new Date().toISOString().split('T')[0],
      "Active"
    ]);
    docsSheet.appendRow([
      "doc-2", 
      "Lead Generation Masterclass Slides", 
      "Exclusive presentation slides from our Q2 marketing campaign masterclass, detailing core funnel math and conversion hacks.",
      "https://docs.google.com/presentation/d/1mock-drive-link-presentation/view",
      "Presentation",
      new Date().toISOString().split('T')[0],
      "Active"
    ]);
    docsSheet.appendRow([
      "doc-3", 
      "Financial Forecasting Template", 
      "Interactive Excel/Google Sheet spreadsheet with formulas for 5-year startup runway projections and hiring plan models.",
      "https://docs.google.com/spreadsheets/d/1mock-drive-link-spreadsheet/view",
      "Spreadsheet",
      new Date().toISOString().split('T')[0],
      "Active"
    ]);
  }
  
  return "Database Setup Completed Successfully!";
}

/* ==========================================================================
   CONTROLLER LOGIC / ROUTING HANDLERS
   ========================================================================== */

/**
 * Validate access token
 */
function handleValidateToken(token, fingerprint) {
  if (!token) return makeResponse({ success: false, error: "No token provided." });
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) return makeResponse({ success: false, error: "Database not initialized." });
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    // Column G (Index 6) is Access Token, Column J (Index 9) is Status, Column K (Index 10) is Expiry Date
    if (data[i][6] === token) {
      var status = data[i][9];
      var expiryStr = data[i][10];
      var row = i + 1;
      
      if (status === "Active") {
        // Check if access has expired (15 days check)
        if (expiryStr) {
          var expiryDate = new Date(expiryStr);
          var now = new Date();
          
          if (now > expiryDate) {
            // Access has expired! Revert status to Pending and clear expiry
            sheet.getRange(row, 10).setValue("Pending");
            sheet.getRange(row, 11).setValue("");
            return makeResponse({
              success: false,
              isPending: true,
              error: "Your 15-day access has expired. Please make payment at the counter to reactivate."
            });
          }
        }
        
        var existingFingerprintsStr = data[i][7] || ""; // Column H (Index 7) is IP Address / Fingerprints
        var fingerprints = existingFingerprintsStr ? existingFingerprintsStr.split(",") : [];
        
        if (fingerprint) {
          if (fingerprints.indexOf(fingerprint) === -1) {
            if (fingerprints.length < 2) {
              fingerprints.push(fingerprint);
              sheet.getRange(row, 8).setValue(fingerprints.join(",")); // Update in sheet
            } else {
              return makeResponse({ 
                success: false, 
                error: "Security Limit Exceeded: This access link has been used on too many different devices." 
              });
            }
          }
        }
        
        return makeResponse({
          success: true,
          name: data[i][2], // Name
          leadId: data[i][0], // Lead ID
          unlockedDocs: data[i].length > 11 ? (data[i][11] || "") : "" // Unlocked Documents
        });
      } else if (status === "Pending") {
        return makeResponse({
          success: false,
          isPending: true,
          error: "Pending Payment Activation. Please pay the representative on-spot to unlock access."
        });
      }
    }
  }
  
  return makeResponse({ success: false, error: "Access token is invalid or inactive." });
}

/**
 * Get active documents
 */
function handleGetDocuments(token, fingerprint) {
  var validation = handleValidateToken(token, fingerprint);
  var validationData = JSON.parse(validation.getContent());
  
  if (!validationData.success) {
    return makeResponse({ success: false, error: validationData.error || "Unauthorized access token." });
  }
  
  var unlockedDocsStr = (validationData.unlockedDocs || "").toString().trim();
  var unlockedDocs = unlockedDocsStr.split(",").map(function(s) { return s.trim(); });
  var allUnlocked = !unlockedDocsStr || unlockedDocsStr === "*" || unlockedDocsStr.toLowerCase() === "all";
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents");
  if (!sheet) return makeResponse({ success: true, documents: [] });
  
  var data = sheet.getDataRange().getValues();
  var documents = [];
  
  for (var i = 1; i < data.length; i++) {
    // Only return Active documents
    if (data[i][6] === "Active") {
      var docId = data[i][0];
      var isUnlocked = allUnlocked || (unlockedDocs.indexOf(docId) !== -1);
      
      documents.push({
        id: docId,
        title: data[i][1],
        description: data[i][2],
        fileType: data[i][4],
        addedDate: data[i][5] ? new Date(data[i][5]).toISOString().split('T')[0] : "",
        status: data[i][6],
        unlocked: isUnlocked
      });
    }
  }
  
  return makeResponse({ success: true, documents: documents });
}

/**
 * Capture lead registrations
 */
function handleCaptureLead(data) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock for max 30 seconds
    lock.waitLock(30000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Leads");
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName("Leads");
    }
    
    var values = sheet.getDataRange().getValues();
    var existingRowIndex = -1;
    var existingStatus = "";
    var existingToken = "";
    var existingExpiryStr = "";
    
    // Check if email already exists
    for (var i = 1; i < values.length; i++) {
      if (values[i][3].toString().toLowerCase() === data.email.toLowerCase()) {
        existingRowIndex = i + 1;
        existingToken = values[i][6];
        existingStatus = values[i][9];
        existingExpiryStr = values[i][10] || "";
        break;
      }
    }
    
    if (existingRowIndex !== -1) {
      if (existingStatus === "Active") {
        // Allow if: no expiry set (legacy/manual activation) OR expiry hasn't passed yet
        var isStillActive = !existingExpiryStr || (new Date() < new Date(existingExpiryStr));
        
        if (isStillActive) {
          // Customer is still within their active window — resend link and redirect
          sendBrandedEmail(data.name, data.email, existingToken);
          return makeResponse({ success: true, token: existingToken, name: data.name, alreadyActive: true });
        }
        
        // Only reaches here if expiry genuinely passed — reset to Pending
        sheet.getRange(existingRowIndex, 10).setValue("Pending");
        sheet.getRange(existingRowIndex, 11).setValue("");
      }
      // Customer is Pending (new or expired). Return token so they can see pending state.
      return makeResponse({ success: true, token: existingToken, name: data.name });
    }
    
    var token = Utilities.getUuid();
    var leadId = "L-" + (sheet.getLastRow() + 100);
    var timestamp = new Date().toLocaleString();
    
    // Append lead row with Pending status and empty Expiry Date placeholder
    sheet.appendRow([
      leadId,
      timestamp,
      data.name,
      data.email,
      data.phone,
      data.company || "",
      token,
      "", // IP placeholder
      data.device || "Desktop",
      "Pending",
      "" // Expiry Date
    ]);
    
    return makeResponse({ success: true, token: token, name: data.name });
  } catch (error) {
    return makeResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Log portal and document access actions
 */
function handleLogAccess(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Access Logs");
  if (!sheet) return makeResponse({ success: false, error: "Access Log database missing." });
  
  // Find lead ID from token
  var leadId = "Unknown";
  var leadsSheet = ss.getSheetByName("Leads");
  if (leadsSheet) {
    var leadsData = leadsSheet.getDataRange().getValues();
    for (var i = 1; i < leadsData.length; i++) {
      if (leadsData[i][6] === data.token) {
        leadId = leadsData[i][0];
        break;
      }
    }
  }
  
  sheet.appendRow([
    new Date().toLocaleString(),
    leadId,
    data.token,
    data.docName,
    data.actionType
  ]);
  
  return makeResponse({ success: true });
}

/**
 * Admin Panel: Get all database data
 */
function handleGetAdminData(passcode) {
  if (passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Invalid admin passcode." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var leads = [];
  var leadsSheet = ss.getSheetByName("Leads");
  if (leadsSheet) {
    var data = leadsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      leads.push({
        id: data[i][0],
        timestamp: data[i][1],
        name: data[i][2],
        email: data[i][3],
        phone: data[i][4],
        company: data[i][5],
        token: data[i][6],
        ip: data[i][7],
        device: data[i][8],
        status: data[i][9],
        expiry: data[i][10] ? new Date(data[i][10]).toISOString() : ""
      });
    }
  }
  
  var logs = [];
  var logsSheet = ss.getSheetByName("Access Logs");
  if (logsSheet) {
    var data = logsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      logs.push({
        timestamp: data[i][0],
        leadId: data[i][1],
        token: data[i][2],
        docName: data[i][3],
        action: data[i][4]
      });
    }
  }
  
  var documents = [];
  var docsSheet = ss.getSheetByName("Documents");
  if (docsSheet) {
    var data = docsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      documents.push({
        id: data[i][0],
        title: data[i][1],
        description: data[i][2],
        fileUrl: data[i][3],
        fileType: data[i][4],
        addedDate: data[i][5] ? new Date(data[i][5]).toISOString().split('T')[0] : "",
        status: data[i][6]
      });
    }
  }
  
  return makeResponse({
    success: true,
    leads: leads,
    logs: logs,
    documents: documents
  });
}

/**
 * Admin Panel: Add document
 */
function handleAddDocument(data) {
  if (data.passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Unauthorized admin access." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("Documents");
  }
  
  var newId = "doc-" + (sheet.getLastRow() + 1);
  var addedDate = new Date().toISOString().split('T')[0];
  
  sheet.appendRow([
    newId,
    data.title,
    data.description,
    data.fileUrl,
    data.fileType,
    addedDate,
    data.status || "Active"
  ]);
  
  return makeResponse({ success: true, id: newId });
}

/**
 * Admin Panel: Update document
 */
function handleUpdateDocument(data) {
  if (data.passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Unauthorized admin access." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents");
  if (!sheet) return makeResponse({ success: false, error: "Documents database missing." });
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === data.id) {
      var row = i + 1;
      // Update values
      sheet.getRange(row, 2).setValue(data.title);
      sheet.getRange(row, 3).setValue(data.description);
      sheet.getRange(row, 4).setValue(data.fileUrl);
      sheet.getRange(row, 5).setValue(data.fileType);
      sheet.getRange(row, 7).setValue(data.status);
      return makeResponse({ success: true });
    }
  }
  
  return makeResponse({ success: false, error: "Document ID not found: " + data.id });
}

/**
 * Admin Panel: Delete document
 */
function handleDeleteDocument(data) {
  if (data.passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Unauthorized admin access." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents");
  if (!sheet) return makeResponse({ success: false, error: "Documents database missing." });
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return makeResponse({ success: true });
    }
  }
  
  return makeResponse({ success: false, error: "Document ID not found." });
}

/**
 * Admin Panel: Activate lead (approve payment on-spot)
 */
function handleActivateLead(data) {
  if (data.passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Unauthorized admin access." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) return makeResponse({ success: false, error: "Leads database missing." });
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === data.leadId) {
      var row = i + 1;
      
      // Calculate Expiry Date (exactly 15 days from now)
      var now = new Date();
      var expiryDate = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));
      
      sheet.getRange(row, 10).setValue("Active"); // Column J (Index 9) is Status
      sheet.getRange(row, 11).setValue(expiryDate.toISOString()); // Column K (Index 10) is Expiry Date
      
      var lastCol = sheet.getLastColumn();
      if (lastCol < 12) {
        sheet.getRange(1, 12).setValue("Unlocked Documents").setFontWeight("bold").setBackground("#f1f5f9");
      }
      if (data.unlockedDocs !== undefined) {
        sheet.getRange(row, 12).setValue(data.unlockedDocs);
      }
      
      // Trigger the automated email with the token link now!
      sendBrandedEmail(values[i][2], values[i][3], values[i][6]);
      
      return makeResponse({ success: true });
    }
  }
  
  return makeResponse({ success: false, error: "Lead ID not found: " + data.leadId });
}

/* ==========================================================================
   EMAIL AUTOMATION LOGIC
   ========================================================================== */
function sendBrandedEmail(recipientName, recipientEmail, token) {
  var accessUrl = FRONTEND_PORTAL_URL + "?token=" + token;
  
  var subject = "Your Requested Documents Are Ready";
  
  // HTML Template Design matching iColors premium aesthetics
  var htmlBody = 
    "<div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;'>" +
      "<div style='text-align: center; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;'>" +
        "<h2 style='color: #6366f1; font-size: 24px; font-weight: bold; margin: 0;'>iColors Document Portal</h2>" +
      "</div>" +
      "<div style='color: #334155; font-size: 16px; line-height: 1.6;'>" +
        "<p>Hello <strong>" + recipientName + "</strong>,</p>" +
        "<p>Thank you for registering. We have processed your request. Your secure credentials are now active, granting you entry to our professional resources repository.</p>" +
        "<div style='text-align: center; margin: 30px 0;'>" +
          "<a href='" + accessUrl + "' style='background-image: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; font-size: 16px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);'>Access Documents</a>" +
        "</div>" +
        "<p style='font-size: 14px; color: #64748b;'>If the button above does not work, copy and paste this link in your browser:</p>" +
        "<p style='font-size: 13px; font-family: monospace; word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; color: #475569;'>" + accessUrl + "</p>" +
      "</div>" +
      "<div style='margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;'>" +
        "<p>This email contains secure, tokenized access parameters. Do not share this mail with others.</p>" +
        "<p>iColors &bull; Support: <a href='mailto:" + SUPPORT_EMAIL + "' style='color: #6366f1; text-decoration: none;'>" + SUPPORT_EMAIL + "</a></p>" +
      "</div>" +
    "</div>";
    
  MailApp.sendEmail({
    to: recipientEmail,
    subject: subject,
    htmlBody: htmlBody
  });
}

/* ==========================================================================
   SECURITY & SECURE DOWNLOADS LOGIC
   ========================================================================== */

/**
 * Helper to extract Google Drive File/Folder ID from URL or raw ID
 */
function extractGoogleDriveId(urlOrId) {
  if (!urlOrId) return "";
  
  // If it's already a clean ID (no slashes, no dots, reasonable length)
  if (urlOrId.indexOf("/") === -1 && urlOrId.indexOf(".") === -1 && urlOrId.length > 10) {
    return urlOrId.trim();
  }
  
  // Google Drive File/Folder Link patterns:
  var fileMatch = urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) return fileMatch[1];
  
  var folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  
  var idMatch = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  
  return urlOrId.trim();
}

/**
 * Private helper to fetch file or folder (zipped) from DriveApp and return Blob, Name, MimeType
 */
function getFileBlob(driveId) {
  try {
    var file = DriveApp.getFileById(driveId);
    return {
      blob: file.getBlob(),
      name: file.getName(),
      mimeType: file.getMimeType()
    };
  } catch (e) {
    // Try as folder
    try {
      var folder = DriveApp.getFolderById(driveId);
      var files = folder.getFiles();
      var blobs = [];
      while (files.hasNext()) {
        var f = files.next();
        blobs.push(f.getBlob());
      }
      if (blobs.length === 0) {
        throw new Error("Folder is empty");
      }
      var zipBlob = Utilities.zip(blobs, folder.getName() + ".zip");
      return {
        blob: zipBlob,
        name: folder.getName() + ".zip",
        mimeType: "application/zip"
      };
    } catch (folderErr) {
      throw new Error("Invalid Google Drive ID or permission denied: " + e.toString() + " / " + folderErr.toString());
    }
  }
}

/**
 * Request a short-lived download token (60 seconds)
 */
function handleRequestDownloadToken(data) {
  var token = data.token;
  var fingerprint = data.fingerprint;
  var docId = data.docId;
  
  if (!token) return makeResponse({ success: false, error: "No token provided." });
  if (!docId) return makeResponse({ success: false, error: "No document ID provided." });
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var leadsSheet = ss.getSheetByName("Leads");
  if (!leadsSheet) return makeResponse({ success: false, error: "Database not initialized." });
  
  var leadsData = leadsSheet.getDataRange().getValues();
  var leadFound = false;
  var authorized = false;
  
  for (var i = 1; i < leadsData.length; i++) {
    if (leadsData[i][6] === token && leadsData[i][9] === "Active") {
      leadFound = true;
      
      // Check if document is unlocked for this lead
      var unlockedDocsStr = leadsData[i].length > 11 ? (leadsData[i][11] || "") : "";
      unlockedDocsStr = unlockedDocsStr.toString().trim();
      var unlockedDocs = unlockedDocsStr.split(",").map(function(s) { return s.trim(); });
      var allUnlocked = !unlockedDocsStr || unlockedDocsStr === "*" || unlockedDocsStr.toLowerCase() === "all";
      
      if (!allUnlocked && unlockedDocs.indexOf(docId) === -1) {
        return makeResponse({ success: false, error: "Access Denied: You have not purchased/unlocked this document." });
      }
      
      var existingFingerprintsStr = leadsData[i][7] || "";
      var fingerprints = existingFingerprintsStr ? existingFingerprintsStr.split(",") : [];
      
      if (fingerprint) {
        if (fingerprints.indexOf(fingerprint) !== -1) {
          authorized = true;
        }
      }
      break;
    }
  }
  
  if (!leadFound) {
    return makeResponse({ success: false, error: "Access token is invalid or inactive." });
  }
  
  if (!authorized) {
    return makeResponse({ success: false, error: "Security validation failed: Unauthorized device." });
  }
  
  // Generate a secure download token using CacheService (valid for 60 seconds)
  var dlToken = "dl-" + Utilities.getUuid();
  var cache = CacheService.getScriptCache();
  cache.put(dlToken, docId, 60);
  
  return makeResponse({ success: true, dlToken: dlToken });
}

/**
 * Retrieve file data privately via Apps Script proxy and return Base64 Data URL
 */
function handleRetrieveFile(data) {
  var dlToken = data.dlToken;
  if (!dlToken) return makeResponse({ success: false, error: "No download token provided." });
  
  var cache = CacheService.getScriptCache();
  var docId = cache.get(dlToken);
  
  if (!docId) {
    return makeResponse({ success: false, error: "Download link is invalid or has expired." });
  }
  
  // Immediately remove token to enforce single-use
  cache.remove(dlToken);
  
  // Find document URL/ID
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var docsSheet = ss.getSheetByName("Documents");
  if (!docsSheet) return makeResponse({ success: false, error: "Documents database missing." });
  
  var docsData = docsSheet.getDataRange().getValues();
  var fileUrlOrId = "";
  
  for (var i = 1; i < docsData.length; i++) {
    if (docsData[i][0] === docId) {
      fileUrlOrId = docsData[i][3]; // Column D
      break;
    }
  }
  
  if (!fileUrlOrId) {
    return makeResponse({ success: false, error: "Document not found." });
  }
  
  var driveId = extractGoogleDriveId(fileUrlOrId);
  if (!driveId) {
    return makeResponse({ success: false, error: "Failed to parse Google Drive ID." });
  }
  
  try {
    var fileInfo = getFileBlob(driveId);
    var base64Data = Utilities.base64Encode(fileInfo.blob.getBytes());
    var dataUrl = "data:" + fileInfo.mimeType + ";base64," + base64Data;
    
    return makeResponse({
      success: true,
      data: dataUrl,
      filename: fileInfo.name
    });
  } catch (err) {
    return makeResponse({ success: false, error: "Failed to download file from Drive: " + err.toString() });
  }
}

/**
 * Run this function once in the Apps Script editor to trigger Google Drive authorization.
 */
function authorizeDrive() {
  DriveApp.getRootFolder();
}

/**
 * Admin Panel: Update lead access settings (Status, Expiry, Unlocked Documents)
 */
function handleUpdateLeadAccess(data) {
  if (data.passcode !== ADMIN_PASSCODE) {
    return makeResponse({ success: false, error: "Unauthorized admin access." });
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) return makeResponse({ success: false, error: "Leads database missing." });
  
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === data.leadId) {
      var row = i + 1;
      
      var lastCol = sheet.getLastColumn();
      if (lastCol < 12) {
        sheet.getRange(1, 12).setValue("Unlocked Documents").setFontWeight("bold").setBackground("#f1f5f9");
      }
      
      if (data.status) {
        sheet.getRange(row, 10).setValue(data.status);
      }
      if (data.expiry !== undefined) {
        sheet.getRange(row, 11).setValue(data.expiry);
      }
      if (data.unlockedDocs !== undefined) {
        sheet.getRange(row, 12).setValue(data.unlockedDocs);
      }
      
      return makeResponse({ success: true });
    }
  }
  
  return makeResponse({ success: false, error: "Lead ID not found: " + data.leadId });
}
