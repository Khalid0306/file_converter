# Web File Converter

Application web permettant de convertir des fichiers de données entre les formats **CSV**, **JSON** et **XML**, avec authentification, historique personnel et panel d'administration.

Projet réalisé dans le cadre du cours de programmation web.

## Équipe

- Khalid OUMAROU GARBA
- Simon ALMEIDA DA SILVA
- Lucca COLLAS

## Stack technique

| Composant | Technologie |
|---|---|
| Backend | PHP 8.2 (natif, sans framework) |
| Base de données | PostgreSQL 15 |
| Infrastructure | Docker Compose (PHP-FPM + Nginx + PostgreSQL) |
| Frontend | HTML + Tailwind CSS + JavaScript (Fetch API) |
| Authentification | JWT (HMAC-SHA256, fait main) |
| Tests | PHPUnit (unitaires) + script bash (API end-to-end) |

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- `jq` (uniquement pour lancer le script de tests API) : `sudo apt-get install -y jq`

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
6. **Supprimer une conversion** : `DELETE /api/conversions/{id}`.

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

## Frontend

| Page | Description |
|---|---|
| Login | Connexion avec email/mot de passe, redirection auto si déjà connecté |
| Convertisseur | Upload drag-and-drop, choix du format cible, aperçu/téléchargement du résultat |
| Historique | Liste des conversions passées avec filtres (format source/cible) et tri |
| Profil | Infos utilisateur et statistiques d'activité |
| Paramètres | Thème (dark/light/auto), couleur d'accent, format par défaut, préférences d'affichage |
| Admin | Dashboard d'administration (non fonctionnel côté backend, voir Limites) |

Les préférences utilisateur (thème, accent, etc.) sont stockées dans le `localStorage` du navigateur.

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

**Tests unitaires** (moteur de conversion) :

```bash
docker compose run --rm app vendor/bin/phpunit
```

**Tests API end-to-end** (auth, conversions, contrôle d'accès) :

```bash
./scripts/test_api.sh
```

## Endpoints API

### Publics

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription (name, email, password) |
| POST | `/api/auth/login` | Connexion → retourne un JWT |

### Authentifiés (header `Authorization: Bearer <token>`)

| Méthode | Route | Description |
|---|---|---|
| DELETE | `/api/auth/logout` | Déconnexion (stateless, supprime le token côté client) |
| POST | `/api/conversions` | Upload et conversion d'un fichier |
| GET | `/api/conversions` | Historique des conversions de l'utilisateur |
| GET | `/api/conversions/{id}/download` | Télécharger le fichier converti |
| DELETE | `/api/conversions/{id}` | Supprimer une conversion |

### Admin uniquement

| Méthode | Route | Statut |
|---|---|---|
| GET | `/api/admin/users` | 501 — non implémenté |
| PUT | `/api/admin/users/{id}` | 501 — non implémenté |
| DELETE | `/api/admin/users/{id}` | 501 — non implémenté |
| GET | `/api/admin/conversions` | 501 — non implémenté |
| GET | `/api/admin/stats` | 501 — non implémenté |

## Limites connues

- Les endpoints admin renvoient tous **501 Not Implemented** (le frontend affiche des données de démo en fallback)
- Le logout est **stateless** : le serveur n'invalide pas le token, seul le frontend le supprime
- Pas de mécanisme de **refresh token** (le JWT expire après 24h)
- Pas de **réinitialisation de mot de passe** ni de vérification d'email
- Les fichiers uploadés ne sont **pas nettoyés automatiquement** (pas de TTL/cron)
- Le `DEMO_MODE` est activé dans le frontend : si l'API est injoignable, des données fictives sont affichées

## Commandes utiles

| Action | Commande |
|---|---|
| Démarrer | `docker compose up` |
| Rebuild après modif Dockerfile | `docker compose up --build` |
| Arrêter | `docker compose down` |
| Réinitialiser la base (relance les seeders) | `docker compose down -v && docker compose up` |
| Shell PHP | `docker compose exec app bash` |
| Logs | `docker compose logs -f app` |