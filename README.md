# Itiraf Panel Botu

Node.js `v20.19.6` ile uyumlu, `discord.js` tabanli, canvas tasarimli bir Discord itiraf panel botu.

## Ozellikler

- `/panel-kur` ile panel kurulum
- Canvas tabanli panel ve itiraf karti
- Buton -> kategori -> modal -> anonim itiraf akisi
- Begen, begenmeme ve raporlama sistemi
- Yorumlar icin otomatik `alt baslik / thread` olusturma
- Moderasyon log kanali
- 20 saniyede bir donen `Streaming` durumu
- Tek config dosyasi

## Kurulum

1. `npm install`
2. `config/config.json` icindeki placeholder alanlari kendi degerlerinle doldur
3. `npm start`

## Config

Tek config dosyasi vardir:

```json
{
  "token": "BOT_TOKEN_BURAYA",
  "guildId": "SUNUCU_ID_BURAYA",
  "panelChannelId": "PANEL_KANAL_ID_BURAYA",
  "confessionChannelId": "ITIRAF_KANAL_ID_BURAYA",
  "logChannelId": "LOG_KANAL_ID_BURAYA"
}
```

Bot placeholder degerlerle acilmaz. Discord ID alanlari sayisal olmak zorundadir.
Gercek tokeni buraya yazip tekrar public repo'ya pushlama.

## Gerekli Yetkiler

- `View Channels`
- `Send Messages`
- `Attach Files`
- `Use Slash Commands`
- `Manage Messages`
- `Create Public Threads`
- `Send Messages in Threads`

## Komut

- `/panel-kur`

Bu komut panel mesajini yollar. Daha once panel kurulmussa mevcut mesaj guncellenir.

## Yayin Notu

- Repo icindeki gercek token ve test verileri temizlendi.
- Yine de daha once bu klasorde gercek token kullandiysan Discord Developer Portal uzerinden tokeni yenilemen iyi olur.
- `data/confessions.json` sifirlandi.
- `node_modules` ve runtime veri dosyasi `.gitignore` icindedir.
