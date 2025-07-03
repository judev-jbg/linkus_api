import { supabaseAdmin } from "../config/database.js";

export class Contact {
  static async add(userId, contactUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .insert({
          user_id: userId,
          contact_user_id: contactUserId,
        })
        .select()
        .single();

      return { contact: data, error };
    } catch (error) {
      return { contact: null, error };
    }
  }

  static async remove(userId, contactUserId) {
    try {
      const { error } = await supabaseAdmin
        .from("contacts")
        .delete()
        .eq("user_id", userId)
        .eq("contact_user_id", contactUserId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  static async getAll(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_contacts_detailed")
        .select("*")
        .eq("user_id", userId)
        .order("contact_username");

      return { contacts: data || [], error };
    } catch (error) {
      return { contacts: [], error };
    }
  }

  static async isContact(userId, contactUserId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("id")
        .eq("user_id", userId)
        .eq("contact_user_id", contactUserId)
        .single();

      return { isContact: !!data, error };
    } catch (error) {
      return { isContact: false, error };
    }
  }
}
