"use client";

interface ProprietesCarteMap {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  className?: string;
}

export function CarteMap({
  latitude = -4.4419,
  longitude = 15.2663,
  zoom = 14,
  className,
}: ProprietesCarteMap) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const lien = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;

  return (
    <div className={className}>
      <iframe
        src={src}
        className="w-full h-64 rounded-card border"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Carte OpenStreetMap"
      />
      <p className="mt-1 text-right text-xs">
        <a
          href={lien}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaire hover:underline"
        >
          Voir sur OpenStreetMap &rarr;
        </a>
      </p>
    </div>
  );
}
