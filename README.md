# Simulateur de trafic ferroviaire ERTMS/ETCS

> *Développé dans le cadre d'une candidature de stage en novembre 2025. Le but était de comprendre les concepts ferroviaires et de les apprendre par la pratique, pas de faire un produit parfait. Si vous voyez des trucs à améliorer, je suis preneur !*


J'ai codé un simulateur de trains basé sur le système **ERTMS/ETCS** (European Rail Traffic Management System / European Train Control System)[[1]](#ref-1). 

Le principe : une ligne découpée en cantons, deux trains qui circulent, et un système qui gère la sécurité (RBC + ATP). Le tout s'affiche en temps réel avec les positions des trains, les feux de signalisation (vert/jaune/rouge), et les règles de sécurité qui s'appliquent automatiquement.

Les règles et calculs viennent des principes ferroviaires standards[[2]](#ref-2)[[3]](#ref-3).

## Pourquoi ce projet ?

J'ai postulé pour un stage chez Compagnie des Signaux sur la virtualisation de simulateurs ferroviaires. Le problème ? Je n'y connaissais pas grand chose en systèmes ferroviaires. Donc au lieu de juste lire de la doc, j'ai décidé de construire mon propre simulateur pour comprendre les concepts.

Résultat : j'ai consacré quelque temps à décortiquer ERTMS, ATP, RBC et tout le reste. Ce repo, c'est le fruit de cet apprentissage rapide.

## Ce que ça fait

Le simulateur montre 2 trains qui circulent sur une ligne avec 4 sections (qu'on appelle des "cantons" en ferroviaire). Les trains accélèrent, ralentissent, et surtout : ils s'arrêtent automatiquement s'ils risquent de se percuter. C'est le principe de l'ATP (Automatic Train Protection).

**En gros :**
- Chaque train a sa propre couleur pour pouvoir les suivre
- Les feux passent au rouge/jaune/vert selon la situation
- Si un train approche un canton occupé → freinage automatique
- Tout est loggé en temps réel dans un journal d'événements
- Des scénarios de test pour vérifier que ça marche

## Installation
```bash
git clone https://github.com/czechmohammed/railway-ertms.git
cd railway-ertms-simulator
npm install
npm start
```

Ça va ouvrir le simulateur sur `http://localhost:3000`

## Les concepts ferroviaires que j'ai appris

### ERTMS (European Rail Traffic Management System)

C'est LE système qui remplace tous les vieux systèmes nationaux incompatibles. Avant ERTMS, chaque pays avait son propre système (TVM en France, LZB en Allemagne, etc.) et les trains devaient s'arrêter aux frontières pour changer d'équipement[[1]](#ref-1)[[4]](#ref-4). Avec ERTMS, un train peut circuler de Paris à Berlin sans problème.

Il y a 3 niveaux :
- **Niveau 1** : Des balises au sol + signaux classiques[[5]](#ref-5)[[6]](#ref-6)
- **Niveau 2** : Communication radio en continu (ce que j'ai simulé)[[2]](#ref-2)[[5]](#ref-5)
- **Niveau 3** : Positionnement satellite (pas encore déployé)

Mon simulateur s'inspire du Niveau 2 : les balises donnent des repères et des limites de vitesse, le RBC gère les autorisations de mouvement[[2]](#ref-2)[[4]](#ref-4).

### Le Cantonnement

Concept simple mais fondamental : une section de voie = un seul train maximum. Point. C'est la base de la sécurité ferroviaire depuis 150 ans et ça marche toujours[[3]](#ref-3)[[7]](#ref-7).

Dans mon simulateur :
```
Canton 1: Train présent = feu rouge
Canton 2: Libre mais canton d'avant occupé = feu jaune  
Canton 3: Complètement libre = feu vert
```

Voilà le code qui gère ça :
```javascript
setCantons(prevCantons => {
  return prevCantons.map(canton => {
    const occupied = trains.some(train => 
      train.position >= canton.start && 
      train.position < canton.end
    );
    
    // calculer signal
    const nextCanton = prevCantons.find(c => c.start === canton.end);
    let signal = 'green';
    
    if (occupied) {
      signal = 'red';
    } else if (nextCanton && nextCanton.occupied) {
      signal = 'yellow';
    }
    
    return { ...canton, occupied, signal };
  });
});
```

### ATP (Automatic Train Protection)

C'est le système de sécurité qui prend le contrôle si le conducteur ne réagit pas (ou s'endort, ou a un malaise). Si le train approche un signal rouge, l'ATP déclenche le freinage d'urgence automatiquement[[2]](#ref-2)[[8]](#ref-8). Le conducteur ne peut même pas l'annuler.

J'ai implémenté ça avec une logique simple :
```javascript
// logique atp
if (nextCanton && nextCanton.signal === 'red') {
  newSpeed = Math.max(0, newSpeed - 5);
  if (newSpeed === 0 && train.speed > 0) {
    addLog(`${train.name} - arrêt atp (signal rouge)`, 'warning');
  }
} else if (nextCanton && nextCanton.signal === 'yellow') {
  newSpeed = Math.min(60, newSpeed);
  if (train.speed > 60) {
    addLog(`${train.name} - réduction vitesse atp (signal jaune)`, 'warning');
  }
}
```

### RBC (Radio Block Center)

C'est l'ordinateur central qui surveille tous les trains d'une zone[[2]](#ref-2)[[4]](#ref-4). Il calcule en temps réel jusqu'où chaque train peut avancer en sécurité (la "Movement Authority"). Dans un vrai système, le RBC communique avec les trains par radio GSM-R.

Mon simulateur simule un RBC basique qui :
- Surveille la position des 2 trains
- Met à jour l'état des cantons
- Calcule les autorisations de mouvement dynamiquement

### Eurobalises

Les **Eurobalises** sont des balises fixes sur la voie qui stockent des données (position, profil, limites de vitesse)[[2]](#ref-2)[[6]](#ref-6). Dans les systèmes réels, certaines balises peuvent transmettre des restrictions temporaires[[6]](#ref-6).

J'en ai placé 4 sur la ligne :
```javascript
const [balises] = useState([
  { position: 150, speedLimit: 80, type: 'Eurobalise' },
  { position: 400, speedLimit: 120, type: 'Eurobalise' },
  { position: 750, speedLimit: 60, type: 'Eurobalise' },
  { position: 1050, speedLimit: 100, type: 'Eurobalise' }
]);
```

Quand un train passe dessus, l'ATP applique la nouvelle limite de vitesse.

### Autorisation de mouvement (MA)

L'Autorisation de Mouvement, c'est la distance jusqu'où un train peut aller selon les contraintes d'infrastructure[[1]](#ref-1)[[9]](#ref-9). En ERTMS Niveau 2, le RBC envoie la MA au train via radio[[1]](#ref-1)[[2]](#ref-2).

Dans le simulateur, la MA est calculée dynamiquement par le RBC en fonction de la position des autres trains. Si un train est devant, la MA s'arrête 150m avant lui (marge de sécurité pour le freinage). Sinon, elle va jusqu'à la fin de la ligne.
```javascript
// calculer MA dynamique basée sur les autres trains
const calculateMA = (train, allTrains) => {
  // trouver le prochain train devant
  const trainsAhead = allTrains
    .filter(t => t.id !== train.id && t.position > train.position)
    .sort((a, b) => a.position - b.position);
  
  if (trainsAhead.length > 0) {
    const nextTrain = trainsAhead[0];
    // MA = distance jusqu'au prochain train - marge de sécurité (150m)
    const dynamicMA = Math.max(100, nextTrain.position - train.position - 150);
    return dynamicMA;
  }
  
  // si pas de train devant, MA jusqu'à la fin de la ligne
  return Math.max(100, 1200 - train.position);
};

// vérification MA dynamique
if (train.position + 50 > train.position + dynamicMA) {
  newSpeed = Math.max(0, newSpeed - 3);
  if (newSpeed === 0 && train.speed > 5) {
    addLog(`${train.name} - arrêt limite ma`, 'warning');
  }
}
```

La MA est recalculée à chaque tick de simulation et mise à jour en temps réel dans l'interface.

### La physique du freinage

Au début j'avais fait un truc super simple : vitesse constante, pas de freinage progressif. Résultat : les trains s'arrêtaient instantanément comme dans un jeu vidéo des années 90. J'ai dû apprendre les formules de distance de freinage[[10]](#ref-10) :

$$d = \frac{v^{2}}{2\,\mu g}$$

À 100 km/h avec des conditions normales, un train met environ 130 mètres à s'arrêter[[10]](#ref-10). Ça aide pour calculer les marges de sécurité. Dans le code, j'ajuste la vitesse par petits incréments (+2 km/h pour accélérer, -3 à -5 km/h pour freiner).

## Structure du code

Le cœur du simulateur, c'est une boucle qui tourne toutes les 100ms (10 fois par seconde) :
1. Calculer nouvelles positions des trains
2. Vérifier si des cantons sont occupés
3. Mettre à jour les signaux
4. Vérifier si ATP doit intervenir
5. Re-dessiner tout sur le Canvas
```javascript
// calcul nouvelle position
newPosition = train.position + (newSpeed / 3600) * 100;

// boucle si fin de ligne
if (newPosition > 1200) {
  newPosition = 50;
  addLog(`${train.name} - retour au départ`, 'info');
}
```

La ligne fait 1200m au total, divisée en 4 cantons de 300m chacun.

## Les scénarios de test

J'ai codé 4 scénarios différents pour vérifier que tout fonctionne :

### 1. Test rattrapage

Un train rapide (Train 1 à 50m, 100 km/h) suit un train plus lent (Train 2 à 400m, 40 km/h) sur la même voie. Le simulateur doit ralentir ou arrêter Train 1 pour empêcher le rattrapage, conformément au principe qu'aucun train ne peut entrer dans un canton occupé[[3]](#ref-3).
```javascript
case 'rattrapage':
  setTrains([
    { id: 1, position: 50, speed: 100, maxSpeed: 120, color: '#ef4444', name: 'Train 1', ma: 1000 },
    { id: 2, position: 400, speed: 40, maxSpeed: 60, color: '#3b82f6', name: 'Train 2', ma: 800 }
  ]);
  addLog('scénario chargé: test rattrapage - train 1 doit ralentir', 'info');
  break;
```

### 2. Test balise 60km/h

Un train passe sur une balise programmée à 60 km/h. Le simulateur détecte la balise et applique la limite[[2]](#ref-2)[[6]](#ref-6).

### 3. Test limite MA

Un train est placé près de la fin de son Autorisation de Mouvement. Ça montre le ralentissement progressif quand il approche de sa limite[[1]](#ref-1)[[9]](#ref-9).

### 4. Config normale

État initial par défaut, trains à l'arrêt aux extrémités. Utile pour recommencer.

Pour tester : cliquer sur un scénario puis sur "Démarrer". Le simulateur affiche en temps réel les positions, les feux et loggue toutes les actions de sécurité.

## Le journal d'événements

Tout ce qui se passe est loggé avec horodatage :
```javascript
const addLog = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 15));
};
```

Exemples de logs :
- "canton 2 occupé"
- "Train 1 - arrêt atp (signal rouge)"
- "Train 2 - balise détectée: 60 km/h"
- "Train 1 - freinage approche limite ma"

## Technologies utilisées

- **React 18** pour l'interface
- **Canvas API** pour le rendu graphique
- **JavaScript** pour toute la logique
- **Tailwind CSS** pour le style


## Ce qui manque (pas eu le temps, je dois postuler le plus vite possible)

- [ ] Plus de trains (passer de 2 à 10)
- [ ] Plusieurs lignes avec des aiguillages
- [ ] Des incidents simulés (panne, obstacle sur voie)
- [ ] Une vraie courbe de freinage progressive
- [ ] Mode pas-à-pas pour déboguer
- [ ] Export des logs en CSV

## Concepts clés retenus

Le simulateur intègre plusieurs concepts du ferroviaire moderne :

- **Cantonnement ferroviaire** : une section par train à la fois[[3]](#ref-3)[[7]](#ref-7)
- **ATP** : validation automatique de vitesse et arrêt d'urgence[[2]](#ref-2)[[8]](#ref-8)
- **RBC** : unité centrale en ETCS N2 qui calcule les Autorisations de Mouvement[[2]](#ref-2)[[4]](#ref-4)
- **Eurobalises ETCS** : marqueurs au sol transmettant profil de voie et restrictions[[2]](#ref-2)[[6]](#ref-6)
- **Formule de freinage** : $d = v^{2}/(2\mu g)$ pour estimer la distance de freinage[[10]](#ref-10)
- **Niveaux ERTMS/ETCS** : distinction du niveau radio continu (Level 2) du niveau 1 à balises ponctuelles[[2]](#ref-2)[[5]](#ref-5)

## Sources

<a id="ref-1"></a>[1] European Rail Traffic Management System - Wikipedia  
<https://en.wikipedia.org/wiki/European_Rail_Traffic_Management_System>

<a id="ref-2"></a>[2] Subsystems and Constituents of the ERTMS - Mobility and Transport  
<https://transport.ec.europa.eu/transport-modes/rail/ertms/what-ertms-and-how-does-it-work/subsystems-and-constituents-ertms_en>

<a id="ref-3"></a>[3] Les systèmes d'espacement des trains | OSRD  
<https://osrd.fr/fr/docs/railway-wiki/signalling/spacing/>

<a id="ref-4"></a>[4] ERTMS: High-performance, European-standard signalling | SNCF Réseau  
<https://www.sncf-reseau.com/en/tomorrows-network/ertms-high-performance-european-standard-signalling>

<a id="ref-5"></a>[5] European Train Control System - Wikipedia  
<https://en.wikipedia.org/wiki/European_Train_Control_System>

<a id="ref-6"></a>[6] Eurobalise - Wikipedia  
<https://en.wikipedia.org/wiki/Eurobalise>

<a id="ref-7"></a>[7] Absolute block signalling - Wikipedia  
<https://en.wikipedia.org/wiki/Absolute_block_signalling>

<a id="ref-8"></a>[8] Automatic train protection - Wikipedia  
<https://en.wikipedia.org/wiki/Automatic_train_protection>

<a id="ref-9"></a>[9] Modèle pour création de documents art 10 du décret 2006-1279  
<https://www.securite-ferroviaire.fr/sites/default/files/reglementations/pdf/2023-03/rfn-ig-se-02-c-00-num-002-v4.pdf>

<a id="ref-10"></a>[10] Braking distance - Wikipedia  
<https://en.wikipedia.org/wiki/Braking_distance>

---

*Développé dans le cadre d'une candidature de stage en novembre 2025. Le but était de comprendre les concepts ferroviaires et de les apprendre par la pratique, pas de faire un produit parfait. Si vous voyez des trucs à améliorer, je suis preneur !*