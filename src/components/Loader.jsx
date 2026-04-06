function LoaderContent() {
  return (
    <>
      <div className="v2-cube">
        <div className="v2-face" />
        <div className="v2-face" />
        <div className="v2-face" />
        <div className="v2-icon">
          <svg viewBox="0 0 24 24">
            <path d="M5.5 12.5 L9.5 16.5 L18.5 6.5" />
          </svg>
        </div>
        <div className="v2-scan" />
        <div className="v2-items">
          <div className="v2-item"><div className="v2-item-check" /><div className="v2-item-line" /></div>
          <div className="v2-item"><div className="v2-item-check" /><div className="v2-item-line" /></div>
          <div className="v2-item"><div className="v2-item-check" /><div className="v2-item-line" /></div>
          <div className="v2-item"><div className="v2-item-check" /><div className="v2-item-line" /></div>
        </div>
      </div>
      <span className="v2-brand">Make Your List</span>
      <span className="v2-sub">Chargement</span>
      <div className="v2-dots"><div className="v2-dot" /><div className="v2-dot" /><div className="v2-dot" /></div>
    </>
  )
}

export default function Loader({ fullScreen = false }) {
  const wrapper = fullScreen
    ? "min-h-screen bg-background flex items-center justify-center"
    : "flex-1 flex items-center justify-center"

  return (
    <div className={wrapper}>
      <div className="v2-wrap">
        <LoaderContent />
      </div>
    </div>
  )
}
