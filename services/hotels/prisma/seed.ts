import { PrismaClient } from "../src/generated/prisma";
import { formaterJour } from "@reserva/service-kit";

const prisma = new PrismaClient();

function joursSuivants(nombre: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < nombre; i++) {
    out.push(formaterJour(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const PHOTOS = {
  fleuve: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
  ],
  lingwala: [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  ],
  lubum: [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
  ],
  goma: [
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
  ],
  matadi: [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
  ],
};

async function main() {
  await prisma.avisHotel.deleteMany();
  await prisma.disponibiliteJour.deleteMany();
  await prisma.planTarif.deleteMany();
  await prisma.typeChambre.deleteMany();
  await prisma.hotel.deleteMany();

  const catalogue = [
    {
      nom: "Hôtel Fleuve Congo",
      ville: "Kinshasa",
      quartier: "Gombe",
      adresse: "45 Boulevard du 30 Juin",
      etoiles: 4,
      noteMoyenne: 4.7,
      noteProprete: 4.8,
      noteEmplacement: 4.9,
      nombreAvis: 3,
      latitude: -4.3,
      longitude: 15.31,
      description: "Vue sur le fleuve, idéal voyages d'affaires. Petit-déjeuner buffet et wifi haut débit.",
      commodites: ["Wifi", "Climatisation", "Restaurant", "Parking", "Générateur"],
      photos: PHOTOS.fleuve,
      avis: [
        { auteurNom: "Amina K.", note: 5, noteProprete: 5, noteEmplacement: 5, commentaire: "Parfait pour une mission à Gombe." },
        { auteurNom: "Jean P.", note: 4, noteProprete: 5, noteEmplacement: 4, commentaire: "Générateur silencieux, bon wifi." },
        { auteurNom: "Sarah M.", note: 5, noteProprete: 4, noteEmplacement: 5, commentaire: "Vue fleuve exceptionnelle." },
      ],
      chambres: [
        { nom: "Chambre double standard", capaciteAdultes: 2, capaciteEnfants: 1, lits: "1 lit queen", superficieM2: 22, total: 8, photos: PHOTOS.fleuve, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 85, devise: "USD" },
          { nom: "Non remboursable", petitDejeuner: true, remboursable: false, prixParNuit: 68, devise: "USD" },
        ]},
        { nom: "Suite fleuve", capaciteAdultes: 2, capaciteEnfants: 2, lits: "1 king + canapé-lit", superficieM2: 40, total: 3, photos: PHOTOS.fleuve, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 140, devise: "USD" },
        ]},
      ],
    },
    {
      nom: "Résidence Lingwala",
      ville: "Kinshasa",
      quartier: "Lingwala",
      adresse: "8 Avenue Kasa-Vubu",
      etoiles: 3,
      noteMoyenne: 4.2,
      noteProprete: 4.0,
      noteEmplacement: 4.3,
      nombreAvis: 2,
      latitude: -4.327,
      longitude: 15.298,
      description: "Chambres calmes, proche des ministères. Tarif en francs congolais.",
      commodites: ["Wifi", "Climatisation", "Parking"],
      photos: PHOTOS.lingwala,
      avis: [
        { auteurNom: "David L.", note: 4, noteProprete: 4, noteEmplacement: 4, commentaire: "Bon rapport qualité-prix." },
        { auteurNom: "Grace N.", note: 4, noteProprete: 4, noteEmplacement: 5, commentaire: "Proche des administrations." },
      ],
      chambres: [
        { nom: "Chambre twin", capaciteAdultes: 2, capaciteEnfants: 0, lits: "2 lits simples", superficieM2: 18, total: 10, photos: PHOTOS.lingwala, tarifs: [
          { nom: "Flexible", petitDejeuner: false, remboursable: true, prixParNuit: 95000, devise: "CDF" },
        ]},
        { nom: "Chambre familiale", capaciteAdultes: 3, capaciteEnfants: 2, lits: "1 double + 1 simple", superficieM2: 28, total: 4, photos: PHOTOS.lingwala, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 145000, devise: "CDF" },
        ]},
      ],
    },
    {
      nom: "Grand Hôtel Lubumbashi",
      ville: "Lubumbashi",
      quartier: "Kenya",
      adresse: "12 Avenue Mwepu",
      etoiles: 5,
      noteMoyenne: 4.8,
      noteProprete: 4.9,
      noteEmplacement: 4.7,
      nombreAvis: 2,
      latitude: -11.664,
      longitude: 27.479,
      description: "Palace minier : spa, piscine, salons de réunion.",
      commodites: ["Wifi", "Piscine", "Spa", "Restaurant", "Salle de réunion", "Générateur"],
      photos: PHOTOS.lubum,
      avis: [
        { auteurNom: "Marc T.", note: 5, noteProprete: 5, noteEmplacement: 5, commentaire: "Spa remarquable." },
        { auteurNom: "Claire B.", note: 5, noteProprete: 5, noteEmplacement: 4, commentaire: "Idéal séminaires." },
      ],
      chambres: [
        { nom: "Deluxe", capaciteAdultes: 2, capaciteEnfants: 1, lits: "1 king", superficieM2: 32, total: 12, photos: PHOTOS.lubum, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 160, devise: "USD" },
          { nom: "Corporate", petitDejeuner: true, remboursable: false, prixParNuit: 125, devise: "USD" },
        ]},
        { nom: "Suite présidentielle", capaciteAdultes: 2, capaciteEnfants: 2, lits: "1 king", superficieM2: 70, total: 1, photos: PHOTOS.lubum, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 380, devise: "USD" },
        ]},
      ],
    },
    {
      nom: "Goma Lake Lodge",
      ville: "Goma",
      quartier: "Les Volcans",
      adresse: "Bord du lac Kivu",
      etoiles: 4,
      noteMoyenne: 4.6,
      noteProprete: 4.5,
      noteEmplacement: 4.8,
      nombreAvis: 1,
      latitude: -1.679,
      longitude: 29.222,
      description: "Bungalows face au Kivu, transferts aéroport inclus.",
      commodites: ["Wifi", "Restaurant", "Vue lac", "Parking", "Générateur"],
      photos: PHOTOS.goma,
      avis: [
        { auteurNom: "Patrick M.", note: 5, noteProprete: 4, noteEmplacement: 5, commentaire: "Lever de soleil sur le lac." },
      ],
      chambres: [
        { nom: "Bungalow jardin", capaciteAdultes: 2, capaciteEnfants: 1, lits: "1 double", superficieM2: 24, total: 6, photos: PHOTOS.goma, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 95, devise: "USD" },
        ]},
        { nom: "Bungalow lac", capaciteAdultes: 2, capaciteEnfants: 1, lits: "1 king", superficieM2: 30, total: 4, photos: PHOTOS.goma, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 130, devise: "USD" },
        ]},
      ],
    },
    {
      nom: "Auberge Matadi Centre",
      ville: "Matadi",
      quartier: "Ville",
      adresse: "Près du port",
      etoiles: 2,
      noteMoyenne: 3.9,
      noteProprete: 3.8,
      noteEmplacement: 4.0,
      nombreAvis: 1,
      latitude: -5.816,
      longitude: 13.45,
      description: "Simple, propre, idéal correspondance bus Kinshasa-Matadi.",
      commodites: ["Wifi", "Ventilateur", "Restaurant"],
      photos: PHOTOS.matadi,
      avis: [
        { auteurNom: "Joseph K.", note: 4, noteProprete: 4, noteEmplacement: 4, commentaire: "Pratique avant le ferry." },
      ],
      chambres: [
        { nom: "Chambre simple", capaciteAdultes: 1, capaciteEnfants: 0, lits: "1 lit simple", superficieM2: 12, total: 8, photos: PHOTOS.matadi, tarifs: [
          { nom: "Flexible", petitDejeuner: false, remboursable: true, prixParNuit: 35000, devise: "CDF" },
        ]},
        { nom: "Chambre double", capaciteAdultes: 2, capaciteEnfants: 1, lits: "1 double", superficieM2: 16, total: 6, photos: PHOTOS.matadi, tarifs: [
          { nom: "Flexible", petitDejeuner: true, remboursable: true, prixParNuit: 55000, devise: "CDF" },
        ]},
      ],
    },
  ];

  const horizon = joursSuivants(60);

  for (const h of catalogue) {
    const hotel = await prisma.hotel.create({
      data: {
        nom: h.nom,
        description: h.description,
        ville: h.ville,
        quartier: h.quartier,
        adresse: h.adresse,
        etoiles: h.etoiles,
        noteMoyenne: h.noteMoyenne,
        noteProprete: h.noteProprete,
        noteEmplacement: h.noteEmplacement,
        nombreAvis: h.nombreAvis,
        latitude: h.latitude,
        longitude: h.longitude,
        commodites: JSON.stringify(h.commodites),
        photos: JSON.stringify(h.photos),
        photoUrl: h.photos[0] ?? null,
        actif: true,
      },
    });

    for (const a of h.avis) {
      await prisma.avisHotel.create({
        data: {
          hotelId: hotel.id,
          auteurNom: a.auteurNom,
          note: a.note,
          noteProprete: a.noteProprete,
          noteEmplacement: a.noteEmplacement,
          commentaire: a.commentaire,
        },
      });
    }

    for (const c of h.chambres) {
      const chambre = await prisma.typeChambre.create({
        data: {
          hotelId: hotel.id,
          nom: c.nom,
          capaciteAdultes: c.capaciteAdultes,
          capaciteEnfants: c.capaciteEnfants,
          lits: c.lits,
          superficieM2: c.superficieM2,
          commodites: JSON.stringify(["Climatisation", "Salle de bain privée"]),
          photos: JSON.stringify(c.photos),
        },
      });
      for (const t of c.tarifs) {
        await prisma.planTarif.create({
          data: {
            typeChambreId: chambre.id,
            nom: t.nom,
            petitDejeuner: t.petitDejeuner,
            remboursable: t.remboursable,
            prixParNuit: t.prixParNuit,
            devise: t.devise,
          },
        });
      }
      // Weekend surcharge ~15% on prix field
      await prisma.disponibiliteJour.createMany({
        data: horizon.map((jour, idx) => {
          const base = c.tarifs[0].prixParNuit;
          const date = new Date();
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + idx);
          const weekend = date.getDay() === 5 || date.getDay() === 6;
          return {
            typeChambreId: chambre.id,
            jour,
            total: c.total,
            vendues: 0,
            reservees: 0,
            prix: weekend ? Math.round(base * 1.15 * 100) / 100 : base,
          };
        }),
      });
    }
  }

  console.log(`✓ ${catalogue.length} hôtels, avis, photos, 60 jours (prix week-end)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
