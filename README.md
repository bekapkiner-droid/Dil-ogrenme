# filiz

Türkçe konuşanlar için dil bahçesi. İngilizce, İspanyolca ve Almanca öğretir.
Kelimeler bitkiye dönüşür, can ve seri yoktur.

- `index.html`: tek dosyalı uygulama, tarayıcıda açılır.
- `scripts/build.js`: `index.html` dosyasını `www/` altında uygulama biçimine çevirir.
- `capacitor.config.json`: Android uygulaması ayarı (Capacitor, yerel bildirimler).
- `.github/workflows/android.yml`: GitHub Actions, debug APK üretir.
- `test/`: Playwright duman testleri.

## Android APK almak

1. GitHub'da Actions sekmesine gir, "Android APK" iş akışını seç, "Run workflow" de.
2. İş bitince sayfanın altındaki Artifacts bölümünden `filiz-debug-apk` dosyasını indir (zip içinde `app-debug.apk`).
3. Telefona kopyalayıp aç. "Bilinmeyen kaynaklardan yükle" izni gerekir.

Xiaomi (HyperOS) için: Ayarlar, Uygulamalar, Filiz içinde "Otomatik başlat"ı aç, pil tasarrufunu "Kısıtlama yok" yap. Aksi halde bildirimler gecikebilir.
