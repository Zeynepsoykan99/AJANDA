---
layout: default
permalink: /privacy/fr/
title: "AJANDA — Politique de Confidentialité"
lang: fr
---

# AJANDA — Politique de Confidentialité

**Dernière mise à jour :** 2 octobre 2026

[Türkçe](/AJANDA/privacy/) · [English](/AJANDA/privacy/en/) · [Deutsch](/AJANDA/privacy/de/) · [Español](/AJANDA/privacy/es/)

## Résumé

AJANDA n'a pas de serveur. Vous n'avez pas besoin de créer un compte, l'application ne vous demande aucune donnée d'identification et n'enregistre pas ce que vous écrivez sur un serveur. Votre agenda, votre journal, vos notes, vos dessins, vos autocollants et vos enregistrements vocaux restent sur votre appareil.

Il existe **deux exceptions** à cela, et toutes deux servent uniquement à transformer ce que vous écrivez en texte : la **reconnaissance d'écriture** et la **conversion des notes vocales en texte**. Les deux sont détaillées ci-dessous.

---

## 1. Où vos données sont conservées

Tout ce que vous créez est stocké dans la mémoire de votre appareil :

- Pages d'agenda, listes de tâches, pages de journal et de carnets
- Vos dessins, zones de texte, autocollants et couvertures
- Vos enregistrements vocaux (sous forme de fichiers dans le dossier de l'application sur votre appareil)
- Votre thème et votre langue, vos rappels

Nous ne pouvons pas accéder à ces données. Elles ne sont pas téléversées sur un serveur, ne sont pas sauvegardées et ne sont pas transférées vers un autre appareil. **Si vous supprimez l'application de votre appareil, toutes ces données sont supprimées.**

---

## 2. Reconnaissance d'écriture

Pour que votre écriture puisse être transformée en texte que vous pouvez rechercher, les **coordonnées** de vos tracés, la taille de la zone d'écriture et la langue que vous avez choisie sont envoyées par internet au **service de reconnaissance d'écriture de Google** (`inputtools.google.com`), où elles sont converties en texte.

**Ce qui n'est pas envoyé :** votre nom, des informations de compte, un identifiant d'appareil ou tout autre identifiant. Seules les coordonnées des tracés sont envoyées. Le texte obtenu est enregistré **uniquement sur votre appareil**.

Cette conversion fonctionne de deux manières :

- **D'elle-même :** dans les sections **Mon agenda** et **À faire**, lorsque vous écrivez à la main, elle s'exécute en arrière-plan afin que ce que vous avez écrit puisse être trouvé dans la recherche.
- **Lorsque vous le demandez :** lorsque vous sélectionnez une écriture avec l'outil lasso et choisissez « convertir en texte ». Dans les sections **Mon journal** et **Mes notes**, la conversion n'a lieu **que de cette façon**, c'est-à-dire uniquement lorsque vous la demandez explicitement — rien n'y est envoyé de lui-même.

La première fois que vous utilisez cette fonction, un avis est affiché dans l'application.

Les coordonnées des tracés sont ce que vous avez écrit : assemblées, elles permettent de redessiner votre écriture. C'est pourquoi, **si vous souhaitez garder quelque chose privé, nous vous recommandons de ne l'écrire à la main qu'en ayant cela en tête.**

---

## 3. Conversion des notes vocales en texte

Pour que vos notes vocales puissent être transformées en texte que vous pouvez rechercher, votre enregistrement est transmis à la **fonction de reconnaissance vocale fournie par le système d'exploitation de votre appareil**. Cette fonction n'est pas fournie par nous, mais par le fabricant ou la plateforme de votre appareil.

- **Sur les appareils Android :** c'est le service de reconnaissance vocale du téléphone qui s'en charge ; sur la plupart des appareils, ce service appartient à **Google**. Votre audio **peut être envoyé par internet à ce service** pour être converti en texte. Cette décision est prise par le service de votre appareil ; l'application ne peut ni la déterminer ni la constater.
- **Sur iPhone et iPad :** nous demandons que la conversion soit effectuée sur l'appareil. Toutefois, si votre appareil ne peut pas traiter seul la langue que vous avez choisie, votre audio **peut être envoyé aux serveurs d'Apple.**

**Le fichier audio que vous enregistrez est conservé uniquement sur votre appareil** ; nous ne le téléversons nulle part. Votre nom, votre compte et les informations de votre appareil ne sont pas envoyés.

La première fois que vous utilisez cette fonction, un avis est affiché dans l'application. Pour savoir comment votre audio est traité par le système d'exploitation, vous pouvez également consulter la politique de confidentialité du fabricant de votre appareil.

---

## 4. Le verrou (code PIN et authentification biométrique)

Vous pouvez verrouiller votre journal et vos carnets avec un code PIN à 4 chiffres, et les déverrouiller avec votre empreinte ou la reconnaissance faciale si votre appareil le permet.

**Ce que fait ce verrou :** votre code PIN est conservé dans la zone sécurisée protégée par le matériel de votre appareil (Keychain sur iOS, Keystore sur Android) ; il n'est **en aucun cas écrit** dans le stockage général non chiffré. Les saisies de code erronées sont limitées ; après plusieurs erreurs consécutives, le temps d'attente augmente progressivement.

**Ce que ce verrou ne fait pas — nous souhaitons le dire clairement :** le verrou est une **porte d'accès**. Il empêche d'autres personnes d'ouvrir votre carnet dans l'application, mais il **ne chiffre pas le contenu du carnet.** Une personne capable d'accéder par des moyens techniques au système de fichiers de votre appareil (par exemple sur un appareil « rooté » ou « jailbreaké », ou via une sauvegarde) pourrait lire le contenu sans avoir besoin du code.

C'est pourquoi la protection la plus importante est **le verrouillage d'écran et le chiffrement de votre appareil lui-même.** Nous vous recommandons de configurer un verrouillage d'écran sur votre appareil.

Vos données biométriques (empreinte, visage) sont traitées par le système d'exploitation ; l'application n'y accède pas et ne les conserve pas — elle reçoit seulement le résultat « authentification réussie ».

---

## 5. Rappels

Lorsque vous définissez un rappel sur vos pages, la notification est programmée **localement sur votre appareil**. Aucun enregistrement n'est créé sur un serveur, aucune infrastructure de notification à distance (push) n'est utilisée et, par conséquent, aucun identifiant tel qu'un jeton de notification n'est créé ni envoyé.

---

## 6. Export et partage

Lorsque vous exportez une page en PDF, le fichier est créé sur votre appareil et le menu de partage de votre appareil s'ouvre. C'est **vous** qui décidez où va le fichier. L'application n'envoie le fichier nulle part d'elle-même.

---

## 7. Ce que nous ne collectons pas

Nous souhaitons le préciser explicitement ; l'application **ne** :

- vous demande pas de créer un compte et ne collecte ni adresse e-mail ni numéro de téléphone
- collecte pas de données d'analyse, de statistiques d'utilisation ni de rapports d'erreur
- affiche pas de publicité et n'utilise pas d'identifiant publicitaire ou de suivi
- accède pas à votre position, vos contacts, vos photos ou votre calendrier
- vend vos données à personne et ne les partage pas à des fins marketing

---

## 8. Supprimer vos données

- Vous pouvez supprimer des pages, des notes, des enregistrements ou des carnets précis depuis l'application.
- Pour supprimer toutes vos données, il suffit de retirer l'application de votre appareil.
- Comme vous n'avez aucune donnée sur un serveur, il n'existe aucun enregistrement dont vous devriez nous demander la suppression.

La durée de conservation par Google ou Apple des données envoyées pour la conversion de l'écriture ou de la voix relève des politiques de ces entreprises ; nous n'avons aucun contrôle sur ce point.

---

## 9. Confidentialité des enfants

AJANDA s'adresse à un **public général**. L'application n'est pas conçue spécifiquement pour les enfants de moins de 13 ans et n'est pas proposée à cette tranche d'âge.

Nous ne collectons pas sciemment d'informations personnelles auprès d'enfants de moins de 13 ans — l'application ne collecte de toute façon aucune information de compte ni information personnelle auprès de **qui que ce soit**.

Si vous autorisez votre enfant à utiliser l'application, nous vous recommandons de l'aider à utiliser les fonctions de conversion d'écriture et de voix décrites aux sections 2 et 3 en comprenant leur fonctionnement.

---

## 10. Modifications de cette politique

Si nous mettons à jour cette politique, nous modifierons la date de « Dernière mise à jour » indiquée en haut. En cas de modification importante, nous en informerons dans l'application.

---

## 11. Contact

Pour toute question relative à la confidentialité : zeynepsoykan99@gmail.com

Propriétaire de l'application : Zeynep Soykan
