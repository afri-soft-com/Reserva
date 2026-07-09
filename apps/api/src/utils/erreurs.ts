/** Erreur de base de l'application — toutes les erreurs métier en héritent */
export class ErreurApplication extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, ErreurApplication.prototype);
  }
}

/** 400 — Données d'entrée invalides */
export class ErreurValidation extends ErreurApplication {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ECHEC");
  }
}

/** 401 — Authentification requise ou invalide */
export class ErreurNonAutorise extends ErreurApplication {
  constructor(message = "Authentification requise") {
    super(message, 401, "NON_AUTORISE");
  }
}

/** 403 — Authentifié mais sans les droits nécessaires */
export class ErreurInterdit extends ErreurApplication {
  constructor(message = "Accès refusé") {
    super(message, 403, "ACCES_INTERDIT");
  }
}

/** 404 — Ressource non trouvée */
export class ErreurNonTrouve extends ErreurApplication {
  constructor(message = "Ressource non trouvée") {
    super(message, 404, "NON_TROUVE");
  }
}

/** 409 — Conflit (ex: créneau déjà réservé) */
export class ErreurConflit extends ErreurApplication {
  constructor(message: string) {
    super(message, 409, "CONFLIT");
  }
}
