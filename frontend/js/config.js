/* ============================================================
   Configuration globale
   ============================================================ */

// Base URL de l'API
const API_BASE = 'http://localhost';

/*
  DEMO_MODE : quand l'API réelle est injoignable (preview, dev sans
  backend), l'application bascule automatiquement sur des données
  fictives pour que toute l'UI reste visible et fonctionnelle.
  -> Passez à `false` en production pour désactiver le fallback.
*/
const DEMO_MODE = true;

// Clés localStorage
const TOKEN_KEY = 'token';
const USER_KEY  = 'user';
