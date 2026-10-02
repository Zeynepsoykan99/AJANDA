---
layout: default
permalink: /privacy/de/
title: "AJANDA — Datenschutzerklärung"
lang: de
---

# AJANDA — Datenschutzerklärung

**Letzte Aktualisierung:** 2. Oktober 2026

[Türkçe](/AJANDA/privacy/) · [English](/AJANDA/privacy/en/) · [Español](/AJANDA/privacy/es/) · [Français](/AJANDA/privacy/fr/)

## Kurzfassung

AJANDA hat keinen Server. Sie müssen kein Konto erstellen, die App fragt Sie nicht nach Identitätsdaten und speichert das, was Sie schreiben, nicht auf einem Server. Ihr Kalender, Ihr Tagebuch, Ihre Notizen, Ihre Zeichnungen, Ihre Sticker und Ihre Sprachaufnahmen bleiben auf Ihrem Gerät.

Davon gibt es **zwei Ausnahmen**, und beide bestehen ausschließlich dazu, Ihre Eingaben in Text umzuwandeln: die **Handschrifterkennung** und die **Umwandlung von Sprachnotizen in Text**. Beide werden unten ausführlich beschrieben.

---

## 1. Wo Ihre Daten liegen

Alles, was Sie erstellen, wird im Speicher Ihres Geräts abgelegt:

- Kalenderseiten, To-do-Listen, Tagebuch- und Notizbuchseiten
- Ihre Zeichnungen, Textfelder, Sticker und Umschlaggestaltungen
- Ihre Sprachaufnahmen (als Dateien im App-Ordner auf Ihrem Gerät)
- Ihre Design- und Spracheinstellung, Ihre Erinnerungen

Wir können auf diese Daten nicht zugreifen. Sie werden nicht auf einen Server hochgeladen, nicht gesichert und nicht auf ein anderes Gerät übertragen. **Wenn Sie die App von Ihrem Gerät löschen, werden alle diese Daten gelöscht.**

---

## 2. Handschrifterkennung

Damit Ihre Handschrift in durchsuchbaren Text umgewandelt werden kann, werden die **Koordinaten** Ihrer Striche, die Größe des Schreibbereichs und die von Ihnen gewählte Sprache über das Internet an den **Handschrifterkennungsdienst von Google** (`inputtools.google.com`) gesendet und dort in Text umgewandelt.

**Was nicht gesendet wird:** Ihr Name, Kontodaten, eine Gerätekennung oder eine andere Kennung. Es werden ausschließlich die Strichkoordinaten gesendet. Der zurückgegebene Text wird **nur auf Ihrem Gerät** gespeichert.

Diese Umwandlung funktioniert auf zwei Wegen:

- **Von selbst:** In den Bereichen **Mein Kalender** und **To-do** läuft sie im Hintergrund, wenn Sie handschriftlich schreiben, damit Ihre Eingaben in der Suche gefunden werden können.
- **Wenn Sie es verlangen:** Wenn Sie mit dem Lasso-Werkzeug eine Schrift auswählen und „in Text umwandeln“ wählen. In den Bereichen **Mein Tagebuch** und **Meine Notizen** erfolgt die Umwandlung **ausschließlich auf diesem Weg**, also nur dann, wenn Sie sie ausdrücklich verlangen — dort wird nichts von selbst gesendet.

Wenn Sie diese Funktion zum ersten Mal nutzen, wird in der App ein Hinweis angezeigt.

Die Strichkoordinaten sind das, was Sie geschrieben haben: zusammengesetzt lässt sich Ihre Handschrift daraus wieder zeichnen. Deshalb empfehlen wir: **Wenn Sie etwas privat halten möchten, schreiben Sie es nur im Bewusstsein dieses Umstands handschriftlich.**

---

## 3. Umwandlung von Sprachnotizen in Text

Damit Ihre Sprachnotizen in durchsuchbaren Text umgewandelt werden können, wird Ihre Aufnahme an die **vom Betriebssystem Ihres Geräts bereitgestellte Spracherkennung** weitergegeben. Diese Funktion stellen nicht wir bereit, sondern der Hersteller bzw. die Plattform Ihres Geräts.

- **Auf Android-Geräten:** Dies übernimmt der eigene Spracherkennungsdienst des Telefons — auf den meisten Geräten gehört dieser Dienst **Google**. Ihre Audioaufnahme **kann zur Umwandlung in Text über das Internet an diesen Dienst gesendet werden.** Diese Entscheidung trifft der Dienst auf Ihrem Gerät; die App kann sie weder bestimmen noch einsehen.
- **Auf iPhone und iPad:** Wir fordern an, dass die Umwandlung auf dem Gerät erfolgt. Wenn Ihr Gerät die gewählte Sprache jedoch nicht selbst verarbeiten kann, **kann Ihre Audioaufnahme an die Server von Apple gesendet werden.**

**Die von Ihnen aufgenommene Audiodatei selbst wird nur auf Ihrem Gerät gespeichert**; wir laden sie nirgendwohin hoch. Ihr Name, Ihr Konto und Ihre Geräteinformationen werden nicht gesendet.

