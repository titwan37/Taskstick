# Taskstick : transformer le tableau d’idées en véritable copilote du TDAH

Mon avis : Taskstick ne doit pas devenir une application de productivité de plus. Elle doit devenir un exosquelette cognitif visuel. Son rôle est de t'aider à sortir les idées de ta tête, comprendre ce qui compte, commencer sans te sentir submergé et retrouver le fil après une interruption.

Ta vision initiale est particulièrement intéressante : le tableau spatial, les Post-it, les regroupements, les arbres de dépendances et l'agenda forment déjà une bonne base conceptuelle. Les documents techniques vont dans cette direction, avec Angular, Mermaid, Monaco et un futur graphe de tâches unifié.&#x20;

## 1. Le concept produit : Taskstick Flow

Je donnerais à Taskstick une identité de spatial thinking & executive-function copilot : un espace de pensée vivant qui transforme les intentions en actions concrètes.

### L'expérience utilisateur idéale

## TASKSTICK

Ton espace de pensée

Auto-save

CAPTURE RAPIDE

Qu'est-ce qui te passe par la tête ?

Ex. : préparer les documents administratifs…

&#x20;Raccourci clavier

&#x20;Dictée

&#x20;Coller

Le Mur

Voir et relier les idées.

Maintenant

Une action, un focus.

Ma semaine

Un planning réaliste.

Copilote IA

Clarifier, découper, organiser.

Maquette conceptuelle illustrative, pas une capture de l'application existante.

Je ferais de « Maintenant » l'écran d'accueil par défaut, avec un accès permanent au Mur, au Planning et au Copilote. Les statistiques deviendraient une vue secondaire. L'utilisateur ne devrait pas avoir à explorer quatre écrans avant de comprendre ce qu'il peut faire.

## 2. Les fonctionnalités qui feraient réellement la différence

Voici les fonctionnalités que je prioriserais pour passer d'un outil de visualisation à une aide quotidienne.

| Fonctionnalité        | Expérience proposée                                             | Priorité |
| --------------------- | --------------------------------------------------------------- | -------- |
| Capture instantanée   | Texte, voix, raccourci global et sauvegarde automatique         | P0       |
| Mur spatial           | Post-It déplaçables, zones, couleurs, tags et connexions        | P0       |
| Découpage intelligent | Transformer une tâche intimidante en petites actions            | P0       |
| Mode Focus            | Une seule tâche visible, minuteur et distractions mises de côté | P0       |
| Agenda adaptatif      | Estimer la durée, prévoir des marges et reporter intelligemment | P1       |
| Relations logiques    | Dépendances, contraintes, tâches bloquées et synergies          | P1       |
| Assistant IA          | Classification, décomposition et propositions de planning       | P1       |
| FR / EN / DE          | Contenus multilingues sans perte de l'original                  | P1       |
| Dashboard personnel   | Comprendre ses progrès et son fonctionnement, sans jugement     | P2       |

P0 désigne le socle indispensable ; P1, l'extension utile dès que le socle est fiable ; P2, les fonctionnalités à ajouter après validation des usages.

### A. Un Brain Dump réellement sans friction

C'est la fonctionnalité que je développerais en premier.

Une idée apparaît ? Un raccourci ouvre un petit champ de saisie. Tu tapes ou dictes, puis l'idée est sauvegardée immédiatement dans une boîte de réception.

Pas besoin de définir sa couleur, sa priorité, sa durée ou sa catégorie.

Ensuite, Taskstick peut proposer :

- une catégorie et une couleur ;
- des tags ;
- un lien avec des idées existantes ;
- une éventuelle transformation en tâche.

Ces propositions doivent être validables en un clic. L'IA ne doit jamais modifier silencieusement ton organisation.

Je prévoirais également un bouton « Tout vider de ma tête » qui permet de capturer plusieurs dizaines d'idées d'affilée, avant de les trier plus tard.

### B. Le mur magnétique doit être un véritable outil de pensée

Tes Post-It ne doivent pas être de simples cartes décoratives.

Je garderais les couleurs, les zones et les regroupements solidaires, mais j'ajouterais trois types de liens visuels bien distincts :

Dépendance — « Il faut d'abord… »

Une tâche est bloquée tant que son véritable prérequis n'est pas satisfait.

Contrainte — « Attention, il manque… »

Document à obtenir, budget limité, réponse attendue ou délai externe.

Relation — « Ces idées vont ensemble »

Une proximité intellectuelle qui ne signifie pas nécessairement qu'une tâche bloque l'autre.

