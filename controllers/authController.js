import { User } from "../models/User.js";
import { sendVerificationEmail } from "../services/emailService.js";

export const register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    console.log("🔄 Processing registration for:", email);

    // Crear usuario
    const { user, error } = await User.create({
      email: email.toLowerCase().trim(),
      password,
      full_name: full_name.trim(),
    });

    if (error) {
      console.error("❌ Registration error:", error);

      if (error.code === "USER_EXISTS") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error creating user account",
        error:
          process.env.NODE_ENV === "development" ? error.details : undefined,
      });
    }

    console.log("✅ User created successfully:", user.id);

    // Enviar email de verificación
    console.log("📧 Sending verification email...");
    const emailResult = await sendVerificationEmail(
      user.email,
      user.email_verification_token
    );

    if (!emailResult.success) {
      console.error("❌ Failed to send verification email:", emailResult.error);
      // No fallar el registro si el email falla, pero notificar
    }

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
      },
      email_sent: emailResult.success,
    });
  } catch (error) {
    console.error("💥 Unexpected registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("🔄 Processing email verification for token:", token);

    const { user, error } = await User.verifyEmail(token);

    if (error || !user) {
      console.error("❌ Email verification failed:", error);
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
            <div style="background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
              <h2 style="color: #e74c3c; margin-bottom: 20px;">❌ Verification Failed</h2>
              <p style="color: #666; margin-bottom: 30px;">
                This verification link is invalid or has already been used.
              </p>
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Return to Login
              </a>
            </div>
          </body>
        </html>
      `);
    }

    console.log("✅ Email verified successfully for user:", user.id);

    res.send(`
      <html>
        <head>
          <title>Email Verified</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
          <div style="background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
            <h2 style="color: #27ae60; margin-bottom: 20px;">✅ Email Verified!</h2>
            <p style="color: #666; margin-bottom: 30px;">
              Your email has been verified successfully. You can now log in and use all features.
            </p>
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Login
            </a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("💥 Unexpected verification error:", error);
    res.status(500).send(`
      <html>
        <head>
          <title>Server Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
          <div style="background: white; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Server Error</h2>
            <p style="color: #666; margin-bottom: 30px;">
              Something went wrong. Please try again later.
            </p>
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Return to Login
            </a>
          </div>
        </body>
      </html>
    `);
  }
};
