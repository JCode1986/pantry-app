import Image from 'next/image';

// Replace these files with real app screenshots and lifestyle photos later.
// Keep the public paths stable so the landing page code does not need to change.
export const marketingImages = {
  heroApp: {
    src: '/images/marketing/hero-app-placeholder.png',
    width: 900,
    height: 1200,
    alt: 'WhereKeep app search preview',
  },
  dashboard: {
    src: '/images/marketing/dashboard-placeholder.png',
    width: 1200,
    height: 900,
    alt: 'WhereKeep dashboard preview',
  },
  search: {
    src: '/images/marketing/search-placeholder.png',
    width: 1200,
    height: 900,
    alt: 'WhereKeep search preview',
  },
  addItem: {
    src: '/images/marketing/add-item-placeholder.png',
    width: 1200,
    height: 900,
    alt: 'WhereKeep add item preview',
  },
  organizedHome: {
    src: '/images/marketing/organized-home-placeholder.png',
    width: 1200,
    height: 900,
    alt: 'Organized home storage preview',
  },
  pantry: {
    src: '/images/marketing/pantry-storage.png',
    width: 1200,
    height: 900,
    alt: 'Organized pantry storage preview',
  },
  garage: {
    src: '/images/marketing/garage-storage.png',
    width: 1200,
    height: 900,
    alt: 'Organized garage bin preview',
  },
  documents: {
    src: '/images/marketing/documents-storage.png',
    width: 1200,
    height: 900,
    alt: 'Organized documents preview',
  },
  family: {
    src: '/images/marketing/family-placeholder.png',
    width: 1200,
    height: 900,
    alt: 'WhereKeep family sharing preview',
  },
};

export default function MarketingImage({
  imageKey,
  alt,
  priority = false,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  className = '',
  imageClassName = '',
  overlayClassName = '',
  scrim = false,
  children,
}) {
  const image = marketingImages[imageKey];

  if (!image) {
    return null;
  }

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm ${className}`}
    >
      <Image
        src={image.src}
        alt={alt || image.alt}
        width={image.width}
        height={image.height}
        priority={priority}
        sizes={sizes}
        className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
      />
      {scrim && <div className="absolute inset-0 bg-white/30" aria-hidden="true" />}
      {children && (
        <div className={`relative z-10 h-full ${overlayClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
