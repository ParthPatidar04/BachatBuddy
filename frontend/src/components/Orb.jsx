// The glossy "AI" sphere from the design reference
export default function Orb({ size = 48, className = '', float = false }) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full ${float ? 'animate-float' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 26%, #ffffff 0%, #e0e7ff 12%, #a5b4fc 36%, #c084fc 62%, #f9a8d4 84%, #7dd3fc 100%)',
        boxShadow: `inset -${size / 8}px -${size / 6}px ${size / 3}px rgba(99,102,241,.4), 0 ${size / 6}px ${size / 2}px rgba(139,92,246,.35)`,
      }}
    />
  );
}