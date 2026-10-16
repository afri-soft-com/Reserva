/**
 * Villes et chefs-lieux de la République Démocratique du Congo
 * (26 provinces + communes majeures).
 */

export type VilleRdcEntry = {
  nom: string;
  province: string;
};

export const VILLES_RDC_DETAIL: readonly VilleRdcEntry[] = [
  // Kinshasa
  { nom: "Kinshasa", province: "Kinshasa" },
  // Kongo-Central
  { nom: "Matadi", province: "Kongo-Central" },
  { nom: "Boma", province: "Kongo-Central" },
  { nom: "Mbanza-Ngungu", province: "Kongo-Central" },
  { nom: "Kisantu", province: "Kongo-Central" },
  { nom: "Kasangulu", province: "Kongo-Central" },
  { nom: "Lukula", province: "Kongo-Central" },
  { nom: "Songololo", province: "Kongo-Central" },
  // Kwango
  { nom: "Kenge", province: "Kwango" },
  { nom: "Popokabaka", province: "Kwango" },
  { nom: "Kasongo-Lunda", province: "Kwango" },
  // Kwilu
  { nom: "Kikwit", province: "Kwilu" },
  { nom: "Bandundu", province: "Kwilu" },
  { nom: "Idiofa", province: "Kwilu" },
  { nom: "Gungu", province: "Kwilu" },
  { nom: "Bulungu", province: "Kwilu" },
  { nom: "Masi-Manimba", province: "Kwilu" },
  // Mai-Ndombe
  { nom: "Inongo", province: "Mai-Ndombe" },
  { nom: "Bolobo", province: "Mai-Ndombe" },
  { nom: "Kutu", province: "Mai-Ndombe" },
  { nom: "Mushie", province: "Mai-Ndombe" },
  // Équateur
  { nom: "Mbandaka", province: "Équateur" },
  { nom: "Bikoro", province: "Équateur" },
  { nom: "Lukolela", province: "Équateur" },
  // Mongala
  { nom: "Lisala", province: "Mongala" },
  { nom: "Bumba", province: "Mongala" },
  { nom: "Bongandanga", province: "Mongala" },
  // Nord-Ubangi
  { nom: "Gbadolite", province: "Nord-Ubangi" },
  { nom: "Mobayi-Mbongo", province: "Nord-Ubangi" },
  { nom: "Yakoma", province: "Nord-Ubangi" },
  // Sud-Ubangi
  { nom: "Gemena", province: "Sud-Ubangi" },
  { nom: "Zongo", province: "Sud-Ubangi" },
  { nom: "Libenge", province: "Sud-Ubangi" },
  { nom: "Budjala", province: "Sud-Ubangi" },
  // Tshuapa
  { nom: "Boende", province: "Tshuapa" },
  { nom: "Monkoto", province: "Tshuapa" },
  { nom: "Ikela", province: "Tshuapa" },
  // Tshopo
  { nom: "Kisangani", province: "Tshopo" },
  { nom: "Ubundu", province: "Tshopo" },
  { nom: "Isangi", province: "Tshopo" },
  { nom: "Opala", province: "Tshopo" },
  { nom: "Banalia", province: "Tshopo" },
  // Bas-Uele
  { nom: "Buta", province: "Bas-Uele" },
  { nom: "Aketi", province: "Bas-Uele" },
  { nom: "Bondo", province: "Bas-Uele" },
  // Haut-Uele
  { nom: "Isiro", province: "Haut-Uele" },
  { nom: "Wamba", province: "Haut-Uele" },
  { nom: "Watsa", province: "Haut-Uele" },
  { nom: "Dungu", province: "Haut-Uele" },
  // Ituri
  { nom: "Bunia", province: "Ituri" },
  { nom: "Aru", province: "Ituri" },
  { nom: "Mahagi", province: "Ituri" },
  { nom: "Djugu", province: "Ituri" },
  { nom: "Mambasa", province: "Ituri" },
  // Nord-Kivu
  { nom: "Goma", province: "Nord-Kivu" },
  { nom: "Butembo", province: "Nord-Kivu" },
  { nom: "Beni", province: "Nord-Kivu" },
  { nom: "Sake", province: "Nord-Kivu" },
  { nom: "Rutshuru", province: "Nord-Kivu" },
  { nom: "Masisi", province: "Nord-Kivu" },
  { nom: "Walikale", province: "Nord-Kivu" },
  // Sud-Kivu
  { nom: "Bukavu", province: "Sud-Kivu" },
  { nom: "Uvira", province: "Sud-Kivu" },
  { nom: "Kamituga", province: "Sud-Kivu" },
  { nom: "Baraka", province: "Sud-Kivu" },
  { nom: "Fizi", province: "Sud-Kivu" },
  { nom: "Kabare", province: "Sud-Kivu" },
  { nom: "Walungu", province: "Sud-Kivu" },
  { nom: "Shabunda", province: "Sud-Kivu" },
  // Maniema
  { nom: "Kindu", province: "Maniema" },
  { nom: "Kalima", province: "Maniema" },
  { nom: "Kasongo", province: "Maniema" },
  { nom: "Punia", province: "Maniema" },
  { nom: "Lubutu", province: "Maniema" },
  // Sankuru
  { nom: "Lusambo", province: "Sankuru" },
  { nom: "Lodja", province: "Sankuru" },
  { nom: "Katako-Kombe", province: "Sankuru" },
  { nom: "Lubefu", province: "Sankuru" },
  // Kasaï
  { nom: "Tshikapa", province: "Kasaï" },
  { nom: "Ilebo", province: "Kasaï" },
  { nom: "Luebo", province: "Kasaï" },
  { nom: "Mweka", province: "Kasaï" },
  // Kasaï-Central
  { nom: "Kananga", province: "Kasaï-Central" },
  { nom: "Dibaya", province: "Kasaï-Central" },
  { nom: "Dimbelenge", province: "Kasaï-Central" },
  { nom: "Demba", province: "Kasaï-Central" },
  // Kasaï-Oriental
  { nom: "Mbuji-Mayi", province: "Kasaï-Oriental" },
  { nom: "Miabi", province: "Kasaï-Oriental" },
  { nom: "Tshilenge", province: "Kasaï-Oriental" },
  { nom: "Katanda", province: "Kasaï-Oriental" },
  // Lomami
  { nom: "Kabinda", province: "Lomami" },
  { nom: "Mwene-Ditu", province: "Lomami" },
  { nom: "Ngandajika", province: "Lomami" },
  { nom: "Luputa", province: "Lomami" },
  // Haut-Lomami
  { nom: "Kamina", province: "Haut-Lomami" },
  { nom: "Bukama", province: "Haut-Lomami" },
  { nom: "Kaniama", province: "Haut-Lomami" },
  // Lualaba
  { nom: "Kolwezi", province: "Lualaba" },
  { nom: "Dilolo", province: "Lualaba" },
  { nom: "Kapanga", province: "Lualaba" },
  { nom: "Sandoa", province: "Lualaba" },
  // Haut-Katanga
  { nom: "Lubumbashi", province: "Haut-Katanga" },
  { nom: "Likasi", province: "Haut-Katanga" },
  { nom: "Kipushi", province: "Haut-Katanga" },
  { nom: "Kasumbalesa", province: "Haut-Katanga" },
  { nom: "Sakania", province: "Haut-Katanga" },
  { nom: "Kambove", province: "Haut-Katanga" },
  // Tanganyika
  { nom: "Kalemie", province: "Tanganyika" },
  { nom: "Kongolo", province: "Tanganyika" },
  { nom: "Moba", province: "Tanganyika" },
  { nom: "Manono", province: "Tanganyika" },
  { nom: "Nyunzu", province: "Tanganyika" },
] as const;

/** Noms seuls, triés (compatibilité historique). */
export const VILLES_RDC: readonly string[] = Object.freeze(
  [...new Set(VILLES_RDC_DETAIL.map((v) => v.nom))].sort((a, b) => a.localeCompare(b, "fr"))
);

export type VilleRdc = string;

export const PROVINCES_RDC: readonly string[] = Object.freeze(
  [...new Set(VILLES_RDC_DETAIL.map((v) => v.province))].sort((a, b) => a.localeCompare(b, "fr"))
);
