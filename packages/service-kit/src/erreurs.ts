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

export class ErreurValidation extends ErreurApplication {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ECHEC");
  }
}

export class ErreurNonAutorise extends ErreurApplication {
  constructor(message = "Authentification requise") {
    super(message, 401, "NON_AUTORISE");
  }
}

export class ErreurInterdit extends ErreurApplication {
  constructor(message = "Accès refusé") {
    super(message, 403, "ACCES_INTERDIT");
  }
}

export class ErreurNonTrouve extends ErreurApplication {
  constructor(message = "Ressource non trouvée") {
    super(message, 404, "NON_TROUVE");
  }
}

export class ErreurConflit extends ErreurApplication {
  constructor(message: string) {
    super(message, 409, "CONFLIT");
  }
}
