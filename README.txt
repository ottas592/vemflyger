FLIGHT WALL PWA

Filerna i denna mapp ska publiceras tillsammans på en webbserver med HTTPS.

Snabbast med GitHub Pages:
1. Skapa ett nytt offentligt GitHub-repository.
2. Ladda upp hela innehållet i denna mapp till repositoryts rot.
3. Öppna Settings > Pages.
4. Välj Deploy from a branch, branch main och mappen /(root).
5. Öppna den publicerade HTTPS-adressen på surfplattan i Chrome.
6. Välj Installera app eller Lägg till på startskärmen.

Viktigt:
- PWA-installation och service worker fungerar normalt bara via HTTPS eller localhost.
- Liveflygdata kräver internetanslutning. Appskalet kan starta från cache, men aktuella flygplan kan inte hämtas offline.
- Appen är inställd på liggande läge och försöker använda helskärm/standalone.
