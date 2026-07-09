import MarketingImage from '@/components/marketing/MarketingImage';

export default function PhoneMockup({ className = '' }) {
  return (
    <div className={`relative mx-auto w-full max-w-sm lg:max-w-[26rem] ${className}`}>
      <div
        className="absolute -inset-5 rounded-[2.5rem] bg-[var(--stocksense-brand-soft)] blur-2xl"
        aria-hidden="true"
      />
      <div className="relative rounded-[2rem] border border-gray-200 bg-gray-950 p-2 shadow-2xl">
        <MarketingImage
          imageKey="heroApp"
          alt="WhereKeep mobile app preview showing a batteries search"
          priority
          className="aspect-[9/16] rounded-[1.5rem] border-gray-800 shadow-none"
          imageClassName="opacity-95"
          sizes="(min-width: 1024px) 340px, 82vw"
        />
      </div>
    </div>
  );
}
