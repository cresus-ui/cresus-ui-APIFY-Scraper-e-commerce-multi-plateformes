# Utiliser l'image de base Apify avec Node.js et Playwright
FROM apify/actor-node-playwright-chrome:18

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production \
    && npm cache clean --force

# Copier le code source
COPY . ./

# Installer les navigateurs Playwright
RUN npx playwright install chromium

# Définir le point d'entrée
CMD npm start