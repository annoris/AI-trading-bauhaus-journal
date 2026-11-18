"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#111111",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24 }}>
          <p>Trading Bauhaus</p>
          <h1>The journal could not load</h1>
          <p style={{ lineHeight: 1.6 }}>
            Try again to reload the application. If you were saving a change, check whether it was
            saved before submitting it again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "12px 20px", cursor: "pointer", font: "inherit" }}
          >
            Try again
          </button>{" "}
          <a href="/" style={{ color: "inherit", marginLeft: 12 }}>
            Go to home
          </a>
        </main>
      </body>
    </html>
  );
}
