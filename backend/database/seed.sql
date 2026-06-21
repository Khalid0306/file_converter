-- Comptes de test (mot de passe pour tous : password123)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin', 'admin@test.com', '$2b$12$lF18EO0mgo2Sm23NSWwsZunmPMtFvIPWxpEO8DOZ8E6LhWv.p7lky', 'admin'),
  ('Alice', 'alice@test.com', '$2b$12$PNgFLxPwUNc3V06ZM1g0GONfSNE1O/bbUn9ryqr3K.9YKo1elhSPO', 'user'),
  ('Bob',   'bob@test.com',   '$2b$12$OOf4RVlfZaEjBvQIdnA0KeuJoXLP6TxL53nxjryu66sf7dT9ZORPi', 'user');

-- Conversions de démonstration : peuplent l'historique pour tester filtres/tri dans l'UI.
-- Métadonnées uniquement — aucun fichier réel sur disque (path_in/path_out = NULL),
-- donc le téléchargement de ces entrées précises renverra 410. Pour un vrai test de
-- téléchargement, passe par l'API (upload réel via /api/conversions).
INSERT INTO conversions (user_id, file_name, from_format, to_format, file_size, status, path_in, path_out, created_at) VALUES
  (2, 'clients.json',     'csv',  'json', 2048, 'completed', NULL, NULL, NOW() - INTERVAL '5 days'),
  (2, 'commandes.xml',    'json', 'xml',  5120, 'completed', NULL, NULL, NOW() - INTERVAL '3 days'),
  (2, 'export.csv',       'xml',  'csv',  1024, 'completed', NULL, NULL, NOW() - INTERVAL '1 day'),
  (3, 'inventaire.xml',   'csv',  'xml',  8192, 'completed', NULL, NULL, NOW() - INTERVAL '4 days'),
  (3, 'utilisateurs.csv', 'json', 'csv',  3072, 'completed', NULL, NULL, NOW() - INTERVAL '2 hours');