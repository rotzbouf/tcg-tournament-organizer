# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.8] - 2026-07-06

### Added
- **Druck-Suite: Match-Slips, Paarungen nach Name, Ranglisten-Aushang** — Im Runden-Tab gibt es jetzt zwei neue Druck-Ausgaben zusätzlich zur bisherigen Paarungsliste: **Match-Slips** — ein Ergebniszettel pro Tisch (zwei pro Zeile, gestrichelte Schnittkanten) mit Tischnummer, beiden Spielern samt ID, Kästchen für gewonnene Spiele und Unentschieden, Sieger-Zeile und je einer Unterschriftszeile pro Spieler (Freilose bekommen keinen Zettel); und **Paarungen (nach Name)** — dieselbe Runde alphabetisch nach Spielername sortiert mit Tisch und Gegner, damit ein Spieler seinen Tisch schnell selbst findet (die bisherige Liste nach Tischnummer bleibt für den Aufruf). Im Rangliste-Tab kommt der **Aushang (Rangliste)** dazu — eine großformatige Rangliste mit „Stand nach Runde N" zum Aushängen nach jeder Runde
- **Export-Brücken zu den offiziellen Turnier-Tools** — Im Rangliste-Tab gibt es (sobald Runden laufen) einen spielabhängigen Export-Button, um die Ergebnisse in die Vendor-Software zu überführen. **Pokémon**: eine echte TOM-Datei (`.tdf`), die von Tournament Operations Manager / RK9Labs eingelesen wird — mit Spielern (POP-ID als `userid`, Namen aufgeteilt, Geburtsdatum im US-Format), allen Swiss- und Finals-Runden und Match-Ergebnissen als TOM-Outcome-Codes (Sieg/Sieg/Unentschieden/Bye); Spieler ohne POP-ID bekommen eine temporäre Nummer, die der TO beim Import ersetzt. **Magic** („EventLink-Ergebnisse") und **Yu-Gi-Oh!** („KTS-Ergebnisse"): eine übersichtliche Rundenergebnis-CSV pro Match (Runde, Tisch, beide Spieler mit spielgerechter ID-Spalte, Spielstand, Sieger) plus angehängtem Endstand — als Übertragungshilfe für die manuelle Eingabe. Andere Spiele erhalten eine generische Rundenergebnis-CSV
- **Automatische Warnung bei illegaler Deckliste** — Reicht ein Spieler nach Turnierstart über die Mobile-Seite eine Deckliste ein, die gegen die Regeln des Formats verstößt (zu wenige/zu viele Karten, Kopienlimit, Sideboard-Größe oder gebannte/limitierte Karten laut hinterlegter Banlist), erscheint dem Turnierleiter automatisch ein Hinweis-Banner mit Spielername und der konkreten Regelverletzung. Reicht der Spieler anschließend eine legale Liste nach, verschwindet der Hinweis von selbst. Während der Anmeldephase erscheint bewusst kein Banner (dort ist die Legalität wie gehabt im Decklisten-Tab sichtbar). Es ist reine Information — jede Maßnahme (Strafe, Nachbesserung) entscheidet der Turnierleiter manuell
- **Offizielle Strafkataloge mit Eskalation** — Beim Vergeben einer Strafe (im Straf-Tab am Turnierleiter-Bildschirm und in der Judge-Ansicht auf dem Handy) gibt es jetzt statt eines reinen Freitextfelds eine Auswahl der offiziellen Vergehen des jeweiligen Spiels, gruppiert nach Kategorie (Spielfehler, Turnierfehler, unsportliches Verhalten, schwerwiegend): Magic nach dem Infraction Procedure Guide (IPG), Pokémon nach den Penalty Guidelines, Yu-Gi-Oh! nach der Konami-Turnierpolitik; Spiele ohne veröffentlichten Katalog erhalten eine generische Liste. Die Auswahl eines Vergehens schlägt automatisch die passende Strafe vor (z.B. Verspätung → Game Loss). Wiederholt ein Spieler dasselbe Vergehen im selben Turnier, wird die Empfehlung automatisch hochgestuft (Verwarnung → Game Loss → Match Loss → Disqualifikation) und ein Hinweis „Wiederholung Nr. N" eingeblendet — der Turnierleiter bzw. Judge behält die letzte Entscheidung und kann die Strafe frei überschreiben. Ein zusätzliches Notizfeld bleibt optional. Das gewählte Vergehen erscheint in der Strafenliste und in der spielerübergreifenden Strafen-Historie
- **Judge-Zugang über die Mobile-Seite** — Co-Judges können jetzt vom Handy aus mitarbeiten: Der Turnierleiter erzeugt im Mobile-Tab einen Judge-QR-Code (eigener Abschnitt „Judge-Zugang" bei laufendem Server); jedes Gerät, das ihn scannt, erhält die Judge-Ansicht. Judges tragen Ergebnisse direkt ein (ohne Bestätigungsschleife, änderbar bis zum Rundenabschluss, inklusive Korrektur), vergeben Strafen (Verwarnung bis Disqualifikation, mit Grund), droppen Spieler, sehen alle Judge-Rufe der Spieler als Liste mit Tisch und Uhrzeit (das Handy vibriert bei neuen Rufen; ein Judge übernimmt einen Ruf per Knopfdruck — wer zuerst übernimmt, kümmert sich, ein zweiter Zugriff wird abgewiesen, und die anderen Judge-Geräte zeigen automatisch an, welcher Judge den Call übernommen hat) und können für Deck-Checks jede Deckliste einsehen — auch bei Sichtbarkeit „versteckt". Rundenverwaltung (generieren, abschließen, Top Cut) bleibt bewusst beim Turnierleiter. Der Zugang lässt sich jederzeit per Knopfdruck widerrufen — alle Judge-Geräte verlieren ihn sofort; der Token steckt nur im QR-Code (URL-Fragment, taucht in keinem Log auf) und erlischt ohnehin beim Beenden der App. Judge-Geräte sind vom Anfragen-Limit des Mobile-Servers ausgenommen, eine zügige Ergebniseingabe wird also nicht gedrosselt
- **Saison-Wertung nachträglich änderbar** — Der Dialog „Turnier bearbeiten" bietet jetzt die Checkbox „Zur Saison werten". Sie ist in jedem Turnierstatus änderbar, auch nach Abschluss: Ein bereits gewertetes Turnier lässt sich nachträglich aus der Saisonwertung nehmen (oder wieder hineinnehmen), die Saison-Rangliste rechnet sofort neu
- **Regelwerk / Format nachträglich änderbar** — Im Dialog „Turnier bearbeiten" lässt sich jetzt auch das spielspezifische Regelwerk umstellen (z.B. Advanced/Traditional bei Yu-Gi-Oh!, Standard/Expanded bei Pokémon) — wie Name und Turniermodus nur während der Anmeldephase, da das Regelwerk die Decklisten-Prüfung bestimmt

### Fixed
- **Toter „Nächste Runde generieren"-Button bei Swiss + Top Cut entfernt** — Nach der letzten Swiss-Runde standen „Top Cut starten" und „Nächste Runde generieren" nebeneinander; der zweite Button tat nichts (die Engine erzeugt über die geplante Rundenzahl hinaus keine Swiss-Runde). Er wird jetzt ausgeblendet, es bleibt nur „Top Cut starten". Gefunden per End-to-End-Simulation von drei parallelen 100-Spieler-Turnieren
- **Export-Buttons zeigten rohe Übersetzungs-Schlüssel** — Seit 1.6.5 stand in den Sprachdateien zweimal ein `export`-Abschnitt; der zweite überschrieb den ersten, wodurch „CSV exportieren", „PDF exportieren", „Paarungen exportieren" und „Abschlussbericht" als technische Schlüssel (z.B. `export.pairings`) angezeigt wurden. Abschnitte zusammengeführt; ein neuer Test verhindert doppelte Schlüssel und prüft, dass Deutsch und Englisch dieselben Schlüssel abdecken. Außerdem beschreibt der Backups-Dialog jetzt den tatsächlichen 2-Minuten-Takt statt des alten 10-Minuten-Takts
- **Saison-Wertung ohne bestehende Saison wählbar** — Die Checkbox „Zur Saison werten" erschien beim Erstellen eines Turniers nur, wenn für das Spiel bereits eine laufende Saison existierte. Turniere ohne Saison wurden stillschweigend als „wird gewertet" angelegt — eine später angelegte Saison sammelte damit rückwirkend alle Turniere in ihrem Zeitraum ein, ohne dass der Turnierleiter je gefragt wurde. Die Checkbox ist jetzt beim Erstellen und Bearbeiten immer sichtbar

## [1.6.6] - 2026-07-05

### Fixed
- **Top Cut wird jetzt regelkonform geseedet** — Die erste Top-Cut-Runde paarte bisher Platz 1 gegen Platz 2, Platz 3 gegen Platz 4 usw. — die beiden besten Swiss-Spieler eliminierten sich damit direkt in Runde 1 gegenseitig. Jetzt wird das offizielle Single-Elimination-Bracket aufgestellt (Pokémon/Magic/Yu-Gi-Oh-Standard): Seed 1 trifft den niedrigsten Qualifikanten (z.B. 1 vs 16, 8 vs 9, …), Seed 1 und 2 stehen in getrennten Bracket-Hälften und können sich frühestens im Finale begegnen. Gilt für alle Cut-Größen (Top 4/8/16/32); bereits laufende Top Cuts behalten ihre Paarungen
- **Keine vermeidbaren Rematches mehr im Swiss** — Die Paarungserzeugung nutzt jetzt ein exaktes Maximum-Weight-Matching (Blossom-Algorithmus) statt einer First-Fit-Suche. Bei großen Turnieren mit Drops konnte die bisherige Suche in der letzten Runde am Tabellenende ein unnötiges Rematch erzeugen; jetzt ist garantiert: Rematches nur, wenn mathematisch unvermeidbar (und dann so wenige wie möglich), Punktegruppen werden bestmöglich eingehalten (ein großer Pair-Down wird gegenüber zwei kleinen vermieden), Power-Pairings bleiben rang-benachbart

### Added
- **Spielersuche im Turnier** — Im Spieler-Tab lässt sich ab 10 Teilnehmern nach Name, Spieler-ID oder Deck filtern (unabhängig von Groß-/Kleinschreibung und Akzenten: „jose" findet „José"); alle Aktionen wie QR-Code, Droppen oder Deckliste stehen direkt am Treffer. Im Runden-Tab filtert eine Suche nach Spielername oder Tischnummer — bei Großturnieren ist damit sofort auffindbar, wo ein Spieler sitzt. Beim Drucken der Paarungen wird immer die vollständige Liste ausgegeben, auch wenn gerade gefiltert ist

### Changed
- **Spielstände überleben jetzt auch Stromausfall, Backups im 2-Minuten-Takt** — Die Datendatei wird beim Speichern zusätzlich per fsync auf die Platte erzwungen (Datei und Verzeichnis): Bisher schützte das atomare Schreiben nur vor App-Abstürzen, nach einem Stromausfall oder OS-Absturz konnte die Datei dagegen leer zurückbleiben und die Wiederherstellung fiel auf ein bis zu 10 Minuten altes Backup zurück. Zusätzlich entstehen automatische Backups jetzt alle 2 statt alle 10 Minuten — im schlimmsten Fall gehen damit nur noch etwa 2 Minuten verloren. Damit die häufigeren Backups die ältere Historie nicht verdrängen, wird die Rotation nach Alter gestaffelt aufbewahrt (unter 15 Minuten alles, bis 2 Stunden viertelstündlich, bis 24 Stunden alle 2 Stunden, danach täglich; maximal 40 Dateien) — der Backups-Dialog reicht also weiterhin bis zum Vortag zurück, bei minutengenauen jungen Ständen

## [1.6.5] - 2026-07-04

### Added
- **Automatische Backups mit Wiederherstellung** — Der App-Zustand wird jetzt als Datei im Benutzerdatenordner gespeichert (atomares Schreiben, Crash-sicher) statt nur im Browser-Speicher. Alle 10 Minuten entsteht ein Backup, die letzten 10 Stände bleiben erhalten; leere oder beschädigte Stände gelangen nie in die Rotation. Ist die Hauptdatei beim Start beschädigt oder fehlt sie, stellt die App automatisch den neuesten brauchbaren Stand wieder her und zeigt einen Hinweis. Über den neuen „Backups"-Dialog in der Seitenleiste lässt sich jeder Stand manuell zurückspielen — vor jeder Wiederherstellung wird der aktuelle Stand zusätzlich gesichert. Beim Beenden der App wird der letzte Stand sofort geschrieben (kein Verlust der letzten Sekunden mehr)
- **QR-Code pro Spieler** — Bei laufendem Mobile-Server zeigt die Spielerliste pro Spieler einen „QR"-Button: Der Code enthält ein vorab an den Spieler gebundenes Zugriffs-Token. Ein Handy, das ihn scannt, ist sofort als dieser Spieler angemeldet (Deckliste, Selbst-Drop, Ergebnismeldung) — ohne Namens-Registrierung und ohne Wettrennen um den Namen. Das Token steckt im URL-Fragment und taucht in keinem Log auf
- **Export ohne persönliche Daten** — Der Export-Button bietet jetzt zwei Modi: „Komplett (Backup)" wie bisher und „Ohne persönliche Daten" zum Weitergeben — Geburtsdaten und Spieler-IDs werden entfernt, Namen, Decks, Ergebnisse und Elo bleiben erhalten

### Security
- **Verschlüsselung der gespeicherten Daten** — Datendatei und Backups werden über den System-Schlüsselbund verschlüsselt (Electron safeStorage), sofern verfügbar; der Status ist im Backups-Dialog sichtbar. Bestehende unverschlüsselte Daten werden beim ersten Start automatisch übernommen. Kann eine verschlüsselte Datei nicht mehr gelesen werden (z.B. Schlüsselbund entfernt), greift die Backup-Wiederherstellung; die unlesbare Datei wird aufbewahrt statt überschrieben und ist mit zurückkehrendem Schlüsselbund wieder verwertbar. Die frühere unverschlüsselte Kopie im Browser-Speicher entfällt und wird nach der Umstellung gelöscht
- **Namens-Übernahme über die LAN-API geschlossen** — Bisher konnte während der offenen Anmeldung jedes Gerät im Netzwerk ein Zugriffs-Token für einen bekannten Spielernamen beanspruchen. Jetzt gilt: Wer zuerst registriert, hält den Namen; weitere Versuche werden abgelehnt (409). Verliert ein Handy seine Sitzung, ist der Weg zurück der QR-Code beim Turnierleiter — die Handy-Seite weist darauf hin
- **Rate-Limit am Mobile-Server** — Schreibzugriffe (Registrierung, Ergebnismeldung, Judge-Ruf, Deckliste, Drop) sind auf 30 Anfragen pro Minute und Gerät begrenzt (429 bei Überschreitung). Ein einzelnes Gerät kann den Turnierleiter nicht mehr mit Meldungen fluten; Lesezugriffe und Live-Updates sind nicht betroffen

## [1.6.4] - 2026-07-03

### Fixed
- **Verdeckte Decklisten nicht mehr über den Mobile-Server lesbar** — Der SSE-Stream und die API des Mobile-Servers enthielten die vollständigen Decklisten aller Spieler, auch bei Sichtbarkeit „versteckt" oder „nur TO". Decklisten werden jetzt vor dem Versand entfernt; das eigene Deck lädt und speichert das Handy über ein Session-Token, das bei der Registrierung ausgestellt wird. Nebeneffekte: Die Registrierung über das Handy legt bei bereits vorhandenem Namen keinen doppelten Spieler mehr an, ist nach Ende der Anmeldephase gesperrt (403), und das Einreichen einer Deckliste sowie das Abmelden vom Turnier sind nur noch für den eigenen Spieler möglich (kein Fremd-Drop über die LAN-API mehr)
- **Elo/Strafen-Zuordnung bevorzugt Spieler-ID** — Rückkehrende Spieler werden jetzt zuerst über ihre hinterlegte Spieler-ID (Konami-ID etc.) mit dem Datenbank-Eintrag verknüpft, statt nur über den Namen. Zwei verschiedene Personen mit gleichem Namen teilen sich dadurch nicht mehr versehentlich Elo- und Strafen-Historie
- **Kein doppeltes Elo mehr beim Turnierabschluss** — Ein erneuter Abschluss eines bereits abgeschlossenen Turniers verändert die Wertung nicht mehr (Guard gegen doppelte Elo-Anwendung)
- **Direktes Ergebnis-Schreiben vom Handy entfernt** — Der ungenutzte Endpoint, über den ein Match-Ergebnis ohne TO-Bestätigung gesetzt werden konnte, wurde entfernt; Spieler melden Ergebnisse ausschließlich über den bestätigungspflichtigen Weg
- **Einheitliche Datenmigration** — Laden aus dem Speicher und Datei-Import nutzen jetzt dieselbe Migrationslogik; importierte Dateien können keine Felder mehr verpassen
- **Discord-Paarungen stimmen mit der echten Runde überein** — Die Discord-Benachrichtigung wurde bisher aus einem zweiten, separaten Reducer-Durchlauf gebaut; da die erste Runde zufällig ausgelost wird, wichen die geposteten Paarungen von den tatsächlich gespeicherten ab. Die Nachricht wird jetzt aus dem echten Turnierzustand nach dem Dispatch erzeugt
- **Mobile-Server gibt nur noch das eigene Turnier preis** — Der lokale Webserver (`/api/state` und der SSE-Stream) sendete bisher den kompletten App-State an jedes verbundene Gerät, inklusive Spieler-Datenbank (Elo, Strafen-Historie, Geburtsdaten, Spieler-IDs) und aller anderen Turniere. Jetzt wird pro Client nur das gebundene Turnier ausgeliefert; die Datenbank verlässt das Gerät nicht mehr
- **SSE-Clients pro Turnier getrennt** — Bei mehreren gleichzeitigen Turnier-Servern erhält jeder Client nur die Updates seines Turniers, das Stoppen eines Servers trennt nur dessen Verbindungen, und der Client-Zähler zählt pro Turnier
- **Request-Größe begrenzt** — POST-Anfragen an den Mobile-Server sind auf 1 MB gedeckelt (Schutz vor Speicher-Erschöpfung)
- **Sideboard getrennt gewertet** — Der Decklist-Parser markiert Karten nach einem Sideboard-Header (`Sideboard`, `Side Deck:`, `!side`) als Side-Deck. Die Validierung zählt Main-Deck und Sideboard jetzt getrennt: Side-Karten blähen die Main-Deck-Zahl nicht mehr auf (kein falsches „zu viele Karten" mehr), und die Sideboard-Größe wird gegen das Limit geprüft (`Zu viele Side-Deck-Karten`). Das Kopienlimit gilt weiterhin über Main + Side zusammen
- **Doppelseitige Karten (DFC/Split) gegen Whitelist** — Bei Whitelist-Formaten (Magic Standard/Pauper) werden `Front // Back`-Karten korrekt erkannt, auch wenn der Export nur die Vorderseite listet — kein falsches „nicht im Format" mehr
- **Kopien-Limit über die ganze Liste** — Die Deck-Validierung summiert jetzt Kopien einer Karte über alle Einträge (z.B. Main + Side Deck), statt jede Zeile einzeln zu prüfen. Eine Karte, die auf zwei Zeilen verteilt das Limit überschreitet (z.B. 3× + 2× bei Limit 4), wird korrekt als Verstoß erkannt — betrifft sowohl das Format-Kopienlimit als auch Limited/Semi-Limited-Banlisten
- **Basic Lands / Basic Energy vom Kopienlimit ausgenommen** — Beliebig viele Standard-Länder (Magic: Plains/Island/Swamp/Mountain/Forest/Wastes inkl. Snow-Covered) und Basis-Energien (Pokémon) lösen keinen „zu viele Kopien"-Fehler mehr aus. Special Energy bleibt limitiert
- **Scryfall Rate Limit** — 200 ms Pause zwischen paginierten Requests; bei 429-Antwort wird automatisch 65 Sekunden gewartet und bis zu 2× erneut versucht; HTTP-Timeout pro Request auf 60 s erhöht
- **Kein Spieler mehr ohne Paarung bei erschöpften Freilosen** — Wenn bei ungerader Spielerzahl alle verbleibenden Spieler bereits ein Freilos hatten, erhält jetzt der niedrigstplatzierte ein unvermeidbares zweites Freilos, statt ohne Match zu bleiben
- **Banlist-Download meldet HTTP-Fehler verständlich** — Antworten mit Status ≥ 400 werden als klarer Fehler (`HTTP 503 für …`) gemeldet, statt als kryptischer JSON-Parse-Fehler einer HTML-Fehlerseite; die automatische Wiederholung bei Scryfall-Rate-Limit (429) bleibt erhalten
- **Mobile-Server gegen DNS-Rebinding geschützt** — Anfragen, deren Host-Header ein Domainname statt einer IP-Adresse ist, werden abgewiesen (legitime Clients erreichen den Server immer über die LAN-IP); die offenen CORS-Header (`Access-Control-Allow-Origin: *`) wurden entfernt, da die Handy-Seite vom selben Server ausgeliefert wird
- **Desktop-App gehärtet** — Fenster können keine neuen Fenster mehr öffnen, Navigation ist auf die App selbst beschränkt, und die Produktions-App erhält eine Content-Security-Policy (Netzwerkzugriff des Renderers nur noch zu Discord-Webhooks)
- **Round Robin: Gedroppte Spieler werden nicht mehr gepaart** — Wer das Turnier verlässt, taucht in den Folgerunden nicht mehr in den Paarungen auf; der planmäßige Gegner erhält stattdessen ein Freilos. Der Spielplan der übrigen Teilnehmer bleibt dabei unverändert (jeder spielt weiterhin genau einmal gegen jeden)
- **Round Robin als spätere Turnierphase repariert** — In Mehrphasen-Turnieren nutzte eine Round-Robin-Phase den absoluten Rundenzähler statt des phasenbezogenen und rechnete über alle statt nur die weitergekommenen Spieler; außerdem landete die Rundengenerierung späterer Phasen im falschen Format-Zweig. Der Spielplan wird jetzt stabil über die Teilnehmer der Phase berechnet
- **Freilose zählen nicht mehr in die Tiebreaker** — Die Opponent-Match-Win-% wertete Freilose der Gegner bisher als Siege (ein Gegner mit 1-2 plus Freilos zählte mit 50 % statt offiziell 33,3 %). Gemäß offiziellen Pokémon-/Magic-Regeln sind Byes jetzt von der Win-Percentage ausgeschlossen; in der angezeigten Siege-Niederlagen-Bilanz zählt ein Freilos weiterhin als Sieg
- **Kein Unentschieden mehr in K.o.-Runden** — Über den Handy-Ergebnisbericht konnte ein bestätigtes Unentschieden in Top Cut / Double Elimination gelangen, wo die Bracket-Logik dann stillschweigend den falschen Spieler weiterrücken ließ. Unentschieden wird für K.o.-Runden jetzt zentral abgelehnt und der Unentschieden-Button auf der Handy-Seite in diesen Runden ausgeblendet
- **Disqualifikation beendet das laufende Match** — Eine DQ vergibt jetzt wie ein Drop automatisch den Sieg an den Gegner; bisher blieb das Match offen und die Runde konnte ohne manuellen Ergebniseintrag nicht abgeschlossen werden
- **Double Elimination verliert keine Spieler mehr** — Bei einer Teilnehmerzahl, die keine Zweierpotenz ist (z.B. 6 oder 12), wurden bisher die überzähligen Spieler beim Start stillschweigend aus dem Bracket ausgeschlossen; jetzt wird das Feld mit Freilosen für die Top-Seeds auf die nächste Zweierpotenz aufgefüllt. Zusätzlich behoben: Im Losers Bracket (immer ungerade Poolgröße) fiel bisher pro Runde ein Spieler unbemerkt aus dem Turnier — der übrige Spieler erhält jetzt ein Freilos und rückt weiter. Ein 2-Spieler-Bracket erreicht jetzt das Grand Final, statt hängen zu bleiben
- **Strafen von Erstteilnehmern bleiben erhalten** — Strafen erreichten die Spieler-Datenbank bisher nur, wenn der Spieler dort bereits einen Eintrag hatte; beim allerersten Turnier eines Spielers gingen sie verloren. Beim Turnierabschluss werden sie jetzt in den neu angelegten Datenbank-Eintrag übernommen (Notizen bleiben wie bisher turnierintern). Außerdem entfernt das Löschen einer Strafe im Turnier jetzt auch den zugehörigen Eintrag in der Spieler-Datenbank
- **Spielertausch prüft die Auswahl** — Beim Tauschen zweier Spieler zwischen Matches wird jetzt validiert, dass die gewählten Spieler tatsächlich in den angegebenen Matches sitzen; ein fehlerhafter Aufruf konnte vorher denselben Spieler doppelt in die Runde setzen
- **Keine doppelte Registrierung im Sync-Fenster** — Registrierten sich zwei Geräte (oder ein Doppel-Tipp) innerhalb der Synchronisations-Verzögerung mit demselben Namen, entstanden zwei identische Spieler. Der Mobile-Server merkt sich jetzt gerade angelegte Namen und legt den Spieler nur einmal an; beide Geräte erhalten trotzdem ihre Session
- **Ergebnis-Korrektur ohne Spielstände löscht die alten** — Wurde ein bereits eingetragenes Match-Ergebnis ohne neue Game-Angaben korrigiert (z.B. Sieger vertauscht), blieben die Spielstände des alten Ergebnisses stehen und verfälschten die Game-Win-Tiebreaker. Sie werden jetzt zurückgesetzt; von einer Game-Loss-Strafe vorbelegte Spielstände bleiben beim ersten Eintrag erhalten
- **Manuell gewählter Top Cut bleibt erhalten** — Der Turnierstart überschrieb eine manuell eingestellte Cut-Größe immer mit der automatisch berechneten. Die manuelle Auswahl gilt jetzt; nur ohne Vorgabe wird automatisch berechnet
- **Handy-Session übersteht Umbenennung** — Benannte der TO einen Spieler um, verlor dessen Handy den Zugriff auf Deckliste und Selbst-Drop. Die Session wird jetzt beim ersten Zugriff fest mit dem Spieler verknüpft und folgt ihm durch Umbenennungen

## [1.6.3] - 2026-06-28

### Changed
- **Banlist-Strategie pro Format** — Jedes Format deklariert jetzt einen Validierungstyp: `legal_list` (MTG Standard, Pauper: vollständige legale Kartenliste von Scryfall), `rotation` (Pokémon Standard: Set-Code-Whitelist für Pokémon-Karten; Trainer/Energie werden übersprungen da Namens-basiert) oder `banlist` (alle anderen: explizite Verboten/Limited/Semi-Limited-Listen). MTG Vintage lädt zusätzlich die Restricted-List (max. 1 Kopie). Die Banlist-Ansicht zeigt für jedes Format den passenden Badge und die entsprechenden Statistiken

## [1.6.2] - 2026-06-28

### Added
- **Saison-Zeitraum** — Beim Erstellen einer Saison wird ein Start- und Enddatum festgelegt. Alle abgeschlossenen Turniere desselben Spiels, deren Erstellungsdatum im Zeitraum liegt, werden automatisch zur Saison gewertet — kein manuelles Hinzufügen mehr nötig. Der Zeitraum ist nachträglich editierbar
- **Saison-Opt-out bei Turniererstellung** — Existiert eine aktive Saison für das gewählte Spiel, erscheint beim Erstellen eines Turniers die Checkbox „Zur Saison werten" (Standard: angehakt). Wird sie deaktiviert, wird das Turnier nicht in der Saison-Wertung berücksichtigt
- **Archivierte Turniere aus Sidebar entfernt** — Archivierte Turniere erscheinen nicht mehr in der Navigation

## [1.6.1] - 2026-06-28

### Fixed
- **Pokémon Standard Banlist-Laden** — Trainer-Namen-Fetch entfernt, der ~18 API-Requests erzeugte und ins Timeout lief. Rotations-Check gilt jetzt nur für Pokémon-Karten (set-code-basiert); Trainer und Energie werden übersprungen, da reprinted Karten ohne vollständige Datenbank nicht zuverlässig geprüft werden können
- **Scryfall API-Fehler** — `Accept: application/json`-Header ergänzt, der von der Scryfall API zwingend vorausgesetzt wird
- **Scryfall Fehler-Response** — Ungültige API-Responses (kein `data`-Array) werfen jetzt einen lesbaren Fehler statt einem `TypeError: data is not iterable`

## [1.6.0] - 2026-06-28

### Added
- **Rotations-Validierung für Pokémon TCG Standard** — Beim Laden der Banlist werden jetzt auch die aktuell legalen Standard-Sets (via pokemontcg.io) sowie alle legalen Trainer- und Energie-Karten-Namen geladen. Pokémon-Karten werden printing-basiert geprüft (Set-Code muss in der aktuellen Rotation sein); Trainer- und Energie-Karten sind legal wenn ihr Name in einem Standard-legalen Set vorkommt — unabhängig vom Druck
- **Rotations-Validierung für MTG Standard** — Beim Laden der Standard-Banlist von Scryfall wird eine vollständige Liste aller Standard-legalen Karten-Namen heruntergeladen. Die Prüfung ist namensbasiert, sodass Reprints in älteren Sets korrekt als legal erkannt werden
- **Set-Code im Parser** — Der Decklist-Parser extrahiert jetzt den Set-Code (`setCode`) als eigenes Feld aus PTCGL- und MTGA-Exportformaten. Karten-Namen enthalten keine Set-Info mehr. Der Parser erkennt außerdem den Abschnittstyp (`section`: pokemon / trainer / energy) für Pokémon-Decklisten

## [1.5.5] - 2026-06-27

### Fixed
- **Strafen-Dialog: Button direkt aktiv** — Der „Strafe vergeben"-Button war beim ersten Öffnen des Dialogs deaktiviert, obwohl der erste Spieler bereits vorausgewählt war. Initialwert von `playerId` stimmt jetzt mit dem angezeigten Select-Eintrag überein
- **Mobile-Vibration bei Timer-Ablauf** — `navigator.vibrate()` wird vom Browser ignoriert wenn die Seite nicht sichtbar ist (Bildschirm gesperrt / Tab im Hintergrund). Die Vibration wird jetzt nachgeholt sobald die Seite wieder sichtbar wird (`visibilitychange`-Listener). Vibrationsmuster verlängert (3× 500 ms). AudioContext wird vor der Wiedergabe explizit resumt um die Autoplay-Blockierung auf Mobile zu umgehen

## [1.5.4] - 2026-06-27

### Fixed
- **Judge Call für gedroppte Spieler gesperrt** — Der Server lehnt Judge Calls von Spielern mit `droppedInRound !== null` mit HTTP 403 ab. Gedroppte Spieler können keinen Judge mehr rufen

## [1.5.3] - 2026-06-27

### Changed
- **Auto-Sieg beim Drop** — Droppt ein Spieler während einer laufenden Runde und sein Match ist noch ausstehend, erhält der Gegner automatisch den Sieg. Bereits eingetragene Ergebnisse und Freilose bleiben unverändert

## [1.5.2] - 2026-06-27

### Fixed
- **Judge-Call-Spam** — Wiederholt ein Spieler einen Judge Call bevor der TO bestätigt hat, wird der alte Eintrag ersetzt statt ein weiterer Banner anzuhängen. Pro Spieler ist immer nur ein offener Judge Call sichtbar

## [1.5.1] - 2026-06-27

### Added
- **Turnier-Archiv** — Abgeschlossene Turniere können im Dashboard archiviert werden. Tab-Umschalter „Aktiv / Archiv" trennt laufende von archivierten Turnieren. Archivierung ist jederzeit rückgängig machbar („Wiederherstellen")
- **Konflikt-Erkennung bei Self-Reporting** — Melden beide Spieler eines Matches ein widersprüchliches Ergebnis (beide Sieg oder beide Niederlage), erscheint ein rotes Warn-Banner. Der TO muss das Ergebnis dann manuell per Schaltfläche eintragen; automatisches Bestätigen ist gesperrt. Stimmen beide Meldungen überein, wird dies im gelben Banner als „Beide melden …" angezeigt

## [1.5.0] - 2026-06-26

### Added
- **Spieler Self-Reporting** — Spieler können ihr Matchergebnis direkt auf der Mobile-Seite eintragen. Der TO sieht einen Bestätigungs-Banner im Rundenbereich und muss das gemeldete Ergebnis explizit bestätigen, bevor es gespeichert wird
- **Saison-Management** — Neue Saisons-Seite in der Navigation. Mehrere abgeschlossene Turniere können zu einer Saison zusammengefasst werden. Konfigurierbare Punkte-Tiers nach Platzierung (Standard: 1.=10, 2.=7, 3.–4.=5, 5.–8.=3, 9.–16.=1). Die Saison-Rangliste wird automatisch über alle verknüpften Turniere berechnet
- **Elo Seeding** — Erste Runde optional nach Elo-Wertung paaren (S-Kurven-Methode: #1 vs. #N/2+1, #2 vs. #N/2+2 usw.). Aktivierbar pro Turnier beim Erstellen
- **Visuelles Bracket** — Neuer „Bracket"-Tab erscheint sobald Top-Cut-Runden existieren. Zeigt den gesamten Eliminationsbaum mit Champion-Hervorhebung
- **Turnier-Abschlussbericht** — HTML-Export nach Turnierende mit Champion-Box, Statistiken, vollständiger Rangliste und allen Rundenpaarungen

## [1.4.1] - 2026-06-26

### Fixed
- **Windows-Build: Dashboard leer** — BrowserRouter durch HashRouter ersetzt. Auf Windows wurde der `file://`-Pfad (`/C:/…/index.html`) nicht als Route `/` erkannt, wodurch der gesamte Dashboard-Inhalt (inkl. „Neues Turnier"-Button) nicht gerendert wurde

## [1.4.0] - 2026-06-24

### Added
- **Dark Mode** — Drei Modi: Hell, Dunkel, System. Toggle in der Sidebar, Theme-Wahl wird gespeichert. Mobile-Seite folgt dem System-Setting des Handys
- **Timer-Alarm** — Sound (Web Audio Beep), Desktop-Notification und Mobile-Vibration bei Rundenende. Sound per Toggle stummschaltbar
- **Elo-Verlauf-Graph** — SVG-Linien-Chart in der Spielerhistorie zeigt Elo-Entwicklung über alle Turniere mit Hover-Tooltips
- **Statistik-Karten** — Rangliste zeigt Spieleranzahl, Durchschnitts-Elo und aktivsten Spieler als Übersicht
- **Paarungen-PDF-Export** — Neue Export-Funktion für Paarungen mit Tischnummern, Spielernamen und Ergebnissen

### Changed
- Alle Farben auf semantische CSS-Variablen umgestellt für konsistentes Theming
- Druckansicht verbessert: saubere Tabellen, versteckte Buttons, Seitenumbruch-Regeln, Print-Header mit Turniername und Rundennummer

## [1.3.3] - 2026-06-23

### Added
- **Power Pairings** — Letzte Swiss-Runde paart innerhalb eines Punktebrackets nach Tiebreaker-Rang. Pro Turnier zu- und abschaltbar (Standard: an)
- **Turnier-Vorlagen** — Wiederkehrende Turnierformate als Vorlage speichern und beim Erstellen laden
- **Decklist-Sichtbarkeit bei Erstellung** — Sichtbarkeitsmodus direkt beim Turnier-Erstellen auswählbar

### Changed
- Game-Score-Felder (Spiele) werden nur noch bei TCGs mit GW%-Tiebreaker angezeigt (SWU, Lorcana, Altered, MTG), nicht mehr bei YGO, Pokémon und Riftbound

## [1.3.2] - 2026-06-23

### Added
- **Manuelle Paarungsänderung** — Spieler zwischen Matches tauschen per Klick (Spieler auswählen → zweiten Spieler anklicken → Swap)
- **Decklist-Sichtbarkeits-Modi** — Drei Modi: Versteckt, Nur für TO, Öffentlich. Steuerbar über neuen Decklisten-Tab, Mobile-Seite respektiert Einstellung
- **Kartenbank-Validierung** — Decklisten werden gegen Deck-Regeln geprüft (Kartenzahl, maximale Kopien pro Karte). Regeln pro TCG konfiguriert
- **Cross-Tournament Penalty-Tracking** — Strafen werden in der Spieler-Datenbank gespeichert und bei zukünftigen Turnieren als Warnung angezeigt
- **Decklist-Übersicht** — Neuer Tab für den TO mit allen eingereichten Decklisten, aufklappbar pro Spieler

### Fixed
- Hardcoded Strings ("Tournament not found", "3 pts") durch i18n-Keys ersetzt

## [1.3.1] - 2026-06-23

### Added
- **Custom-Notiz im Penalty-System** — Neue Option "Notiz" als Strafart, rein zur Dokumentation ohne Spieleffekt
- **Multi-Format Decklist-Import** — Unterstützung für MTGA, PTCGL, Moxfield, Limitless, Pixelborn, DreamBorn, Archidekt, pokemoncard.io Formate; Sektions-Header werden automatisch übersprungen

## [1.3.0] - 2026-06-23

### Added
- **Disney Lorcana** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor), Minimum 4 Swiss-Runden
- **Altered** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor)
- **Magic: The Gathering** — Neues TCG mit OMW%/GW%/OGW%-Tiebreaker (33% Floor), Minimum 4 Swiss-Runden
- Per-Spiel konfigurierbare Mindest-Rundenanzahl (`minSwissRounds`)

## [1.2.9] - 2026-06-23

### Added
- **Navigation nach Registrierung** — Registrierte Spieler sehen sofort Paarungen- und Rangliste-Tabs auf der mobilen Seite

### Changed
- "Nicht du? Wechseln"-Button auf der mobilen Seite entfernt, um versehentliche Doppel-Registrierungen zu vermeiden

### Fixed
- Mobile Seite zeigte weiße Seite wegen Syntax-Fehler in Template-Literal

## [1.2.8-beta] - 2026-06-23

### Added
- **QR-Code drucken** — Drucken-Button im QR-Code-Fenster, damit der QR-Code am Eventtag ausgedruckt im Shop ausgelegt werden kann
- **Automatische Elo-Aktualisierung** — Elo-Wertung wird automatisch beim Turnierende angewendet, mit Schutz gegen doppelte Anwendung
- **SSE Initial-State** — Mobile Seite erhält sofort den aktuellen Turnierstand beim Verbinden

### Changed
- Manueller "Elo aktualisieren"-Button entfernt (Missbrauchsschutz)
- "Nächste Runde generieren"-Button nach Turnierende deaktiviert
- Mobile Seite nutzt gebundene Turnier-ID statt erstes Turnier aus dem State

### Fixed
- Mobile Registrierungsseite konnte leer bleiben wenn der initiale API-Aufruf fehlschlug
- SSE-Updates auf dem Registrierungs-Tab wurden komplett blockiert

## [1.2.7] - 2026-06-22

### Added
- **CSV-Export** — Turnierergebnisse als CSV exportieren (Rang, Name, Spieler-ID, Punkte, Tiebreaker)
- **PDF-Export** — Formatiertes Ergebnis-PDF mit Turnierinformationen und Standings-Tabelle
- **Automatische Top-Cut-Berechnung** — Top-Cut-Größe wird anhand der Spieleranzahl nach offiziellen Regeln berechnet (9–16: Top 4, 17–32: Top 8, 33–64: Top 16, 65+: Top 32)

### Changed
- Manuelle Top-Cut-Auswahl entfernt, ersetzt durch automatische Berechnung beim Turnierstart

## [1.2.6-beta] - 2026-06-22

### Added
- **Einzelne Spieler aus Datenbank löschen** — ×-Button pro Spieler in der Rangliste mit Bestätigungsdialog

## [1.2.5-beta] - 2026-06-22

### Added
- **Autocomplete bei Spielereingabe** — Vorschläge aus der Datenbank beim Tippen mit Name und Elo-Anzeige, Auswahl per Klick oder Pfeiltasten
- **Turnierformat in der Turnieransicht** — Format (Swiss, Swiss + Top Cut, etc.), Top-Cut-Größe und Altersklassen im Header sichtbar
- **Umschalten Gesamt-/Divisions-Rangliste** — Buttons zum Wechsel zwischen Rangliste pro Altersklasse und Gesamtrangliste

### Changed
- Separates Dropdown "Spieler aus Datenbank hinzufügen" entfernt, durch integriertes Autocomplete ersetzt

## [1.2.4-beta] - 2026-06-22

### Added
- **Judge Call über Mobile** — Spieler können per Button einen Judge an ihren Tisch rufen, Tischnummer wird automatisch erkannt
- Popup-Benachrichtigung auf dem TO-Bildschirm mit Spielername und Tischnummer
- Eigenes Match wird in der mobilen Paarungsansicht blau hervorgehoben
- Rundenzeit-Timer auf der mobilen Seite sichtbar

### Changed
- **Ergebnis-Reporting nur noch über TO** — Result-Buttons aus der mobilen Ansicht entfernt, Hinweis auf Meldung beim Turnierleiter

## [1.2.3-beta] - 2026-06-22

### Added
- **Pokémon TCG Altersklassen** — Offizielle Divisionen (Junior / Senior / Masters) basierend auf Geburtsjahr und Season-Zyklus (Sep–Aug)
- Paarung pro Division getrennt (Juniors nur gegen Juniors, etc.)
- Standings pro Division mit eigener Rangliste
- Division-Badge in der Turnier-Spielerliste
- TO kann Altersklassen bei Turniererstellung deaktivieren für kleine lokale Turniere
- **Erweiterte mobile Registrierung** — Vorname, Nachname, Geburtsdatum (optional), Spieler-ID (optional)
- Session-Speicherung in localStorage für spätere Rückkehr zum Turnier
- Spieler können nur noch eigene Deckliste einreichen (kein Dropdown für andere Spieler)

## [1.2.2-beta] - 2026-06-22

### Added
- **QR-Code im eigenen Fenster öffnen** — Separates Always-on-Top-Fenster mit Turniername und QR-Code, mehrere gleichzeitig möglich für parallele Turnierregistrierung

### Fixed
- **QR-Code wird nach Server-Start nicht angezeigt** — QR-Code-Generierung in den Renderer-Prozess verschoben, umgeht Bundler-Probleme mit dem qrcode-Modul im Hauptprozess
- **Mobile Registrierung: Eingabefeld wird nach Sekunden zurückgesetzt** — Timer-Update vom DOM-Rebuild getrennt, Eingabefelder bleiben während der Eingabe erhalten
- **Spieler können Decklisten für andere einreichen** — Register und Decklist als zusammenhängender Flow, Spieler können nur ihre eigene Deckliste einreichen

## [1.2.1-beta] - 2026-06-22

### Added
- **Spieler-ID / Spielerprofil** — TCG-spezifische Spieler-IDs hinterlegen (Konami-ID, Pokemon Player ID, etc.)
- Spielerprofil-Ansicht in der Rangliste mit editierbarer Spieler-ID
- Spieler-ID-Spalte in der Ranglisten-Übersicht
- Spieler-ID wird bei Turnier-Anmeldung aus der Datenbank übernommen
- Spieler-ID wird in der Turnier-Spielerliste angezeigt

### Fixed
- **QR-Code wird nach Server-Start nicht angezeigt** — `qrcode`-Modul wurde beim Bundling nicht externalisiert, dynamischer Import schlug still fehl
- `qrcode` als Rollup-External konfiguriert und statisch importiert
- `electron-builder.yml` enthält nun `qrcode` und dessen Dependencies für den produktiven Build

## [1.2.0-beta] - 2026-06-21

### Added
- **Local web server for mobile player access** — Players scan a QR code to interact via phone browser
- Mobile page: view pairings, submit results, register, submit decklists, view standings
- Server-Sent Events for live state updates to all connected devices
- QR code generation for local network URL
- Server Panel tab in tournament view with start/stop controls
- IPC state synchronization bridge between renderer and main process
- Timer state sync for mobile timer display
- REST API endpoints for tournament interaction
- Auto-detect local IP address for server URL
- Server auto-cleanup on app close

## [1.1.0] - 2026-06-21

### Added
- Game-level result tracking (game scores within a match, e.g., 2-1 in best-of-3)
- Game-configurable tiebreaker system: TCG-standard (OMW%, GW%, OGW%) for YGO/Pokemon/SWU, chess-standard (Buchholz/SB) for Riftbound
- Tiebreaker minimum floors (33% for SWU/MTG-style, 25% for YGO/Pokemon)
- Head-to-head tiebreaker for YGO and Pokemon
- Game Loss penalty now mechanically awards opponent +1 game win
- Grand Final bracket reset option for Double Elimination tournaments
- Losers bracket pairing with rematch avoidance
- Game score input fields on MatchCard

### Changed
- StandingsTable shows game-appropriate tiebreaker columns (OMW%/GW%/OGW% or Buchholz/SB based on game)
- Discord webhook messages use i18n system instead of hardcoded German strings
- Tiebreaker configuration per game via GameConfig

## [1.0.0] - 2026-06-21

### Added
- **Tournament Formats:** Double Elimination (winners/losers bracket, grand final) and Round Robin (circle algorithm)
- **Format Selection:** Choose between Swiss, Swiss + Top Cut, Double Elimination, and Round Robin when creating a tournament
- **Penalty System:** Issue warnings, game losses, match losses, and disqualifications; auto-applies match results and drops
- **Multi-Phase Tournaments:** Configure sequential phases (e.g., Round Robin → Swiss → Top Cut) with player advancement between phases
- **Decklist Submission:** Players can submit full card lists (parsed from "3x Card Name" format) with card count stats
- **Elo Rankings:** Persistent player database with Elo ratings across tournaments (K=32 new, K=16 established)
- **Rankings Page:** Searchable player rankings with tournament history and Elo progression
- **Discord Webhook:** Post pairings, standings, and results to Discord channels automatically
- **Discord Settings Tab:** Configure and test webhook URL per tournament
- Round Robin engine tests
- Double Elimination engine tests
- Elo calculation engine tests
- Decklist parser tests

### Changed
- Standings calculation supports Round Robin and Double Elimination bracket phases
- Serialization version bumped to 1.2.0 with backward-compatible migration
- UPDATE_TOURNAMENT allows changing Discord webhook URL at any tournament stage

## [0.9.0] - 2026-06-21

### Added
- Auto-save via localStorage — tournament data persists across sessions
- Error boundary — catches React errors with reload fallback
- Confirmation dialogs for delete tournament and drop player
- Undo system with history stack (Ctrl+Z)
- Tournament editing during registration (name, round time, top cut)
- Bulk player import via textarea (one name per line)
- Print pairings button with print-optimized CSS
- Table numbers on match cards
- Deck name tracking per player
- Keyboard shortcuts: Ctrl+E export, Ctrl+I import, Ctrl+Z undo
- Reducer test suite (20 test cases)
- Top cut engine tests
- `nearestPowerOfTwo` utility function

### Fixed
- Top cut validates player count and clamps to nearest power of 2
- Top cut rejects non-power-of-2 player counts
- Match results can only be submitted in the active (non-complete) round
- Dialog component now traps focus and has proper ARIA attributes
- RoundHistory accordion has aria-expanded and aria-controls

### Changed
- Standings calculated from Swiss rounds only (excluding top cut matches)
- Dialog uses role="dialog", aria-modal, aria-labelledby, and focus restoration

### Removed
- Unused `selectActiveTournaments` selector

## [0.8.2] - 2026-06-21

### Added
- Round timer displayed next to tournament name in sidebar for running tournaments

## [0.8.1] - 2026-06-21

### Added
- Top 32 option for Top Cut tournament mode

### Fixed
- Top Cut standings now rank players by bracket placement (winner = 1st, finalist = 2nd, etc.) instead of Swiss tiebreakers
- Swiss points and tiebreakers are calculated from Swiss rounds only, excluding Top Cut matches
- Players can no longer receive more than one bye in a tournament

## [0.8.0] - 2026-06-21

### Added
- Round time selection via dropdown menu (20–90 minutes in 10-minute steps)
- Tournament mode selection: Swiss-only or with Top Cut (Top 4, Top 8, Top 16)
- Top Cut single-elimination bracket phase after Swiss rounds
- Top Cut status badge and round counter in tournament view
- Draw option hidden in Top Cut matches (single elimination requires a winner)

### Changed
- Migrated Tailwind CSS configuration to v4 syntax (@import, @theme)
- Replaced PostCSS plugin `tailwindcss` with `@tailwindcss/postcss`

## [0.7.1] - 2026-06-21

### Added
- CI pipeline with typecheck, lint, and tests
- CodeQL security scanning
- Dependabot config for npm and GitHub Actions
- ESLint with TypeScript and React plugins
- Security policy with vulnerability reporting guidelines

### Changed
- Bump dependencies: react 19, react-dom 19, i18next 26, react-i18next 17, electron 42, vite-plugin-electron 1.0, tailwindcss 4, jsdom 29
- Bump GitHub Actions: checkout v7, setup-node v6, upload-artifact v7, action-gh-release v3, codeql-action v4

## [0.7.0] - 2026-06-20

### Added
- Drop player from running tournament
- Dropped players keep their rank in standings but are excluded from future rounds
- Multiple byes per round when pairing constraints require it
- Visual indicators for dropped players (strikethrough, drop round label)
- Active/total player count display during tournament

## [0.6.0] - 2026-06-19

### Added
- JSON export/import with schema validation
- Native Electron file dialogs with browser fallback
- Export/Import buttons in sidebar

## [0.5.0] - 2026-06-19

### Added
- Independent countdown timer per tournament
- Drift-free timer using endTimestamp approach
- Compact timer display on dashboard cards
- Full timer controls (start/pause/reset) in tournament view
- Visual color changes at 5min, 1min, and expired

## [0.4.0] - 2026-06-19

### Added
- Tournament detail view with tabbed interface
- Player management (add/remove during registration)
- Round generation with Swiss pairing
- Match result entry with one-click buttons
- Standings table with all tiebreaker columns
- Round history with accordion display

## [0.3.0] - 2026-06-19

### Added
- State management with React Context + useReducer
- Dashboard with tournament cards
- Create tournament dialog (name, game, round time)
- Sidebar navigation with tournament list
- Reusable UI components (Button, Card, Dialog, Input, Select, Badge)
- i18n setup with German and English translations

## [0.2.0] - 2026-06-19

### Added
- Swiss pairing algorithm with backtracking for rematch avoidance
- Standings calculator with Buchholz, Median-Buchholz, Sonneborn-Berger tiebreakers
- Scoring module (3-1-0 point system)
- 31 unit tests for all engine modules

## [0.1.0] - 2026-06-19

### Added
- Project scaffold with Vite + React + TypeScript + Electron
- TailwindCSS styling setup
- Basic app shell layout with sidebar navigation
- i18n support (German and English) with i18next
- Electron main process with IPC for file operations
- TypeScript type definitions for Tournament, Player, Round, Match, Standing
- Game configuration for Yu-Gi-Oh!, Pokémon TCG, Star Wars: Unlimited, Riftbound
