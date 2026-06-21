#!/usr/bin/env bash
#
# test_api.sh — Suite de tests automatiques pour l'API du convertisseur de fichiers
#
# Usage :
#   ./test_api.sh                     # teste http://localhost
#   ./test_api.sh http://localhost:8080
#
# Prérequis : curl, jq
#   sudo apt-get install -y jq
#
set -uo pipefail

BASE_URL="${1:-http://localhost}"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# ── Couleurs ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
PASS=0
FAIL=0

# ── Vérification des dépendances ─────────────────────────────────────────────
if ! command -v jq &> /dev/null; then
    echo -e "${RED}jq est requis.${NC} Installe-le avec : sudo apt-get install -y jq"
    exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

section() {
    echo ""
    echo -e "${BLUE}── $1 ──${NC}"
}

assert_status() {
    local description="$1"
    local expected="$2"
    local actual="$3"
    TOTAL=$((TOTAL + 1))

    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✓${NC} $description (HTTP $actual)"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $description (attendu $expected, obtenu $actual)"
        FAIL=$((FAIL + 1))
    fi
}

# Requête JSON. Retourne "BODY<NEWLINE>STATUS" sur stdout.
http_json() {
    local method="$1" path="$2" token="${3:-}" data="${4:-}"
    local args=(-s -w '\n%{http_code}' -X "$method" "${BASE_URL}${path}" -H "Content-Type: application/json")
    [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
    [ -n "$data" ] && args+=(-d "$data")
    curl "${args[@]}"
}

# Upload multipart. Retourne "BODY<NEWLINE>STATUS".
http_upload() {
    local path="$1" token="$2" filepath="$3" to_format="$4"
    curl -s -w '\n%{http_code}' -X POST "${BASE_URL}${path}" \
        -H "Authorization: Bearer $token" \
        -F "file=@${filepath}" \
        -F "to_format=${to_format}"
}

# Sépare le corps et le code HTTP d'une réponse http_json/http_upload
body_of()   { echo "$1" | sed '$d'; }
status_of() { echo "$1" | tail -n1; }

# ── Fichiers d'exemple ─────────────────────────────────────────────────────

make_csv()  { printf 'name,age\nAlice,30\nBob,25\n' > "$1"; }
make_json() { printf '[{"name":"Alice","age":"30"},{"name":"Bob","age":"25"}]' > "$1"; }
make_xml()  { printf '<?xml version="1.0"?><root><row><name>Alice</name><age>30</age></row></root>' > "$1"; }

CSV_FILE="$TMP_DIR/sample.csv"
JSON_FILE="$TMP_DIR/sample.json"
XML_FILE="$TMP_DIR/sample.xml"
make_csv  "$CSV_FILE"
make_json "$JSON_FILE"
make_xml  "$XML_FILE"

echo "=========================================="
echo " Suite de tests API — $BASE_URL"
echo "=========================================="

# ══════════════════════════════════════════════════════════════════════════
section "1. Authentification — Register"
# ══════════════════════════════════════════════════════════════════════════

EMAIL="testuser_$(date +%s)_${RANDOM}@example.com"
PASSWORD="password123"

RESP=$(http_json POST /api/auth/register "" "{\"name\":\"Test User\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
STATUS=$(status_of "$RESP")
BODY=$(body_of "$RESP")
assert_status "Inscription d'un nouvel utilisateur" "201" "$STATUS"
USER_TOKEN=$(echo "$BODY" | jq -r '.token // empty')

RESP=$(http_json POST /api/auth/register "" "{\"name\":\"Test User\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
assert_status "Email déjà utilisé → conflit" "409" "$(status_of "$RESP")"

RESP=$(http_json POST /api/auth/register "" "{\"name\":\"\",\"email\":\"\",\"password\":\"\"}")
assert_status "Champs manquants → erreur de validation" "422" "$(status_of "$RESP")"

RESP=$(http_json POST /api/auth/register "" "{\"name\":\"X\",\"email\":\"pas-un-email\",\"password\":\"password123\"}")
assert_status "Email invalide → erreur de validation" "422" "$(status_of "$RESP")"

RESP=$(http_json POST /api/auth/register "" "{\"name\":\"X\",\"email\":\"short@test.com\",\"password\":\"123\"}")
assert_status "Mot de passe trop court → erreur de validation" "422" "$(status_of "$RESP")"

# ══════════════════════════════════════════════════════════════════════════
section "2. Authentification — Login"
# ══════════════════════════════════════════════════════════════════════════

RESP=$(http_json POST /api/auth/login "" "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
STATUS=$(status_of "$RESP")
BODY=$(body_of "$RESP")
assert_status "Connexion avec les bons identifiants" "200" "$STATUS"
USER_TOKEN=$(echo "$BODY" | jq -r '.token // empty')

RESP=$(http_json POST /api/auth/login "" "{\"email\":\"${EMAIL}\",\"password\":\"mauvais_mdp\"}")
assert_status "Connexion avec mauvais mot de passe → 401" "401" "$(status_of "$RESP")"

RESP=$(http_json POST /api/auth/login "" "{\"email\":\"inexistant@test.com\",\"password\":\"password123\"}")
assert_status "Connexion avec email inconnu → 401" "401" "$(status_of "$RESP")"

# Comptes seedés
RESP=$(http_json POST /api/auth/login "" '{"email":"alice@test.com","password":"password123"}')
ALICE_TOKEN=$(body_of "$RESP" | jq -r '.token // empty')
assert_status "Connexion compte seedé (Alice)" "200" "$(status_of "$RESP")"

RESP=$(http_json POST /api/auth/login "" '{"email":"admin@test.com","password":"password123"}')
ADMIN_TOKEN=$(body_of "$RESP" | jq -r '.token // empty')
assert_status "Connexion compte seedé (Admin)" "200" "$(status_of "$RESP")"

if [ -z "$USER_TOKEN" ]; then
    echo -e "${RED}Impossible de récupérer un token utilisateur, arrêt des tests dépendants de l'auth.${NC}"
    USER_TOKEN="invalid"
fi

# ══════════════════════════════════════════════════════════════════════════
section "3. Contrôle d'accès"
# ══════════════════════════════════════════════════════════════════════════

RESP=$(http_json GET /api/conversions "")
assert_status "Route protégée sans token → 401" "401" "$(status_of "$RESP")"

RESP=$(http_json GET /api/conversions "token_invalide_xyz")
assert_status "Route protégée avec token invalide → 401" "401" "$(status_of "$RESP")"

RESP=$(http_json GET /api/admin/users "$USER_TOKEN")
assert_status "Route admin avec rôle user → 403" "403" "$(status_of "$RESP")"

RESP=$(http_json GET /api/nope "$USER_TOKEN")
assert_status "Route inconnue → 404" "404" "$(status_of "$RESP")"

# ══════════════════════════════════════════════════════════════════════════
section "4. Conversions — les 6 sens"
# ══════════════════════════════════════════════════════════════════════════

declare -A SAMPLE_FILES=( [csv]="$CSV_FILE" [json]="$JSON_FILE" [xml]="$XML_FILE" )
declare -a CREATED_IDS=()

for FROM in csv json xml; do
    for TO in csv json xml; do
        [ "$FROM" = "$TO" ] && continue
        RESP=$(http_upload /api/conversions "$USER_TOKEN" "${SAMPLE_FILES[$FROM]}" "$TO")
        STATUS=$(status_of "$RESP")
        BODY=$(body_of "$RESP")
        assert_status "Conversion ${FROM} → ${TO}" "201" "$STATUS"
        ID=$(echo "$BODY" | jq -r '.conversion.id // empty')
        [ -n "$ID" ] && CREATED_IDS+=("$ID")
    done
done

# ══════════════════════════════════════════════════════════════════════════
section "5. Conversions — cas d'erreur"
# ══════════════════════════════════════════════════════════════════════════

RESP=$(http_upload /api/conversions "$USER_TOKEN" "$CSV_FILE" "csv")
assert_status "Même format source et cible → 422" "422" "$(status_of "$RESP")"

TXT_FILE="$TMP_DIR/sample.txt"
echo "contenu quelconque" > "$TXT_FILE"
RESP=$(http_upload /api/conversions "$USER_TOKEN" "$TXT_FILE" "json")
assert_status "Extension non supportée (.txt) → 422" "422" "$(status_of "$RESP")"

RESP=$(curl -s -w '\n%{http_code}' -X POST "${BASE_URL}/api/conversions" \
    -H "Authorization: Bearer $USER_TOKEN" -F "to_format=json")
assert_status "Upload sans fichier → 422" "422" "$(status_of "$RESP")"

# ══════════════════════════════════════════════════════════════════════════
section "6. Historique — liste, filtres, tri"
# ══════════════════════════════════════════════════════════════════════════

RESP=$(http_json GET /api/conversions "$USER_TOKEN")
STATUS=$(status_of "$RESP")
COUNT=$(body_of "$RESP" | jq '.conversions | length')
assert_status "Liste de l'historique" "200" "$STATUS"
echo "    → ${COUNT} conversion(s) trouvée(s) pour cet utilisateur"

RESP=$(http_json GET "/api/conversions?to_format=json" "$USER_TOKEN")
assert_status "Filtre par format cible (to_format=json)" "200" "$(status_of "$RESP")"

RESP=$(http_json GET "/api/conversions?sort=file_size&order=asc" "$USER_TOKEN")
assert_status "Tri par taille croissante" "200" "$(status_of "$RESP")"

RESP=$(http_json GET "/api/conversions?sort=created_at&order=desc" "$USER_TOKEN")
assert_status "Tri par date décroissante" "200" "$(status_of "$RESP")"

# ══════════════════════════════════════════════════════════════════════════
section "7. Téléchargement"
# ══════════════════════════════════════════════════════════════════════════

if [ "${#CREATED_IDS[@]}" -gt 0 ]; then
    FIRST_ID="${CREATED_IDS[0]}"
    HTTP_CODE=$(curl -s -o "$TMP_DIR/downloaded" -w '%{http_code}' \
        "${BASE_URL}/api/conversions/${FIRST_ID}/download" \
        -H "Authorization: Bearer $USER_TOKEN")
    assert_status "Téléchargement d'une conversion possédée" "200" "$HTTP_CODE"

    if [ -s "$TMP_DIR/downloaded" ]; then
        echo "    → fichier téléchargé non vide ($(wc -c < "$TMP_DIR/downloaded") octets)"
    fi
else
    echo -e "  ${YELLOW}⚠ Aucun id de conversion disponible, étape ignorée${NC}"
fi

RESP=$(http_json GET "/api/conversions/999999/download" "$USER_TOKEN")
assert_status "Téléchargement d'une conversion inexistante → 404" "404" "$(status_of "$RESP")"

# Alice ne doit pas pouvoir accéder aux conversions de l'utilisateur de test
if [ "${#CREATED_IDS[@]}" -gt 0 ] && [ -n "$ALICE_TOKEN" ]; then
    RESP=$(http_json GET "/api/conversions/${FIRST_ID}/download" "$ALICE_TOKEN")
    assert_status "Téléchargement d'une conversion d'un autre user → 404" "404" "$(status_of "$RESP")"
fi

# ══════════════════════════════════════════════════════════════════════════
section "8. Suppression"
# ══════════════════════════════════════════════════════════════════════════

if [ "${#CREATED_IDS[@]}" -gt 0 ]; then
    DELETE_ID="${CREATED_IDS[0]}"
    RESP=$(http_json DELETE "/api/conversions/${DELETE_ID}" "$USER_TOKEN")
    assert_status "Suppression d'une conversion possédée" "200" "$(status_of "$RESP")"

    RESP=$(http_json DELETE "/api/conversions/${DELETE_ID}" "$USER_TOKEN")
    assert_status "Suppression d'une conversion déjà supprimée → 404" "404" "$(status_of "$RESP")"
else
    echo -e "  ${YELLOW}⚠ Aucun id de conversion disponible, étape ignorée${NC}"
fi

# ══════════════════════════════════════════════════════════════════════════
section "9. Routes admin (contrôle de rôle)"
# ══════════════════════════════════════════════════════════════════════════

if [ -n "$ADMIN_TOKEN" ]; then
    RESP=$(http_json GET /api/admin/users "$ADMIN_TOKEN")
    STATUS=$(status_of "$RESP")
    # 200 une fois le panel admin codé, 501 tant qu'il reste en stub
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "501" ]; then
        echo -e "  ${GREEN}✓${NC} Accès admin à /api/admin/users autorisé (HTTP $STATUS)"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} Accès admin à /api/admin/users (HTTP $STATUS inattendu)"
        FAIL=$((FAIL + 1))
    fi
    TOTAL=$((TOTAL + 1))

    RESP=$(http_json GET /api/admin/stats "$ADMIN_TOKEN")
    STATUS=$(status_of "$RESP")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "501" ]; then
        echo -e "  ${GREEN}✓${NC} Accès admin à /api/admin/stats autorisé (HTTP $STATUS)"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} Accès admin à /api/admin/stats (HTTP $STATUS inattendu)"
        FAIL=$((FAIL + 1))
    fi
    TOTAL=$((TOTAL + 1))
else
    echo -e "  ${YELLOW}⚠ Pas de token admin disponible, étape ignorée${NC}"
fi

# ══════════════════════════════════════════════════════════════════════════
section "10. Logout"
# ══════════════════════════════════════════════════════════════════════════

RESP=$(http_json DELETE /api/auth/logout "$USER_TOKEN")
assert_status "Déconnexion" "200" "$(status_of "$RESP")"

# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "=========================================="
echo " Résumé"
echo "=========================================="
echo -e "Total  : $TOTAL"
echo -e "${GREEN}Réussis: $PASS${NC}"
echo -e "${RED}Échecs : $FAIL${NC}"
echo "=========================================="

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}Tous les tests sont passés.${NC}"
    exit 0
else
    echo -e "${RED}Certains tests ont échoué — voir le détail ci-dessus.${NC}"
    exit 1
fi