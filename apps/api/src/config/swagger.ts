import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "RESERVA API",
      version: "1.0.0",
      description: "API de réservation de services en RDCongo",
    },
    servers: [
      { url: "http://localhost:4000", description: "Développement" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Erreur: {
          type: "object",
          properties: {
            succes: { type: "boolean", example: false },
            erreur: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Utilisateur: {
          type: "object",
          properties: {
            id: { type: "string" },
            telephone: { type: "string" },
            nom: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["CLIENT", "PRESTATAIRE", "ADMIN"] },
          },
        },
        PlanAbonnement: {
          type: "object",
          properties: {
            id: { type: "string" },
            nom: { type: "string" },
            description: { type: "string" },
            prix: { type: "number" },
            devise: { type: "string" },
            dureeJours: { type: "integer" },
            maxServices: { type: "integer" },
            commissionReduite: { type: "number" },
            fonctionnalites: { type: "string" },
            actif: { type: "boolean" },
          },
        },
        ConfigurationTarification: {
          type: "object",
          properties: {
            id: { type: "string" },
            cle: { type: "string" },
            valeur: { type: "string" },
            description: { type: "string" },
            type: { type: "string" },
            actif: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/api/sante": {
        get: {
          tags: ["Système"],
          summary: "Vérification de santé",
          responses: { "200": { description: "API opérationnelle" } },
        },
      },
      "/api/auth/inscription": {
        post: {
          tags: ["Authentification"],
          summary: "Inscription utilisateur",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["telephone", "nom"],
                  properties: {
                    telephone: { type: "string", example: "+243991234567" },
                    nom: { type: "string", example: "Patrick Mukendi" },
                    langue: { type: "string", enum: ["fr", "ln", "sw"] },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Inscription réussie, OTP envoyé" },
            "400": { description: "Données invalides", $ref: "#/components/schemas/Erreur" },
          },
        },
      },
      "/api/auth/connexion": {
        post: {
          tags: ["Authentification"],
          summary: "Connexion par PIN",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["telephone", "pin"],
                  properties: {
                    telephone: { type: "string", example: "+243900000001" },
                    pin: { type: "string", example: "1234" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Connexion réussie" },
            "401": { description: "PIN invalide" },
          },
        },
      },
      "/api/admin/plans": {
        get: {
          tags: ["Admin - Plans"],
          summary: "Lister tous les plans",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Liste des plans" } },
        },
        post: {
          tags: ["Admin - Plans"],
          summary: "Créer un plan",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Plan créé" } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
