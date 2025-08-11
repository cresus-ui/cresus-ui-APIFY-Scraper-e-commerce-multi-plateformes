#!/usr/bin/env node

/**
 * Script de build pour tester l'actor localement avant déploiement
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Vérification de la configuration de l\'actor...');

// Vérifier les fichiers essentiels
const requiredFiles = [
    'package.json',
    'apify.json',
    'Dockerfile',
    'src/main.js'
];

let allFilesExist = true;

for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Fichier manquant: ${file}`);
        allFilesExist = false;
    } else {
        console.log(`✅ ${file}`);
    }
}

if (!allFilesExist) {
    console.error('❌ Des fichiers essentiels sont manquants!');
    process.exit(1);
}

// Vérifier package.json
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts || !packageJson.scripts.start) {
        console.error('❌ Script "start" manquant dans package.json');
        process.exit(1);
    }
    
    if (!packageJson.dependencies || !packageJson.dependencies.apify) {
        console.error('❌ Dépendance "apify" manquante dans package.json');
        process.exit(1);
    }
    
    console.log('✅ package.json valide');
} catch (error) {
    console.error('❌ Erreur lors de la lecture de package.json:', error.message);
    process.exit(1);
}

// Vérifier apify.json
try {
    const apifyJson = JSON.parse(fs.readFileSync('apify.json', 'utf8'));
    
    if (!apifyJson.name) {
        console.error('❌ Nom de l\'actor manquant dans apify.json');
        process.exit(1);
    }
    
    console.log('✅ apify.json valide');
} catch (error) {
    console.error('❌ Erreur lors de la lecture de apify.json:', error.message);
    process.exit(1);
}

// Vérifier la structure des scrapers
const scrapersDir = 'src/scrapers';
if (fs.existsSync(scrapersDir)) {
    const scrapers = fs.readdirSync(scrapersDir).filter(file => file.endsWith('.js'));
    console.log(`✅ ${scrapers.length} scrapers trouvés: ${scrapers.join(', ')}`);
} else {
    console.error('❌ Dossier src/scrapers manquant');
    process.exit(1);
}

console.log('\n🎉 Configuration de l\'actor validée avec succès!');
console.log('\n📋 Étapes suivantes pour déployer sur Apify:');
console.log('1. Connectez-vous à votre compte Apify');
console.log('2. Créez un nouvel actor ou utilisez un existant');
console.log('3. Liez ce repository GitHub à votre actor');
console.log('4. Déclenchez un build depuis l\'interface Apify');
console.log('\n💡 Assurez-vous que votre repository GitHub est public ou que Apify a accès à votre repository privé.');