Une distinction technique importante : seules les dépendances bloquantes doivent influencer automatiquement l'état « bloqué ». Les relations d'idées ne doivent jamais empêcher l'exécution d'une tâche.

J'ajouterais aussi un bouton « Réorganiser le mur » qui aligne ou regroupe les notes selon leur couleur, leur zone ou leur thème, tout en proposant un aperçu avant de déplacer des centaines de cartes.

### C. Le Task Decomposer : combattre la paralysie devant les grandes tâches

Exemple :

### Tâche initiale

Préparer un dossier administratif complexe

Trop vaste pour savoir par où commencer.

Grande tâche

PROPOSITION DU COPILOTE

1. Ouvrir le formulaire

   2 min · Action immédiatement réalisable
2. Identifier les pièces demandées

   10 min · Repérer ce qui est disponible et ce qui manque
3. Associer les documents existants

   15 min · Relier les pièces aux champs concernés
4. Lister les informations manquantes

   10 min · Préparer les demandes externes nécessaires

Concevoir cette fonction

L'IA doit produire des actions concrètes, pas seulement reformuler la tâche en sous-tâches abstraites. Elle devrait identifier le premier geste physique ou numérique à effectuer, les documents nécessaires, les dépendances et la durée estimée.

Les durées restent des estimations, pas des engagements. L'utilisateur doit pouvoir indiquer qu'une tâche paraît trop grosse et demander un nouveau découpage.

### D. Le mode Focus : le cœur du produit

Lorsqu'une tâche est choisie, un clic sur « Je commence » active un mode qui masque le reste.

Ce mode affiche uniquement :

- la tâche et sa définition de réussite ;
- le premier geste à effectuer ;
- un minuteur visuel de durée réglable ;
- un bouton « Mettre de côté cette idée » pour capturer une distraction ;
- un bouton « Pause » et un moyen simple de reprendre.

Le minuteur pourrait proposer 5, 15, 25 ou 45 minutes, plutôt que d'imposer une technique Pomodoro unique.

La durée et les pauses doivent être adaptées aux préférences de la personne. Les recommandations cliniques sur le TDAH mentionnent notamment l'intérêt d'adaptations environnementales, de rappels visuels et de périodes de concentration plus courtes avec pauses de mouvement lorsque cela est approprié.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.nice.org.uk\&sz=32)

NICE



Règle d'or : le mode Focus doit réduire les choix disponibles, pas ajouter de nouvelles décisions.

### E. L'agenda doit être adaptatif, pas culpabilisant

Je ne ferais pas un calendrier qui remplit chaque quart d'heure disponible. Il créerait une nouvelle source de stress dès la première journée imprévisible.

Je proposerais plutôt :

- une capacité planifiée volontairement inférieure au temps disponible ;
- des durées ajustables et des marges entre les créneaux ;
- des blocs regroupant les petites tâches administratives ;
- des tâches fixes pour les véritables rendez-vous ;
- des tâches flexibles qui peuvent être déplacées ;
- un recalcul du planning lorsque la journée change.

L'application ne doit pas décréter que toutes les tâches difficiles se font le matin. Elle doit apprendre les préférences individuelles, à partir d'un retour simple : « J'avais de l'énergie », « J'étais fatigué », « Cette tâche a pris plus longtemps ».

Le report doit être une action de réorganisation, jamais une pénalité.

## 3. Architecture cible : construire un moteur cognitif, pas trois applications séparées

Les documents indiquent que Taskstick v1.2.0 est déjà une SPA Angular avec Monaco, Mermaid, plusieurs visualisations et une persistance locale par date. En revanche, le tableau magnétique interactif, le modèle de données unifié et le planning adaptatif sont encore des éléments de l'architecture cible, et non des fonctionnalités que je considérerais déjà implémentées.

Mur : HTML/CSS et SVG

Garder les Post-It en HTML pour leur édition et leur accessibilité. Utiliser SVG pour les liens, les flèches et les interactions spatiales. Conserver `panzoom` initialement, puis évaluer un moteur de graphe dédié si le besoin grandit.

Stockage : IndexedDB et Dexie.js

Persister les nœuds, les liens, les positions, les traductions et l'historique. Prévoir des versions de schéma et un adaptateur de migration pour les journaux `journal-YYYYMMDD` existants.

Logique métier déterministe

Un moteur de dépendances et un moteur d'agenda indépendants de l'IA. Les règles d'ordonnancement restent testables et prévisibles, même sans connexion à un modèle.

IA : service interchangeable

