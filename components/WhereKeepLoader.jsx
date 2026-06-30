export default function WhereKeepLoader({
  label = "Finding your inventory...",
  detail = "Checking every location, area, and category.",
}) {
  return (
    <div className="wherekeep-loader" role="status" aria-live="polite">
      <svg
        className="wherekeep-loader__mark"
        viewBox="0 0 160 160"
        aria-hidden="true"
      >
        <circle className="wherekeep-loader__halo" cx="80" cy="80" r="54" />
        <circle className="wherekeep-loader__pulse" cx="80" cy="92" r="30" />

        <g className="wherekeep-loader__shelf">
          <path className="wherekeep-loader__shelf-line" d="M39 112H121" />
          <path
            className="wherekeep-loader__shelf-line wherekeep-loader__shelf-line--short"
            d="M52 127H108"
          />
          <rect
            className="wherekeep-loader__box wherekeep-loader__box--left"
            x="49"
            y="82"
            width="22"
            height="24"
            rx="5"
          />
          <rect
            className="wherekeep-loader__box wherekeep-loader__box--right"
            x="89"
            y="82"
            width="22"
            height="24"
            rx="5"
          />
          <rect
            className="wherekeep-loader__box wherekeep-loader__box--center"
            x="69"
            y="72"
            width="22"
            height="34"
            rx="5"
          />
        </g>

        <g className="wherekeep-loader__pin">
          <path
            className="wherekeep-loader__pin-body"
            d="M80 23c-24 0-43 19-43 43 0 31 37 72 40 76a4 4 0 0 0 6 0c3-4 40-45 40-76 0-24-19-43-43-43Z"
          />
          <circle className="wherekeep-loader__pin-center" cx="80" cy="66" r="17" />
          <path className="wherekeep-loader__check" d="M72 66l6 6 12-14" />
        </g>
      </svg>

      <div className="wherekeep-loader__text">
        <p className="wherekeep-loader__label">{label}</p>
        <p className="wherekeep-loader__detail">{detail}</p>
      </div>
    </div>
  );
}
