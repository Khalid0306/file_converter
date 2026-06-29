# Web File Converter

Application web permettant de convertir des fichiers de données entre les formats **CSV**, **JSON** et **XML**, avec authentification, historique personnel, partage public temporaire et panel d'administration.

Projet réalisé dans le cadre du cours de programmation web.

## Équipe

- Khalid OUMAROU GARBA
- Simon ALMEIDA DA SILVA
- Lucca COLLAS

## Fonctionnalités

- **Convertir** un fichier entre CSV, JSON et XML (6 sens de conversion)
- **Partager** un résultat via un lien public temporaire, sans compte requis
- **Historique** personnel avec filtres, tri et recherche
- **Panel admin** : gestion des utilisateurs, statistiques globales, vue sur toutes les conversions

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | PHP 8.2 (natif, sans framework) |
| Base de données | PostgreSQL 15 |
| Infrastructure | Docker Compose (PHP-FPM + Nginx + PostgreSQL) |
| Frontend | HTML + Tailwind CSS (CDN) + JavaScript (Fetch API) |
| Authentification | JWT (HMAC-SHA256, fait main) |
| Tests | PHPUnit (unitaires) + script bash (API end-to-end) |

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- `jq` (pour lancer le script de tests API) : `sudo apt-get install -y jq`

## Installation

```bash
git clone <url_du_repo>
cd file-converter
cp .env.example .env
docker compose up --build
```

L'application est accessible sur **http://localhost**.

## Comptes de test (créés automatiquement au premier démarrage)

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@test.com` | `password123` | admin |
| `alice@test.com` | `password123` | user |
| `bob@test.com` | `password123` | user |

## Utilisation

1. **Se connecter** : `POST /api/auth/login` avec `email` et `password` → renvoie un token JWT (valide 24h).
2. **S'authentifier** : ajouter le header `Authorization: Bearer <token>` sur toutes les routes protégées.
3. **Convertir un fichier** : `POST /api/conversions` (multipart) avec le champ `file` et `to_format` (`csv`, `json` ou `xml`).
4. **Consulter l'historique** : `GET /api/conversions`, filtrable (`?from_format=`, `?to_format=`) et triable (`?sort=created_at|file_size|file_name&order=asc|desc`).
5. **Télécharger un résultat** : `GET /api/conversions/{id}/download`.
6. **Partager un résultat** : `POST /api/conversions/{id}/share` → renvoie un lien public valide 24h, accessible sans authentification via `GET /api/share/{token}`. Révocable via `DELETE /api/conversions/{id}/share`.
7. **Supprimer une conversion** : `DELETE /api/conversions/{id}`.

### Exemple complet

```bash
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' | jq -r '.token')

curl -X POST http://localhost/api/conversions \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data.csv" \
  -F "to_format=json"
```

## Formats supportés

CSV ↔ JSON ↔ XML — 6 sens de conversion. Les données doivent être tabulaires (liste d'enregistrements à plat).

## Structure du projet
file-converter/

├── docker-compose.yml

├── backend/

│   ├── public/index.php       # point d'entrée

│   ├── routes/api.php         # déclaration des routes

│   ├── src/

│   │   ├── Core/               # Router, Request, Response, Database, Jwt, Storage

│   │   ├── Controllers/        # Auth, Conversion, Admin

│   │   ├── Middleware/         # Auth, Admin

│   │   ├── Models/             # User, Conversion

│   │   └── Services/           # Converter

│   ├── database/               # schema.sql, seed.sql

│   └── tests/                  # PHPUnit

├── frontend/                   # SPA (HTML, JS, CSS, Tailwind)

├── scripts/test_api.sh         # tests API automatisés

└── docker/                     # Dockerfile PHP, config Nginx

## Tests

**Tests unitaires** (moteur de conversion + logique de partage) :

```bash
docker compose run --rm app vendor/bin/phpunit
```

**Tests API end-to-end** (auth, conversions, partage, contrôle d'accès) :

```bash
./scripts/test_api.sh
```

## Commandes utiles

| Action | Commande |
|---|---|
| Démarrer | `docker compose up` |
| Rebuild après modif Dockerfile | `docker compose up --build` |
| Arrêter | `docker compose down` |
| Réinitialiser la base (relance les seeders) | `docker compose down -v && docker compose up` |
| Shell PHP | `docker compose exec app bash` |
| Logs | `docker compose logs -f app` |

## Sécurité

- Mots de passe hashés (bcrypt), jamais stockés en clair
- JWT signé HMAC-SHA256, expiration 24h
- Requêtes SQL exclusivement préparées (PDO), aucune concaténation
- Tri/filtres validés par whitelist côté serveur (anti-injection)
- Liens de partage : token aléatoire cryptographique (`random_bytes`), jamais l'id de la ressource ; expiration vérifiée côté serveur à chaque accès ; révocation immédiate