Une interface `AiProvider` permettant de choisir un modèle local via Ollama ou un modèle dans le navigateur, ou un fournisseur distant via un backend sécurisé.

Pour la synchronisation Mermaid, je recommande de commencer par un export généré depuis le graphe canonique, avec import explicite des diagrammes existants. Une synchronisation bidirectionnelle automatique entre du texte Mermaid et des objets graphiques est possible, mais plus difficile à fiabiliser qu'une simple exportation. Il vaut mieux ne pas en faire un prérequis au premier MVP.

### C. Un copilote IA hybride, avec des limites claires

Je ferais évoluer le `AiAgentService` existant par étapes.

Les quatre opérations utiles seraient :

| Fonction                     | Entrées                                               | Résultat                              |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------- |
| `decomposeTask(nodeId)`      | Une tâche et son contexte                             | Petites actions proposées             |
| `classifyInbox(nodeIds)`     | Un lot de notes                                       | Tags, catégories et couleurs proposés |
| `inferDependencies(nodeIds)` | Plusieurs tâches                                      | Liens candidats, avec justification   |
| `suggestSchedule(week)`      | Disponibilités, durées, priorités et énergie déclarée | Planning proposé, modifiable          |

L'IA ne devrait pas décider seule de ce qui est urgent, interpréter toutes les contraintes comme des dépendances ou remplir automatiquement toute la semaine.

Elle doit aussi pouvoir répondre : « Il me manque une information pour te proposer une organisation fiable. »

Je conserverais les règles déterministes pour la logique critique et l'IA pour les tâches ambiguës ou sémantiques. L'organisation doit rester utilisable sans modèle génératif.

Pour le support multilingue, je garderais le français, l'anglais et l'allemand au niveau du modèle de données, pas seulement au niveau des onglets de Monaco. Les traductions générées par IA doivent être distinctes du texte original, surtout pour les courriers et démarches administratives.

Deux précautions techniques :

- Les documents mentionnent `@xenova/transformers` 2.17.2. La documentation actuelle présente `@huggingface/transformers` 3.8.1. Je traiterais le passage à la version récente comme une migration à tester, et non comme une mise à jour aveugle. Les modèles peuvent tourner localement dans le navigateur, avec des compromis de taille et de performance.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://huggingface.co\&sz=32)

  Hugging Face

  +1

- La reconnaissance vocale via `SpeechRecognition` n'est pas disponible uniformément dans tous les navigateurs, et certains moteurs peuvent envoyer l'audio à un service distant. Il faut donc une solution de secours par saisie et une indication claire des implications de confidentialité.&#x20;

  [image](https://www.google.com/s2/favicons?domain=https://developer.mozilla.org\&sz=32)

  MDN



## 4. Comment rendre l'application cool sans créer une nouvelle distraction ?

Le design doit être attractif, vivant et personnalisable, mais ne pas rivaliser avec la tâche à accomplir.

Je choisirais une interface visuelle avec un fond sombre ou clair, une palette pastel contrôlée pour les Post-It, des mouvements fluides et des retours visuels très courts lorsqu'une note s'accroche ou qu'une tâche est achevée.

Les animations et les sons seraient désactivables. Les informations importantes seraient reconnaissables sans dépendre uniquement des couleurs.

Je mettrais aussi en place trois principes de conception :

Simplicité progressive. Par défaut, seules les actions principales sont visibles. Les fonctions avancées apparaissent à la demande. C'est cohérent avec les recommandations de conception cognitive du W3C, qui soulignent l'intérêt de simplifier les écrans et de réduire les distractions.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.w3.org\&sz=32)

W3C

+2



Motivation sans punition. Pas de perte de série, de score rouge ou de message culpabilisant après une journée difficile. Valoriser le démarrage, les petits progrès et la capacité à reprendre.

Personnalisation fonctionnelle. L'utilisateur peut choisir son thème, son niveau d'animation, la durée de ses sessions, ses rappels et la quantité d'informations affichées.

L'objectif n'est pas que l'utilisateur passe davantage de temps sur Taskstick. C'est qu'il puisse en sortir pour réaliser ce qui compte.

## 5. Plan d'implémentation recommandé

Je conserverais les quatre grandes phases décrites dans ton POC, mais je changerais l'ordre des priorités : il faut démontrer que Taskstick aide réellement à passer à l'action avant d'investir beaucoup de temps dans l'IA et les visualisations avancées. FileCite ref_id="turn1file4" />

## 00

Socle et validation de l'expérience

Fondation

