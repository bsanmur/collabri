-- Collabrí - seed inicial para desarrollo/pruebas

-- Usuarios
INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
VALUES
    (1, 'Ana Pérez', 'ana@example.com', 'hash1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Juan García', 'juan@example.com', 'hash2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Proyecto
INSERT INTO projects (id, name, code, creator_id, created_at, updated_at)
VALUES
    (1, 'Proyecto Demo', 'PROJ1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Colaborador
INSERT INTO collaborators (id, project_id, user_id, role, added_at)
VALUES
    (1, 1, 1, 'member', CURRENT_TIMESTAMP),
    (2, 1, 2, 'member', CURRENT_TIMESTAMP);
