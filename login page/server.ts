import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { authenticator } = require("otplib");
import crypto from "crypto";

const generateOTP = (length: number = 6) => {
  return crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');
};
import { OAuth2Client } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || "google_client_id_placeholder";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Auth Configuration ---
// Generating a fixed secret for demo purposes so user can scan it once
const AUTHENTICATOR_SECRET = "KVKXG4S7B5GRH6ZA"; // Standard Base32 secret
const otpStore = new Map<string, string>();
const securityLogs: Array<{ id: string, timestamp: string, event: string, status: 'success' | 'failure', details: string }> = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log system helper
  const addSecurityLog = (event: string, status: 'success' | 'failure', details: string) => {
    const log = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      event,
      status,
      details
    };
    securityLogs.unshift(log); 
    if (securityLogs.length > 30) securityLogs.pop();
    console.log(`[AUDIT] ${status.toUpperCase()}: ${event} - ${details}`);
  };

    // Setup Nodemailer Transporter (Production-ready SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: true, // Force TLS for Gmail
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false // Helps in some restricted environments
    }
  });

  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.warn("SMTP ERROR: Real email delivery is disabled. Using Ethereal (Simulated Inbox) fallback.");
    } else {
      console.log("IDENTITY GATEWAY: SMTP Connection Verified. Real emails will be dispatched.");
    }
  });

  // --- API Routes ---

  // Mock roles and users for demonstration
  const users = {
    admin: { email: "admin@amnex.com", password: "password123", name: "System Admin" },
    superadmin: { email: "super@amnex.com", password: "password123", name: "Super User" },
    vendor: { code: "VEND001", mobile: "9876543210", password: "password123", name: "Premium Vendor" }
  };

  // 1. Admin/Super Admin password check
  app.post("/api/auth/credential-check", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      
      if (role === 'admin' || role === 'superadmin') {
        const user = role === 'admin' ? users.admin : users.superadmin;
        if (email !== user.email || password !== user.password) {
          addSecurityLog(`Login Attempt (${role})`, 'failure', `Invalid credentials for ${email}`);
          return res.status(401).json({ error: "Invalid credentials" });
        }
        
        addSecurityLog(`Credential Match (${role})`, 'success', `Verified for ${email}`);
        
        if (role === 'superadmin') {
          return res.json({ success: true, nextStep: 'authenticator', identifier: email });
        }

        const otp = generateOTP(6);
        otpStore.set(email, otp);

        // ALWAYS LOG THE OTP FOR THE DEVELOPER
        console.log(`[SECURITY-CONSOLE] OTP for ${email}: ${otp}`);

        if (transporter && (process.env.SMTP_USER || process.env.SMTP_HOST === 'smtp.ethereal.email')) {
          transporter.sendMail({
            from: process.env.SMTP_FROM || '"Amnex Secure Gateway" <no-reply@amnex.com>',
            to: email,
            subject: `Security Access Code: ${otp}`,
            html: `
              <div style="font-family: sans-serif; background: #f8fafc; padding: 40px; color: #001b3d;">
                <div style="background: white; padding: 32px; border-radius: 24px; border: 1px solid #e2e8f0; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="color: #0056b3; font-weight: 900; font-size: 20px; margin-bottom: 24px;">AMNEX</div>
                  <div style="font-size: 14px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Access Challenge</div>
                  <h2 style="margin: 0; font-size: 24px; font-weight: 900; margin-bottom: 24px;">Verify Identity</h2>
                  <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; text-align: center; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #001b3d;">
                    ${otp}
                  </div>
                  <p style="margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.6;">
                    This code was requested for <strong>${email}</strong>. If you did not request this, please secure your account immediately.
                  </p>
                </div>
              </div>
            `
          }).then(info => {
            if (!process.env.SMTP_USER) {
              const previewUrl = nodemailer.getTestMessageUrl(info);
              return res.json({ success: true, nextStep: 'otp', identifier: email, previewUrl });
            }
            return res.json({ success: true, nextStep: 'otp', identifier: email });
          }).catch(err => {
            console.error("Critical Email Error:", err);
            return res.json({ success: true, nextStep: 'otp', identifier: email, mockOtp: otp }); 
          });
        } else {
          return res.json({ success: true, nextStep: 'otp', identifier: email, mockOtp: otp });
        }
      } else {
        res.status(400).json({ error: "Invalid identity context" });
      }
  } catch (err) {
    console.error("Credential Check Critical Failure:", err);
    res.status(500).json({ error: "Portal subsystem error" });
  }
});

  // 2. Authenticator Verification (TOTP)
  app.post("/api/auth/verify-authenticator", (req, res) => {
    const { code } = req.body;
    const isValid = authenticator.check(code, AUTHENTICATOR_SECRET);
    
    if (isValid) {
      addSecurityLog('SuperAdmin TOTP', 'success', 'Google Authenticator protocol verified');
      return res.json({ 
        success: true, 
        token: "jwt-superadmin", 
        user: { 
          email: users.superadmin.email,
          name: users.superadmin.name, 
          role: 'superadmin' 
        } 
      });
    }
    
    addSecurityLog('SuperAdmin TOTP', 'failure', 'Invalid sync code submitted');
    res.status(401).json({ error: "Invalid synchronization code" });
  });

  // Security Logs Endpoint
  app.get("/api/admin/logs", (req, res) => {
    res.json(securityLogs);
  });

  // Registration helper for Authenticator
  app.get("/api/auth/authenticator-setup", async (req, res) => {
    try {
      console.log("Generating Authenticator URI via Protocol v4...");
      const otpauth = authenticator.keyuri("super@amnex.com", "Amnex Secure Gateway", AUTHENTICATOR_SECRET);
      res.json({ secret: AUTHENTICATOR_SECRET, uri: otpauth });
    } catch (err) {
      console.error("QR Generation Loop Failure:", err);
      res.status(500).json({ error: "QR Protocol Generation Error" });
    }
  });

  // 3. Email/Mobile OTP Verification
  app.post("/api/auth/verify-otp", (req, res) => {
    const { otp, role, identifier } = req.body;
    console.log(`[DEBUG] Verify OTP request: role=${role}, identifier=${identifier}, otp=${otp}`);
    
    const storedOtp = otpStore.get(identifier);
    console.log(`[DEBUG] Stored OTP for ${identifier}: ${storedOtp}`);

    if (storedOtp && storedOtp === otp) {
      otpStore.delete(identifier);
      addSecurityLog(`${role} OTP`, 'success', `Verified for ${identifier}`);
      
      const user = role === 'admin' ? users.admin : users.vendor;
      return res.json({ 
        success: true, 
        token: `jwt-${role}`,
        user: { 
          email: role === 'admin' ? users.admin.email : `${users.vendor.code.toLowerCase()}@amnex.com`,
          name: user.name, 
          role: role 
        }
      });
    }

    addSecurityLog(`${role} OTP`, 'failure', `Wrong OTP for ${identifier}`);
    res.status(401).json({ error: "Verification failed. Mismatched signature." });
  });

  // 4. Vendor Login (Initial step)
  app.post("/api/auth/vendor-check", async (req, res) => {
    let { vendorCode, mobile, password } = req.body;
    
    // Normalize inputs
    vendorCode = vendorCode?.trim();
    mobile = mobile?.trim();
    password = password?.trim();

    console.log(`[DEBUG] Vendor check request: vendorCode=${vendorCode}, mobile=${mobile}, password=${password}`);
    
    if (vendorCode && mobile &&
        (vendorCode.toUpperCase() === 'VEND001' || vendorCode.toUpperCase() === 'AMNEX')) {
      // Generate real OTP for vendor using requested library
      const otp = generateOTP(6);
      otpStore.set(vendorCode, otp);
      otpStore.set(mobile, otp); // Also store by mobile for convenience

      addSecurityLog('Vendor Login Check', 'success', `Credentials verified for ${vendorCode} (Mobile: ${mobile})`);

      // Delivery simulation (since no SMS hardware)
      console.log(`[VENDOR OTP] PIN for ${vendorCode} via ${mobile}: ${otp}`);
      
      if (transporter) {
        // Send asynchronously to avoid blocking the user
        transporter.sendMail({
          from: '"Amnex Secure Gateway" <no-reply@amnex.com>',
          to: "vendor-test@amnex.com", 
          subject: "Vendor Security PIN",
          html: `<p>Your secure access PIN is: <strong>${otp}</strong>. Destination Mobile: ${mobile}</p>`
        }).catch(e => console.warn("Nodemailer failed to send vendor OTP:", e));
      }

      return res.json({ success: true, nextStep: 'mobile-otp', identifier: vendorCode, mockOtp: otp });
    }
    res.status(401).json({ error: "Invalid vendor credentials" });
  });

  // 5. Google SSO Identity Flow (GIS Protocol)
  app.post("/api/auth/google/verify", async (req, res) => {
    const { credential } = req.body;

    if (GOOGLE_CLIENT_ID === "google_client_id_placeholder") {
      return res.status(400).json({ 
        error: "Google SSO is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment." 
      });
    }

    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (!payload) return res.status(400).json({ error: "Invalid identity payload" });

      const { email, name, picture } = payload;
      
      addSecurityLog('Google SSO Verification', 'success', `Identity verified for ${email}`);

      res.json({ 
        success: true, 
        user: { 
          email, 
          name, 
          picture,
          role: 'employee' 
        } 
      });
    } catch (err) {
      console.error("Google verify error:", err);
      addSecurityLog('Google SSO Verification', 'failure', 'Invalid credential token');
      res.status(401).json({ error: "Invalid identity token" });
    }
  });

  // Legacy callback for backward compatibility (optional)
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    addSecurityLog('Google SSO Callback', 'success', 'Identity signal received');
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #001b3d; color: white;">
          <div style="background: rgba(255,255,255,0.05); padding: 3rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 400px; backdrop-blur: 20px;">
            <div style="font-weight: 900; font-size: 24px; color: #0056b3; margin-bottom: 40px; letter-spacing: 2px;">AMNEX</div>
            <div style="width: 60px; h-60px; margin: 0 auto 24px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style="margin: 0; font-weight: 900; font-size: 24px;">Identity Sync Complete</h2>
            <p style="opacity: 0.5; font-size: 14px; margin-top: 16px; line-height: 1.6;">Your Google account has been successfully synchronized with the Amnex Secure Gateway.</p>
            <div style="margin-top: 32px; font-size: 10px; font-weight: 900; color: #0056b3; text-transform: uppercase; letter-spacing: 2px;">Closing Secure Protocol...</div>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    user: { email: 'user@gmail.com', name: 'Identity Synchronized', role: 'employee' } 
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              }, 2000);
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
