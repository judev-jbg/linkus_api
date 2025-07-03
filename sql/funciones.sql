-- Función para generar username único basado en email
CREATE OR REPLACE FUNCTION generate_unique_username(base_email VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    base_username VARCHAR;
    final_username VARCHAR;
    counter INTEGER := 1;
BEGIN
    -- Extraer parte antes del @ y limpiar
    base_username := lower(split_part(base_email, '@', 1));
    base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
    
    -- Asegurar longitud mínima
    IF length(base_username) < 3 THEN
        base_username := base_username || 'user';
    END IF;
    
    -- Truncar si es muy largo
    IF length(base_username) > 25 THEN
        base_username := left(base_username, 25);
    END IF;
    
    final_username := base_username;
    
    -- Verificar unicidad y agregar número si es necesario
    WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
        final_username := base_username || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Función para crear o obtener conversación privada entre dos usuarios
CREATE OR REPLACE FUNCTION get_or_create_private_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    existing_conversation UUID;
BEGIN
    -- Verificar que los usuarios existen y no están bloqueados
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id IN (user1_id, user2_id) 
        AND is_blocked = false
        AND email_verified = true
    ) THEN
        RAISE EXCEPTION 'One or both users do not exist or are blocked/unverified';
    END IF;
    
    -- Buscar conversación existente entre los dos usuarios
    SELECT cp1.conversation_id INTO existing_conversation
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = user1_id 
    AND cp2.user_id = user2_id
    AND c.is_group = false
    AND cp1.conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        GROUP BY conversation_id 
        HAVING COUNT(*) = 2
    );
    
    IF existing_conversation IS NOT NULL THEN
        RETURN existing_conversation;
    END IF;
    
    -- Crear nueva conversación
    INSERT INTO conversations (is_group) VALUES (false) RETURNING id INTO conversation_id;
    
    -- Agregar participantes
    INSERT INTO conversation_participants (conversation_id, user_id) 
    VALUES (conversation_id, user1_id), (conversation_id, user2_id);
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar usuarios
CREATE OR REPLACE FUNCTION search_users(search_term VARCHAR, current_user_id UUID)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    email VARCHAR,
    full_name VARCHAR,
    avatar_url VARCHAR,
    is_contact BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.avatar_url,
        CASE WHEN c.id IS NOT NULL THEN true ELSE false END as is_contact
    FROM users u
    LEFT JOIN contacts c ON c.user_id = current_user_id AND c.contact_user_id = u.id
    WHERE u.id != current_user_id
    AND u.is_blocked = false
    AND u.email_verified = true
    AND (
        u.username ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.full_name ILIKE '%' || search_term || '%'
    )
    ORDER BY 
        CASE WHEN c.id IS NOT NULL THEN 0 ELSE 1 END, -- Contactos primero
        u.username;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener conversaciones de un usuario con detalles
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_username VARCHAR,
    other_full_name VARCHAR,
    other_avatar_url VARCHAR,
    last_message_content TEXT,
    last_message_type message_type,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT,
    is_contact BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH conversation_details AS (
        SELECT DISTINCT
            c.id as conv_id,
            c.last_message_at,
            -- Obtener el otro usuario en conversaciones privadas
            CASE 
                WHEN c.is_group = false THEN (
                    SELECT cp2.user_id 
                    FROM conversation_participants cp2 
                    WHERE cp2.conversation_id = c.id 
                    AND cp2.user_id != p_user_id
                    LIMIT 1
                )
                ELSE NULL 
            END as other_user,
            cp.last_read_at
        FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        WHERE cp.user_id = p_user_id
        AND c.is_group = false -- Solo conversaciones privadas por ahora
    ),
    last_messages AS (
        SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.content,
            m.message_type,
            m.created_at
        FROM messages m
        WHERE m.conversation_id IN (SELECT conv_id FROM conversation_details)
        ORDER BY m.conversation_id, m.created_at DESC
    )
    SELECT 
        cd.conv_id,
        cd.other_user,
        u.username,
        u.full_name,
        u.avatar_url,
        lm.content,
        lm.message_type,
        COALESCE(lm.created_at, cd.last_message_at),
        -- Contar mensajes no leídos
        (SELECT COUNT(*) 
         FROM messages m2 
         WHERE m2.conversation_id = cd.conv_id 
         AND m2.created_at > cd.last_read_at
         AND m2.sender_id != p_user_id
        ) as unread_count,
        CASE WHEN contacts.id IS NOT NULL THEN true ELSE false END as is_contact
    FROM conversation_details cd
    LEFT JOIN users u ON u.id = cd.other_user
    LEFT JOIN last_messages lm ON lm.conversation_id = cd.conv_id
    LEFT JOIN contacts ON contacts.user_id = p_user_id AND contacts.contact_user_id = cd.other_user
    WHERE u.id IS NOT NULL -- Asegurar que el otro usuario existe
    ORDER BY COALESCE(lm.created_at, cd.last_message_at) DESC;
END;
$$ LANGUAGE plpgsql;