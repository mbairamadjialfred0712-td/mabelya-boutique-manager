VitePWA({
  registerType: "autoUpdate",
  devOptions: {
    enabled: true
  },
  manifest: {
    name: "Mabelya Fashion",
    short_name: "Mabelya",
    description: "Application de gestion Mabelya",
    theme_color: "#000000",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  }
})