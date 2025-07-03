import { supabaseAdmin } from "../config/database.js";

export class Conversation {
  static async getOrCreatePrivate(user1Id, user2Id) {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        "get_or_create_private_conversation",
        {
          user1_id: user1Id,
          user2_id: user2Id,
        }
      );

      return { conversationId: data, error };
    } catch (error) {
      return { conversationId: null, error };
    }
  }

  static async getUserConversations(userId) {
    try {
      const { data, error } = await supabaseAdmin.rpc(
        "get_user_conversations",
        {
          p_user_id: userId,
        }
      );

      return { conversations: data || [], error };
    } catch (error) {
      return { conversations: [], error };
    }
  }

  static async getMessages(conversationId, userId, limit = 50, offset = 0) {
    try {
      // Verificar que el usuario es participante
      const { data: participant } = await supabaseAdmin
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .single();

      if (!participant) {
        return { messages: [], error: { message: "Unauthorized" } };
      }

      const { data, error } = await supabaseAdmin
        .from("messages")
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
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return { messages: data?.reverse() || [], error };
    } catch (error) {
      return { messages: [], error };
    }
  }

  static async delete(conversationId, userId) {
    try {
      // Verificar que el usuario es participante
      const { data: participant } = await supabaseAdmin
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .single();

      if (!participant) {
        return { error: { message: "Unauthorized" } };
      }

      // Eliminar participación del usuario
      const { error } = await supabaseAdmin
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      // Verificar si quedan participantes
      const { data: remainingParticipants } = await supabaseAdmin
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId);

      // Si no quedan participantes, eliminar conversación
      if (!remainingParticipants || remainingParticipants.length === 0) {
        await supabaseAdmin
          .from("conversations")
          .delete()
          .eq("id", conversationId);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  static async updateLastRead(conversationId, userId) {
    try {
      const { error } = await supabaseAdmin
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      return { error };
    } catch (error) {
      return { error };
    }
  }
}