Définir le parcours principal, clarifier les états des tâches, fixer les modèles TypeScript et tester une maquette sur des scénarios réels : idée soudaine, tâche administrative complexe, interruption et reprise.

Livrable : spécification fonctionnelle courte, parcours UX et critères d'acceptation.

## 01

Capture + TaskstickStore + Mur magnétique

MVP prioritaire

Mettre en place le stockage structuré avec Dexie, la migration des journaux existants, la sauvegarde automatique, le mur interactif, les tags, les couleurs, les raccourcis et Undo/Redo.

Critère de réussite : enregistrer une idée instantanément et la retrouver sans perte.

## 02

Graphe et relations logiques

Ajouter les liens SVG, les relations typées, le calcul des tâches bloquées, la détection des cycles et les regroupements. Générer les vues Mermaid à partir des données unifiées.

Critère de réussite : le regroupement visuel et les relations de dépendance ne se contredisent pas.

## 03

Mode Focus et planning hebdomadaire

Construire la vue « Maintenant », le minuteur, la capture des distractions, les petites étapes réalisables, puis le calendrier avec créneaux flexibles, marges et reports simples.

Critère de réussite : une tâche peut être choisie, démarrée, interrompue et reprise sans perdre le contexte.

## 04

Copilote IA et multilingue complet

Ajouter le découpage de tâches, la classification par lot, les suggestions de dépendances, l'optimisation de planning et les traductions FR / EN / DE. Déporter les traitements lourds dans des Web Workers lorsqu'ils risquent de bloquer l'interface.

Critère de réussite : les suggestions réduisent le travail d'organisation sans introduire de modifications imprévues.

## 05

Validation, accessibilité et fiabilité

Tester les parcours de bout en bout, les migrations, les erreurs de traduction, le fonctionnement hors ligne, les petits écrans, le clavier et les préférences de réduction des animations. Mesurer les frictions avec de vrais usages.

Critère de réussite : Taskstick reste fiable les jours où l'utilisateur est débordé, et pas seulement lorsqu'il est motivé.

L'ordre compte davantage que le nombre de fonctions. Je ne lancerais pas un grand chantier IA en parallèle de toutes les évolutions du mur. Je stabiliserais d'abord le modèle de données et le parcours quotidien, puis je ferais progresser les capacités de l'assistant.

## 6. Comment savoir si Taskstick aide vraiment ?

Je suivrais quelques indicateurs utiles plutôt que de simplement compter les cartes et les tâches terminées.

| Indicateur                              | Ce qu'il permet de comprendre                                               |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Temps moyen de capture                  | La saisie est-elle réellement sans friction ?                               |
| Temps entre choix et démarrage          | Taskstick réduit-elle la difficulté de se lancer ?                          |
| Nombre de tâches démarrées et terminées | Le système facilite-t-il l'action, pas seulement l'organisation ?           |
| Écart entre durée estimée et réelle     | Les estimations s'améliorent-elles avec le temps ?                          |
| Tâches reportées ou abandonnées         | Le planning est-il réaliste ou trop chargé ?                                |
| Facilité ressentie à reprendre          | L'utilisateur retrouve-t-il rapidement le contexte après une interruption ? |

Je commencerais par un pilote de deux semaines, avec un petit groupe de personnes volontaires concernées par le TDAH, ou par tes propres usages si c'est d'abord un outil personnel. Les retours doivent permettre d'améliorer le produit, pas d'évaluer ou de diagnostiquer les utilisateurs.

Les mesures devraient être locales et facultatives autant que possible, avec une séparation claire entre les données personnelles et les statistiques de test.

## Ma recommandation finale

Si je devais choisir les trois investissements qui changeraient le plus la valeur de Taskstick, ce seraient :

1. Le TaskstickStore, afin que toutes les vues utilisent enfin les mêmes données structurées.
2. Le duo Capture instantanée + Mode Focus, pour réduire l'écart entre une pensée et une action commencée.
3. Le Task Decomposer, pour transformer les tâches intimidantes en premières étapes évidentes.

C'est ce trio qui doit former le cœur de la première version réellement utile. Le graphe complet, le planning adaptatif et le copilote IA pourront ensuite s'appuyer sur cette fondation.

La prochaine étape de développement la plus logique est de convertir cette feuille de route en `tasks.json`, avec des tâches atomiques, leurs dépendances, leurs critères d'acceptation, leurs tests et les prérequis techniques. Ce fichier pourra piloter un agent de codage progressivement, sans qu'il tente de réaliser toute l'architecture cible en une seule fois.