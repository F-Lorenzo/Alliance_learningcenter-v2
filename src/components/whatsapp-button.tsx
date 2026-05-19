export function WhatsAppButton() {
  const phone = "541166733590";
  const message = encodeURIComponent("Hola! Tengo una consulta sobre Alliance Learning Center.");
  const href = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
      style={{ backgroundColor: "#25D366" }}
    >
      {/* WhatsApp SVG oficial */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-8 h-8"
        fill="white"
      >
        <path d="M16.004 2C8.28 2 2 8.278 2 16c0 2.478.65 4.8 1.785 6.82L2 30l7.37-1.766A13.94 13.94 0 0 0 16.004 30C23.722 30 30 23.72 30 16S23.722 2 16.004 2zm0 25.6a11.54 11.54 0 0 1-5.88-1.607l-.42-.25-4.37 1.047 1.072-4.254-.274-.437A11.537 11.537 0 0 1 4.4 16c0-6.398 5.206-11.6 11.604-11.6 6.396 0 11.598 5.202 11.598 11.6 0 6.396-5.202 11.6-11.598 11.6zm6.37-8.674c-.35-.175-2.07-1.02-2.39-1.136-.32-.117-.554-.175-.787.174-.233.35-.904 1.137-1.108 1.37-.204.234-.408.263-.758.088-.35-.175-1.477-.544-2.814-1.736-1.04-.928-1.742-2.074-1.946-2.424-.204-.35-.022-.539.153-.713.158-.156.35-.408.525-.612.175-.204.233-.35.35-.583.116-.234.058-.44-.03-.613-.087-.175-.787-1.895-1.078-2.595-.284-.683-.572-.59-.787-.6l-.67-.012c-.233 0-.612.087-.932.438-.32.35-1.22 1.193-1.22 2.91 0 1.718 1.25 3.378 1.424 3.612.175.233 2.46 3.753 5.96 5.264.833.36 1.484.574 1.99.735.836.266 1.597.228 2.198.138.67-.1 2.07-.846 2.362-1.664.29-.817.29-1.517.203-1.664-.086-.146-.32-.233-.67-.408z" />
      </svg>
    </a>
  );
}
