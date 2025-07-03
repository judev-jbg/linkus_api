-- Índices para búsquedas frecuentes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);

-- Índices para mensajes y conversaciones
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);

-- Índices para contactos
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_contact_user_id ON contacts(contact_user_id);

-- Índice para búsqueda de texto en mensajes (solo texto)
CREATE INDEX idx_messages_content_search ON messages 
USING gin(to_tsvector('spanish', content)) 
WHERE message_type = 'text';

-- Índice para conversaciones ordenadas por última actividad
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);