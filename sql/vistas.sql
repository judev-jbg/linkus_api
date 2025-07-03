-- Vista de contactos con información completa
CREATE VIEW user_contacts_detailed AS
SELECT 
    c.user_id,
    c.contact_user_id,
    u.username as contact_username,
    u.full_name as contact_full_name,
    u.email as contact_email,
    u.avatar_url as contact_avatar_url,
    u.about_me as contact_about_me,
    c.created_at as contact_added_at
FROM contacts c
JOIN users u ON u.id = c.contact_user_id
WHERE u.is_blocked = false;

-- Vista de usuarios para administradores
CREATE VIEW admin_users_view AS
SELECT 
    id,
    email,
    username,
    full_name,
    phone,
    role,
    is_blocked,
    email_verified,
    created_at,
    updated_at,
    (SELECT COUNT(*) FROM messages WHERE sender_id = users.id) as message_count,
    (SELECT COUNT(*) FROM contacts WHERE user_id = users.id) as contact_count
FROM users
ORDER BY created_at DESC;