Wenn Sie diese Funktion zum ersten Mal nutzen, wird in der App ein Hinweis angezeigt. Um zu erfahren, wie Ihre Audioaufnahme vom Betriebssystem verarbeitet wird, können Sie auch die Datenschutzerklärung Ihres Geräteherstellers einsehen.

---

## 4. Die Sperre (PIN und biometrische Authentifizierung)

Sie können Ihr Tagebuch und Ihre Notizbücher mit einer vierstelligen PIN sperren und, sofern Ihr Gerät es unterstützt, mit Fingerabdruck oder Gesichtserkennung entsperren.

**Was diese Sperre leistet:** Ihre PIN wird im hardwaregeschützten sicheren Bereich Ihres Geräts gespeichert (Keychain unter iOS, Keystore unter Android); sie wird **unter keinen Umständen** in den unverschlüsselten allgemeinen Speicher geschrieben. Falsche PIN-Eingaben werden begrenzt; bei wiederholt falschen Eingaben verlängert sich die Wartezeit stufenweise.

**Was diese Sperre nicht leistet — das möchten wir deutlich sagen:** Die Sperre ist eine **Zugangstür**. Sie verhindert, dass andere Ihr Notizbuch in der App öffnen, **verschlüsselt den Inhalt des Notizbuchs jedoch nicht.** Wer auf technischem Wege auf das Dateisystem Ihres Geräts zugreifen kann (etwa auf einem „gerooteten“ oder „jailbroken“ Gerät oder über eine Gerätesicherung), könnte den Inhalt ohne PIN lesen.

Der wichtigste Schutz ist deshalb **die Bildschirmsperre und Verschlüsselung Ihres Geräts selbst.** Wir empfehlen, auf Ihrem Gerät eine Bildschirmsperre einzurichten.

Ihre biometrischen Daten (Fingerabdruck, Gesicht) werden vom Betriebssystem verarbeitet; die App greift nicht auf diese Daten zu und speichert sie nicht — sie erhält lediglich das Ergebnis „Authentifizierung erfolgreich“.

---

## 5. Erinnerungen

Wenn Sie für Ihre Seiten eine Erinnerung einrichten, wird die Benachrichtigung **lokal auf Ihrem Gerät** geplant. Es wird kein Eintrag auf einem Server erstellt, keine Infrastruktur für Remote-Benachrichtigungen (Push) verwendet und daher auch keine Kennung wie ein Benachrichtigungs-Token erzeugt oder gesendet.

---

## 6. Export und Weitergabe

Wenn Sie eine Seite als PDF exportieren, wird die Datei auf Ihrem Gerät erzeugt und das Teilen-Menü Ihres Geräts geöffnet. **Sie** entscheiden, wohin die Datei geht. Die App sendet die Datei nicht von selbst irgendwohin.

---

## 7. Was wir nicht erheben

Wir möchten dies ausdrücklich festhalten; die App:

- verlangt kein Konto und erhebt keine E-Mail-Adresse und keine Telefonnummer
- erhebt keine Analysedaten, Nutzungsstatistiken oder Fehlerberichte
- zeigt keine Werbung und verwendet keine Werbe- oder Tracking-Kennung
- greift nicht auf Ihren Standort, Ihre Kontakte, Ihre Fotos oder Ihren Kalender zu
- verkauft Ihre Daten an niemanden und gibt sie nicht zu Marketingzwecken weiter

---

## 8. Löschen Ihrer Daten

- Einzelne Seiten, Notizen, Sprachaufnahmen oder Notizbücher können Sie in der App löschen.
- Um alle Ihre Daten zu löschen, genügt es, die App von Ihrem Gerät zu entfernen.
- Da Sie keine Daten auf einem Server haben, gibt es keinen Datensatz, dessen Löschung Sie bei uns beantragen müssten.

Wie lange die zur Handschrift- oder Spracherkennung gesendeten Daten von Google oder Apple aufbewahrt werden, richtet sich nach den Richtlinien dieser Unternehmen; darauf haben wir keinen Einfluss.

---

## 9. Datenschutz von Kindern

AJANDA richtet sich an ein **allgemeines Publikum**. Die App ist nicht speziell für Kinder unter 13 Jahren gestaltet und wird dieser Altersgruppe nicht angeboten.

Wir erheben nicht bewusst personenbezogene Daten von Kindern unter 13 Jahren — die App erhebt ohnehin von **niemandem** Kontodaten oder personenbezogene Daten.

Wenn Sie Ihrem Kind die Nutzung der App erlauben, empfehlen wir, ihm dabei zu helfen, die in den Abschnitten 2 und 3 beschriebenen Funktionen zur Handschrift- und Spracherkennung mit Verständnis für deren Funktionsweise zu nutzen.

---

## 10. Änderungen dieser Erklärung

Wenn wir diese Erklärung aktualisieren, ändern wir oben das Datum „Letzte Aktualisierung“. Bei einer wesentlichen Änderung weisen wir in der App darauf hin.

---

## 11. Kontakt

Bei Fragen zum Datenschutz: zeynepsoykan99@gmail.com

Inhaberin der App: Zeynep Soykan
