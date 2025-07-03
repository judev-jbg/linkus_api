import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configurar transporter basado en el proveedor
const createEmailTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // true para 465, false para otros
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Configuraciones específicas por proveedor
  if (process.env.SMTP_HOST?.includes("gmail")) {
    config.service = "gmail";
  }

  return nodemailer.createTransport(config);
};

const transporter = createEmailTransporter();

// Verificar configuración de email
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("⚠️ Email credentials not configured");
      return false;
    }

    await transporter.verify();
    console.log("✅ Email service configured successfully");
    return true;
  } catch (error) {
    console.error("❌ Email service configuration failed:", error.message);

    // Dar sugerencias basadas en el error
    if (error.message.includes("Invalid login")) {
      console.log(
        "💡 Gmail tip: Make sure you're using an App Password, not your regular password"
      );
      console.log(
        "   Generate one at: https://myaccount.google.com/apppasswords"
      );
    }

    return false;
  }
};

export const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${
      process.env.BACKEND_URL || "http://localhost:3001"
    }/api/auth/verify-email/${token}`;

    const mailOptions = {
      from: `"LinkUs" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: "Verifique su dirección de correo electrónico",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Gracias por registrase. Por favor, verifique su dirección de correo electrónico para completar su registro.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verificar la dirección de correo electrónico
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Si el botón no funciona, copie y pegue este enlace en su navegador:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Si no se ha registrado en esta cuenta, ignore este correo electrónico.
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    return { success: false, error: error.message };
  }
};
