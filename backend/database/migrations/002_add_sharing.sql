-- Ajoute le partage public temporaire d'une conversion.
-- share_token : identifiant aléatoire (jamais l'id auto-incrémenté, pour ne pas être devinable)
-- share_expires_at : NULL = non partagé. Un token n'est valide que si non NULL et non expiré.

ALTER TABLE conversions
    ADD COLUMN share_token VARCHAR(64) UNIQUE,
    ADD COLUMN share_expires_at TIMESTAMP;