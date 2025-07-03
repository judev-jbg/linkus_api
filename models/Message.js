import { supabaseAdmin } from "../config/database.js";

export class Message {
  static async create(messageData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("messages")
        .insert(messageData)
        .select(
          `
          id,
          content,
          message_type,
          file_url,
          file_name,
          file_size,
          created_at,
          sender:users!sender_id(id, username, full_name, avatar_url)
        `
        )
        .single();

      return { message: data, error };
    } catch (error) {
      return { message: null, error };
    }
  }

  static async search(userId, searchTerm) {
    try {
      const { data, error } = await supabaseAdmin
        .from("messages")
        .select(
          `
          id,
          content,
          message_type,
          created_at,
          conversation_id,
          sender:users!sender_id(id, username, full_name, avatar_url)
        `
        )
        .textSearch("content", searchTerm)
        .eq("message_type", "text")
        .in(
          "conversation_id",
          supabaseAdmin
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", userId)
        )
        .order("created_at", { ascending: false })
        .limit(50);

      return { messages: data || [], error };
    } catch (error) {
      return { messages: [], error };
    }
  }
}
