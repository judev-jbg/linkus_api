import { supabaseAdmin } from "../config/database.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export class User {
  static async create(userData) {
    try {
      const { email, password, full_name } = userData;

      // Verificar si el email ya existe
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        return {
          user: null,
          error: {
            message: "User already exists with this email",
            code: "USER_EXISTS",
          },
        };
      }

      // Hash de la contraseña
      const password_hash = await bcrypt.hash(password, 12);

      // Generar token de verificación
      const email_verification_token = uuidv4();

      // Crear usuario (el trigger generará un username automáticamente)
      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          password_hash,
          full_name,
          email_verification_token,
        })
        .select(
          "id, email, username, full_name, email_verification_token, created_at"
        )
        .single();

      if (error) {
        console.error("Database error creating user:", error);
        return {
          user: null,
          error: {
            message: "Error creating user",
            code: "DB_ERROR",
            details: error.message,
          },
        };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error("Unexpected error creating user:", error);
      return {
        user: null,
        error: {
          message: "Unexpected error creating user",
          code: "UNEXPECTED_ERROR",
          details: error.message,
        },
      };
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      // Si no encuentra el usuario, no es un error
      if (error && error.code === "PGRST116") {
        return { user: null, error: null };
      }

      if (error) {
        console.error("Database error finding user by email:", error);
        return { user: null, error };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error("Unexpected error finding user by email:", error);
      return { user: null, error };
    }
  }

  static async verifyEmail(token) {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({
          email_verified: true,
          email_verification_token: null,
        })
        .eq("email_verification_token", token)
        .select("id, email, username, full_name, email_verified")
        .single();

      if (error) {
        console.error("Database error verifying email:", error);
        return { user: null, error };
      }

      return { user: data, error: null };
    } catch (error) {
      console.error("Unexpected error verifying email:", error);
      return { user: null, error };
    }
  }
}
